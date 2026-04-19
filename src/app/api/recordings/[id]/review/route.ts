import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const recording = await prisma.recording.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            feedback: true,
            topic: true,
          },
          orderBy: { startSec: "asc" },
        },
      },
    });

    if (!recording) {
      throw new ApiError("NOT_FOUND", `Recording ${id} not found`);
    }

    return NextResponse.json({ recording });
  } catch (err) {
    return respond(err);
  }
}
