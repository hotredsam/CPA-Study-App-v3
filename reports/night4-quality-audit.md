# Night 4 Quality Audit - Superseded Notes

This report is preserved as history. Current production instructions live in
`README.md`, `RUNBOOK.md`, `DEPLOY.md`, and `docs/deploy-prod.md`.

Current production decisions:

- Use OpenRouter via `OPENROUTER_API_KEY` for AI routing.
- Use local `whisper.cpp` in Trigger.dev task containers for transcription.
- Use Google OAuth and `AUTH_ALLOWED_EMAILS=hotredsam@gmail.com` for access.
- Do not use direct provider-specific production API keys.

Historical finding summary:

- Early fixture processing reached the pipeline shape but produced provisional
  output because Windows dev did not have the Whisper model and the early
  extraction path had no real frames/transcripts.
- The remaining real-quality verification step is to deploy Trigger.dev with
  `OPENROUTER_API_KEY` and `WHISPER_MODEL_PATH`, then run a real Becker
  recording through the pipeline.
