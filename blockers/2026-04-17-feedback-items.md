# Blocker: Feedback Rubric Keys Not Yet Finalised

**Opened:** 2026-04-17  
**Status:** Open  
**Owner:** Sam (design decision)

## Problem

The grading prompt returns structured `FeedbackItem[]` rows with arbitrary `key` values.
Until Sam locks the 10 canonical rubric keys (5 accounting + 5 consulting), the UI cannot:

- Display human-readable labels consistently
- Group accounting vs consulting feedback in the Review screen
- Track mastery per rubric key over time in the Dashboard
- Export rubric-keyed data to Anki cards

## Current workaround

`src/lib/schemas/feedback.ts` exports `PROVISIONAL_RUBRIC_KEYS` — 10 placeholder keys
that the grading system uses until real keys are defined. Items produced with these keys
carry `provisional: true` in the schema. The Review UI shows a **provisional** badge on
those items so Sam can see which scores are based on placeholder rubrics.

### Provisional keys in use

| Key | Label | Domain |
|-----|-------|--------|
| acc-conceptual-understanding | Conceptual Understanding | accounting |
| acc-application-accuracy | Application Accuracy | accounting |
| acc-standard-citation | Standard Citation | accounting |
| acc-calculation-mechanics | Calculation Mechanics | accounting |
| acc-journal-entry | Journal Entry | accounting |
| con-risk-identification | Risk Identification | consulting |
| con-professional-judgement | Professional Judgement | consulting |
| con-communication-clarity | Communication Clarity | consulting |
| con-synthesis | Synthesis | consulting |
| con-recommendation-quality | Recommendation Quality | consulting |

## Resolution path

1. Sam reviews the keys above and edits `PROVISIONAL_RUBRIC_KEYS` in
   `src/lib/schemas/feedback.ts` with the final labels.
2. Remove `provisional: true` from the seed data in `prisma/seed-night5.ts`.
3. Update the grading system prompt (`src/lib/prompts/grading.ts`) to enumerate
   the final keys so Claude fills them consistently.
4. Run `pnpm prisma migrate dev` if a migration is needed to add a `rubricKey` column.
5. Close this file (or mark status: Resolved).

## Files affected

- `src/lib/schemas/feedback.ts` — `PROVISIONAL_RUBRIC_KEYS`, `FeedbackItem.provisional`
- `src/app/review/[recordingId]/ReviewClient.tsx` — provisional badge in `FeedbackCard`
- `src/lib/prompts/grading.ts` — system prompt references rubric keys
- `prisma/seed-night5.ts` — seed data uses placeholder keys
