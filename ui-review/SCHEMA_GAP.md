# Schema Gap Analysis — Night 5

Compares prototype `src/data.jsx` data shapes against current `prisma/schema.prisma`. Every model/field needed in Phase B is listed here.

---

## Existing models — required extensions

### Recording (extend)
```
+ sections      CpaSection[]  -- prototype: recording.sections is an array
+ title         String?       -- prototype: recording.title (e.g. "Tue morning MCQ · Becker FAR revenue")
+ tagStage      Json?         -- {status, startedAt, completedAt, pct}
+ modelUsed     String?       -- which model graded this recording (e.g. anthropic/claude-sonnet-4.6)
+ segmentsCount Int?          -- total number of segments after segmentation
```

### Question (extend)
```
+ topicId       String?       -- FK → Topic (set during Tag stage)
+ tags          Json?         -- {section, unit, topic, difficulty}
+ taggedAt      DateTime?     -- when Tag stage completed for this question
```

### StageProgress (extend enum StageName)
```
StageName: uploading | segmenting | extracting | transcribing | tagging | grading
                                                                ^^^^^^^^^
                                                                ADD THIS
```

---

## New models required

### Topic
```prisma
model Topic {
  id         String     @id @default(cuid())
  section    CpaSection
  name       String
  unit       String?
  mastery    Float      @default(0)    -- 0.0 to 1.0
  errorRate  Float?                   -- 0.0 to 1.0
  cardsDue   Int        @default(0)
  lastSeen   DateTime?
  notes      String?                  -- user manual notes
  aiNotes    Json?                    -- {coreRule, pitfall, citation, performance}
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  questions  Question[]
  chunks     Chunk[]
  ankiCards  AnkiCard[]
}
```

### Textbook
```prisma
enum TextbookStatus {
  INDEXING
  READY
  NEEDS_UPDATE
  FAILED
  QUEUED
}

model Textbook {
  id          String          @id @default(cuid())
  title       String
  publisher   String?
  sections    CpaSection[]
  pages       Int?
  chunkCount  Int             @default(0)
  indexStatus TextbookStatus  @default(QUEUED)
  sizeBytes   BigInt?
  r2Key       String?         @unique
  citedCount  Int             @default(0)
  uploadedAt  DateTime        @default(now())
  indexedAt   DateTime?
  chunks      Chunk[]
}
```

### Chunk
```prisma
model Chunk {
  id            String    @id @default(cuid())
  textbook      Textbook  @relation(fields: [textbookId], references: [id], onDelete: Cascade)
  textbookId    String
  order         Int
  chapterRef    String?   -- e.g. "7.3c"
  title         String?
  content       String
  topicId       String?
  topic         Topic?    @relation(fields: [topicId], references: [id])
  fasbCitation  String?   -- e.g. "606-10-32-31"
  figures       Json?     -- [{caption, r2Key}]
  embedding     Json?     -- float array (fallback when pgvector not available)
  embeddingPrec String?   -- "full" | "provisional" | null
  createdAt     DateTime  @default(now())

  @@index([textbookId, order])
  @@index([topicId])
}
```

### AnkiCard
```prisma
enum AnkiCardType {
  CLOZE
  QA
  DEFINITION
  FORMULA
}

model AnkiCard {
  id             String       @id @default(cuid())
  front          String
  back           String
  explanation    String?
  sourceCitation String?
  section        CpaSection?
  topicId        String?
  topic          Topic?       @relation(fields: [topicId], references: [id])
  chunkId        String?
  type           AnkiCardType @default(QA)
  difficulty     Float?       -- 0.0 to 1.0
  srsState       Json         @default("{\"ease\":2.5,\"interval\":0,\"nextDue\":null,\"lapses\":0,\"repetitions\":0}")
  voiceNoteR2Key String?
  mnemonic       String?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  reviews        AnkiReview[]
  notes          AnkiNote[]

  @@index([section])
  @@index([topicId])
}
```

### AnkiReview
```prisma
enum AnkiRating {
  AGAIN
  HARD
  GOOD
  EASY
}

model AnkiReview {
  id          String     @id @default(cuid())
  card        AnkiCard   @relation(fields: [cardId], references: [id], onDelete: Cascade)
  cardId      String
  rating      AnkiRating
  reviewedAt  DateTime   @default(now())
  newInterval Int
  newEase     Float

  @@index([cardId])
}
```

### AnkiNote
```prisma
model AnkiNote {
  id         String   @id @default(cuid())
  card       AnkiCard @relation(fields: [cardId], references: [id], onDelete: Cascade)
  cardId     String
  content    String
  isVoice    Boolean  @default(false)
  r2Key      String?  -- if voice note
  createdAt  DateTime @default(now())
}
```

### StudyRoutine
```prisma
model StudyRoutine {
  id           String   @id @default(cuid())
  xmlSource    String   -- raw XML from user
  parsedBlocks Json?    -- {morning:[],midday:[],evening:[]}
  examDates    Json?    -- {FAR:"2026-08-31", REG:"...", AUD:"...", TCP:"..."}
  hoursTarget  Json?    -- {daily:5, weekly:35, total:1200}
  createdAt    DateTime @default(now())
  activatedAt  DateTime?
}
```

### Budget
```prisma
model Budget {
  id                String   @id @default(cuid())
  monthlyCapUsd     Float    @default(50)
  warnThreshold     Float    @default(0.8)  -- 80%
  autoDegrade       Boolean  @default(true)
  hardStop          Boolean  @default(false)
  currentUsageUsd   Float    @default(0)
  currentMonthStart DateTime @default(now())
  rolloverEnabled   Boolean  @default(false)
  updatedAt         DateTime @updatedAt
}
```

### CacheEntry
```prisma
model CacheEntry {
  id          String   @id @default(cuid())
  functionKey String
  inputHash   String
  embedding   Json?    -- float array for semantic dedup
  output      Json
  hitCount    Int      @default(0)
  precision   String?  -- "full" | "provisional"
  createdAt   DateTime @default(now())
  expiresAt   DateTime

  @@unique([functionKey, inputHash])
  @@index([expiresAt])
}
```

### BatchJob
```prisma
enum BatchJobStatus {
  QUEUED
  RUNNING
  COMPLETED
  FAILED
}

model BatchJob {
  id                  String         @id @default(cuid())
  functionKey         String
  payload             Json
  status              BatchJobStatus @default(QUEUED)
  coalesceWindowStart DateTime?
  coalesceWindowEnd   DateTime?
  offPeakPreferred    Boolean        @default(false)
  createdAt           DateTime       @default(now())
  completedAt         DateTime?
  resultId            String?        -- CacheEntry id after completion

  @@index([status, functionKey])
  @@index([coalesceWindowEnd])
}
```

### ChatMessage + Conversation
```prisma
enum ChatRole {
  USER
  ASSISTANT
}

enum ConversationScope {
  REVIEW
  ANKI
  STUDY
}

model Conversation {
  id        String            @id @default(cuid())
  scope     ConversationScope
  scopeId   String            -- recordingId | questionId | chunkId
  createdAt DateTime          @default(now())
  messages  ChatMessage[]
}

model ChatMessage {
  id             String       @id @default(cuid())
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  conversationId String
  role           ChatRole
  content        String
  contextRefs    Json?        -- {recordingId?, questionId?, topicId?, chunkId?}
  createdAt      DateTime     @default(now())

  @@index([conversationId])
}
```

### UserSettings (single-row)
```prisma
model UserSettings {
  id                String   @id @default("singleton")
  theme             String   @default("paper")   -- paper|night|sepia|sakura|scientific
  accentHue         Int      @default(18)
  density           String   @default("comfortable")  -- comfortable|compact
  serifFamily       String   @default("Instrument Serif")
  activeModelConfig Json?    -- per-function model overrides
  openRouterKeyEnc  String?  -- AES-256-GCM encrypted
  updatedAt         DateTime @updatedAt
}
```

### ModelConfig (11 rows — one per AI feature)
```prisma
enum AiFunctionKey {
  PIPELINE_GRADE
  PIPELINE_SEGMENT
  PIPELINE_TRANSCRIBE
  PIPELINE_EXTRACT
  PIPELINE_TAG
  TOPIC_EXTRACT
  CHECKPOINT_QUIZ
  ANKI_GEN
  CHAT_TUTOR
  VOICE_NOTE
  TOPIC_NOTES
}

model ModelConfig {
  id                String         @id @default(cuid())
  functionKey       AiFunctionKey  @unique
  model             String
  batchEnabled      Boolean        @default(false)
  cacheEnabled      Boolean        @default(true)
  interestLevel     String?        -- "high"|"medium"|"low"
  downtimeTolerance String?        -- "live"|"batch-friendly"|"off-peak-ok"
  useOAuthFallback  Boolean        @default(false)
  updatedAt         DateTime       @updatedAt
}
```

### IndexingConfig (single-row)
```prisma
model IndexingConfig {
  id                 String   @id @default("singleton")
  indexDepth         Int      @default(3)
  ocrMode            Boolean  @default(true)
  formulaExtraction  Boolean  @default(true)
  exampleDetection   Boolean  @default(true)
  crossRefLinking    Boolean  @default(true)
  glossaryBuild      Boolean  @default(true)
  figureCaptioning   Boolean  @default(false)
  sectionAutoTag     Boolean  @default(true)
  unitGrouping       Boolean  @default(true)
  ankiCardGen        Boolean  @default(true)
  embeddingModel     String   @default("text-embedding-3-large")
  chunkSize          Int      @default(512)
  overlapWindow      Int      @default(64)
  reindexOnUpdate    Boolean  @default(false)
  piiScrubbing       Boolean  @default(true)
  indexModel         String   @default("anthropic/claude-haiku-4.5")
  batchMode          Boolean  @default(true)
  offPeakTier        Boolean  @default(false)
  concurrency        Int      @default(8)
  updatedAt          DateTime @updatedAt
}
```

### ModelCall (audit/cost tracking)
```prisma
model ModelCall {
  id          String   @id @default(cuid())
  functionKey String
  model       String
  inputTokens Int?
  outputTokens Int?
  usdCost     Float?
  cacheHit    Boolean  @default(false)
  batchJobId  String?
  createdAt   DateTime @default(now())

  @@index([functionKey, createdAt])
  @@index([createdAt])
}
```

---

## Summary: migration complexity

| Model | Gap | Notes |
|-------|-----|-------|
| Recording | extend | Add sections[], title, tagStage, modelUsed, segmentsCount |
| Question | extend | Add topicId, tags, taggedAt |
| StageName enum | extend | Add `tagging` value |
| Topic | NEW | Core mastery/history model |
| Textbook | NEW | Library item with indexing status |
| Chunk | NEW | Textbook chunk with embedding |
| AnkiCard | NEW | Replaces ReviewState (keeps ReviewState for backward compat) |
| AnkiReview | NEW | SRS review history |
| AnkiNote | NEW | Card notes (text + voice) |
| StudyRoutine | NEW | Parsed XML blocks |
| Budget | NEW | Monthly spend control |
| CacheEntry | NEW | Semantic/prompt cache |
| BatchJob | NEW | Coalesce queue |
| Conversation | NEW | Chat tutor sessions |
| ChatMessage | NEW | Individual messages |
| UserSettings | NEW | Single-row app preferences |
| ModelConfig | NEW | Per-function AI config (11 rows) |
| IndexingConfig | NEW | Single-row indexing options |
| ModelCall | NEW | Audit trail |

**All in one migration:** `pnpm prisma migrate dev --name night5_feature_expansion`
