# Fixtures

Public Becker CPA content used for integration + e2e tests. The video files themselves are **not committed** (see `.gitignore`). Only this README and `ground-truth.json` are versioned.

To repopulate the fixtures on a new machine, run the `/fixtures` slash command or the commands in the section below.

## Files

| ID | File | Duration | Source | Notes |
|---|---|---|---|---|
| `sample-3q` | `sample-3q.mp4` | 10:58 | [Becker ExamSolver Sample Video 1](https://www.youtube.com/watch?v=a18BAkY14W8) | Happy-path 3-question walkthrough |
| `sample-5q` | `sample-5q.mkv` | 10:41 | [Becker ExamSolver Sample Video 2](https://www.youtube.com/watch?v=u6SSrht0LTc) | 5-question walkthrough; tests mid-length segmentation |
| `sample-long` | `sample-long.mkv` | 17:50 | [How To Pass The CPA Exam Using Becker CPA Review (2024 TUTORIAL)](https://www.youtube.com/watch?v=ymjN-H80Dgo) | Long-form stress test |
| `sample-corrupt` | `sample-corrupt.mkv` | — | synthetic (truncated `sample-long`) | Tests pipeline resilience / partial recovery |

Container formats vary because YouTube serves different codec families and `yt-dlp` won't remux an h264+aac stream into a webm container. The pipeline normalizes everything via `ffmpeg` before ingest, so container doesn't matter downstream — but tests that assert "webm" will break. Use `ffprobe` rather than extension sniffing.

## Ground truth

`ground-truth.json` contains tentative metadata: durations (authoritative, from `ffprobe`), expected question counts, and evenly-spaced placeholder boundaries. **Real segmentation boundaries were not manually verified.** Reviewers should tighten these by watching the clips and editing `ground-truth.json` in place, then adding a note to `sam-input/TODO.xml`.

## How to re-download

```powershell
winget install -e --id yt-dlp.yt-dlp
yt-dlp -f "bv*[height<=720]+ba/b[height<=720]" -o "fixtures/sample-3q.%(ext)s"   "https://www.youtube.com/watch?v=a18BAkY14W8"
yt-dlp -f "bv*[height<=720]+ba/b[height<=720]" -o "fixtures/sample-5q.%(ext)s"   "https://www.youtube.com/watch?v=u6SSrht0LTc"
yt-dlp -f "bv*[height<=720]+ba/b[height<=720]" -o "fixtures/sample-long.%(ext)s" "https://www.youtube.com/watch?v=ymjN-H80Dgo"
# Then truncate to make sample-corrupt (6 MiB):
dd if=fixtures/sample-long.mkv of=fixtures/sample-corrupt.mkv bs=1M count=6
```

## Legal / usage

These are Becker-owned videos pulled from their public YouTube channel for local development and automated testing only. **Do not commit the binary content, redistribute it, or include frames or transcripts in user-facing output.** The extracted question text is used only to train the extraction prompt and compare against what the pipeline recovers.
