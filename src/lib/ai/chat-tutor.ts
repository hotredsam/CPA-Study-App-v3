import { z } from "zod";
import { AiFunctionKey, ConversationScope } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { runFunction } from "@/lib/llm/router";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const ChatTutorInput = z.object({
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

export const ChatTutorOutput = z.object({
  reply: z.string(),
  conversationId: z.string(),
});

export type ChatTutorInput = z.infer<typeof ChatTutorInput>;
export type ChatTutorOutput = z.infer<typeof ChatTutorOutput>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveScope(
  context: ChatTutorInput["context"],
): { scope: ConversationScope; scopeId: string } {
  if (context?.questionId) {
    return { scope: ConversationScope.REVIEW, scopeId: context.questionId };
  }
  if (context?.topicId) {
    return { scope: ConversationScope.STUDY, scopeId: context.topicId };
  }
  if (context?.recordingId) {
    return { scope: ConversationScope.REVIEW, scopeId: context.recordingId };
  }
  return { scope: ConversationScope.ANKI, scopeId: "general" };
}

async function buildPrompt(input: ChatTutorInput): Promise<string> {
  const parts: string[] = [
    "You are a CPA exam tutor. Answer clearly and concisely. Reference specific rules, citations, or examples where relevant.",
    "",
  ];

  // Add context: question transcript + extracted data
  if (input.context?.questionId) {
    const question = await prisma.question.findUnique({
      where: { id: input.context.questionId },
    });
    if (question) {
      if (question.transcript) {
        parts.push(`Question Transcript: ${JSON.stringify(question.transcript)}`);
        parts.push("");
      }
      if (question.extracted) {
        parts.push(`Extracted Question Data: ${JSON.stringify(question.extracted)}`);
        parts.push("");
      }
    }
  }

  // Add context: topic AI notes
  if (input.context?.topicId) {
    const topic = await prisma.topic.findUnique({
      where: { id: input.context.topicId },
    });
    if (topic?.aiNotes) {
      parts.push(`Topic AI Notes: ${JSON.stringify(topic.aiNotes)}`);
      parts.push("");
    }
  }

  // Add conversation history (last 10 messages)
  if (input.conversationId) {
    const history = await prisma.chatMessage.findMany({
      where: { conversationId: input.conversationId },
      orderBy: { createdAt: "asc" },
      take: 10,
    });
    if (history.length > 0) {
      parts.push("Conversation History:");
      for (const msg of history) {
        parts.push(`${msg.role}: ${msg.content}`);
      }
      parts.push("");
    }
  }

  parts.push(`User: ${input.message}`);

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Entry function
// ---------------------------------------------------------------------------

export async function runChatTutor(input: ChatTutorInput): Promise<ChatTutorOutput> {
  const validated = ChatTutorInput.parse(input);

  // Resolve or create conversation
  let conversationId = validated.conversationId;
  if (!conversationId) {
    const { scope, scopeId } = resolveScope(validated.context);
    const conversation = await prisma.conversation.create({
      data: { scope, scopeId },
    });
    conversationId = conversation.id;
  }

  const prompt = await buildPrompt({ ...validated, conversationId });

  const result = await runFunction(AiFunctionKey.CHAT_TUTOR, {
    prompt,
    conversationId,
  });

  const reply = typeof result.output === "string"
    ? result.output
    : JSON.stringify(result.output);

  // Store user message and AI reply
  await prisma.chatMessage.create({
    data: {
      conversationId,
      role: "USER",
      content: validated.message,
      contextRefs: validated.context ?? undefined,
    },
  });

  await prisma.chatMessage.create({
    data: {
      conversationId,
      role: "ASSISTANT",
      content: reply,
    },
  });

  return ChatTutorOutput.parse({ reply, conversationId });
}
