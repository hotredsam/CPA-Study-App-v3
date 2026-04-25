import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, respond } from "@/lib/api-error";
import { runVoiceNote } from "@/lib/ai/voice-note";
import { r2Client, bucket } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
) {
  try {
    const { cardId } = await params;

    const card = await prisma.ankiCard.findUnique({ where: { id: cardId } });
    if (!card) {
      throw new ApiError("NOT_FOUND", `AnkiCard not found: ${cardId}`);
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof Blob)) {
      throw new ApiError("BAD_REQUEST", "audio field is required (multipart form data)");
    }

    const mimeType = audioFile.type || "audio/webm";
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const timestamp = Date.now();
    const r2Key = `voice-notes/${cardId}/${timestamp}.${ext}`;

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Save to R2
    const client = r2Client();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: r2Key,
        Body: audioBuffer,
        ContentType: mimeType,
      }),
    );

    // Transcribe with local whisper
    const { transcript } = await runVoiceNote({
      audioData: audioBuffer,
      mimeType,
    });

    // Update AnkiCard.voiceNoteR2Key
    await prisma.ankiCard.update({
      where: { id: cardId },
      data: { voiceNoteR2Key: r2Key },
    });

    await prisma.ankiNote.create({
      data: {
        cardId,
        content: transcript || "(voice note had no detected speech)",
        isVoice: true,
        r2Key,
      },
    });

    return NextResponse.json({ transcript, r2Key });
  } catch (err) {
    return respond(err);
  }
}
