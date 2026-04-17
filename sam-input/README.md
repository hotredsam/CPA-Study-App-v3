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
