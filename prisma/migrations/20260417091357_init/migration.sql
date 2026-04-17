-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('uploading', 'uploaded', 'segmenting', 'processing_questions', 'done', 'failed');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('pending', 'extracting', 'transcribing', 'grading', 'done', 'incomplete', 'failed');

-- CreateEnum
CREATE TYPE "CpaSection" AS ENUM ('AUD', 'BEC', 'FAR', 'REG');

-- CreateEnum
CREATE TYPE "StageName" AS ENUM ('uploading', 'segmenting', 'extracting', 'transcribing', 'grading');

-- CreateTable
CREATE TABLE "Recording" (
    "id" TEXT NOT NULL,
    "status" "RecordingStatus" NOT NULL DEFAULT 'uploading',
    "r2Key" TEXT NOT NULL,
    "durationSec" DOUBLE PRECISION,
    "triggerRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "clipR2Key" TEXT,
    "thumbnailR2Key" TEXT,
    "startSec" DOUBLE PRECISION NOT NULL,
    "endSec" DOUBLE PRECISION NOT NULL,
    "section" "CpaSection",
    "transcript" JSONB,
    "extracted" JSONB,
    "status" "QuestionStatus" NOT NULL DEFAULT 'pending',
    "noAudio" BOOLEAN NOT NULL DEFAULT false,
    "segmentationSignals" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "accountingScore" DOUBLE PRECISION NOT NULL,
    "consultingScore" DOUBLE PRECISION,
    "combinedScore" DOUBLE PRECISION NOT NULL,
    "whatYouNeedToLearn" TEXT,
    "weakTopicTags" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageProgress" (
    "id" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "stage" "StageName" NOT NULL,
    "pct" DOUBLE PRECISION NOT NULL,
    "etaSec" INTEGER,
    "message" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Recording_r2Key_key" ON "Recording"("r2Key");

-- CreateIndex
CREATE INDEX "Question_recordingId_idx" ON "Question"("recordingId");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_questionId_key" ON "Feedback"("questionId");

-- CreateIndex
CREATE INDEX "StageProgress_recordingId_updatedAt_idx" ON "StageProgress"("recordingId", "updatedAt");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageProgress" ADD CONSTRAINT "StageProgress_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording"("id") ON DELETE CASCADE ON UPDATE CASCADE;
