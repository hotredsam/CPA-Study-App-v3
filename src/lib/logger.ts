import pino from "pino";

export const logger = pino({
  name: "cpa-study",
  redact: {
    paths: [
      "req.headers.authorization",
      "request.headers.authorization",
      "headers.authorization",
      "cookie",
      "cookies",
      "*.OPENROUTER_API_KEY",
      "*.AUTH_SECRET",
      "*.R2_SECRET_ACCESS_KEY",
      "*.DATABASE_URL",
      "*.TRIGGER_SECRET_KEY",
      "*.ENCRYPTION_KEY",
      "apiKey",
      "secret",
      "password",
      "token",
    ],
    censor: "[REDACTED]",
  },
});
