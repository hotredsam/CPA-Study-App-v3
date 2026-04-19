import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { respond, ApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/batch/status?id=<jobId>
 * Returns the status of a batch job.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      throw new ApiError("BAD_REQUEST", "Missing required query parameter: id");
    }

    const job = await prisma.batchJob.findUnique({ where: { id } });

    if (!job) {
      throw new ApiError("NOT_FOUND", `BatchJob not found: ${id}`);
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      functionKey: job.functionKey,
      expectedCompletionAt: job.coalesceWindowEnd,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  } catch (err) {
    return respond(err);
  }
}
