---
description: Run the full verification suite (typecheck, lint, unit, integration, e2e).
---

Run in order, halting on first failure:
1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm e2e`
Summarize results in a table. Append to `BUILD_LOG.md`.
