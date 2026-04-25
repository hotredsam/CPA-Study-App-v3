import { logger, task } from "@trigger.dev/sdk/v3";
import { AiFunctionKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { makeThrottledStage } from "./progress";
import { extractJsonFromResponse } from "@/lib/claude-cli";
import { runFunction } from "@/lib/llm/router";
import { GRADING_SYSTEM_PROMPT, buildGradingUserPrompt } from "@/lib/prompts/grading";
import { ExtractedQuestion } from "@/lib/schemas/extracted";
import { FeedbackPayload } from "@/lib/schemas/feedback";
import { Transcript } from "@/lib/schemas/transcript";
import { retrieveTextbookChunksForQuestion } from "@/lib/textbooks/retrieval";

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
    let setStage = makeThrottledStage();

    setStage({ stage: "grading", pct: 0, message: "Fetching question…" });

    // 1. Fetch Question with extracted + transcript fields
    const question = await prisma.question.findUniqueOrThrow({
      where: { id: questionId },
    });
    setStage = makeThrottledStage(question.recordingId);

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

    // 4. Pull matching textbook chunks, then build grading prompt.
    const textbookContext = extractedResult.success
      ? await retrieveTextbookChunksForQuestion({
          question: extractedData.question,
          choices: extractedData.choices,
          beckerExplanation: extractedData.beckerExplanation,
          section: extractedData.section,
        })
      : [];

    const gradingPrompt = buildGradingUserPrompt({
      question: extractedData.question,
      choices: extractedData.choices,
      userAnswer: extractedData.userAnswer,
      correctAnswer: extractedData.correctAnswer,
      beckerExplanation: extractedData.beckerExplanation,
      transcript: transcriptText,
      textbookContext: textbookContext.map((chunk) => ({
        citation: chunk.citation,
        content: chunk.content,
      })),
    });

    setStage({ stage: "grading", pct: 20, message: "Calling Claude for grading…" });

    setStage({ stage: "grading", pct: 20, message: "Calling OpenRouter for grading..." });

    // 5. Call the configured grading model through OpenRouter/router.
    let rawJson: unknown = null;
    try {
      const result = await runFunction(
        AiFunctionKey.PIPELINE_GRADE,
        { prompt: gradingPrompt, systemPrompt: GRADING_SYSTEM_PROMPT },
        { bypassBatch: true },
      );
      rawJson = result.output;
    } catch (err) {
      logger.warn("OpenRouter grading failed", { questionId, err: String(err) });
      await prisma.question.update({
        where: { id: questionId },
        data: { status: "failed" },
      });
      throw err;
    }

    setStage({ stage: "grading", pct: 70, message: "Parsing grading response…" });

    // 6. Parse JSON
    if (typeof rawJson === "string") {
      const rawText = rawJson;
      try {
        rawJson = extractJsonFromResponse(rawText);
      } catch (err) {
        logger.warn("extractJsonFromResponse failed in gradeQuestion", {
          questionId,
          raw: rawText.slice(0, 300),
          err: String(err),
        });
        rawJson = null;
      }
    }

    const feedbackParsed = FeedbackPayload.safeParse(rawJson);

    setStage({ stage: "grading", pct: 80, message: "Persisting feedback…" });

    if (feedbackParsed.success) {
      // 7. Upsert Feedback row
      const feedbackData = feedbackParsed.data;

      // If extraction was incomplete, annotate items as provisional.
      const items = isIncomplete
        ? feedbackData.items.map((item) => ({ ...item, provisional: true }))
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
      logger.warn("gradeQuestion: FeedbackPayload parse failed", {
        questionId,
        parseError: feedbackParsed.error?.message,
      });

      const shouldRejectInvalidFeedback = feedbackParsed.success === false;
      if (shouldRejectInvalidFeedback) {
        await prisma.question.update({
          where: { id: questionId },
          data: { status: "failed" },
        });
        throw new Error(`Grading output failed schema validation for question ${questionId}`);
      }

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
