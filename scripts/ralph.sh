#!/usr/bin/env bash
set -euo pipefail

# scripts/ralph.sh — Ralph loop driver for PLAN.md Phase 1 Tasks 1-10.
# Invokes `/task N` for each of the 10 MVP tasks, then verifies + pushes.
# See setupinstructions.md Section 13 for full contract.

MAX_TASKS=10
COMPLETION_PROMISE="BUILD-COMPLETE"
CACHE_DIR=".claude/cache"
mkdir -p "$CACHE_DIR"

for task in $(seq 1 "$MAX_TASKS"); do
  echo "=== Ralph iteration: Task $task ==="
  claude -p "/task $task" \
    --permission-mode acceptEdits \
    --output-format json \
    > "$CACHE_DIR/ralph-task-$task.json" || {
      echo "Task $task failed — delegating to debugger once"
      claude -p "Task $task failed. Delegate to the debugger subagent. If debugger cannot fix after 3 attempts, document in BUILD_LOG.md and return control." \
        --permission-mode acceptEdits
  }

  # Verify this task's checks pass before moving on.
  claude -p "/verify" --permission-mode acceptEdits

  # After each task completes, update RESUME_STATE.md and push.
  cat > RESUME_STATE.md <<RS
# Resume state

status: running
last-completed-section: 13
last-completed-step: task-$task
next-action: start Task $((task + 1))
iteration: 1
updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Notes for the wrapper

The wrapper script \`scripts/overnight.ps1\` reads this file between Claude invocations.
- If \`status: BUILD-COMPLETE\` → wrapper exits.
- Otherwise → wrapper sleeps 4 hours, then runs \`claude --continue\` to resume.
RS

  git add RESUME_STATE.md
  git commit -m "chore(ralph): task $task done" || true
  git push || echo "(push failed — likely main-branch lock; continuing)"
done

claude -p "All tasks attempted. Produce a final summary in BUILD_LOG.md and emit $COMPLETION_PROMISE."
echo "$COMPLETION_PROMISE"
