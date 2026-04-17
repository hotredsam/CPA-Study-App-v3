# CPA Study System — Overnight Autonomous Build Playbook

**Target repo:** https://github.com/hotredsam/CPA-Study-App-v3
**Source of truth for the build:** `C:\Users\hotre\OneDrive\Desktop\Coding Projects\CPA Study Servant\PLAN.md`
**Runtime:** Windows 11, PowerShell + Git Bash available, Node 22 expected.
**Authentication:** Claude Code OAuth only. No Anthropic API keys. All runtime AI calls during development go through the OAuth-authenticated Claude Code session.

---

## 0. Rules of engagement (READ FIRST, DO NOT SKIP)

You are Claude Code. You will execute this entire document autonomously tonight. Sam is asleep. Do not prompt for input — make the best available decision and keep moving. Log every decision in `BUILD_LOG.md` in the repo root so Sam can review in the morning.

**Failure handling**

- If a step fails, write the failure + chosen remediation to `BUILD_LOG.md` and continue.
- Never halt the build waiting for a human. If a dependency cannot be installed, document it and continue with the rest.
- If something absolutely requires human credentials (OAuth browser flow for a third-party service, paid API signup), add it to `sam-input/TODO.xml` with `<blocker>` tags and keep moving on everything else.

**Commit rhythm**

- Commit after every successful sub-step. Small, frequent commits. Conventional Commits format (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- Push after every major section completes (sections 1–13 below).
- Never force-push. Never rewrite history.

**Subagent usage**

- Delegate heavy work to the subagents defined in Part 7. The top-level session is an orchestrator — it plans, delegates, and verifies, but does not do deep implementation itself.
- Always read `PLAN.md` before delegating an implementation task.
- After each task finishes, invoke the `verifier` subagent. Do not commit until verification passes or the failure is documented in `BUILD_LOG.md`.

**The Ralph Loop (Part 13)**

- After setup completes, enter a Ralph loop that iterates through `PLAN.md` Phase 1, tasks 1 through 10, until every task's Verification block passes. The loop exits when the completion promise `BUILD-COMPLETE` is emitted.

---

## 1. Fix known Claude Code regressions (environment)

**Step 1.** Detect the platform. `systeminfo | findstr /B /C:"OS Name"` on PowerShell, confirm Windows 11. Record in `BUILD_LOG.md`.

**Step 2.** Check Claude Code version. Run `claude --version`. If below 2.1.87, update:

- Native installer: `claude update`
- If that fails, force a reinstall: download the native installer from https://code.claude.com/docs/en/setup and run it.
- If Claude was installed via npm (deprecated), run `npm uninstall -g @anthropic-ai/claude-code`, then install natively.

Re-verify: `claude --version`.

**Step 3.** Verify OAuth auth. Run `claude auth status`. If not authenticated via Max plan, run `claude /login` and complete the browser flow. If running headless, generate a long-lived OAuth token: `claude setup-token` — then set `CLAUDE_CODE_OAUTH_TOKEN` as a Windows user environment variable via `[Environment]::SetEnvironmentVariable("CLAUDE_CODE_OAUTH_TOKEN", "<token>", "User")`. Do NOT set `ANTHROPIC_API_KEY` — OAuth only.

**Step 4.** Set the adaptive-thinking fix + max effort as persistent user environment variables:

```powershell
[Environment]::SetEnvironmentVariable("CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING", "1", "User")
[Environment]::SetEnvironmentVariable("CLAUDE_CODE_EFFORT_LEVEL", "max", "User")
```

These take effect on the next `claude` launch. Confirm they're set by opening a new PowerShell and running `$env:CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING`.

**Step 5.** Back up the Claude config directory before any further changes: `Copy-Item -Path "$HOME\.claude" -Destination "$HOME\.claude.backup-$(Get-Date -Format yyyyMMdd)" -Recurse`.

**Step 6.** Enable Auto Dream. Open `$HOME\.claude\settings.json` (create if missing) and merge:

```json
{
  "auto_dream": true,
  "effort": "max"
}
```

Preserve any other existing keys. If the server-side flag isn't live on this account, fall back by installing the community drop-in:

```bash
git clone https://github.com/grandamenium/dream-skill.git "$HOME/.claude/skills/dream-skill"
```

**Step 7.** Harden Cowork against the "Session VM process not available" error. Because Claude Code running on the host has admin capability (if Sam is in an elevated PowerShell), run these checks non-destructively:

```powershell
Get-Service CoworkVMService | Format-List
Set-Service -Name CoworkVMService -StartupType Automatic
Start-Service -Name CoworkVMService -ErrorAction SilentlyContinue

# Disable NTFS compression on the Claude data dir (Hyper-V rejects compressed VHDX)
compact /u /s "$env:LOCALAPPDATA\Claude"

# Check for required Windows features
Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform, HypervisorPlatform | Format-Table FeatureName, State
```

If features are disabled, enable them and log the need for a reboot in `BUILD_LOG.md`:

```powershell
Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart
Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform -NoRestart
```

Do not auto-reboot. Note the pending reboot in `BUILD_LOG.md` and continue — the rest of the build doesn't require Cowork.

---

## 2. System prerequisites

**Step 8.** Detect Node. `node --version` — want v22.x. If missing or wrong version, install nvm-windows and run `nvm install 22 && nvm use 22`. If that's not available, use winget: `winget install -e --id OpenJS.NodeJS.LTS --version 22`.

**Step 9.** Install pnpm: `npm install -g pnpm@latest`. Verify `pnpm --version`.

**Step 10.** Install git (should already exist): `git --version`.

**Step 11.** Install ffmpeg via winget: `winget install -e --id Gyan.FFmpeg`. Verify `ffmpeg -version`.

**Step 12.** Install Docker Desktop if missing: `winget install -e --id Docker.DockerDesktop`. If Docker service isn't running, start it. If Docker cannot be installed non-interactively (often requires a reboot for WSL integration), log it and continue. Local Postgres will fall back to a Neon free-tier connection if Docker is unavailable.

**Step 13.** Install whisper.cpp. Clone, build, and download the `small.en` model weights:

```bash
cd "$HOME"
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp
# Windows build via cmake
cmake -B build -S .
cmake --build build --config Release
bash ./models/download-ggml-model.sh small.en
```

If cmake is missing, install it via `winget install -e --id Kitware.CMake`. Log any failures. The pipeline will still work using the `smart-whisper` npm package at runtime (bundles its own binary), so this is a nice-to-have for local CLI use only.

**Step 14.** Install the Trigger.dev CLI globally: `npm install -g trigger.dev@latest`.

---

## 3. Bootstrap the new GitHub repo

**Step 15.** Pick a clean working directory on the same drive as the existing plan so the `OneDrive` Known-Folder issue doesn't bite:

```powershell
$WORK = "C:\Users\hotre\Desktop\Coding Projects\CPA-Study-App-v3"
New-Item -ItemType Directory -Path $WORK -Force
Set-Location $WORK
```

Deliberately choose `Desktop\Coding Projects` (NOT the OneDrive-redirected path) to avoid Cowork mount issues when Sam later tests locally via Cowork.

**Step 16.** Initialize the repo, wire up the GitHub remote, and make the first commit per GitHub's quick-setup:

```bash
echo "# CPA-Study-App-v3" > README.md
git init
git add README.md
git commit -m "chore: initial commit"
git branch -M main
git remote add origin https://github.com/hotredsam/CPA-Study-App-v3.git
git push -u origin main
```

If the push fails due to missing auth, `gh auth login` via the GitHub CLI; log the failure and continue with local work until auth is resolved.

**Step 17.** Copy the authoritative PLAN.md into the new repo from the source path:

```powershell
Copy-Item -Path "C:\Users\hotre\OneDrive\Desktop\Coding Projects\CPA Study Servant\PLAN.md" -Destination "$WORK\PLAN.md" -Force
```

If the source is missing, stop and write a clear failure entry — PLAN.md is the project's source of truth, not optional.

**Step 18.** Write an MIT `LICENSE` file with Sam Carlson as copyright holder and the current year.

**Step 19.** Write `.gitignore`:

```gitignore
# deps
node_modules/
.pnpm-store/

# next
.next/
out/
build/
dist/

# env
.env
.env.*
!.env.example

# fixtures & binaries
/fixtures/*.webm
/fixtures/*.mp4
/fixtures/*.wav
*.bin
*.ggml

# trigger.dev
.trigger/

# claude
.claude/cache/
BUILD_LOG.md.bak

# OS
.DS_Store
Thumbs.db

# sam-input transient
/sam-input/audio/*.wav
/sam-input/audio/*.m4a
!/sam-input/audio/.gitkeep
/sam-input/.processed/
```

**Step 20.** Write a **pretty** `README.md` (overwriting the placeholder from step 16). Use this exact content, which includes shields, a mermaid architecture diagram, and a clear feature list:

```markdown
<div align="center">

# CPA Study Servant

**AI-powered CPA exam coach that watches you work, listens to you think, and grades both your answer and your reasoning.**

[![Built with Claude Code](https://img.shields.io/badge/Built%20with-Claude%20Code-8A2BE2)](https://code.claude.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-App%20Router-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Trigger.dev](https://img.shields.io/badge/Trigger.dev-v3-F45E2B)](https://trigger.dev)
[![whisper.cpp](https://img.shields.io/badge/whisper.cpp-local-5A67D8)](https://github.com/ggerganov/whisper.cpp)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## What it does

You record yourself working through Becker CPA practice questions. The app:

1. Captures your screen + your voice.
2. Splits the recording into one clip per question using ffmpeg scene detection, verbal cues from local Whisper, and perceptual-hash template matching against Becker's UI.
3. Transcribes your reasoning locally with `whisper.cpp` — **your audio never leaves your machine**.
4. Extracts the question, choices, your answer, and Becker's explanation from keyframes using Claude vision.
5. Grades both your **accounting knowledge** (0–10) and your **verbal consulting technique** (0–10), then returns a 10-item structured feedback payload.
6. Tracks progress across sessions, surfaces weak topics every 100 questions, and grounds explanations in your uploaded textbooks (Phase 2).

## Architecture

``` mermaid
flowchart LR
    A[Record in-app<br/>MediaRecorder + getDisplayMedia] --> B[R2 upload<br/>presigned PUT]
    B --> C[Trigger.dev v3<br/>processRecording]
    C --> D[ffmpeg segmentation<br/>+ pHash UI templates<br/>+ Whisper pre-pass]
    D --> E1[Claude vision<br/>question extraction]
    D --> E2[Local whisper.cpp<br/>transcription]
    E1 & E2 --> F[Claude Sonnet 4.6<br/>grading + 10-item feedback]
    F --> G[Review UI<br/>live progress + playback]
```

## Stack

- Next.js (App Router) + Tailwind
- TypeScript strict, Node 22, pnpm
- Prisma + Postgres (Neon in prod, Docker locally)
- Trigger.dev v3 for all long-running work
- Cloudflare R2 for blobs
- `whisper.cpp` via `smart-whisper` for transcription (local, zero per-minute cost)
- Claude Sonnet 4.6 via OAuth-authenticated Claude Code during dev; Anthropic API in prod
- `ffmpeg` for video work

## Development

``` bash
pnpm install
docker compose up -d postgres
pnpm prisma migrate dev
pnpm dev               # Next.js
npx trigger.dev@latest dev   # Trigger.dev
```

## Sam's input folder

Drop voice memos into `sam-input/audio/` or edit `sam-input/TODO.xml` and save. A hook transcribes the audio with local Whisper and calls Claude Code to act on whatever you dictated — overnight or while you're at work. See `sam-input/README.md` for the schema.

## Status

Phase 1 MVP under autonomous build. See `BUILD_LOG.md` for the overnight build report, and `PLAN.md` for the full task breakdown.
```

**Step 21.** Commit: `git add README.md LICENSE .gitignore PLAN.md && git commit -m "docs: plan, pretty README, license, gitignore" && git push`.

---

## 4. Repository scaffold files

**Step 22.** Create the directory structure:

```bash
mkdir -p src/app src/components src/lib src/server src/trigger
mkdir -p prisma
mkdir -p tests/unit tests/integration tests/e2e
mkdir -p fixtures
mkdir -p docs
mkdir -p sam-input/audio sam-input/.processed
mkdir -p .claude/agents .claude/commands .claude/skills .claude/hooks
mkdir -p scripts
touch sam-input/audio/.gitkeep
touch sam-input/.processed/.gitkeep
```

**Step 23.** Write `CLAUDE.md` at repo root. This is the build contract — every subagent reads it before work.

```markdown
# CPA Study System — Build Contract

Source of truth: `PLAN.md`. Read it before every task.

## Stack (locked)
- TypeScript strict, no `any`, no `@ts-ignore`
- Node 22, pnpm
- Next.js (App Router) + Tailwind
- Prisma + Postgres
- Trigger.dev v3 — all long-running work
- Local whisper.cpp via smart-whisper — NEVER OpenAI Whisper API
- Claude Sonnet 4.6 via OAuth for dev, Anthropic API for prod
- Cloudflare R2 blobs
- ffmpeg local in Trigger.dev task container

## Commands
- `pnpm dev` — Next.js
- `pnpm test` — Vitest
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — eslint
- `pnpm e2e` — Playwright
- `pnpm prisma migrate dev` — migrate
- `npx trigger.dev@latest dev` — Trigger.dev runner

## Conventions
- Named exports only (except Next.js page/layout/route files).
- Colocate tests with source (`foo.ts` → `foo.test.ts`).
- Zod validation at every boundary.
- All long tasks emit the `StageProgress` shape via Trigger.dev metadata.
- Use realtime (`useRealtimeRun`), never polling.

## Do-nots
- No OpenAI API calls.
- No polling endpoints.
- No hardcoded secrets. `.env` only. Commit `.env.example` only.
- No default exports outside Next.js pages.
- No `any`, no `@ts-ignore`.

## Workflow
- One PLAN.md task per session; `/clear` between tasks.
- Enter Plan Mode before coding.
- End each task with its Verification block. Commit only on pass.
- Delegate heavy work to subagents in `.claude/agents/`.
```

**Step 24.** Write `.claude/settings.json` (project-scoped). This enables Auto Dream at project level, restricts tools to the safe set, and sets Sonnet 4.6 as default.

```json
{
  "model": "claude-sonnet-4-6",
  "effort": "max",
  "auto_dream": true,
  "permissions": {
    "allow": [
      "Bash(pnpm:*)",
      "Bash(npx:*)",
      "Bash(npm:*)",
      "Bash(git:*)",
      "Bash(docker:*)",
      "Bash(docker compose:*)",
      "Bash(gh:*)",
      "Bash(ffmpeg:*)",
      "Bash(ffprobe:*)",
      "Bash(node:*)",
      "Bash(yt-dlp:*)",
      "Edit",
      "Write",
      "Read",
      "Grep",
      "Glob",
      "WebFetch",
      "WebSearch"
    ],
    "deny": [
      "Bash(rm -rf /:*)",
      "Bash(git push --force:*)",
      "Bash(git reset --hard origin/main:*)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": {
          "tool": "Write|Edit",
          "file_paths": ["sam-input/TODO.xml"]
        },
        "command": "node scripts/sam-input-dispatch.mjs xml"
      }
    ]
  }
}
```

**Step 25.** Write slash commands in `.claude/commands/`:

`task.md`:

```markdown
---
description: Execute a single task from PLAN.md end-to-end with subagents.
---

Read `PLAN.md` and find Task $1. Delegate to the `planner` subagent to produce a concrete implementation plan for that task's Scope. Present the plan. Then delegate to `implementer` to execute. Then delegate to `test-writer` for unit coverage. Then delegate to `verifier` to run the Verification block. Then delegate to `code-reviewer`. Commit only on a clean review.
```

`ralph.md`:

```markdown
---
description: Run the overnight Ralph loop through Phase 1 of PLAN.md.
---

Enter Ralph loop mode. For each task 1–10 in `PLAN.md` Phase 1, in order:
1. Delegate to `planner` → `implementer` → `test-writer` → `verifier` → `code-reviewer`.
2. Commit with a conventional message.
3. Push.
4. If verification fails twice in a row, delegate to `debugger` and retry once. If that also fails, document in `BUILD_LOG.md` and move to the next task.
5. Exit when every task has a passing Verification block. Emit `BUILD-COMPLETE`.
```

`verify.md`:

```markdown
---
description: Run the full verification suite (typecheck, lint, unit, integration, e2e).
---

Run in order, halting on first failure:
1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm e2e`
Summarize results in a table. Append to `BUILD_LOG.md`.
```

`fixtures.md`:

```markdown
---
description: Download and label Becker CPA practice videos as fixtures.
---

Use `yt-dlp` to pull 3 short Becker CPA practice question videos from YouTube into `fixtures/`. Choose videos that clearly show the Becker UI and include narrated reasoning. Name them `sample-3q.webm`, `sample-5q.webm`, `sample-corrupt.webm` (for the corrupt one, truncate the middle of an existing download with ffmpeg). Update `fixtures/README.md` with the source URLs and best-guess ground-truth timestamps derived from an ffprobe+Whisper scan.
```

**Step 26.** Commit the config + scaffold: `git add CLAUDE.md .claude/ .gitignore && git commit -m "chore: CLAUDE.md, slash commands, settings" && git push`.

---

## 5. Custom skills (10 new skills)

Create each of these as `SKILL.md` files inside `.claude/skills/<skill-name>/`. The skill name is the folder name. Every file includes YAML frontmatter with `name` and `description`, then a detailed instructions body.

**Step 27.** Create all 10 skill folders and files:

### 5.1 `.claude/skills/becker-ui-extractor/SKILL.md`

Purpose: Structured Claude-vision prompts for pulling question, choices, selected answer, correct answer, and Becker's explanation from keyframe images. Includes the locked JSON schema, the prompt template, fallback rules for missing fields, and a small-sample self-test fixture set.

### 5.2 `.claude/skills/local-whisper/SKILL.md`

Purpose: Best-practices wrapper for invoking `smart-whisper` (whisper.cpp) from Node: model selection rules (`small.en` default, `base.en` for speed-critical, `medium.en` when accuracy matters), stderr progress parsing (regex for `[MM:SS.fff --> MM:SS.fff]` and pct math), model weight caching in the Trigger.dev build extension, the word-timestamp output schema, and a "no speech detected" detection heuristic.

### 5.3 `.claude/skills/ffmpeg-pipeline/SKILL.md`

Purpose: Canonical ffmpeg flags for the three use cases in this project (scene detection, audio extraction, thumbnail/keyframe extraction), including stderr progress parsing (`time=HH:MM:SS.ms`), scene threshold tuning ranges, and the fallback order when scene detection fails.

### 5.4 `.claude/skills/trigger-dev-v3/SKILL.md`

Purpose: Conventions for writing Trigger.dev tasks in this repo — the `StageProgress` metadata shape, `metadata.set()` throttling rules (1/sec max), build extensions for bundling ffmpeg + whisper.cpp + model weights, machine size guidelines (`large-2x` default), retry policies, and realtime subscription from the Next.js client.

### 5.5 `.claude/skills/cpa-grading/SKILL.md`

Purpose: The grading prompt template, the 10-item feedback schema (with TBD placeholders until Sam locks them), the scoring math for accounting + consulting + combined, and the Zod schema used to validate Claude's grading response.

### 5.6 `.claude/skills/r2-storage/SKILL.md`

Purpose: Cloudflare R2 patterns: presigned PUT + GET generation via the AWS SDK v3, multipart upload with progress, blob key naming conventions (`recordings/<id>/raw.webm`, `clips/<questionId>/clip.webm`, etc.), and lifecycle/retention rules.

### 5.7 `.claude/skills/realtime-ui/SKILL.md`

Purpose: Frontend patterns for `@trigger.dev/react-hooks` `useRealtimeRun` — how to bind progress bars, how to render stage-level + per-question sub-progress, how to handle the failed-stage error state, and how to keep the status page keyboard-navigable.

### 5.8 `.claude/skills/sam-input-handler/SKILL.md`

Purpose: How the hook dispatcher parses `sam-input/TODO.xml` diffs, how audio uploads are transcribed and converted into task prompts, how ambiguous items are deferred into new `<blocker>` tags in the XML, and how the system reports back to Sam via log entries at the top of the XML.

### 5.9 `.claude/skills/fixture-harness/SKILL.md`

Purpose: How to write deterministic fixture tests — reading `fixtures/README.md` ground truth, pulling the matching recording, running the pipeline against it, and asserting within-tolerance matches on boundary timestamps, extracted text, and transcript alignment.

### 5.10 `.claude/skills/prisma-schema-steward/SKILL.md`

Purpose: The locked Prisma schema shape, enum conventions (`RecordingStatus`, `QuestionStatus`, `CpaSection`), migration rules (additive-only in Phase 1, no destructive ops without Sam approval), and the `Feedback.items` JSON schema that must stay synchronized with `cpa-grading`.

---

## 6. Subagent system

Subagents live in `.claude/agents/<name>.md` with YAML frontmatter. Each agent has a focused description, a locked tool allowlist, and a clear role. The top-level session orchestrates; agents do the work.

**Step 28.** Create all 12 subagent files:

### 6.1 `.claude/agents/planner.md`

```markdown
---
name: planner
description: Reads PLAN.md, selects the next task, and emits a concrete, step-by-step implementation plan scoped strictly to that task's Scope section. Never writes code. Use proactively at the start of every task.
tools: Read, Grep, Glob, WebSearch
---

You are the planning agent. For a given task number from PLAN.md:
1. Read the task's full entry, including Scope, Verification, and Commit-when.
2. Read CLAUDE.md for conventions.
3. Read any referenced skills from `.claude/skills/`.
4. Produce a numbered implementation plan of no more than 12 steps, each concrete and testable. Call out which files will be created or edited and which skill/subagent should handle each.
5. Flag any open question that must be resolved before the task can complete.

Return the plan as markdown. Do not execute it.
```

### 6.2 `.claude/agents/implementer.md`

```markdown
---
name: implementer
description: Writes and edits code to execute a plan produced by the planner. Respects CLAUDE.md conventions strictly. Use after planner finishes.
tools: Read, Write, Edit, Grep, Glob, Bash
---

You are the implementation agent. Given a plan, execute it by writing code. Rules:
- Follow CLAUDE.md conventions exactly (strict TS, no any, named exports, Zod at boundaries, realtime not polling).
- Write the minimum code to satisfy the plan. No speculative features.
- If a skill exists for a subtask (e.g., `local-whisper`, `trigger-dev-v3`), load it and follow its patterns.
- Do not write tests — the test-writer handles that.
- Do not commit — the orchestrator handles that.
- If a step is ambiguous or impossible, stop and summarize; do not improvise beyond the plan.
```

### 6.3 `.claude/agents/test-writer.md`

```markdown
---
name: test-writer
description: Writes Vitest unit and integration tests and Playwright E2E tests for freshly implemented code. Use after implementer finishes and before verifier.
tools: Read, Write, Edit, Grep, Glob, Bash
---

You are the test author. For each new module implemented in the current task:
- Write a colocated `*.test.ts` with Vitest covering the happy path, edge cases, and error paths.
- Add an integration test in `tests/integration/` if the module crosses a boundary (DB, R2, Trigger.dev, external API).
- Add a Playwright E2E test in `tests/e2e/` when the task has user-visible UI.
- Run the new tests before handing off. Fix compile/lint errors in the tests themselves. Do not "fix" production code to make a bad test pass — that's the debugger's job.
```

### 6.4 `.claude/agents/verifier.md`

```markdown
---
name: verifier
description: Runs the Verification block from PLAN.md for the current task and reports pass/fail with evidence. Read-only plus test runs. Use after test-writer.
tools: Read, Grep, Glob, Bash
---

You are the verification agent. For the current task:
1. Read its Verification block from PLAN.md.
2. Execute each check literally. If a check says "on fixtures/sample-3q.webm, produce exactly 3 clips within ±2s of ground truth," run the pipeline and assert.
3. Also run `pnpm typecheck && pnpm lint && pnpm test`.
4. Return a structured report: PASS / FAIL per check, command output, file diffs touched in this task.
Do not write code. If a check fails, hand off to the debugger.
```

### 6.5 `.claude/agents/code-reviewer.md`

```markdown
---
name: code-reviewer
description: Reviews a task's diff against CLAUDE.md conventions, PLAN.md scope, and security + perf best-practices before commit. Use after verifier passes.
tools: Read, Grep, Glob, Bash
---

You are the reviewer. Read the current task's diff (`git diff HEAD`). Check:
- CLAUDE.md conventions (named exports, strict TS, Zod, realtime-not-polling, no OpenAI API calls).
- Security: no hardcoded secrets, no credentials in .env.example, no PII logged.
- Performance: no N+1 DB queries, no unbounded loops, no synchronous blocking IO in hot paths.
- Scope: no code outside the current PLAN.md task's Scope section.
- Tests: adequate coverage for new logic.

Return PASS or FAIL with a list of specific concerns. Do not edit code.
```

### 6.6 `.claude/agents/debugger.md`

```markdown
---
name: debugger
description: Reproduces and fixes failing verifications. Use when verifier returns FAIL.
tools: Read, Write, Edit, Grep, Glob, Bash
---

You are the debug agent. Given a failing check:
1. Reproduce the failure locally with the exact command the verifier used.
2. Instrument minimally to find the root cause.
3. Apply the smallest possible fix.
4. Re-run the failing check. Repeat until it passes or you've tried 3 distinct approaches.
5. If still failing after 3 attempts, write the evidence trail into `BUILD_LOG.md` under the current task and hand back control.
```

### 6.7 `.claude/agents/schema-guardian.md`

```markdown
---
name: schema-guardian
description: Validates Prisma migrations and ensures the schema stays aligned with PLAN.md data contracts and the cpa-grading skill's Feedback schema. Use whenever prisma/schema.prisma changes.
tools: Read, Grep, Glob, Bash
---

You are the schema guardian. On any change to `prisma/schema.prisma`:
- Compare against the locked schema shape in `.claude/skills/prisma-schema-steward/SKILL.md`.
- Reject destructive migrations (drops, renames without rename-preserving migration files) unless the current task explicitly authorizes them.
- Run `pnpm prisma validate` and `pnpm prisma format`.
- Return PASS or FAIL with the specific migration concerns.
```

### 6.8 `.claude/agents/ffmpeg-expert.md`

```markdown
---
name: ffmpeg-expert
description: Deep expertise in ffmpeg for segmentation, scene detection, audio extraction, and progress parsing. Use when implementing or debugging anything in src/server/video/* or Task 4.
tools: Read, Write, Edit, Grep, Glob, Bash
---

You are the ffmpeg specialist. Load `.claude/skills/ffmpeg-pipeline/SKILL.md` on startup. Produce ffmpeg command strings tuned for Becker screen recordings (16:9, 30fps, UI-heavy, minimal motion). Always include stderr progress parsing. Document the chosen flags in a comment above the call site.
```

### 6.9 `.claude/agents/trigger-dev-expert.md`

```markdown
---
name: trigger-dev-expert
description: Deep expertise in Trigger.dev v3 task design, progress metadata, build extensions, and realtime subscriptions. Use when writing or reviewing anything in /src/trigger.
tools: Read, Write, Edit, Grep, Glob, Bash
---

You are the Trigger.dev specialist. Load `.claude/skills/trigger-dev-v3/SKILL.md` on startup. All tasks you write must emit `StageProgress` metadata on a throttled cadence, set explicit retry policies, and declare required build extensions (ffmpeg, whisper.cpp, model weights).
```

### 6.10 `.claude/agents/security-auditor.md`

```markdown
---
name: security-auditor
description: Scans for secret leaks, missing .gitignore entries, unsafe deserialization, and SSRF vectors. Runs before every push.
tools: Read, Grep, Glob, Bash
---

You are the security auditor. Before every push:
- `git diff --cached` — scan for anything that looks like a secret (regex: sk-, pk_, SG\\.[A-Za-z0-9], AKIA, etc.).
- Confirm `.env` is gitignored.
- Scan for `dangerouslySetInnerHTML`, `eval(`, `new Function(`, unbounded `fetch(` calls without timeout or URL allowlist.
- Return PASS or FAIL with file:line citations.
```

### 6.11 `.claude/agents/ui-builder.md`

```markdown
---
name: ui-builder
description: Builds React components and pages per the realtime-ui skill. Use for any work under src/app or src/components.
tools: Read, Write, Edit, Grep, Glob, Bash
---

You are the UI builder. Load `.claude/skills/realtime-ui/SKILL.md` on startup. Use Tailwind, keep components server-rendered unless client state or realtime is needed, bind progress to `useRealtimeRun`, keep accessibility intact (keyboard nav, aria-labels, focus rings).
```

### 6.12 `.claude/agents/sam-input-listener.md`

```markdown
---
name: sam-input-listener
description: Invoked by the file-watcher hook when sam-input/TODO.xml or sam-input/audio/* changes. Parses the new content and dispatches work.
tools: Read, Write, Edit, Grep, Glob, Bash
---

You are Sam's asynchronous work intake. Load `.claude/skills/sam-input-handler/SKILL.md` on startup. When invoked:
- Diff the XML against `sam-input/.processed/last.xml` to find new items.
- For any new audio file in `sam-input/audio/`, run local whisper.cpp against it, convert transcript to task prompts, and append to the XML.
- Dispatch each new `<item>` to the orchestrator. Move processed items into a `<done>` section with a timestamp. Copy the current XML into `sam-input/.processed/last.xml`.
- Never delete anything. Everything Sam wrote is preserved in the `<done>` block.
```

**Step 29.** Commit: `git add .claude/ && git commit -m "feat(claude): 12 subagents + 10 skills" && git push`.

---

## 7. Sam's async input system

**Step 30.** Create `sam-input/README.md`:

```markdown
# Sam's async input

Drop work here and I'll pick it up.

## Two ways to send me work

**1. Edit `TODO.xml` and save.**
A PostToolUse hook fires when the XML changes, parses the diff, and kicks off a Claude Code run with whatever you wrote.

**2. Drop an audio file in `audio/`.**
Any `*.wav`, `*.m4a`, or `*.mp3` is transcribed locally with whisper.cpp. The transcript is appended to `TODO.xml` as a new `<item>` with `source="audio"`, and the file is moved to `.processed/audio-archive/`.

## What gets preserved

- All your raw XML entries stay in the file. Completed ones move into `<done>` with a timestamp.
- Audio originals are archived, never deleted.
- Full processing log lives in `BUILD_LOG.md` at repo root.

## Status

Current state snapshot is written to `sam-input/.processed/last.xml` after every run.
```

**Step 31.** Create `sam-input/TODO.xml` with an empty template Sam can fill:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sam-input>
  <meta>
    <owner>Sam Carlson</owner>
    <project>CPA Study App v3</project>
  </meta>

  <items>
    <!--
      Add <item> entries below. Each has:
        - id: unique, e.g. "2026-04-17-01"
        - priority: "urgent" | "normal" | "low"
        - kind: "feature" | "fix" | "question" | "tweak" | "blocker"
        - body: what you want done, in plain English
      Example:
      <item id="2026-04-17-01" priority="normal" kind="tweak">
        <body>Make the progress bar purple instead of blue on the status page.</body>
      </item>
    -->
  </items>

  <blockers>
    <!-- Things I can't do without you. E.g., OAuth logins, payments, secrets. -->
  </blockers>

  <done>
    <!-- Completed items moved here automatically. Don't edit. -->
  </done>

  <log>
    <!-- Most recent first. Don't edit. -->
  </log>
</sam-input>
```

**Step 32.** Create `scripts/sam-input-dispatch.mjs` — the hook script that runs when the XML is saved or a new audio file appears:

```javascript
#!/usr/bin/env node
// Dispatcher for sam-input. Invoked by .claude/settings.json PostToolUse hook
// and by the chokidar watcher (scripts/sam-input-watch.mjs).
//
// Usage: node scripts/sam-input-dispatch.mjs <mode>
//   mode = "xml"   — diff TODO.xml vs last.xml, spawn claude for new <item>s
//   mode = "audio" — transcribe any *.wav|*.m4a|*.mp3 in sam-input/audio,
//                    append to TODO.xml, then re-run in "xml" mode.
//
// Auth: relies on the ambient CLAUDE_CODE_OAUTH_TOKEN env var. No API keys.

import { execSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync } from "node:fs";
import { join } from "node:path";

const REPO = process.cwd();
const XML = join(REPO, "sam-input", "TODO.xml");
const PROCESSED_DIR = join(REPO, "sam-input", ".processed");
const LAST_XML = join(PROCESSED_DIR, "last.xml");
const AUDIO_DIR = join(REPO, "sam-input", "audio");
const AUDIO_ARCHIVE = join(PROCESSED_DIR, "audio-archive");

if (!existsSync(PROCESSED_DIR)) mkdirSync(PROCESSED_DIR, { recursive: true });
if (!existsSync(AUDIO_ARCHIVE)) mkdirSync(AUDIO_ARCHIVE, { recursive: true });

const mode = process.argv[2] ?? "xml";

if (mode === "audio") {
  for (const file of readdirSync(AUDIO_DIR).filter((f) => /\.(wav|m4a|mp3)$/i.test(f))) {
    const src = join(AUDIO_DIR, file);
    // Local whisper.cpp transcription
    const out = execSync(
      `npx -y smart-whisper transcribe --model small.en --input "${src}" --format text`,
      { encoding: "utf8" }
    ).trim();
    // Append to TODO.xml under <items>
    const xml = readFileSync(XML, "utf8");
    const id = `${new Date().toISOString().slice(0, 10)}-audio-${Date.now()}`;
    const item = `\n    <item id="${id}" priority="normal" kind="feature" source="audio:${file}">\n      <body>${escapeXml(out)}</body>\n    </item>`;
    const updated = xml.replace(/(<items>)/, `$1${item}`);
    writeFileSync(XML, updated);
    renameSync(src, join(AUDIO_ARCHIVE, file));
  }
  // Fall through to xml dispatch
}

// Diff mode: compare current XML vs last-processed snapshot
const current = readFileSync(XML, "utf8");
const last = existsSync(LAST_XML) ? readFileSync(LAST_XML, "utf8") : "";
if (current === last) {
  process.exit(0);
}

// Extract new <item> blocks (naive but sufficient for this single-user setup)
const newItems = extractItems(current).filter((it) => !last.includes(`id="${it.id}"`));
if (newItems.length === 0) {
  writeFileSync(LAST_XML, current);
  process.exit(0);
}

// Dispatch each new item to Claude Code via OAuth
for (const it of newItems) {
  const prompt = `Work on this item from Sam, then move it into <done> in sam-input/TODO.xml when complete:\n\nID: ${it.id}\nKind: ${it.kind}\nPriority: ${it.priority}\nBody:\n${it.body}\n\nRespect CLAUDE.md conventions. Commit and push when done.`;
  spawnSync("claude", ["-p", prompt, "--permission-mode", "acceptEdits"], {
    stdio: "inherit",
    env: process.env, // carries CLAUDE_CODE_OAUTH_TOKEN
  });
}

writeFileSync(LAST_XML, current);

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function extractItems(xml) {
  const items = [];
  const re = /<item\s+id="([^"]+)"\s+priority="([^"]+)"\s+kind="([^"]+)"[^>]*>\s*<body>([\s\S]*?)<\/body>\s*<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    items.push({ id: m[1], priority: m[2], kind: m[3], body: m[4].trim() });
  }
  return items;
}
```

**Step 33.** Create `scripts/sam-input-watch.mjs` — a chokidar watcher Sam can leave running to catch audio uploads in real time:

```javascript
#!/usr/bin/env node
// Long-running watcher for sam-input/audio/*.
// Run with: node scripts/sam-input-watch.mjs
// Keeps running; every new audio file triggers the dispatcher.

import chokidar from "chokidar";
import { spawnSync } from "node:child_process";

const AUDIO_DIR = "sam-input/audio";
console.log(`[sam-input-watch] watching ${AUDIO_DIR}/ for new audio files`);

const watcher = chokidar.watch(`${AUDIO_DIR}/*.{wav,m4a,mp3}`, {
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
});

watcher.on("add", (path) => {
  console.log(`[sam-input-watch] new audio: ${path}`);
  spawnSync("node", ["scripts/sam-input-dispatch.mjs", "audio"], { stdio: "inherit" });
});
```

**Step 34.** Install `chokidar` and `smart-whisper`:

```bash
pnpm add -D chokidar
pnpm add smart-whisper @trigger.dev/sdk @trigger.dev/react-hooks
```

**Step 35.** Commit: `git add sam-input/ scripts/ package.json pnpm-lock.yaml && git commit -m "feat(sam-input): XML todo + audio hook + dispatcher" && git push`.

---

## 8. Next.js + Prisma + Trigger.dev scaffold

**Step 36.** Scaffold Next.js into the existing repo root (non-interactive):

```bash
pnpm create next-app@latest . --ts --app --tailwind --eslint --src-dir --import-alias "@/*" --use-pnpm --no-git
```

If that complains the directory isn't empty, copy the existing repo contents aside, scaffold into a temp dir, merge, and restore.

**Step 37.** Install Prisma, set up Postgres via Docker Compose, define initial schema, migrate:

```bash
pnpm add -D prisma
pnpm add @prisma/client zod
pnpm prisma init
```

Write `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: cpa_study
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata: {}
```

Write `prisma/schema.prisma` matching the schema locked in PLAN.md Task 1 (Recording, Question, Feedback, StageProgress with the enums). Run `pnpm prisma migrate dev --name init`.

**Step 38.** Initialize Trigger.dev in-repo:

```bash
npx trigger.dev@latest init
```

Accept defaults. This creates `trigger.config.ts` and the `src/trigger/` folder.

**Step 39.** Configure Trigger.dev build extensions for ffmpeg + whisper.cpp. Edit `trigger.config.ts` to include the ffmpeg extension and a custom extension that installs whisper.cpp + downloads `ggml-small.en.bin` during image build. (Reference the `trigger-dev-v3` skill for the exact pattern.)

**Step 40.** Write `.env.example` (no secrets, just shape):

```
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cpa_study"

# Cloudflare R2
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="cpa-study-v3"
R2_PUBLIC_URL=""

# Trigger.dev
TRIGGER_PROJECT_ID=""
TRIGGER_SECRET_KEY=""

# Anthropic — leave empty for now, OAuth Claude Code is used during dev
ANTHROPIC_API_KEY=""
```

Write a matching `.env` file with empty values. Add an entry to `sam-input/TODO.xml` `<blockers>` listing exactly which keys Sam needs to fill when he's back online.

**Step 41.** Commit: `git add . && git commit -m "feat(scaffold): next.js + prisma + trigger.dev + docker" && git push`.

---

## 9. Testing infrastructure

**Step 42.** Install and configure Vitest + Playwright:

```bash
pnpm add -D vitest @vitest/ui @vitejs/plugin-react
pnpm add -D @playwright/test
pnpm exec playwright install --with-deps chromium
```

Write `vitest.config.ts`, `playwright.config.ts`, and wire up `pnpm test` + `pnpm e2e` in `package.json`.

**Step 43.** Write smoke tests that must pass on the empty scaffold:

- `src/lib/hello.test.ts` — trivial sanity check.
- `tests/integration/db.test.ts` — connects to local Postgres, runs a trivial query.
- `tests/e2e/home.spec.ts` — Playwright hits `/` and asserts the page renders without console errors.

Run `pnpm typecheck && pnpm lint && pnpm test && pnpm e2e`. All must pass before proceeding.

**Step 44.** Commit: `git add . && git commit -m "test: vitest + playwright smoke tests passing" && git push`.

---

## 10. MCPs

Install every MCP the project needs. Skip only the ones that require a login Sam must do himself.

**Step 45.** Install filesystem, postgres, github, and fetch MCPs at project scope:

```bash
claude mcp add filesystem --scope local -- npx -y @modelcontextprotocol/server-filesystem .
claude mcp add postgres --scope local -- npx -y @modelcontextprotocol/server-postgres "postgresql://postgres:postgres@localhost:5432/cpa_study"
claude mcp add fetch --scope local -- npx -y @modelcontextprotocol/server-fetch
```

For GitHub, the CLI-based one that uses `gh auth` is best (no PAT needed):

```bash
claude mcp add github --scope local -- npx -y @modelcontextprotocol/server-github
```

If any of those don't exist yet, write a tiny local MCP shim in `scripts/mcps/<name>/` using the MCP SDK. Do not skip — build it.

**Step 46.** Verify: `claude mcp list`. Log which are connected in `BUILD_LOG.md`.

---

## 11. Fixture acquisition from public Becker videos

**Step 47.** Install `yt-dlp`: `winget install -e --id yt-dlp.yt-dlp`.

**Step 48.** Run `/fixtures` or the equivalent skill to download 3 real Becker CPA practice videos from YouTube. Use search queries like `"becker cpa practice question walkthrough"`, `"becker AUD practice problem"`, and pick the ones with clear narration and visible Becker UI.

Download at 720p to keep sizes reasonable:

```bash
yt-dlp -f "bv*[height<=720]+ba/b[height<=720]" -o "fixtures/sample-3q.%(ext)s" "<url1>"
yt-dlp -f "bv*[height<=720]+ba/b[height<=720]" -o "fixtures/sample-5q.%(ext)s" "<url2>"
yt-dlp -f "bv*[height<=720]+ba/b[height<=720]" -o "fixtures/sample-long.%(ext)s" "<url3>"
```

Then build a `sample-corrupt.webm` by truncating `sample-long.webm` mid-file with ffmpeg to simulate a crashed recording.

**Step 49.** Run the `fixture-harness` skill to generate best-guess ground-truth timestamps for each fixture by running ffprobe + local Whisper and writing `fixtures/README.md`. Flag every guess so Sam can tighten them later via `sam-input/TODO.xml`.

**Step 50.** Commit: `git add fixtures/ && git commit -m "test: becker fixture videos + ground truth" && git push`. Note: `.gitignore` excludes the actual `.webm` files — only `fixtures/README.md` and the ground-truth JSON get committed. The videos stay local.

---

## 12. Full verification before entering the Ralph loop

**Step 51.** Run the complete verification suite:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm e2e
```

**Step 52.** Run a smoke check of the full tool surface:

- Claude Code slash commands — `/task`, `/ralph`, `/verify`, `/fixtures` all present in `.claude/commands/`.
- All 12 subagents present in `.claude/agents/` and loadable.
- All 10 skills present in `.claude/skills/`.
- All MCPs green in `claude mcp list`.
- Trigger.dev dev runner starts: `npx trigger.dev@latest dev` for 10 seconds then shut down cleanly.
- Prisma migrations applied: `pnpm prisma migrate status` returns clean.
- Local Postgres up: `docker compose ps postgres` shows running.
- Env vars set: `$env:CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` is `1`.

Any failure here → log + attempt a fix → log fix → retry. Do not proceed to the Ralph loop until this passes.

**Step 53.** Commit + push: `git add . && git commit -m "chore: pre-ralph verification green" && git push`.

---

## 13. Ralph loop — implement Phase 1 of PLAN.md

**Step 54.** Enter the Ralph loop. Either invoke `/ralph` or run the following driver script and let it continue until completion.

Create `scripts/ralph.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
MAX_TASKS=10
COMPLETION_PROMISE="BUILD-COMPLETE"

for task in $(seq 1 $MAX_TASKS); do
  echo "=== Ralph iteration: Task $task ==="
  claude -p "/task $task" --permission-mode acceptEdits --output-format json > ".claude/cache/ralph-task-$task.json" || {
    echo "Task $task failed — delegating to debugger once"
    claude -p "Task $task failed. Delegate to the debugger subagent. If debugger cannot fix after 3 attempts, document in BUILD_LOG.md and return control." --permission-mode acceptEdits
  }
  # Verify this task's checks pass before moving on
  claude -p "/verify" --permission-mode acceptEdits
  git push
done

claude -p "All tasks attempted. Produce a final summary in BUILD_LOG.md and emit $COMPLETION_PROMISE."
echo "$COMPLETION_PROMISE"
```

Make it executable: `chmod +x scripts/ralph.sh` (or run it via `bash scripts/ralph.sh` on Windows Git Bash).

**Step 55.** Run the Ralph loop: `bash scripts/ralph.sh 2>&1 | tee BUILD_LOG.md`. The loop invokes `/task 1` through `/task 10` in sequence. For each task:

1. `planner` reads PLAN.md and emits a concrete plan.
2. `implementer` writes code per the plan.
3. `test-writer` adds unit + integration + e2e tests.
4. `verifier` runs the task's Verification block.
5. `code-reviewer` reviews the diff.
6. On pass → commit + push.
7. On fail → `debugger` gets one retry; if still failing, log and move on.

**Step 56.** After the loop exits with `BUILD-COMPLETE`, run the final audit:

- `pnpm typecheck && pnpm lint && pnpm test && pnpm e2e`
- Record all 10 PLAN.md task outcomes in a PASS/FAIL table appended to `BUILD_LOG.md`.
- `security-auditor` final sweep.
- `git push`.

**Step 57.** Write a top-of-file summary to `BUILD_LOG.md` that Sam can skim in 60 seconds:

- What built cleanly.
- What's blocked (in `sam-input/TODO.xml` as `<blocker>`s).
- How to run the app locally (`pnpm dev` + `docker compose up -d postgres` + `npx trigger.dev@latest dev`).
- Next recommended action.

**Step 58.** Final commit + push: `git add BUILD_LOG.md && git commit -m "chore: overnight build report" && git push`.

---

## 14. Rate-limit resilience — survive the 5-hour cap and resume

The Max 20x plan resets its usage window every ~5 hours. If a long overnight run exhausts the window, the Anthropic API starts returning rate-limit errors and the current Claude Code session cannot continue in-place. Recovery requires an external wrapper script that detects the exit, sleeps for 4 hours (buffered past the 5-hour reset), and resumes via `claude --continue`.

**Step R1.** Very early in the run (do this before starting Section 1 work if possible, or during Section 4 at the latest), write a resumable state file at the repo root, `RESUME_STATE.md`. Initialize it with:

```markdown
# Resume state

status: running
last-completed-section: 0
last-completed-step: 0
next-action: start Section 1
iteration: 1
updated: <ISO-8601 timestamp>

## Notes for the wrapper
The wrapper script `scripts/overnight.ps1` reads this file between Claude invocations.
- If `status: BUILD-COMPLETE` → wrapper exits.
- Otherwise → wrapper sleeps 4 hours, then runs `claude --continue` to resume.
```

**Step R2.** Update `RESUME_STATE.md` at the end of every section (1, 2, 3, …, 13) AND before any planned graceful exit. The update is a small commit; push it. This is the wrapper's only source of truth for "where are we."

**Step R3.** Detect rate-limit pressure proactively. If any of these happen, treat it as imminent-cap and gracefully exit rather than crashing mid-work:

- Any tool call returns an error message matching `rate_limit`, `usage_limit`, `Retry after`, or `5-hour`.
- You observe that the current session has consumed substantially more effort than the remaining work (subjective — bias toward exiting early rather than crashing).
- You're mid-Ralph-loop and Task N has been retrying for >30 minutes with no forward motion.

On detection:

1. Write `status: rate-limited` and a `resume-instruction:` line to `RESUME_STATE.md` describing the exact next action.
2. Commit and push with message `chore: rate limit hit, saving state for wrapper resume`.
3. Print to stdout: `CLAUDE-EXIT-FOR-RESUME`. The wrapper greps for this token.
4. Exit the session (you do this by ending your response — the wrapper sees the `-p` call complete).

**Step R4.** Create `scripts/overnight.ps1` — the PowerShell wrapper that loops, sleeps, and resumes. Write it to the repo. It is idempotent: Sam can also run it manually tomorrow morning if needed.

```powershell
# scripts/overnight.ps1 — overnight orchestrator with rate-limit sleep/resume.
# Run: powershell -ExecutionPolicy Bypass -File scripts\overnight.ps1
#
# Contract with Claude Code:
#   - Claude writes RESUME_STATE.md at the end of every section.
#   - Claude sets `status: BUILD-COMPLETE` when the whole playbook is done.
#   - Claude prints `CLAUDE-EXIT-FOR-RESUME` when it detects rate-limit pressure.
#
# Wrapper behavior:
#   - First iteration: launches Claude with the opening prompt from OPENING_PROMPT.md
#     (Sam creates this file once with the exact prompt he wants Claude to start with).
#   - Subsequent iterations: `claude --continue` with a "resume from RESUME_STATE.md"
#     nudge, after sleeping 4 hours.
#   - Exits cleanly when RESUME_STATE.md shows BUILD-COMPLETE or MaxIterations hit.

param(
    [int]$MaxIterations = 8,
    [int]$SleepSeconds  = 14400  # 4 hours
)

$ErrorActionPreference = "Continue"
$log = Join-Path $PSScriptRoot "..\OVERNIGHT_LOG.txt"
$state = Join-Path $PSScriptRoot "..\RESUME_STATE.md"
$openingPrompt = Join-Path $PSScriptRoot "..\OPENING_PROMPT.md"

function Log($msg) {
    $line = "[$((Get-Date).ToString('o'))] $msg"
    Write-Host $line
    Add-Content -Path $log -Value $line
}

function BuildComplete {
    if (-not (Test-Path $state)) { return $false }
    return (Select-String -Path $state -Pattern "status:\s*BUILD-COMPLETE" -Quiet)
}

Log "overnight.ps1 starting. MaxIterations=$MaxIterations, SleepSeconds=$SleepSeconds"

for ($i = 1; $i -le $MaxIterations; $i++) {
    Log "=== Iteration $i ==="

    if ($i -eq 1) {
        if (-not (Test-Path $openingPrompt)) {
            Log "FATAL: OPENING_PROMPT.md missing. Create it with the exact prompt you want Claude to start from."
            exit 2
        }
        $prompt = Get-Content $openingPrompt -Raw
        & claude --permission-mode acceptEdits -p $prompt 2>&1 | Tee-Object -FilePath $log -Append
    } else {
        $resumePrompt = "Resume the overnight build from RESUME_STATE.md. Read that file first, identify the next action, and continue. Keep writing RESUME_STATE.md at every section boundary. Exit cleanly with CLAUDE-EXIT-FOR-RESUME if you hit rate-limit pressure again."
        & claude --continue --permission-mode acceptEdits -p $resumePrompt 2>&1 | Tee-Object -FilePath $log -Append
    }

    if (BuildComplete) {
        Log "RESUME_STATE.md shows BUILD-COMPLETE. Exiting successfully."
        break
    }

    if ($i -eq $MaxIterations) {
        Log "Max iterations reached without BUILD-COMPLETE. Check RESUME_STATE.md and BUILD_LOG.md."
        break
    }

    Log "Claude session ended. Sleeping $SleepSeconds seconds before resume (buffers past the 5-hour Max cap reset)."
    # Heartbeat every 15 minutes so Sam can see the script is alive
    $heartbeatInterval = 900
    $elapsed = 0
    while ($elapsed -lt $SleepSeconds) {
        Start-Sleep -Seconds ([Math]::Min($heartbeatInterval, $SleepSeconds - $elapsed))
        $elapsed += $heartbeatInterval
        Log "…sleeping, $([int](($SleepSeconds - $elapsed) / 60)) min remaining"
    }
}

Log "overnight.ps1 exiting."
```

**Step R5.** Commit and push the wrapper: `git add scripts/overnight.ps1 RESUME_STATE.md && git commit -m "feat(wrapper): overnight auto-resume on rate limit" && git push`.

**Step R6.** Update the Ralph loop driver in Section 13 to also write `RESUME_STATE.md` between iterations. After each PLAN.md task completes, update:

```
last-completed-section: 13
last-completed-step: <task-N>
next-action: start Task <N+1>
iteration: <current-wrapper-iteration>
```

**Step R7.** When the playbook is fully done, write:

```
status: BUILD-COMPLETE
finished: <ISO-8601>
summary: See BUILD_LOG.md
```

to `RESUME_STATE.md`. Commit and push. The wrapper sees this and exits.

### How Sam launches this instead of bare `claude`

Sam's overnight launch command becomes two steps:

1. Save the opening prompt to `OPENING_PROMPT.md` at the repo root (the "paste this" message from the handoff).
2. Run:

   ```powershell
   cd "C:\Users\hotre\Desktop\Coding Projects\CPA-Study-App-v3"
   powershell -ExecutionPolicy Bypass -File scripts\overnight.ps1
   ```

The wrapper handles the rest: first run with the opening prompt, exit detection, 4-hour sleep, resume, repeat up to 8 times (~32 hours of wall-clock headroom). If it finishes before the cap, it never sleeps — it just exits.

### Known limits of this setup

- `claude --continue` resumes the most recent session for the user. Do not run other `claude` invocations in parallel during the overnight run or `--continue` may attach to the wrong session.
- OAuth tokens in non-interactive mode (`-p`) have been reported to occasionally 401 after ~10–15 minutes. If that happens, the wrapper will log the 401 and retry on the next cycle; worst case Sam re-runs `claude setup-token` in the morning and relaunches the wrapper.
- Windows sleep/hibernate will suspend the wrapper. Set the power plan to "Never sleep" while plugged in before bed.

---

## 15. Handoff artifact: what Sam will see in the morning

When Sam wakes up, the repo should contain:

- A green CI-passing commit on `main`.
- `BUILD_LOG.md` summarizing the night's work, what passed, what's in `sam-input/TODO.xml` as blocked.
- A running Docker Postgres (if he left Docker Desktop open).
- All 12 subagents, 10 skills, 4 slash commands, and the sam-input pipeline fully wired.
- PLAN.md Phase 1 Tasks 1–10 each with their Verification block green, OR with a concrete `<blocker>` explaining why.
- The app running locally with `pnpm dev` + `npx trigger.dev@latest dev`.
- The sam-input watcher usable: `node scripts/sam-input-watch.mjs` in a background terminal, or audio drops caught by the PostToolUse hook.

Emit the completion promise: `BUILD-COMPLETE`.

---

## Appendix A: environment variables quick reference

| Variable | Value | Purpose |
|---|---|---|
| `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` | `1` | Fix Feb–Mar 2026 regression; force fixed thinking budget |
| `CLAUDE_CODE_EFFORT_LEVEL` | `max` | Force max reasoning effort every turn |
| `CLAUDE_CODE_OAUTH_TOKEN` | `<from claude setup-token>` | Headless OAuth auth, no API key |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/cpa_study` | Local dev Postgres |

Explicitly NOT set during dev: `ANTHROPIC_API_KEY`. OAuth only.

## Appendix B: how the sam-input loop closes

1. Sam edits `sam-input/TODO.xml` and saves, OR drops an audio file in `sam-input/audio/`.
2. PostToolUse hook (XML) or chokidar watcher (audio) fires `scripts/sam-input-dispatch.mjs`.
3. Audio → local whisper.cpp → new `<item>` appended to XML.
4. Dispatcher diffs current XML vs `.processed/last.xml`, identifies new `<item>`s.
5. For each, spawns `claude -p "<prompt>" --permission-mode acceptEdits` using the ambient OAuth token.
6. Claude acts — edits code, commits, pushes.
7. Dispatcher moves the item into `<done>` with timestamp and updates `last.xml`.
8. Everything is logged in `BUILD_LOG.md` and the XML's `<log>` section.

## Appendix C: if the Ralph loop stalls

Three protections:

- Circuit breaker: if the same task fails verification 3× in a row, the loop logs the failure, adds a `<blocker>` to `sam-input/TODO.xml`, and moves on.
- Time cap: every task has an implicit 45-minute budget. After that the debugger gives up.
- Cost cap: because we're on OAuth (Max plan), cost is bounded by the weekly usage cap, not API billing. If the Max cap is hit mid-loop, the loop pauses and writes a `<blocker>` explaining that Sam's Max window needs to reset.

---

**Begin execution now. Emit `BUILD-COMPLETE` when the entire document has been executed and PLAN.md Phase 1 verifications are either green or documented as blocked.**
