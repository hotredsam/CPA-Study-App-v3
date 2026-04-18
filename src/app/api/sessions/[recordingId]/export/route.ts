import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { ExtractedQuestion } from "@/lib/schemas/extracted";

export const dynamic = "force-dynamic";

function stableGuid(questionId: string): string {
  return createHash("md5").update(`cpa-anki-${questionId}`).digest("hex").slice(0, 16);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildFront(extracted: ReturnType<typeof ExtractedQuestion.safeParse>): string {
  if (!extracted.success) return "<p><em>Question text unavailable</em></p>";
  const d = extracted.data;
  const choicesHtml = d.choices
    .map((c) => `<div class="choice">${escapeHtml(c.label)}. ${escapeHtml(c.text)}</div>`)
    .join("");
  return `<div class="question">${escapeHtml(d.question)}</div>${choicesHtml}`;
}

function buildBack(
  extracted: ReturnType<typeof ExtractedQuestion.safeParse>,
  items: unknown[],
): string {
  const answerHtml = (() => {
    if (!extracted.success) return "";
    const d = extracted.data;
    const ans = d.correctAnswer
      ? `<p class="correct">✓ Correct answer: ${escapeHtml(d.correctAnswer)}</p>`
      : "";
    const exp = d.beckerExplanation
      ? `<p>${escapeHtml(d.beckerExplanation)}</p>`
      : "";
    return ans + exp;
  })();

  // Top 3 lowest-scoring feedback items
  const feedbackItems = Array.isArray(items)
    ? [...items]
        .filter(
          (it): it is { key: string; score: number; comment?: string } =>
            typeof it === "object" &&
            it !== null &&
            typeof (it as Record<string, unknown>).score === "number",
        )
        .sort((a, b) => a.score - b.score)
        .slice(0, 3)
    : [];

  const feedbackHtml =
    feedbackItems.length > 0
      ? `<div class="feedback">` +
        feedbackItems
          .map(
            (it) =>
              `<div class="feedback-item"><span class="score">${it.score}/10</span> ${escapeHtml(it.key)}${it.comment ? `: ${escapeHtml(it.comment)}` : ""}</div>`,
          )
          .join("") +
        `</div>`
      : "";

  return answerHtml + feedbackHtml;
}

async function callPython(cards: unknown[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const scriptPath = join(process.cwd(), "scripts", "generate-apkg.py");
    const child = spawn("python", [scriptPath], { stdio: ["pipe", "pipe", "pipe"] });

    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];

    child.stdout.on("data", (d: Buffer) => chunks.push(d));
    child.stderr.on("data", (d: Buffer) => errChunks.push(d));

    child.on("close", (code) => {
      if (code !== 0) {
        const stderr = Buffer.concat(errChunks).toString();
        reject(new Error(`generate-apkg.py exited ${code}: ${stderr}`));
      } else {
        resolve(Buffer.concat(chunks));
      }
    });

    child.on("error", reject);

    child.stdin.write(JSON.stringify(cards));
    child.stdin.end();
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ recordingId: string }> },
) {
  const { recordingId } = await params;

  const recording = await prisma.recording.findUnique({
    where: { id: recordingId },
    include: {
      questions: {
        include: { feedback: true },
        orderBy: { startSec: "asc" },
      },
    },
  });

  if (!recording) {
    return NextResponse.json({ error: "recording not found" }, { status: 404 });
  }

  const cards = recording.questions
    .filter((q) => q.status === "done" && q.extracted)
    .map((q) => {
      const extracted = ExtractedQuestion.safeParse(q.extracted);
      const rawItems = q.feedback?.items;
      const items: unknown[] = Array.isArray(rawItems) ? rawItems : [];
      return {
        guid: stableGuid(q.id),
        front: buildFront(extracted),
        back: buildBack(extracted, items),
      };
    });

  if (cards.length === 0) {
    return NextResponse.json(
      { error: "no graded questions in this recording" },
      { status: 422 },
    );
  }

  let apkgBuffer: Buffer;
  try {
    apkgBuffer = await callPython(cards);
  } catch (err) {
    console.error("generate-apkg.py failed:", err);
    return NextResponse.json(
      { error: "apkg generation failed — ensure Python + genanki are installed" },
      { status: 500 },
    );
  }

  const filename = `cpa-${recordingId.slice(0, 8)}.apkg`;
  return new Response(new Uint8Array(apkgBuffer), {
    status: 200,
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${filename}"`,
      "content-length": String(apkgBuffer.length),
    },
  });
}
