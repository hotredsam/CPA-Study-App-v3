import { NextResponse } from "next/server";
import { DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { ApiError, respond } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** Delete all R2 objects under a prefix. */
async function deleteR2Prefix(prefix: string): Promise<void> {
  const { r2Client, bucket } = await import("@/lib/r2");
  const client = r2Client();
  const bkt = bucket();
  let token: string | undefined;

  do {
    const list = await client.send(new ListObjectsV2Command({
      Bucket: bkt,
      Prefix: prefix,
      ContinuationToken: token,
    }));

    const keys = (list.Contents ?? []).map((o) => o.Key).filter(Boolean) as string[];
    await Promise.all(
      keys.map((k) => client.send(new DeleteObjectCommand({ Bucket: bkt, Key: k })))
    );

    token = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (token);
}

async function deleteR2Object(key: string): Promise<void> {
  const { r2Client, bucket } = await import("@/lib/r2");
  await r2Client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = await params;

    const recording = await prisma.recording.findUnique({ where: { id } });
    if (!recording) {
      throw new ApiError("NOT_FOUND", `Recording ${id} not found`);
    }

    // 1. Delete all questions (and their R2 clips) via DB cascade
    const questions = await prisma.question.findMany({
      where: { recordingId: id },
      select: { id: true },
    });

    // 2. Clean up R2: delete raw recording + all clip objects
    const r2Deletes: Promise<void>[] = [];
    if (recording.r2Key) {
      r2Deletes.push(deleteR2Object(recording.r2Key).catch(() => undefined));
    }
    for (const q of questions) {
      r2Deletes.push(deleteR2Prefix(`clips/${q.id}/`).catch(() => undefined));
    }
    await Promise.all(r2Deletes);

    // 3. Delete DB rows (cascade handles questions → feedback, stageProgress)
    await prisma.recording.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return respond(err);
  }
}
