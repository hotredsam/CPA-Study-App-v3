# Resume state

status: running
last-completed-section: 1
last-completed-step: 7
next-action: start Section 2 (system prerequisites)
iteration: 1
updated: 2026-04-17T00:55:00Z

## Notes for the wrapper

The wrapper script `scripts/overnight.ps1` reads this file between Claude invocations.
- If `status: BUILD-COMPLETE` → wrapper exits.
- Otherwise → wrapper sleeps 4 hours, then runs `claude --continue` to resume.

Claude Code updates this file at every section boundary AND before any graceful exit.
