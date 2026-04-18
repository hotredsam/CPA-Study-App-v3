import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.string().url().optional(),
  TRIGGER_PROJECT_ID: z
    .string()
    .min(1)
    .refine((v) => !v.includes("placeholder"), {
      message: "TRIGGER_PROJECT_ID must not be the placeholder value — set a real project ID",
    }),
  TRIGGER_SECRET_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().optional(),
  WHISPER_MODEL_PATH: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = (() => {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables — see console for details");
  }
  return result.data;
})();
