# AI Features - Current Implementation Notes

This document used to describe an early design prototype. It has been reduced to
the current app decisions so it does not conflict with the deploy docs.

## Current Runtime Choices

- Production app/API: Vercel
- Database: Postgres through Prisma
- Long-running jobs: Trigger.dev v3
- Blob storage: Cloudflare R2
- AI routing: OpenRouter through `OPENROUTER_API_KEY`
- Transcription: local `whisper.cpp` in the Trigger.dev task container
- Auth: Google OAuth signed session, allowlisted to `hotredsam@gmail.com`

## AI Surfaces

- Textbook indexing parses and chunks uploaded textbooks, infers Becker units
  from references such as `F1 M1`, and creates coverage-based Anki cards.
- Question extraction and grading use OpenRouter-routed models.
- Anki Audio uses browser speech synthesis for concept review and posts the
  same review ratings as normal flashcards.
- Topic mastery blends graded question evidence, Anki recall, due-card pressure,
  and recency weighting.

## Security Expectations

- OpenRouter keys stay server-side.
- Saved Settings keys are encrypted with `ENCRYPTION_KEY`; the browser receives
  only `{ hasKey: boolean }`.
- Do not add database, auth, R2, Trigger, or OpenRouter secrets to
  `NEXT_PUBLIC_*` variables.
- Keep `ENABLE_ADMIN_WIPE=false` in production.
