import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const canReachDb = !!process.env.DATABASE_URL;

let exportRoute: typeof import("../../src/app/api/sessions/[recordingId]/export/route");
let testRecordingId: string;
let testQuestionId: string;

describe.skipIf(!canReachDb)("Anki export route", () => {
  beforeAll(async () => {
    exportRoute = await import(
      "../../src/app/api/sessions/[recordingId]/export/route"
    );

    const rec = await prisma.recording.create({
      data: { status: "done", durationSec: 120 },
    });
    testRecordingId = rec.id;

    const q = await prisma.question.create({
      data: {
        recordingId: rec.id,
        startSec: 0,
        endSec: 60,
        status: "done",
        extracted: {
          question: "Which of the following is an asset?",
          choices: [
            { label: "A", text: "Cash" },
            { label: "B", text: "Accounts Payable" },
            { label: "C", text: "Revenue" },
            { label: "D", text: "Expense" },
          ],
          userAnswer: "A",
          correctAnswer: "A",
          beckerExplanation: "Cash is a current asset.",
          section: "FAR",
        },
      },
    });
    testQuestionId = q.id;

    // Add feedback so the card has a back
    await prisma.feedback.create({
      data: {
        questionId: testQuestionId,
        items: [
          { key: "knowledgeAccuracy", score: 8, comment: "Correct identification" },
          { key: "reasoningChain", score: 7, comment: "Good reasoning" },
        ],
        accountingScore: 8,
        consultingScore: 7,
        combinedScore: 7.5,
        weakTopicTags: ["balance sheet"],
      },
    });
  });

  afterAll(async () => {
    await prisma.recording.delete({ where: { id: testRecordingId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("returns 404 for unknown recording", async () => {
    const req = new NextRequest("http://localhost/api/sessions/nonexistent/export");
    const res = await exportRoute.GET(req, {
      params: Promise.resolve({ recordingId: "nonexistent" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns a valid .apkg (ZIP magic bytes + collection.anki2 entry)", async () => {
    const req = new NextRequest(
      `http://localhost/api/sessions/${testRecordingId}/export`,
    );
    const res = await exportRoute.GET(req, {
      params: Promise.resolve({ recordingId: testRecordingId }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/octet-stream");
    expect(res.headers.get("content-disposition")).toMatch(/\.apkg/);

    const buf = Buffer.from(await res.arrayBuffer());

    // ZIP magic bytes: PK\x03\x04
    expect(buf[0]).toBe(0x50); // P
    expect(buf[1]).toBe(0x4b); // K
    expect(buf[2]).toBe(0x03);
    expect(buf[3]).toBe(0x04);

    // The .apkg ZIP must contain "collection.anki2"
    const content = buf.toString("latin1");
    expect(content).toContain("collection.anki2");
  });

  it("returns 422 for a recording with no graded questions", async () => {
    const emptyRec = await prisma.recording.create({
      data: { status: "done" },
    });
    try {
      const req = new NextRequest(
        `http://localhost/api/sessions/${emptyRec.id}/export`,
      );
      const res = await exportRoute.GET(req, {
        params: Promise.resolve({ recordingId: emptyRec.id }),
      });
      expect(res.status).toBe(422);
    } finally {
      await prisma.recording.delete({ where: { id: emptyRec.id } }).catch(() => {});
    }
  });
});
