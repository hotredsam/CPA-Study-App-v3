import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

let cached: S3Client | undefined;

export function r2Client(): S3Client {
  if (cached) return cached;
  cached = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });
  return cached;
}

export function bucket(): string {
  return env.R2_BUCKET_NAME;
}

export async function presignUpload(key: string, contentType: string, expiresIn = 900): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client(), cmd, { expiresIn });
}

export async function presignDownload(key: string, expiresIn = 900): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: bucket(),
    Key: key,
  });
  return getSignedUrl(r2Client(), cmd, { expiresIn });
}

export const keys = {
  recordingRaw: (recordingId: string) => `recordings/${recordingId}/raw.webm`,
  recordingAudio: (recordingId: string) => `recordings/${recordingId}/audio.wav`,
  clipVideo: (questionId: string) => `clips/${questionId}/clip.webm`,
  clipAudio: (questionId: string) => `clips/${questionId}/audio.wav`,
  clipThumbnail: (questionId: string) => `clips/${questionId}/thumbnail.jpg`,
  questionFrame: (questionId: string, idx: number) =>
    `clips/${questionId}/question-frames/${String(idx).padStart(3, "0")}.jpg`,
  feedbackFrame: (questionId: string, idx: number) =>
    `clips/${questionId}/feedback-frames/${String(idx).padStart(3, "0")}.jpg`,
};
