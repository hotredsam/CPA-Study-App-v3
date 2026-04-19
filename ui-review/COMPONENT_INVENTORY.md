# Component Inventory — CPA Study Servant Prototype

Generated during Night 5 Phase A analysis. Every `src/*.jsx` file inventoried below.

---

## `src/primitives.jsx`

Shared design primitives used by every screen. All exported via `Object.assign(window, {...})`.

**Components:**
- `SectionBadge({ section, size })` — colored pill badge (xs/sm/md/lg) for CPA sections. Uses oklch hue from `window.SECTIONS[section].hue`. No data source — takes section string prop.
- `Score({ value, size, suffix })` — mono tabular number colored green/warn/red at thresholds 7.5/5. Used for /10 display.
- `Bar({ pct, height, accent })` — horizontal progress bar with track + fill. Transition `.4s`. Used everywhere.
- `Btn({ children, onClick, variant, size, icon, active, style, title, disabled, type })` — 5 variants (primary/ghost/subtle/danger/good), 3 sizes (sm/md/lg). Sharp 3px radius.
- `Icon({ name, size, color })` — inline SVG icon library. ~30 icons as switch-cases. No external icon dep.
- `Kbd({ children })` — keyboard shortcut chip.
- `Logo({ size })` — ledger-book SVG in accent-colored box.
- `Card({ children, pad, style, onClick, title, accent, id })` — bordered box with optional left accent stripe and click handler.
- `EyebrowHeading({ eyebrow, title, right, sub })` — page header: mono eyebrow + large h1 + subtitle + right-slot.
- `Divider({ vertical, style })` — 1px horizontal or vertical separator.
- `Tabs({ value, onChange, items })` — underline-style tab bar with optional badge counts.
- `Toggle({ on, onChange })` — 32×18 pill toggle.

**Utility functions:** `fmtDur(sec)`, `fmtDate(iso)`, `relTime(iso)`, `daysUntil(iso)`.

**Data source:** `window.SECTIONS` for hue values in SectionBadge.

---

## `src/s-dashboard.jsx`

**Component:** `ScreenDashboard({ nav })`

**Tree:**
- `EyebrowHeading` — static copy with Anki + Record buttons
- `Card` (current focus) — gradient background per section hue
  - `FocusStat` (×4) — unit progress, hours, topics, cards due
  - 3 CTAs (Continue reading, Practice Anki, Record drill)
- Stats row: 4× `Stat` — total hours, this week, streak, recordings count
- Section cards: 4× `SectionCard({ section, due })` — per-section hours/progress/exam date
- Routine: 3× `RoutineBlock({ block })` — morning/midday/evening task lists
  - `TaskRow({ t, last })` — time + dot indicator + label + optional external link

**State:** none (fully derived from window globals)

**Data source:** `window.STUDY_STATS`, `window.SECTION_STATS`, `window.UNITS.FAR`, `window.SECTIONS`, `window.ROUTINE`, `window.PAST_RECORDINGS`, `window.LIVE_PIPELINES`

**Local components:** `FocusStat`, `Stat`, `SectionCard`, `RoutineBlock`, `TaskRow`

---

## `src/s-record.jsx`

**Component:** `ScreenRecord({ nav })`

**State:** `phase` ('setup'|'recording'|'uploading'), `elapsed`, `mic`, `source`, `sections[]`, `model`, `paused`, `uploadPct`, `micLevel`

**Tree:**
- **Setup phase:** Two-column layout
  - Left `Card` with 4 `Group` sections:
    - Screen capture: 4× `Picker` (fake device list)
    - Microphone: 3× `Picker` with peak level bars
    - Section allocation: 6× toggle buttons (one per CPA section)
    - Grading model: 4× `Picker` from first 4 `window.OPENROUTER_MODELS`
  - Right column: preflight checks card (5× `Check`), session summary card (`KV` pairs), start button
- **Cockpit phase:** `Cockpit` — full-viewport overlay, 60-bar sine waveform, elapsed timer, pause/stop
- **Upload phase:** `UploadPanel` — centered card with % and bar

**Data source:** `window.SECTIONS`, `window.OPENROUTER_MODELS`, `window.TEXTBOOKS` (for textbook count check)

**Local components:** `Group`, `Picker`, `Check`, `KV`, `Cockpit`, `UploadPanel`

**Note:** Waveform is synthetic (`Math.sin(i * 0.3 + elapsed * 0.7)`). Real version needs AudioWorklet/AnalyserNode from live mic.

---

## `src/s-pipeline.jsx`

**Component:** `ScreenPipeline({ nav })`

**State:** `tab` ('processing'|'previous')

**Tree:**
- `EyebrowHeading`
- `Tabs` (Processing | Previous with badge counts)
- **Processing tab:** list of `PipelineCard` per `window.LIVE_PIPELINES`
- **Previous tab:** `Card` table grid (7 columns: SECT/TITLE/WHEN/QUESTIONS/DURATION/AVG SCORE/MODEL)

**`PipelineCard({ p, onOpen })`:**
- Header row: section badges, title, question count/ETA, Preview button
- 5-stage stepper grid: each stage has dot indicator + `Bar`. Stages: Upload → Segment → Extract → Transcribe → Grade
- Per-question mini-grid: colored squares (green done, accent active, surface pending)

**Data source:** `window.LIVE_PIPELINES`, `window.PAST_RECORDINGS`

**Note:** Prototype shows 5 stages; AI_FEATURES spec has 6 (Upload/Segment/Extract/Transcribe/Tag/Grade). Tag stage was added in v1.4 but prototype `STAGES` array has only 5. The index.html data shows `stage:'tagging'` so both 5 and 6 appear — use 6 in production.

---

## `src/s-review.jsx`

**Component:** `ScreenReview({ nav })`

**State:** `selected` (question idx, 1-based), `layout` ('split'|'stacked'), `showFlow`

**Tree:**
- `EyebrowHeading` with Split/Stacked toggle buttons
- `QuestionSelector({ session, current, onSelect })` — horizontal scrollable bar of colored squares
- **Split layout (default):** left column (QuestionCard, TranscriptCard, FlowchartCard, AIChat) + right rail (ScoreCard, FeedbackCard, SourcesCard)
- **Stacked layout:** 3-column top row + full-width cards below

**Child components:**
- `QuestionSelector` — auto-scrolls to keep selected centered, prev/next buttons
- `QuestionCard` — question text + 4 choices highlighted correct/user-wrong/neutral
- `TranscriptCard` — italic transcript in serif font + 4 stats (hedges/fillers/self-corrects/words-per-sec)
- `FlowchartCard` — 5-step ASC-606 flow. Each step: left box (green/red), middle detail text, right citation badge. Connector lines between steps.
- `ScoreCard` — big combined number + accounting/consulting sub-scores with bars
- `FeedbackCard` — 4 `KVBlock` sections (gap/misstep/technique/study)
- `SourcesCard` — expandable source list sorted by relevance. Excerpt with accent left-border when open.
- `AIChat` — chat UI with simulated `setTimeout` response. Input + Ask button.

**Data source:** `window.REVIEW_SESSION`, `window.REVIEW_Q`

---

## `src/s-topics.jsx`

**Component:** `ScreenTopics({ nav })`

**State:** `filter` (section or 'all'), `sort` ('error'|'mastery'|'cards'|'seen'), `expanded` (topic id or null)

**Tree:**
- `EyebrowHeading` with filter buttons (all/FAR/REG/AUD/TCP)
- Sort buttons row (4 sort options)
- `Card` table (8 columns: SECT/TOPIC/UNIT/MASTERY/ERROR RATE/CARDS/SEEN/chevron)
  - `TopicRow` for each item — click to expand
    - `TopicDetail` in expanded state (3-col: Notes textarea + Recent history + Actions)

**`TopicDetail({ t, nav })`:**
- Notes: `textarea` with local state
- History: list of `{date, score, event}` rows
- Actions: 5 buttons (Update from textbooks / Practice cards / Open in book / Drill / Save notes)
- "Where covered" card with citation text

**Data source:** `window.TOPICS`, `window.TEXTBOOKS`

---

## `src/s-study-textbook.jsx`

**Component:** `ScreenStudyTextbook({ nav })`

**State:** `chunkIdx`, `quizAnswer`, `submitted`

**Tree:**
- `EyebrowHeading` with Open raw book + Notes buttons
- Progress strip: section badge + chunk count + unit progress bar
- Two-column layout:
  - Left: `Card` (reading prose) + checkpoint quiz `Card`
    - Body paragraphs + optional callout + optional worked example
    - Checkpoint: 4 radio-style answer buttons → submit → reveal explanation + Continue button
  - Right rail: chunk navigator list + session stats + source card

**Data source:** `window.STUDY_CHUNKS` (4 chunks of FAR Ch 7.3a–7.3d)

**Note:** No home state in this file. Prototype doesn't show a separate "Study home" screen in the JSX — the reader is the only view. The AI_FEATURES description mentions a resume hero; this needs to be added in the Next.js version.

---

## `src/s-anki.jsx`

**Component:** `ScreenAnki({ nav })`

**State:** `mode` ('daily'|'practice'|'path'|'browse')

**Four sub-views:**
- `AnkiDaily({ nav, setMode })` — two-column: due count card + breakdown table / streak + retention + backlog stats
- `AnkiPractice()` — card flip (front→back→rate), ask-AI panel, voice recording panel, notes + stats rail
  - State: `flipped`, `idx`, `askMode`, `askInput`, `voice`
  - Rating: 4 buttons (Again/Hard/Good/Easy) — purely visual, no real SM-2 call
- `AnkiPath()` — linear path list (locked/current/done states per deck)
- `AnkiBrowse()` — placeholder card (not implemented in prototype)

**Data source:** `window.ANKI_TODAY`, `window.ANKI_CARDS`, `window.ANKI_PATH`

---

## `src/s-rest.jsx`

Contains three screens: Textbooks (Library), TextbookView, and Settings.

### `ScreenTextbooks({ nav })`

**State:** `dragOver`

**Tree:**
- `EyebrowHeading` with Upload button
- Drag-drop `Card` (changes border/bg on dragOver)
- Two-column layout: textbook list table + right rail (web-API sources + storage)
- `TextbookRow` — book spine icon, title/publisher/pages/size, section badges, indexing status (done/queued/indexing %), citation count, Open+Re-index buttons

**Data source:** `window.TEXTBOOKS`, `window.SECTIONS`

---

### `ScreenTextbookView({ nav })`

**State:** `chIdx` (chapter index)

**Tree:**
- `EyebrowHeading`
- 3-column grid: TOC nav (left) + prose content (center) + history + citations (right)

**Data source:** `window.TEXTBOOK_VIEW`

---

### `ScreenSettings({ nav, onTweakChange, tweaks })`

**State:** `tab` ('study'|'models'|'appearance'|'indexing'|'danger')

**5 sub-components:**
- `SettingsStudy()` — XML textarea + exam dates + hours target inputs
- `SettingsModels()` — 8-row per-function model selects + OpenRouter key + budget bar
- `SettingsAppearance({ tweaks, onTweakChange })` — 3 theme pickers + accent hue slider + density + serif toggle
- `SettingsIndexing()` — 15-option grid (toggle/slider/select mixed) 
- `SettingsDanger()` — 5 destructive-action rows with red confirm buttons

**Props:** `tweaks` = `{ theme, accentHue, density, serif }` from parent App state. `onTweakChange(key, val)` bubbles up to App for persistence.

**Data source:** `window.OPENROUTER_MODELS`

---

## `src/data.jsx`

Not a screen. Defines all mock data globals via `Object.assign(window, {...})`.

**Globals exported:** `SECTIONS`, `STUDY_STATS`, `SECTION_STATS`, `UNITS`, `ROUTINE`, `OPENROUTER_MODELS` (20 models), `LIVE_PIPELINES`, `PAST_RECORDINGS`, `REVIEW_SESSION`, `REVIEW_Q`, `TOPICS`, `TEXTBOOKS`, `STUDY_CHUNKS`, `ANKI_TODAY`, `ANKI_CARDS`, `ANKI_PATH`, `TEXTBOOK_VIEW`

**Key data shapes:**
- Recording: `{ id, title, sections[], stage, stagePct, questionsDone, questionsTotal, etaSec, startedMs, avgCombined, model, durationSec, createdAt }`
- Topic: `{ id, name, section, unit, mastery, errorRate, cardsDue, seen, notes, history[] }`
- AnkiCard: `{ id, section, topic, type, reviews, interval, ease, lapses, created, front, back, mnemonic, notes[] }`
- Source: `{ id, textbook, ref, page, relevance, passage[] }`
- StudyChunk: `{ id, chapter, ref, title, estMin, body[], callout?, example?, quiz:{q, choices[], answer, explanation} }`

---

## `src/_all.jsx`

Not analyzed separately — this is the `_all.jsx` bundle (concatenation of all other JSX files for the single-page prototype). Not used in the Next.js migration.

---

## `components/browser-window.jsx`

Prototype browser chrome wrapper (not a screen). Used in audit screenshots. Not relevant to Next.js migration.
