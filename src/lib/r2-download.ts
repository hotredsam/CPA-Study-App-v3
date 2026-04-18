import { GetObjectCommand } from "@aws-sdk/client-s3";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import { r2Client, bucket } from "./r2";

/**
 * Downloads an R2 object to a local temp file.
 * The caller is responsible for cleanup.
 *
 * @param r2Key - The R2 object key to download
 * @param ext   - File extension (no leading dot) for the tmp filename
 * @returns Absolute path to the downloaded temp file
 */
export async function downloadToTmp(r2Key: string, ext: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "cpa-r2-"));
  const tmpPath = join(dir, `download.${ext}`);

  let didWrite = false;
  try {
    const cmd = new GetObjectCommand({ Bucket: bucket(), Key: r2Key });
    const response = await r2Client().send(cmd);

    if (!response.Body) {
      throw new Error(`R2 GetObject returned no body for key: ${r2Key}`);
    }

    const readable = response.Body as Readable;
    const writable = createWriteStream(tmpPath);
    await pipeline(readable, writable);
    didWrite = true;
    return tmpPath;
  } finally {
    if (!didWrite) {
      // Clean up the dir if we never wrote anything useful
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
