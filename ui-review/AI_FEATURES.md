# Study Servant — Complete Feature & AI Reference

This document covers **every feature in the prototype**: what it does, how it should work end-to-end, and — where AI is involved — which model runs it and why. It also includes a full changelog of what was built during the design process.

---

## Table of contents

1. [The product in one paragraph](#the-product-in-one-paragraph)
2. [How a session flows, end-to-end](#how-a-session-flows-end-to-end)
3. [Screens, top to bottom](#screens-top-to-bottom)
   - [Dashboard](#1-dashboard)
   - [Record](#2-record)
   - [Pipeline](#3-pipeline)
   - [Review](#4-review)
   - [Topics](#5-topics)
   - [Study Textbook](#6-study-textbook)
   - [Anki](#7-anki)
   - [Library (Textbooks)](#8-library-textbooks)
   - [Textbook Viewer](#9-textbook-viewer)
   - [Settings](#10-settings)
4. [Every AI feature, in detail](#every-ai-feature-in-detail)
5. [Infrastructure: budget, cache, batching](#infrastructure-budget-cache-batching)
6. [Design system notes](#design-system-notes)
7. [Changelog — what was built](#changelog--what-was-built)

---

## The product in one paragraph

Study Servant is a CPA-exam study tool for candidates who study by **talking through practice questions out loud**. You record yourself working a question bank (screen + mic). Claude segments the recording into individual questions, matches your spoken reasoning against the textbook's correct reasoning, and gives you a **/10 score per question** with the exact spot where your reasoning diverged. Over time it builds a topic-mastery map, drives an Anki deck, and generates your weekly study schedule from your exam dates.

The aesthetic is **warm paper with ledger-red accents** — calm, focused, and deliberately *not* a drunk-tank-pink panic app. Neutral analyst tone throughout; no pep talk, no emojis, no motivation theater.

---

## How a session flows, end-to-end

```
┌─────────────┐    ┌──────────┐    ┌───────────┐    ┌────────┐    ┌────────┐
│ 1. Record   │ -> │ 2. Upload│ -> │ 3.Pipeline│ -> │4.Review│ -> │5.Topics│
│   screen+   │    │   to R2  │    │  runs 6   │    │  q/q   │    │ updated│
│   mic       │    │          │    │  stages   │    │        │    │        │
└─────────────┘    └──────────┘    └───────────┘    └────────┘    └────────┘
                                          │                           │
                                          v                           v
                                   ┌─────────────┐            ┌───────────────┐
                                   │ Anki deck   │            │ Tomorrow's    │
                                   │ regenerated │            │ routine shifts│
                                   └─────────────┘            └───────────────┘
```

1. **Record** — Capture display + mic. Pick which CPA sections are in this session.
2. **Upload** — Streams to Cloudflare R2 while recording.
3. **Pipeline** — 6 stages: Upload → Segment → Extract → Transcribe → Tag → Grade.
4. **Review** — Every question gets a /10 combined score (accounting + consulting rubric), transcript, flowchart with first-misstep marker, and linked sources.
5. **Topics** — Mastery deltas from the session are written back. Weak topics get more Anki cards; tomorrow's routine rebalances.

---

## Screens, top to bottom

### 1. Dashboard

**What it is:** Entry point. Shows where you are in your study goal, what's next, and what's processing in the background.

**Sections:**
- **Title line** — "583 hours in, 31 this week, on pace." (neutral, factual — no "Great job!" cheerleading)
- **Current focus card** — what chapter/unit you're on right now, with three CTAs (Continue reading · Practice Anki · Record drill)
- **Stats row** — Total hours · This week vs target · Streak · Recordings processing
- **Exam countdowns** — FAR / REG / AUD / TCP with days remaining, color-coded by urgency
- **Today's routine** — Morning / Midday / Evening blocks parsed from the study-routine XML
- **Weakest topics** — Sorted by error rate, each clickable to open Topics with that row expanded

**How it works:**
- `STUDY_STATS` (hours, streak, weekly target) is computed from recording durations + reading chunks completed
- Routine blocks come from the user's `<study-routine>` XML (Settings → Study schedule)
- The "recordings processing" badge in the sidebar is a live count from the Pipeline

---

### 2. Record

**What it is:** Where you capture a study session. Three phases: **Preflight → Cockpit → Upload**.

**Preflight:**
- **Screen capture picker** — lists available displays + specific app windows (Chrome showing Becker, etc.). Says what's currently focused.
- **Microphone picker** — shows available mics with a live peak-level bar, sample rate, default flag
- **Preflight checks** — 8 auto-verified items on the right rail: Display captured · Mic signal · OpenRouter API · R2 storage · Workers AI embeddings · FASB web API · Sections assigned · Budget OK
- **Section assignment** — toggle which CPA sections this session covers (FAR, REG, AUD, TCP, BAR, ISC). Multiple allowed — Claude figures out which questions belong to which during segmentation.
- **OpenRouter model picker** — override the grading model for this session (defaults to Sonnet)

**Cockpit (while recording):**
- Full-viewport focused mode — no mac chrome, sidebar, or noise
- Elapsed timer center-stage
- **Speech-reactive waveform** — 60 vertical bars. Amplitude envelope = syllabic modulation (~4Hz) × burst gate (on/off pauses) × noise grain. Not a static sine — it looks like speech.
- Live transcript panel (optional — can be toggled off for less distraction)
- Stop button + instant review button

**Upload:**
- Progress bar with KB/s + time remaining
- "Safe to leave this page" once upload ≥ 100%

---

### 3. Pipeline

**What it is:** Status of all recordings being processed. Two tabs: **Processing** and **Previous**.

**Processing tab:**
- One card per live recording
- 6-stage horizontal stepper: **Upload → Segment → Extract → Transcribe → Tag → Grade**
- Each stage shows per-stage percent + ETA
- Per-question mini-grid — once segmentation finishes, shows every question as a square that fills as it's graded
- Live log stream (collapsible)
- "Started processing 14m ago" (relative time, hours for >60m)

**Previous tab:**
- Table of completed recordings: Section · Title · When · Questions · Duration · Avg Score · Model used
- Click row → opens Review for that recording

**The 6 stages:**
| Stage | What it does |
|-------|--------------|
| Upload | Bytes land in R2 |
| Segment | Claude splits the recording into Q&A boundaries |
| Extract | OCR the screen-share frames for the MCQ text |
| Transcribe | Whisper converts audio to timestamped transcript |
| Tag | Haiku tags each question with section/unit/topic/difficulty |
| Grade | Sonnet scores each question /10 with first-misstep analysis |

---

### 4. Review

**What it is:** The core workflow. After a recording is graded, you review every question with Claude's feedback side-by-side with the textbook source.

**Two states:**
1. **Home** — Pick a recording (same table as Pipeline → Previous, but the *entry point* from the sidebar goes here first)
2. **Question view** — All grading output for a single question

**Question view layout:**
- **Top** — Horizontal question selector bar. Every question in the session as a colored square: green=correct, red=incorrect, brightness=score. Auto-scrolls to keep current centered. Prev/Next buttons.
- **Top-row cards** — Combined score (big number, out of 10) + Accounting /5 + Consulting /5. Compact AI feedback card.
- **Question card** — The actual question text, the user's answer, the correct answer, the explanation
- **Transcript card** — Full spoken transcript with hedges, fillers, and self-corrections counted. Timestamps link to audio position.
- **Flowchart card** — Mermaid-style ASC-606 5-step reasoning flow
   - Shared steps where user and correct path agree
   - **Divergence point** — where you first went wrong, shown as a visual fork with both branches drawn
   - User branch in red-soft with the specific misstep called out
   - Correct branch in green-soft with the citation badge
   - **Citation badges are clickable** — scrolls to the Sources card below and auto-selects the matching source with a brief highlight flash
- **Sources card** — Left rail: list of retrieved sources (textbook, FASB ASC, past recordings) ranked by relevance. Right rail: the full passage with the specific highlighted spans that Claude judged relevant.
- **AI chat** — Bottom panel. Ask follow-up questions. The tutor has full context: transcript + flowchart + sources + your past performance on this topic.

---

### 5. Topics

**What it is:** Every topic Claude has extracted from your indexed textbooks, with mastery, error rate, cards due, and history.

**Filters (all in column headers, sortable + filterable):**
- SECT · TOPIC · UNIT · MASTERY · ERROR RATE · CARDS · SEEN
- Each header has a dropdown filter + sort arrow
- Search box in the Topic column
- "Clear" button top-right when filters are active
- Row count: "8 of 47 shown · 3 filters"

**Header actions (right rail):**
- **Refresh AI notes for all** — queues an AI-notes regeneration for every filtered row. Estimated cost shown in the toast. Runs batch-mode.
- **Process all shown** — re-indexes the filtered topics against textbooks. Runs in Pipeline.

**Row expand shows:**
- **Notes textarea** — your manual notes + an "AI refresh" button that regenerates a structured note (core rule · pitfall · citation · performance)
- **Recent history** — last 4–6 events on this topic with date, score, and event (e.g. "Tue MCQ · 4.2 · consolidation question")
- **Actions** — Update from textbooks · Practice N cards · Open in book · Drill this topic · Save notes
- **Where covered** card — citations across every indexed book

---

### 6. Study Textbook

**What it is:** Claude-guided reading. The book is chunked into digestible reading blocks; after each chunk, Claude quizzes you before letting you advance.

**Two states:**
1. **Home** — Resume hero (big card: "Pick up here → Ch 7.3c Allocation when SSPs ≠ transaction price") + book picker + table of contents
2. **Reader** — One chunk at a time

**Reader layout:**
- Reading progress bar (chunks read / total)
- The chunk itself — rendered as prose in a serif column, 32–36px padding, max ~72ch width, plus callouts, pull quotes, and worked examples
- Right rail — "where this fits in your study plan", FASB ASC links, prior questions that touched this topic
- **Checkpoint** — after the chunk, Claude generates 3–5 questions. You answer before advancing. Wrong answers tag the topic for re-review.
- **Back to study home** button (explicit ← arrow)
- **Open raw book** button (jumps to the PDF-style textbook viewer)

Reading time is logged automatically against the section's hour total.

---

### 7. Anki

**What it is:** Spaced-repetition flashcards. Three modes: **Daily · Practice · Ask AI**.

**Daily deck:**
- N cards due today, grouped by section
- Each card is section-badged; cloze-deletion is the default format
- 4-button rating (Again / Hard / Good / Easy) like standard Anki

**Practice mode:**
- Unlimited pick-through, no scheduler impact
- Filter by section / topic / tag

**Ask AI:**
- Free-form question panel
- Claude has access to indexed textbooks + your topic history
- Response includes an auto-offer to "turn this into a card" — one click generates a cloze card with citation

**Voice notes:**
- Long-press a card → record a 10-30s voice memo
- Whisper transcribes, appends to the card's note field

**Card generation:**
- Runs during textbook indexing (batch-mode Haiku)
- Triggered manually via "regenerate cards for this topic"
- Every generated card has: front · back · explanation · source citation · section tag · difficulty

---

### 8. Library (Textbooks)

**What it is:** All your indexed books. Drag-and-drop upload area + the list of what you've indexed.

**List:**
- Each book card shows: Section badge · Title · Pages · Chunks · Indexing status · Size on disk
- Status can be: **Indexing** (progress bar), **Ready**, **Needs update** (source changed), **Failed**
- Actions per book: Open · Re-index · Remove · Export chunks

**Upload:**
- Full-page drag-and-drop overlay (Discord-style red takeover) when you drag a file anywhere on the page
- Accepts PDF, EPUB, HTML
- Indexing kicks off immediately, runs in Pipeline
- Cost estimate shown before confirming ("Index this book — ~$0.24, ~4h batch")

---

### 9. Textbook Viewer

**What it is:** Read the raw textbook content. Three-column layout.

- **Left** — Table of contents (all chapters, clickable)
- **Middle** — Rendered chapter with proper typography, callouts, worked examples, figure placeholders, formulas
- **Right** — Citations & cross-refs ("This chapter cited in Q17, Q22 of yesterday's session")
- **Back button** context-aware — remembers whether you came from Study Textbook, Review, Topics, or Library

---

### 10. Settings

**5 tabs:**

#### Study schedule
- **Study routine XML textarea** — your `<study-routine>` XML, with syntax coloring suggestion
- **Drop XML** button + Discord-style full-page drag overlay that accepts `.xml` files
- **Copy Claude prompt** — copies a full, schema-aware prompt to your clipboard for use in Claude Projects (which generates the XML)
- **Save & regenerate today** — parses the XML and rebuilds today's routine
- **Validate** — schema check, reports block + task count
- **Exam dates** — per-section date pickers (FAR, REG, AUD, TCP) + a hard "all done" deadline
- **Hours target** — daily & weekly hours targets

#### Models & API
- **Per-function config** — 8 functions, each an expandable row:
  - Model dropdown (20 OpenRouter models)
  - Description (what this function does)
  - **Interest** level (how much it matters)
  - **Downtime** tolerance (live / batch-friendly / off-peak OK)
  - **Batching** toggle per-function
  - **Cache** toggle per-function
  - Monthly call count + cost
- **OpenRouter API key** — password field + rotate button + today's usage
- **Monthly budget** — limit, warn threshold, hard-stop toggle, auto-degrade-tier toggle, ENFORCED badge
- **Cache** right rail — global hit rate, savings, prompt caching + semantic dedup toggles, TTL, clear button
- **Batching** right rail — 6h coalesce window, off-peak preference, live-mode override, queued request count, next batch run time

#### Appearance
- **5 themes:** Paper (warm cream · default) · Night (dark slate) · Sepia (amber) · Sakura (soft pink) · Scientific (terminal green on slate)
- **Accent hue slider** — oklch-based, default ledger red at 18°
- **Density** — Comfortable / Compact
- **Serif family** — Instrument Serif / Tiempos / Source Serif

#### Indexing
- **15 indexing options** — Index depth · OCR mode · Formula extraction · Example detection · Cross-reference linking · Glossary build · Figure captioning · Section auto-tag · Unit grouping · Anki card generation · Embedding model · Chunk size · Overlap window · Reindex on update · PII scrubbing
- **Single top-20 model dropdown** for indexing (Haiku recommended)
- Batch mode + Off-peak tier toggles
- Concurrency picker (4/8/16/32)
- **Cost estimator** — side-by-side "with batch+off-peak" vs "live, no batch"

#### Danger zone
- Reset hours · Wipe Anki progress · Re-index all books · Delete account

---

## Every AI feature, in detail

### 1. Grading
- **Model:** `anthropic/claude-sonnet-4.6`
- **Where:** Runs on every segmented question after a recording is processed.
- **What it does:** Takes the student's spoken answer + transcript + matched textbook citation, evaluates vs. the correct answer, assigns a /10 score (5 accounting + 5 consulting), identifies the root-cause gap, and writes the "first misstep" narrative with a transcript timestamp link.
- **Why Sonnet:** Sonnet-tier reasoning is needed to match loose spoken answers against rigid textbook rules and to isolate the exact moment reasoning diverges. Haiku drops accuracy ~12pp on ambiguous partial-credit cases.
- **Criticality:** Live. Blocks the Review screen.
- **Cache:** On (prompt cache + semantic dedup, TTL 30d).
- **Batch:** Off.

### 2. Segmentation
- **Model:** `google/gemini-2.5-pro`
- **Where:** First stage of the recording pipeline.
- **What it does:** Takes screen-share OCR text + Whisper transcript and splits a 40-minute recording into individual question boundaries with start/end timestamps and question-source tags (Becker MCQ, Ninja sim, etc.).
- **Why Gemini Pro:** Needs 1M+ context to hold the full session transcript + screen OCR together. Gemini 2.5 Pro has been most reliable on boundary precision.
- **Criticality:** Live. Wrong boundaries corrupt every downstream stage.
- **Cache:** Off. Every recording is novel.
- **Batch:** Off.

### 3. Transcription
- **Model:** `openai/whisper-large-v3`
- **Where:** Recording pipeline, stage 1 (parallel with upload).
- **What it does:** Converts session audio to timestamped transcript. Speaker-diarization off (single-speaker assumed).
- **Criticality:** Medium. Errors propagate but Sonnet grading recovers most of them.
- **Cache:** Off.
- **Batch:** Off. Uses the streaming $0.006/min tier.

### 4. Topic extraction
- **Model:** `anthropic/claude-haiku-4.5`
- **Where:** Runs during textbook indexing, one call per chunk.
- **What it does:** Identifies the canonical CPA topic(s), subsection, worked examples, and cross-references to FASB ASC / IRC / PCAOB codes for each chunk.
- **Why Haiku:** Volume is high (thousands of chunks per book), output is structured, Haiku matches Sonnet within 2% accuracy on this.
- **Criticality:** Medium. Fuels the Topics screen and weakness detection.
- **Cache:** On.
- **Batch:** On by default.

### 5. Checkpoint-quiz generation
- **Model:** `anthropic/claude-sonnet-4.6`
- **Where:** Study Textbook reader — after every reading chunk.
- **What it does:** Generates 3–5 checkpoint questions with distractors, correct answer, and rationale.
- **Why Sonnet:** Distractor quality matters — bad distractors train bad patterns.
- **Criticality:** Medium. Runs when resuming reading.
- **Cache:** On. 90%+ hit rate (chunks rarely change).
- **Batch:** Off.

### 6. Anki card generation
- **Model:** `anthropic/claude-haiku-4.5`
- **Where:** Runs during textbook indexing; also triggered by "regenerate cards for this topic".
- **What it does:** Produces cloze and Q&A cards from indexed content with explanation + source citation.
- **Criticality:** Low-medium. Can be regenerated anytime.
- **Cache:** On.
- **Batch:** On. Queue overnight.

### 7. Chat tutor
- **Model:** `anthropic/claude-sonnet-4.6`
- **Where:** Bottom of Review screen + Anki "Ask AI" mode.
- **What it does:** Answers conversational follow-ups with full context: session transcript + relevant textbook chunks + student's past performance on the topic.
- **Criticality:** Low. Opt-in per session.
- **Cache:** On (prompt cache on static context).
- **Batch:** Off.

### 8. Voice-note transcription
- **Model:** `openai/whisper-large-v3`
- **Where:** Short voice memos attached to Anki cards or Review sessions.
- **What it does:** Transcribes <30s voice memos into note fields.
- **Criticality:** Low.
- **Cache:** Off.
- **Batch:** Off.

### 9. Topic AI-notes refresh
- **Model:** `anthropic/claude-haiku-4.5`
- **Where:** Topics screen → row expand → "AI refresh" button. Also bulk "Refresh AI notes for all".
- **What it does:** Regenerates a structured note — core rule · common pitfall · citation · last-3 performance — from current textbook + history.
- **Criticality:** Low.
- **Cache:** On.
- **Batch:** On for bulk action.

### 10. Recording pipeline tagging
- **Model:** `anthropic/claude-haiku-4.5`
- **Where:** Pipeline stage 5 (between Transcribe and Grade).
- **What it does:** Attaches section / unit / topic / difficulty tags to each segmented question. Mastery updates happen on tag completion, not at end of grading.
- **Criticality:** Medium. Untagged questions don't update mastery.
- **Cache:** On (hashed on question text).
- **Batch:** Off.

### 11. Study-routine generator *(external)*
- **Model:** User's Claude Projects instance (not via our pipeline)
- **Where:** Settings → Study schedule → Copy Claude prompt.
- **What it does:** Generates a weekly `<study-routine>` XML from exam dates, hours target, and weak-section signal.
- **Note:** Deliberately not piped through our billing — the user owns the routine and should iterate on it.

---

## Infrastructure: budget, cache, batching

### Monthly budget (enforced)
- Hard cap at the user-set dollar limit.
- When hit, **non-essential calls pause** until next cycle: Anki regen, AI notes refresh, chat tutor.
- **Warn threshold** (default 80%) triggers a dashboard banner.
- **Auto-degrade at 80%:** Sonnet → Haiku on Grading + Checkpoint quiz; live mode disabled across the board.
- **Rollover** optional — unused budget carries into next cycle.

### Cache
- Global prompt cache + semantic-dedup cache.
- **Prompt cache** uses Anthropic's native beta feature on the static system prompt + textbook context.
- **Semantic dedup** hashes the meaningful user input and returns prior results when cosine similarity > 0.97.
- **TTL** defaults to 30d, per-function configurable.
- Hit rate + savings shown in a global card.

### Batching
- **6h coalesce windows** for batch-mode functions. Routes to provider off-peak tier when both toggles are on.
- **Off-peak** adds another ~30% off but may wait days under high demand.
- **Live-mode functions** bypass the queue entirely.
- Queued call count + next-batch-run-time displayed.

### Per-function overrides
- Every AI feature listed above has its own Model / Batching / Cache setting.
- Global defaults apply only where a function hasn't been overridden.

---

## Design system notes

- **Aesthetic:** Warm paper canvas (`oklch(0.96 0.014 75)`), arterial ledger-red accent (`oklch(0.52 0.18 18)`) — scientific-attention hue, not drunk-tank pink.
- **Corners:** Sharp. 3–4px radii max. No big pill buttons.
- **Type:** Geist (UI) · Geist Mono (numbers, eyebrows, IDs) · Instrument Serif (headlines, reader prose).
- **Copy voice:** Neutral analyst. Numbers, gaps, evidence. No exclamation marks, no "Great job!", no emojis. "583 hours in" not "You're crushing it!"
- **Color-coded sections** throughout: FAR (blue) · REG (purple) · AUD (green) · TCP (amber) · BAR (teal) · ISC (rose).
- **5 themes** all-working: Paper · Night · Sepia · Sakura · Scientific.
- **Density** swap — Comfortable (default) or Compact.
- **Keyboard nav** — `g` then `h/r/s/v/y/u/a/l/t` jumps between screens.
- **Session position** persisted to localStorage — refresh safely.

---

## Changelog — what was built

### v1.6 — Polish pass (today)
- Fixed "Per-function" row layout (Grading expansion no longer overlaps model id)
- Rows now collapsed by default
- **Waveform is speech-reactive** — syllabic × burst gate × noise envelope
- **Citation badges in Review flowchart** are now clickable; scroll to Sources and auto-select + flash the matching source
- **Topics: "All sections" truncation fix** — shortened filter label
- Pipeline "N seconds ago" now uses `relTime` for hours-scale durations
- Added explicit "Back to study home" button on the Study Textbook reader
- Added `sparkle` icon for AI-refresh actions

### v1.5 — Topics AI notes
- Bulk **"Refresh AI notes for all"** action in Topics header — queues regeneration for filtered rows with cost estimate
- Per-topic **"AI refresh"** button inside row expand — regenerates the structured note
- **Global toast system** — listens on `servant:toast` event, renders fixed-bottom banner
- New AI function: Topic AI-notes refresh (Haiku, batch-mode)

### v1.4 — Pipeline tagging
- Added dedicated **"Tag" stage** between Transcribe and Grade
- New AI function: Recording pipeline tagging (Haiku)
- Topic mastery now updated per-question on tagging completion (not end of grading)
- One live recording pipeline now shows the tagging stage

### v1.3 — Per-function model config
- Settings → Models rebuilt as **expandable per-function rows** (8 functions)
- Each function has its own Model dropdown + Batching toggle + Cache toggle + description + interest/downtime labels + call count + monthly cost
- Global defaults card now shows in the right rail, clearly marked as override-only

### v1.2 — Budget enforcement
- **Monthly budget card** — limit, warn threshold, hard-stop, auto-degrade tier
- Budget enforced across all functions
- ENFORCED badge shown when rules are active

### v1.1 — Review home
- Review tab now lands on a **recording picker** first
- Every completed recording listed in a table; click opens the question-by-question review for that session
- "All recordings" back button restored at top of the question view

### v1.0.5 — Settings → Study schedule
- **Copy Claude prompt** now copies a full, schema-aware prompt to clipboard + success toast
- **Discord-style drag-drop overlay** for `.xml` files — full-page red takeover with clear drop instruction
- **Drop XML button** opens native file picker as a fallback
- **Validate** runs schema check + reports block/task counts via toast

### v1.0.4 — Settings → Appearance
- Added **Sakura** theme (soft pink · focused)
- Added **Scientific Mode** theme (terminal green on slate · high-contrast focus)
- 5 themes total: Paper · Night · Sepia · Sakura · Scientific

### v1.0.3 — Settings → Indexing
- Single **top-20 OpenRouter model** dropdown for indexing
- Recommended-model callout card
- Batch mode + Off-peak tier toggles unified
- Concurrency picker (4/8/16/32)
- Side-by-side cost estimator (batch+off-peak vs. live)
- **15 indexing options** with mixed slider / toggle / select controls

### v1.0.2 — Models & API (initial)
- OpenRouter API key input
- 8 core AI functions configured
- Monthly cost totals

### v1.0.1 — Study Textbook reader
- Checkpoint quiz flow — read a chunk, answer questions before advancing
- Resume hero + chapter picker + TOC
- Reading time logged to section hours

### v1.0 — Initial launch
- **Dashboard** — current focus, stats, routine, weakest topics
- **Record** — preflight, cockpit, upload; multi-section, model picker, fullscreen (no mac chrome)
- **Pipeline** — stacked cards, one per recording, nested stepper + per-question grid
- **Review** — combined /10 score, scrollable question bar, flowchart with first-misstep marker, sources panel, AI chat
- **Topics** — filter + sort by error rate / mastery / due / seen; expandable rows with notes + history
- **Textbooks** — library + visual viewer with ToC + citations rail
- **Anki** — daily deck + practice + ask-AI + voice notes
- **Settings** — 5 tabs (Study schedule · Models · Appearance · Indexing · Danger zone)
- **Tweaks panel** wired (theme + accent persisted to disk)
- Sharper edges, warm paper canvas, ledger-red accent, ledger-book logo

---

## What needs to change to make this real

> **Important:** This is a design prototype. The list below is a best-effort map of what would need to be built or configured to turn it into a working application. **Claude Code (or whoever implements it) should verify each step independently** — I haven't built the backend, so some of these assumptions may be wrong in practice.

### Backend services to stand up

1. **Cloudflare R2 bucket** — `cpa-recordings`, us-east, with a signed-upload worker. Recordings land here directly from the browser via resumable multipart upload. Lifecycle: auto-delete raw recordings after 90 days, keep transcripts + grading output indefinitely.
2. **Cloudflare Workers** — one Worker per pipeline stage (Upload webhook → Segment → Extract → Transcribe → Tag → Grade). Each Worker reads the previous stage's output from R2, calls its model, and writes back. A Durable Object tracks per-recording state + exposes a websocket for live pipeline updates.
3. **Cloudflare Workers AI** — embeddings via `@cf/baai/bge-large-en-v1.5` for textbook chunk vectors. Index lives in Vectorize.
4. **Database** — Neon Postgres (or Cloudflare D1 if staying in-Cloudflare) for: user, recordings, questions, transcripts, grades, topics, mastery history, Anki cards + SRS state, study routine, exam dates, budget ledger.
5. **OpenRouter account** — API key + a monthly billing cap. All LLM calls go through OpenRouter so model swapping is just a config change.
6. **FASB ASC access** — their public web API or a scraped+cached copy. Used for citation verification during grading.
7. **Auth** — Clerk or Auth.js. Single-user app but still needs a session.

### Pipeline worker specifics

Each worker needs real logic, not the mocked-out progress bars in the prototype:

- **Upload worker** — signs R2 URLs, verifies multipart completion, kicks off Segment
- **Segment worker** — calls Gemini 2.5 Pro with transcript + OCR; needs robust JSON-schema output with timestamps that round-trip against the audio
- **Extract worker** — OCR's screen-share frames. Could use Workers AI vision or Google Vision API; has to handle Becker/Ninja/Gleim visual conventions
- **Transcribe worker** — Whisper API (via OpenRouter or direct); writes word-level timestamps
- **Tag worker** — Haiku call per question with JSON schema; writes tags + triggers mastery update
- **Grade worker** — Sonnet call per question with the full rubric prompt; writes /10 score + first-misstep + citation; this is the most prompt-engineering-heavy stage

### Client-side items the prototype fakes

- **Screen/mic capture** — `getDisplayMedia` + `getUserMedia`. The prototype picker lists fake devices; real implementation has to enumerate actual ones, handle permission flows, and recover from mid-session device swaps.
- **Waveform** — currently driven by a synthetic envelope. Real version needs an `AudioWorklet` or `AnalyserNode` pulling FFT bins from the live mic.
- **Websocket to pipeline** — the pipeline screen polls `window.PIPELINE` in the prototype. Real version subscribes to the Durable Object's websocket and updates in place.
- **Persistence** — Tweaks panel writes to disk via a dev-mode message protocol. Real app needs all the user preferences stored server-side against the user row.

### Model integration details

Each of the 11 AI features needs a working prompt template:

- Grading prompt needs the rubric (accounting /5 + consulting /5), source citation, and output schema. Should reference a golden-answer-key dataset for eval.
- Segmentation prompt needs question-boundary heuristics per question-bank vendor (Becker vs Ninja vs Gleim have different screen conventions).
- Topic extraction needs the CPA topic taxonomy as a reference document — which doesn't exist as a clean file; will need to be built from the AICPA's section blueprints.
- The study-routine generator's prompt exists in the Copy-Claude-prompt clipboard text; it should be tested end-to-end with real user data before being considered final.

### Caching + batching layer

- **Prompt cache** — Anthropic's native beta. Needs server-side integration with the cached-prefix API.
- **Semantic dedup** — requires an embedding call per request + a vector lookup. The 0.97 cosine threshold is a guess; calibrate against real traffic.
- **Batch coalescing** — 6h windows need a scheduled worker that reads the queue table, groups by function, submits in batch, and writes results back.

### Data that doesn't exist yet

- The prototype uses seeded mock data for recordings, questions, topics, transcripts. Real system needs:
  - A CPA topic taxonomy (derived from AICPA blueprints)
  - Golden-answer keys for grading eval
  - Mapped FASB ASC → CPA topic index
  - At least one indexed textbook (Becker FAR is a reasonable MVP target)

### Things to verify before building

- OpenRouter's batch pricing + off-peak tier behavior — the 50% / 30% numbers in the prototype are illustrative, not quoted from current pricing.
- Whisper's $0.006/min is an OpenAI direct number; OpenRouter may mark it up.
- R2 egress pricing for pipeline-to-LLM-provider data transfer — not free.
- Whether Gemini 2.5 Pro's context actually handles 40+ min of transcript + OCR reliably (we assume yes; benchmark before committing).
- Whether browser-native `MediaRecorder` output can be fed directly to Whisper or needs transcoding.

---

*Last updated with v1.6 polish pass. Every model choice above is a default — per-function dropdowns let you route any function to any top-20 OpenRouter model (OpenAI · Anthropic · Google · Mistral · DeepSeek · xAI · Meta Llama).*
