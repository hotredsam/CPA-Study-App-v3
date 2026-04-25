---
name: ffmpeg-pipeline
description: Canonical ffmpeg flags and progress parsing for the CPA study pipeline. Use when implementing Task 4 (segmentation) or any code that runs ffmpeg — scene detection, audio extraction, keyframe sampling, clip writing.
---

# ffmpeg Pipeline

Three use cases, three canonical command shapes. All commands stream stderr progress lines — parse them for UI feedback.

## 1. Scene detection (Task 4 Signal A)

```bash
ffmpeg -hide_banner -i "$RECORDING" \
  -vf "select='gt(scene,0.30)',showinfo" \
  -vsync vfr -f null - 2>&1
```

- Threshold: `0.30` is a good baseline for Becker screen recordings (mostly static, occasional UI transitions). Tune range: `0.20` (too sensitive) to `0.45` (misses subtle transitions).
- `showinfo` emits `Parsed_showinfo_1 ... pts_time:XX.XX` lines — scrape those for scene timestamps.
- Output to `-f null -` — we don't need the video, just the timestamps.

## 2. Audio extraction (Task 6)

```bash
ffmpeg -hide_banner -y -i "$CLIP" \
  -vn -ac 1 -ar 16000 -c:a pcm_s16le \
  "$OUT_WAV"
```

- Mono, 16 kHz, 16-bit PCM — exactly what whisper.cpp wants.
- `-vn` drops video. `-y` overwrites existing output.

## 3. Thumbnail / keyframe extraction (Tasks 4 + 5)

```bash
# Single thumbnail at a timestamp (question view, Task 4)
ffmpeg -hide_banner -y -ss "$TS_SEC" -i "$RECORDING" \
  -frames:v 1 -q:v 2 "$OUT_JPG"

# Sample N keyframes evenly across a span (Task 5)
ffmpeg -hide_banner -y -ss "$START" -to "$END" -i "$RECORDING" \
  -vf "fps=1/$INTERVAL" -q:v 2 "$OUT_PATTERN_%02d.jpg"
```

- `-ss` before `-i` seeks cheaply (not frame-accurate, but we don't need frame accuracy).
- `-q:v 2` is near-lossless JPEG.

## Clip writing (after segmentation boundaries are known)

```bash
ffmpeg -hide_banner -y -ss "$START" -to "$END" -i "$RECORDING" \
  -c copy "$OUT_WEBM"
```

- Use `-c copy` for speed when possible. If keyframe alignment causes A/V drift, fall back to `-c:v libvpx-vp9 -c:a libopus`.

## Progress parsing (stderr)

Every ffmpeg invocation emits lines like:

```
frame= 1234 fps= 30 q=-1.0 Lsize=N/A time=00:01:23.45 bitrate=N/A speed=2.5x
```

Regex: `/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/`

```ts
const [, hh, mm, ss, cs] = match;
const processedSec = +hh * 3600 + +mm * 60 + +ss + +cs / 100;
const pct = Math.min(100, (processedSec / totalDurationSec) * 100);
```

Throttle metadata updates to ≤1 Hz (see `trigger-dev-v3` skill).

## Fallback order for segmentation

If scene detection (Signal A) returns <2 candidates on a recording ≥3 min long, fall back — in this order:
1. Transcript cues (Signal B) alone.
2. Fixed-interval splits every 5 minutes with a `lowConfidence: true` flag on the resulting `Question` rows.
3. One `Question` spanning the full recording, marked `segmentation: "failed"`.

Always log which signal(s) contributed to each boundary for debugging.
