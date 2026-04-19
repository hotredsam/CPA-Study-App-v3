-- CreateEnum
CREATE TYPE "TextbookStatus" AS ENUM ('QUEUED', 'INDEXING', 'READY', 'NEEDS_UPDATE', 'FAILED');

-- CreateEnum
CREATE TYPE "AnkiCardType" AS ENUM ('CLOZE', 'QA', 'DEFINITION', 'FORMULA');

-- CreateEnum
CREATE TYPE "AnkiRating" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');

-- CreateEnum
CREATE TYPE "BatchJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "ConversationScope" AS ENUM ('REVIEW', 'ANKI', 'STUDY');

-- CreateEnum
CREATE TYPE "AiFunctionKey" AS ENUM ('PIPELINE_GRADE', 'PIPELINE_SEGMENT', 'PIPELINE_TRANSCRIBE', 'PIPELINE_EXTRACT', 'PIPELINE_TAG', 'TOPIC_EXTRACT', 'CHECKPOINT_QUIZ', 'ANKI_GEN', 'CHAT_TUTOR', 'VOICE_NOTE', 'TOPIC_NOTES');

-- AlterEnum
ALTER TYPE "QuestionStatus" ADD VALUE 'tagging';

-- AlterEnum
ALTER TYPE "StageName" ADD VALUE 'tagging';

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "taggedAt" TIMESTAMP(3),
ADD COLUMN     "tags" JSONB,
ADD COLUMN     "topicId" TEXT;

-- AlterTable
ALTER TABLE "Recording" ADD COLUMN     "modelUsed" TEXT,
ADD COLUMN     "sections" "CpaSection"[],
ADD COLUMN     "segmentsCount" INTEGER,
ADD COLUMN     "tagStage" JSONB,
ADD COLUMN     "title" TEXT;

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "section" "CpaSection" NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "mastery" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "errorRate" DOUBLE PRECISION,
    "cardsDue" INTEGER NOT NULL DEFAULT 0,
    "lastSeen" TIMESTAMP(3),
    "notes" TEXT,
    "aiNotes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Textbook" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT,
    "sections" "CpaSection"[],
    "pages" INTEGER,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "indexStatus" "TextbookStatus" NOT NULL DEFAULT 'QUEUED',
    "sizeBytes" BIGINT,
    "r2Key" TEXT,
    "citedCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "indexedAt" TIMESTAMP(3),

    CONSTRAINT "Textbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chunk" (
    "id" TEXT NOT NULL,
    "textbookId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "chapterRef" TEXT,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "topicId" TEXT,
    "fasbCitation" TEXT,
    "figures" JSONB,
    "embedding" JSONB,
    "embeddingPrec" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnkiCard" (
    "id" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "explanation" TEXT,
    "sourceCitation" TEXT,
    "section" "CpaSection",
    "topicId" TEXT,
    "chunkId" TEXT,
    "type" "AnkiCardType" NOT NULL DEFAULT 'QA',
    "difficulty" DOUBLE PRECISION,
    "srsState" JSONB NOT NULL DEFAULT '{"ease":2.5,"interval":0,"nextDue":null,"lapses":0,"repetitions":0}',
    "voiceNoteR2Key" TEXT,
    "mnemonic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnkiCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnkiReview" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "rating" "AnkiRating" NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "newInterval" INTEGER NOT NULL,
    "newEase" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AnkiReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnkiNote" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isVoice" BOOLEAN NOT NULL DEFAULT false,
    "r2Key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnkiNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyRoutine" (
    "id" TEXT NOT NULL,
    "xmlSource" TEXT NOT NULL,
    "parsedBlocks" JSONB,
    "examDates" JSONB,
    "hoursTarget" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "StudyRoutine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "monthlyCapUsd" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "warnThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "autoDegrade" BOOLEAN NOT NULL DEFAULT true,
    "hardStop" BOOLEAN NOT NULL DEFAULT false,
    "currentUsageUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentMonthStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rolloverEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CacheEntry" (
    "id" TEXT NOT NULL,
    "functionKey" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "embedding" JSONB,
    "output" JSONB NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "precision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CacheEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchJob" (
    "id" TEXT NOT NULL,
    "functionKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "BatchJobStatus" NOT NULL DEFAULT 'QUEUED',
    "coalesceWindowStart" TIMESTAMP(3),
    "coalesceWindowEnd" TIMESTAMP(3),
    "offPeakPreferred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "resultId" TEXT,

    CONSTRAINT "BatchJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "scope" "ConversationScope" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "contextRefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "theme" TEXT NOT NULL DEFAULT 'paper',
    "accentHue" INTEGER NOT NULL DEFAULT 18,
    "density" TEXT NOT NULL DEFAULT 'comfortable',
    "serifFamily" TEXT NOT NULL DEFAULT 'Instrument Serif',
    "activeModelConfig" JSONB,
    "openRouterKeyEnc" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelConfig" (
    "id" TEXT NOT NULL,
    "functionKey" "AiFunctionKey" NOT NULL,
    "model" TEXT NOT NULL,
    "batchEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cacheEnabled" BOOLEAN NOT NULL DEFAULT true,
    "interestLevel" TEXT,
    "downtimeTolerance" TEXT,
    "useOAuthFallback" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexingConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "indexDepth" INTEGER NOT NULL DEFAULT 3,
    "ocrMode" BOOLEAN NOT NULL DEFAULT true,
    "formulaExtraction" BOOLEAN NOT NULL DEFAULT true,
    "exampleDetection" BOOLEAN NOT NULL DEFAULT true,
    "crossRefLinking" BOOLEAN NOT NULL DEFAULT true,
    "glossaryBuild" BOOLEAN NOT NULL DEFAULT true,
    "figureCaptioning" BOOLEAN NOT NULL DEFAULT false,
    "sectionAutoTag" BOOLEAN NOT NULL DEFAULT true,
    "unitGrouping" BOOLEAN NOT NULL DEFAULT true,
    "ankiCardGen" BOOLEAN NOT NULL DEFAULT true,
    "embeddingModel" TEXT NOT NULL DEFAULT 'text-embedding-3-large',
    "chunkSize" INTEGER NOT NULL DEFAULT 512,
    "overlapWindow" INTEGER NOT NULL DEFAULT 64,
    "reindexOnUpdate" BOOLEAN NOT NULL DEFAULT false,
    "piiScrubbing" BOOLEAN NOT NULL DEFAULT true,
    "indexModel" TEXT NOT NULL DEFAULT 'anthropic/claude-haiku-4.5',
    "batchMode" BOOLEAN NOT NULL DEFAULT true,
    "offPeakTier" BOOLEAN NOT NULL DEFAULT false,
    "concurrency" INTEGER NOT NULL DEFAULT 8,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelCall" (
    "id" TEXT NOT NULL,
    "functionKey" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "usdCost" DOUBLE PRECISION,
    "cacheHit" BOOLEAN NOT NULL DEFAULT false,
    "batchJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Topic_section_idx" ON "Topic"("section");

-- CreateIndex
CREATE UNIQUE INDEX "Textbook_r2Key_key" ON "Textbook"("r2Key");

-- CreateIndex
CREATE INDEX "Textbook_indexStatus_idx" ON "Textbook"("indexStatus");

-- CreateIndex
CREATE INDEX "Chunk_textbookId_order_idx" ON "Chunk"("textbookId", "order");

-- CreateIndex
CREATE INDEX "Chunk_topicId_idx" ON "Chunk"("topicId");

-- CreateIndex
CREATE INDEX "AnkiCard_section_idx" ON "AnkiCard"("section");

-- CreateIndex
CREATE INDEX "AnkiCard_topicId_idx" ON "AnkiCard"("topicId");

-- CreateIndex
CREATE INDEX "AnkiReview_cardId_idx" ON "AnkiReview"("cardId");

-- CreateIndex
CREATE INDEX "AnkiNote_cardId_idx" ON "AnkiNote"("cardId");

-- CreateIndex
CREATE INDEX "CacheEntry_expiresAt_idx" ON "CacheEntry"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CacheEntry_functionKey_inputHash_key" ON "CacheEntry"("functionKey", "inputHash");

-- CreateIndex
CREATE INDEX "BatchJob_status_functionKey_idx" ON "BatchJob"("status", "functionKey");

-- CreateIndex
CREATE INDEX "BatchJob_coalesceWindowEnd_idx" ON "BatchJob"("coalesceWindowEnd");

-- CreateIndex
CREATE INDEX "Conversation_scope_scopeId_idx" ON "Conversation"("scope", "scopeId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_idx" ON "ChatMessage"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelConfig_functionKey_key" ON "ModelConfig"("functionKey");

-- CreateIndex
CREATE INDEX "ModelCall_functionKey_createdAt_idx" ON "ModelCall"("functionKey", "createdAt");

-- CreateIndex
CREATE INDEX "ModelCall_createdAt_idx" ON "ModelCall"("createdAt");

-- CreateIndex
CREATE INDEX "Question_topicId_idx" ON "Question"("topicId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_textbookId_fkey" FOREIGN KEY ("textbookId") REFERENCES "Textbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnkiCard" ADD CONSTRAINT "AnkiCard_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnkiReview" ADD CONSTRAINT "AnkiReview_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "AnkiCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnkiNote" ADD CONSTRAINT "AnkiNote_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "AnkiCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
