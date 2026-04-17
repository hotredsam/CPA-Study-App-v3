---
description: Run the overnight Ralph loop through Phase 1 of PLAN.md.
---

Enter Ralph loop mode. For each task 1–10 in `PLAN.md` Phase 1, in order:
1. Delegate to `planner` → `implementer` → `test-writer` → `verifier` → `code-reviewer`.
2. Commit with a conventional message.
3. Push.
4. If verification fails twice in a row, delegate to `debugger` and retry once. If that also fails, document in `BUILD_LOG.md` and move to the next task.
5. Exit when every task has a passing Verification block. Emit `BUILD-COMPLETE`.
