---
description: Download and label Becker CPA practice videos as fixtures.
---

Use `yt-dlp` to pull 3 short Becker CPA practice question videos from YouTube into `fixtures/`. Choose videos that clearly show the Becker UI and include narrated reasoning. Name them `sample-3q.webm`, `sample-5q.webm`, `sample-corrupt.webm` (for the corrupt one, truncate the middle of an existing download with ffmpeg). Update `fixtures/README.md` with the source URLs and best-guess ground-truth timestamps derived from an ffprobe+Whisper scan.
