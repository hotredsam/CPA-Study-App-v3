---
name: prisma-schema-steward
description: Locked Prisma schema shape, enum conventions, additive-only migration rules, and the Feedback JSON contract. Use whenever anything under prisma/ changes or cpa-grading's Feedback schema is modified.
---

# Prisma Schema Steward

The schema is the durable contract between tasks. Additive-only migrations in Phase 1. No destructive ops without an explicit `<item kind="schema-destructive">` from Sam.

## Locked shape (Task 1 writes, subsequent tasks extend)

```prisma
// prisma/schema.prisma
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }
generator client { provider = "prisma-client-js" }

enum RecordingStatus {
  uploading
  uploaded
  segmenting
  processing_questions
  done
  failed
}

enum QuestionStatus {
  pending
  extracting
  transcribing
  grading
  done
  incomplete
  failed
}

enum CpaSection {
  AUD
  BEC
  FAR
  REG
}

enum StageName {
  uploading
  segmenting
  extracting
  transcribing
  grading
}

model Recording {
  id          String          @id @default(cuid())
  status      RecordingStatus @default(uploading)
  r2Key       String          @unique
  durationSec Float?
  triggerRunId String?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  questions   Question[]
  progress    StageProgress[]
}

model Question {
  id                String         @id @default(cuid())
  recording         Recording      @relation(fields: [recordingId], references: [id], onDelete: Cascade)
  recordingId       String
  clipR2Key         String?
  thumbnailR2Key    String?
  startSec          Float
  endSec            Float
  section           CpaSection?
  transcript        Json?          // { segments: [...] }
  extracted         Json?          // ExtractedQuestion shape
  status            QuestionStatus @default(pending)
  noAudio           Boolean        @default(false)
  segmentationSignals Json?        // debug: which signals contributed
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  feedback          Feedback?
  @@index([recordingId])
}

model Feedback {
  id              String   @id @default(cuid())
  question        Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  questionId      String   @unique
  items           Json     // FeedbackPayload.items (10 items)
  accountingScore Float
  consultingScore Float?   // null when noAudio
  combinedScore   Float
  whatYouNeedToLearn String?
  weakTopicTags   Json     // string[]
  createdAt       DateTime @default(now())
}

model StageProgress {
  id          String    @id @default(cuid())
  recording   Recording @relation(fields: [recordingId], references: [id], onDelete: Cascade)
  recordingId String
  stage       StageName
  pct         Float     // 0-100
  etaSec      Int?
  message     String
  updatedAt   DateTime  @default(now())
  @@index([recordingId, updatedAt])
}
```

## Migration rules

- **Additive-only** in Phase 1: new columns (nullable or with defaults), new models, new enum values at the end.
- **No** column drops, renames, type changes, or enum value removals without a `<item kind="schema-destructive">` approval in `sam-input/TODO.xml`.
- Migration file names: `NNNN_short_description.sql` — never modify an existing migration after it's been committed.
- Run `pnpm prisma validate && pnpm prisma format` before committing any schema change. `schema-guardian` subagent blocks commits that skip this.

## Feedback.items JSON contract

Kept in sync with `.claude/skills/cpa-grading/SKILL.md` — the `FeedbackPayload.items` Zod schema. If one changes, the other must change in the same commit. `schema-guardian` verifies both files moved together.

## StageProgress: persistence optional

The canonical progress source is Trigger.dev realtime metadata. `StageProgress` rows are a debug tail: the task writes each emit to the table *in addition* to `metadata.set`. The UI does NOT read from StageProgress — it uses `useRealtimeRun`.

## Why these enums

- `RecordingStatus.done` not `complete` — matches Trigger.dev's "COMPLETED" and reads cleanly.
- `QuestionStatus.incomplete` is distinct from `failed`: incomplete = missing data but recoverable with human review; failed = pipeline errored.
- `CpaSection` matches Becker's four sections exactly.

## Do not

- Do not add a `User` model in Phase 1. Single-user, no auth.
- Do not add full-text search columns yet. Use basic `@@index` only.
- Do not put secrets in columns. R2 keys only reference the bucket contents; credentials stay in `.env`.
