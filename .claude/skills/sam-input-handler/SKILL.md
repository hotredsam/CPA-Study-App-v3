---
name: sam-input-handler
description: How the sam-input dispatcher parses TODO.xml diffs, transcribes audio drops, dispatches work to Claude, and records completion. Use when editing anything under scripts/sam-input-*.mjs or .claude/agents/sam-input-listener.md.
---

# Sam Input Handler

One-way channel for Sam to hand work to the orchestrator — by XML edit OR by audio drop. Everything is preserved; nothing Sam writes is ever lost.

## File layout

```
sam-input/
  README.md               # user-facing docs
  TODO.xml                # the one file Sam writes to
  audio/                  # drop zone for voice memos
    <file>.wav|m4a|mp3
    .gitkeep              # committed
  .processed/             # gitignored, runtime-only
    last.xml              # snapshot after the last dispatch
    audio-archive/        # moved audio originals
```

## XML shape (single source of truth)

```xml
<sam-input>
  <meta><owner>Sam Carlson</owner><project>CPA Study App v3</project></meta>
  <items>
    <item id="YYYY-MM-DD-NN" priority="urgent|normal|low" kind="feature|fix|question|tweak|blocker" source="audio:filename?">
      <body>plain English instruction</body>
    </item>
  </items>
  <blockers>
    <blocker id="..." reason="..."><body>...</body></blocker>
  </blockers>
  <done>
    <item id="..." completedAt="ISO-8601" by="claude-code"><body>original body</body><result>...</result></item>
  </done>
  <log>
    <entry at="ISO-8601" level="info|warn|error">...</entry>
  </log>
</sam-input>
```

## Dispatch flow (what `scripts/sam-input-dispatch.mjs` does)

1. If invoked with `audio` mode: iterate `sam-input/audio/*.{wav,m4a,mp3}`, run local whisper.cpp via `smart-whisper`, insert a new `<item>` into `<items>` with `source="audio:<filename>"`, then move the original into `.processed/audio-archive/<filename>`.
2. Regardless of mode: read `TODO.xml` and `.processed/last.xml`; extract `<item>` blocks that don't appear in `last.xml` (by `id`).
3. For each new item, `spawnSync("claude", ["-p", prompt, "--permission-mode", "acceptEdits"])` with the ambient `CLAUDE_CODE_OAUTH_TOKEN` env var.
4. Prompt Claude to complete the task AND move the item to `<done>` with an ISO-8601 timestamp. The dispatcher does not modify the XML after spawn — Claude is responsible for updating it (atomic, preserves log order).
5. After all spawns complete, write the current `TODO.xml` to `.processed/last.xml` as the new snapshot.

## Ambiguity handling

- If an item's body is too vague to act on, the responding Claude must add a new `<blocker>` with a question for Sam and leave the original item in `<items>` — do NOT move to `<done>`.
- If an item references a skill/tool that doesn't exist, log a warn to `<log>` and add a `<blocker>`.
- Never guess at credentials or secret values.

## Audio transcription details

- Model: `small.en` — short voice memos transcribe in seconds.
- `source` attribute must include the filename so Sam can trace which audio produced which item.
- If transcription is empty (`noSpeechDetected`), log a warn and move the audio file to `.processed/audio-archive/` without adding an item.

## Reporting back to Sam

- Top of `<log>`: append a one-line summary per dispatched item. Most recent first.
- Non-trivial completions also get a line in repo-root `BUILD_LOG.md` under a `### Sam-input completions` section.

## Do not

- Do not delete audio files — move to archive.
- Do not edit or delete existing `<item>` / `<blocker>` / `<done>` entries. Append-only, with status migrations via moving between sections.
- Do not dispatch if the XML fails to parse (corrupt). Log error to `<log>` via a brief repair append, and set a `<blocker id="xml-repair">`.
