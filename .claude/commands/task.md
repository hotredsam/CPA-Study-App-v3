---
description: Execute a single task from PLAN.md end-to-end with subagents.
---

Read `PLAN.md` and find Task $1. Delegate to the `planner` subagent to produce a concrete implementation plan for that task's Scope. Present the plan. Then delegate to `implementer` to execute. Then delegate to `test-writer` for unit coverage. Then delegate to `verifier` to run the Verification block. Then delegate to `code-reviewer`. Commit only on a clean review.
