import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { respond } from "@/lib/api-error";
import { runChatTutor } from "@/lib/ai/chat-tutor";

export const dynamic = "force-dynamic";

const PostBodySchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1),
  context: z
    .object({
      recordingId: z.string().optional(),
      questionId: z.string().optional(),
      topicId: z.string().optional(),
    })
    .optional(),
});

// TODO(streaming): upgrade to SSE once OpenRouter streaming is confirmed
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = PostBodySchema.parse(body);

    const result = await runChatTutor(parsed);

    return NextResponse.json(result);
  } catch (err) {
    return respond(err);
  }
}
