import { logger, task } from "@trigger.dev/sdk/v3";
import { AiFunctionKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { makeThrottledStage } from "./progress";
import { extractJsonFromResponse } from "@/lib/claude-cli";
import { runFunction } from "@/lib/llm/router";
import { EXTRACTION_SYSTEM_PROMPT } from "@/lib/prompts/extraction";
import { ExtractedQuestion, ExtractedQuestionIncomplete } from "@/lib/schemas/extracted";
import { Transcript } from "@/lib/schemas/transcript";

// ---------------------------------------------------------------------------
// Build text-only extraction prompt
// ---------------------------------------------------------------------------

function buildTextExtractionPrompt(args: {
  questionId: string;
  startSec: number;
  endSec: number;
  transcriptText: string;
}): string {
  const { questionId, startSec, endSec, transcriptText } = args;
  const lines: string[] = [
    `This is a Becker CPA practice question session recording.`,
    ``,
    `Clip ID: ${questionId}`,
    `Clip timing: ${startSec.toFixed(1)}s – ${endSec.toFixed(1)}s`,
    ``,
  ];

  if (transcriptText.trim().length > 0) {
    lines.push(
      `Transcript from this segment (${startSec.toFixed(1)}s – ${endSec.toFixed(1)}s):`,
      transcriptText.trim(),
      ``,
    );
  } else {
    lines.push(
      `No transcript is available for this segment yet.`,
      ``,
    );
  }

  lines.push(
    `Based on the timing context and any available transcript text, extract the CPA practice question.`,
    `Return the JSON object as specified in the system instructions.`,
    `Note: Because no screenshots are available, set fields to null where the information cannot be determined from the transcript alone.`,
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export const extractQuestion = task({
  id: "extractQuestion",
  maxDuration: 60 * 15,
  run: async (payload: { questionId: string }) => {
    const { questionId } = payload;
    let setStage = makeThrottledStage();

    setStage({ stage: "extracting", pct: 0, message: "Fetching question…" });

    // 1. Fetch Question
    const question = await prisma.question.findUniqueOrThrow({
      where: { id: questionId },
      include: { recording: true },
    });
    setStage = makeThrottledStage(question.recordingId);

    await prisma.question.update({
      where: { id: questionId },
      data: { status: "extracting" },
    });

    setStage({ stage: "extracting", pct: 10, message: "Building prompt…" });

    // 2. Fetch any available transcript from this question (may be null at this stage)
    let transcriptText = "";
    if (question.transcript !== null) {
      const transcriptParsed = Transcript.safeParse(question.transcript);
      if (transcriptParsed.success) {
        transcriptText = transcriptParsed.data.segments
          .filter((s) => s.start >= question.startSec && s.end <= question.endSec)
          .map((s) => s.text)
          .join(" ");
        if (transcriptText.trim().length === 0) {
          // Fall back to all segments if none match the time range
          transcriptText = transcriptParsed.data.segments.map((s) => s.text).join(" ");
        }
      }
    }

    // 3. Build text-only prompt
    const prompt = buildTextExtractionPrompt({
      questionId,
      startSec: question.startSec,
      endSec: question.endSec,
      transcriptText,
    });

    setStage({ stage: "extracting", pct: 20, message: "Calling Claude…" });

    setStage({ stage: "extracting", pct: 20, message: "Calling OpenRouter..." });

    // 4. Call the configured extraction model through OpenRouter/router.
    let rawJson: unknown;
    try {
      const result = await runFunction(
        AiFunctionKey.PIPELINE_EXTRACT,
        { prompt, systemPrompt: EXTRACTION_SYSTEM_PROMPT },
        { bypassBatch: true },
      );
      rawJson = result.output;
    } catch (err) {
      logger.warn("OpenRouter extraction failed", { questionId, err: String(err) });
      const stubExtracted = {
        incomplete: true as const,
        reason: `Extraction model call failed: ${String(err).slice(0, 200)}`,
        _precision: "provisional",
      };
      await prisma.question.update({
        where: { id: questionId },
        data: {
          extracted: stubExtracted,
          status: "incomplete",
        },
      });
      setStage({ stage: "extracting", pct: 100, message: "Extraction incomplete (model error)" });
      return { questionId, ok: true };
    }

    setStage({ stage: "extracting", pct: 70, message: "Parsing response…" });

    // 5. Parse JSON from model response
    let parsed: ReturnType<typeof ExtractedQuestion.safeParse>;

    if (typeof rawJson === "string") {
      const rawText = rawJson;
      try {
        rawJson = extractJsonFromResponse(rawText);
      } catch (err) {
        logger.warn("extractJsonFromResponse failed", { questionId, raw: rawText.slice(0, 300), err: String(err) });
        rawJson = null;
      }
    }

    if (rawJson !== null) {
      parsed = ExtractedQuestion.safeParse(rawJson);
    } else {
      // rawJson extraction failed — treat as a failed parse
      parsed = ExtractedQuestion.safeParse(null);
    }

    setStage({ stage: "extracting", pct: 85, message: "Persisting result…" });

    if (parsed.success) {
      // 6a. Parse succeeded — persist with _precision marker
      const extracted = {
        ...parsed.data,
        _precision: "provisional",
      };

      await prisma.question.update({
        where: { id: questionId },
        data: {
          extracted,
          status: "done",
          section: parsed.data.section ?? undefined,
        },
      });

      logger.log("extractQuestion succeeded", { questionId, section: parsed.data.section });
    } else {
      // 6b. Parse failed — check if Claude returned an incomplete marker
      const incompleteParsed = ExtractedQuestionIncomplete.safeParse(rawJson);
      const reason = incompleteParsed.success
        ? incompleteParsed.data.reason
        : `JSON parse failed: ${String(!parsed.success && parsed.error)}`;

      const stubExtracted = {
        incomplete: true as const,
        reason,
        _precision: "provisional",
      };

      await prisma.question.update({
        where: { id: questionId },
        data: {
          extracted: stubExtracted,
          status: "incomplete",
        },
      });

      logger.warn("extractQuestion incomplete", { questionId, reason });
    }

    setStage({ stage: "extracting", pct: 100, message: "Extraction complete" });
    return { questionId, ok: true };
  },
});
