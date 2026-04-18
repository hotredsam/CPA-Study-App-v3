import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const canReachDb = !!process.env.DATABASE_URL;

// Route handlers — import after env check so module load doesn't throw
let gradeRoute: typeof import("../../src/app/api/review/[questionId]/grade/route");
let nextRoute: typeof import("../../src/app/api/review/next/route");

let testRecordingId: string;
let testQuestionId: string;

describe.skipIf(!canReachDb)("review API routes", () => {
  beforeAll(async () => {
    // Lazily import route handlers (they import from @/lib/prisma which needs DB)
    [gradeRoute, nextRoute] = await Promise.all([
      import("../../src/app/api/review/[questionId]/grade/route"),
      import("../../src/app/api/review/next/route"),
    ]);

    // Seed minimal test data
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
      },
    });
    testQuestionId = q.id;
  });

  afterAll(async () => {
    // Clean up seeded data
    await prisma.recording.delete({ where: { id: testRecordingId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("POST /api/review/[questionId]/grade — creates ReviewState on first grade", async () => {
    const req = new NextRequest(
      `http://localhost/api/review/${testQuestionId}/grade`,
      {
        method: "POST",
        body: JSON.stringify({ quality: 5 }),
        headers: { "content-type": "application/json" },
      },
    );

    const res = await gradeRoute.POST(req, {
      params: Promise.resolve({ questionId: testQuestionId }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.questionId).toBe(testQuestionId);
    expect(body.quality).toBe(5);
    expect(body.repetitions).toBe(1);
    expect(body.interval).toBe(1);
    expect(body.efactor).toBeCloseTo(2.6, 1);
    expect(body.nextReviewAt).toBeTruthy();
  });

  it("POST /api/review/[questionId]/grade — second grade updates ReviewState", async () => {
    const req = new NextRequest(
      `http://localhost/api/review/${testQuestionId}/grade`,
      {
        method: "POST",
        body: JSON.stringify({ quality: 4 }),
        headers: { "content-type": "application/json" },
      },
    );

    const res = await gradeRoute.POST(req, {
      params: Promise.resolve({ questionId: testQuestionId }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.repetitions).toBe(2);
    expect(body.interval).toBe(6); // second repetition → 6 days
  });

  it("POST /api/review/[questionId]/grade — 400 on invalid quality", async () => {
    const req = new NextRequest(
      `http://localhost/api/review/${testQuestionId}/grade`,
      {
        method: "POST",
        body: JSON.stringify({ quality: 7 }), // invalid
        headers: { "content-type": "application/json" },
      },
    );

    const res = await gradeRoute.POST(req, {
      params: Promise.resolve({ questionId: testQuestionId }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/review/[questionId]/grade — 404 for unknown question", async () => {
    const req = new NextRequest(
      "http://localhost/api/review/nonexistent-id/grade",
      {
        method: "POST",
        body: JSON.stringify({ quality: 5 }),
        headers: { "content-type": "application/json" },
      },
    );

    const res = await gradeRoute.POST(req, {
      params: Promise.resolve({ questionId: "nonexistent-id" }),
    });
    expect(res.status).toBe(404);
  });

  it("GET /api/review/next — returns items list", async () => {
    const req = new NextRequest("http://localhost/api/review/next");
    const res = await nextRoute.GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.totalDue).toBe("number");
    expect(typeof body.totalNew).toBe("number");
  });

  it("GET /api/review/next — respects n query param", async () => {
    const req = new NextRequest("http://localhost/api/review/next?n=1");
    const res = await nextRoute.GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.length).toBeLessThanOrEqual(1);
  });

  it("GET /api/review/next — 400 on invalid n", async () => {
    const req = new NextRequest("http://localhost/api/review/next?n=abc");
    const res = await nextRoute.GET(req);
    expect(res.status).toBe(400);
  });
});
