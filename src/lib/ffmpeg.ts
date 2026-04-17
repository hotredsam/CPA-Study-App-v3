import { spawn } from "node:child_process";
import { parseFfmpegPctFromChunk } from "./progress-parsers";

// Scene detection output from `-vf "select='gt(scene,THRESHOLD)',showinfo"`.
// ffmpeg prints `pts_time:SECONDS` on each detected scene change to stderr.
const SCENE_PTS = /pts_time:(\d+\.?\d*)/g;

export function parseSceneTimestamps(stderr: string): number[] {
  const out: number[] = [];
  SCENE_PTS.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SCENE_PTS.exec(stderr)) !== null) {
    const t = Number(m[1]);
    if (Number.isFinite(t)) out.push(t);
  }
  return out;
}

export type SceneDetectOptions = {
  input: string;
  totalDurationSec: number;
  threshold?: number;
  onProgress?: (pct: number) => void;
  ffmpegBin?: string;
};

export async function detectScenes(opts: SceneDetectOptions): Promise<number[]> {
  const { input, totalDurationSec, threshold = 0.3, onProgress, ffmpegBin = "ffmpeg" } = opts;
  return new Promise<number[]>((resolve, reject) => {
    const args = ["-hide_banner", "-i", input, "-vf", `select='gt(scene,${threshold})',showinfo`, "-an", "-f", "null", "-"];
    const proc = spawn(ffmpegBin, args);
    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stderr += text;
      if (onProgress) {
        const pct = parseFfmpegPctFromChunk(text, totalDurationSec);
        if (pct !== null) onProgress(pct);
      }
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`));
        return;
      }
      resolve(parseSceneTimestamps(stderr));
    });
  });
}
