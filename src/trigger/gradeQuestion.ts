import { logger, task } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import { makeThrottledStage } from "./progress";
import { callClaude, extractJsonFromResponse } from "@/lib/claude-cli";
import { GRADING_SYSTEM_PROMPT, buildGradingUserPrompt } from "@/lib/prompts/grading";
import { ExtractedQuestion } from "@/lib/schemas/extracted";
import { FeedbackPayload } from "@/lib/schemas/feedback";
import { Transcript } from "@/lib/schemas/transcript";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTranscriptText(transcriptRaw: unknown): string {
  if (transcriptRaw === null || transcriptRaw === undefined) return "";
  const parsed = Transcript.safeParse(transcriptRaw);
  if (!parsed.success) return "";
  return parsed.data.segments.map((s) => s.text).join(" ").trim();
}

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export const gradeQuestion = task({
  id: "gradeQuestion",
  maxDuration: 60 * 15,
  run: async (payload: { questionId: string }) => {
    const { questionId } = payload;
    const setStage = makeThrottledStage();

    setStage({ stage: "grading", pct: 0, message: "Fetching question…" });

    // 1. Fetch Question with extracted + transcript fields
    const question = await prisma.question.findUniqueOrThrow({
      where: { id: questionId },
    });

    await prisma.question.update({
      where: { id: questionId },
      data: { status: "grading" },
    });

    // 2. Parse extracted field
    const extractedResult = ExtractedQuestion.safeParse(question.extracted);
    const isIncomplete = !extractedResult.success;

    // Derive safe values to use in grading prompt (fall back to nulls if incomplete)
    const extractedData = extractedResult.success
      ? extractedResult.data
      : {
          question: "(Question could not be extracted from recording)",
          choices: [],
          userAnswer: null,
          correctAnswer: null,
          beckerExplanation: null,
          section: null,
        };

    // 3. Build transcript text
    const transcriptText = buildTranscriptText(question.transcript);

    // 4. Build grading prompt
    const gradingPrompt = buildGradingUserPrompt({
      question: extractedData.question,
      choices: extractedData.choices,
      userAnswer: extractedData.userAnswer,
      correctAnswer: extractedData.correctAnswer,
      beckerExplanation: extractedData.beckerExplanation,
      transcript: transcriptText,
    });

    setStage({ stage: "grading", pct: 20, message: "Calling Claude for grading…" });

    // 5. Call Claude
    let raw: string;
    try {
      raw = await callClaude(gradingPrompt, { systemPrompt: GRADING_SYSTEM_PROMPT });
    } catch (err) {
      logger.warn("callClaude failed in gradeQuestion", { questionId, err: String(err) });
      raw = "";
    }

    setStage({ stage: "grading", pct: 70, message: "Parsing grading response…" });

    // 6. Parse JSON
    let feedbackParsed: ReturnType<typeof FeedbackPayload.safeParse>;
    let rawJson: unknown = null;

    if (raw.length > 0) {
      try {
        rawJson = extractJsonFromResponse(raw);
      } catch (err) {
        logger.warn("extractJsonFromResponse failed in gradeQuestion", {
          questionId,
          raw: raw.slice(0, 300),
          err: String(err),
        });
      }
    }

    feedbackParsed = FeedbackPayload.safeParse(rawJson);

    setStage({ stage: "grading", pct: 80, message: "Persisting feedback…" });

    if (feedbackParsed.success) {
      // 7. Upsert Feedback row
      const feedbackData = feedbackParsed.data;

      // If extraction was incomplete, annotate items with precision
      const items = isIncomplete
        ? feedbackData.items.map((item) => ({ ...item, precision: "provisional" }))
        : feedbackData.items;

      await prisma.feedback.upsert({
        where: { questionId },
        create: {
          questionId,
          items,
          accountingScore: feedbackData.accountingScore,
          consultingScore: feedbackData.consultingScore,
          combinedScore: feedbackData.combinedScore,
          whatYouNeedToLearn: feedbackData.whatYouNeedToLearn,
          weakTopicTags: feedbackData.weakTopicTags,
        },
        update: {
          items,
          accountingScore: feedbackData.accountingScore,
          consultingScore: feedbackData.consultingScore,
          combinedScore: feedbackData.combinedScore,
          whatYouNeedToLearn: feedbackData.whatYouNeedToLearn,
          weakTopicTags: feedbackData.weakTopicTags,
        },
      });

      logger.log("gradeQuestion succeeded", {
        questionId,
        combinedScore: feedbackData.combinedScore,
        isIncomplete,
      });
    } else {
      // 8. Parse failed — upsert stub Feedback
      logger.warn("gradeQuestion: FeedbackPayload parse failed, upserting stub", {
        questionId,
        parseError: !feedbackParsed.success ? feedbackParsed.error?.message : "unknown",
      });

      await prisma.feedback.upsert({
        where: { questionId },
        create: {
          questionId,
          items: [],
          accountingScore: 5,
          consultingScore: 5,
          combinedScore: 5,
          whatYouNeedToLearn: "Grading failed — retry after fixing extraction",
          weakTopicTags: [],
        },
        update: {
          items: [],
          accountingScore: 5,
          consultingScore: 5,
          combinedScore: 5,
          whatYouNeedToLearn: "Grading failed — retry after fixing extraction",
          weakTopicTags: [],
        },
      });
    }

    // 9. Update Question.status → "done"
    await prisma.question.update({
      where: { id: questionId },
      data: { status: "done" },
    });

    setStage({ stage: "grading", pct: 100, message: "Grading complete" });

    return { questionId, ok: true };
  },
});
