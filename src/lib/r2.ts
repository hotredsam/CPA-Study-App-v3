import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type R2Env = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

function env(): R2Env {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "R2 env missing — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME"
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

let cached: S3Client | undefined;

export function r2Client(): S3Client {
  if (cached) return cached;
  const { accountId, accessKeyId, secretAccessKey } = env();
  cached = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cached;
}

export function bucket(): string {
  return env().bucket;
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
