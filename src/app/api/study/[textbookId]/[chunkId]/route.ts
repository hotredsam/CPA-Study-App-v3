import { NextResponse } from "next/server";
import { respond } from "@/lib/api-error";
import { readStudyChunkData } from "@/lib/study-data";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ textbookId: string; chunkId: string }> },
): Promise<NextResponse> {
  try {
    const { textbookId, chunkId } = await params;
    return NextResponse.json(await readStudyChunkData(textbookId, chunkId));
  } catch (err) {
    return respond(err);
  }
}
