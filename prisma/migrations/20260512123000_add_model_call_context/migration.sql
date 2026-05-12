ALTER TABLE "ModelCall" ADD COLUMN "estimatedUsd" DOUBLE PRECISION;
ALTER TABLE "ModelCall" ADD COLUMN "recordingId" TEXT;
ALTER TABLE "ModelCall" ADD COLUMN "questionId" TEXT;
ALTER TABLE "ModelCall" ADD COLUMN "topicId" TEXT;
ALTER TABLE "ModelCall" ADD COLUMN "chunkId" TEXT;

CREATE INDEX "ModelCall_recordingId_createdAt_idx" ON "ModelCall"("recordingId", "createdAt");
CREATE INDEX "ModelCall_questionId_createdAt_idx" ON "ModelCall"("questionId", "createdAt");
CREATE INDEX "ModelCall_topicId_createdAt_idx" ON "ModelCall"("topicId", "createdAt");
CREATE INDEX "ModelCall_chunkId_createdAt_idx" ON "ModelCall"("chunkId", "createdAt");
