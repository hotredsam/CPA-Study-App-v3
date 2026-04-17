// Stderr progress parsers for ffmpeg and whisper.cpp. These are pure functions —
// they parse one chunk of stderr output and return a normalized pct 0-100
// given the total duration of the input.

const FFMPEG_TIME = /time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/g;

export function parseFfmpegPctFromChunk(chunk: string, totalDurationSec: number): number | null {
  if (totalDurationSec <= 0) return null;
  let last: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  FFMPEG_TIME.lastIndex = 0;
  while ((match = FFMPEG_TIME.exec(chunk)) !== null) last = match;
  if (!last) return null;
  const [, h, m, s, cs] = last;
  const elapsed =
    Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(cs) / 100;
  const pct = Math.min(100, Math.max(0, (elapsed / totalDurationSec) * 100));
  return Math.round(pct);
}

const WHISPER_LINE =
  /\[(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})\]/g;

export function parseWhisperPctFromChunk(chunk: string, totalDurationSec: number): number | null {
  if (totalDurationSec <= 0) return null;
  let last: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  WHISPER_LINE.lastIndex = 0;
  while ((match = WHISPER_LINE.exec(chunk)) !== null) last = match;
  if (!last) return null;
  const [, , , , , h, m, s, ms] = last;
  const endSec = Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;
  const pct = Math.min(100, Math.max(0, (endSec / totalDurationSec) * 100));
  return Math.round(pct);
}
