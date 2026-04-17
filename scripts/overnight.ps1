# scripts/overnight.ps1 — overnight orchestrator with rate-limit sleep/resume.
# Run: powershell -ExecutionPolicy Bypass -File scripts\overnight.ps1
#
# Contract with Claude Code:
#   - Claude writes RESUME_STATE.md at the end of every section.
#   - Claude sets `status: BUILD-COMPLETE` when the whole playbook is done.
#   - Claude prints `CLAUDE-EXIT-FOR-RESUME` when it detects rate-limit pressure.
#
# Wrapper behavior:
#   - First iteration: launches Claude with the opening prompt from OPENING_PROMPT.md
#     (Sam creates this file once with the exact prompt he wants Claude to start with).
#   - Subsequent iterations: `claude --continue` with a "resume from RESUME_STATE.md"
#     nudge, after sleeping 4 hours.
#   - Exits cleanly when RESUME_STATE.md shows BUILD-COMPLETE or MaxIterations hit.

param(
    [int]$MaxIterations = 8,
    [int]$SleepSeconds  = 14400  # 4 hours
)

$ErrorActionPreference = "Continue"
$log = Join-Path $PSScriptRoot "..\OVERNIGHT_LOG.txt"
$state = Join-Path $PSScriptRoot "..\RESUME_STATE.md"
$openingPrompt = Join-Path $PSScriptRoot "..\OPENING_PROMPT.md"

function Log($msg) {
    $line = "[$((Get-Date).ToString('o'))] $msg"
    Write-Host $line
    Add-Content -Path $log -Value $line
}

function BuildComplete {
    if (-not (Test-Path $state)) { return $false }
    return (Select-String -Path $state -Pattern "status:\s*BUILD-COMPLETE" -Quiet)
}

Log "overnight.ps1 starting. MaxIterations=$MaxIterations, SleepSeconds=$SleepSeconds"

for ($i = 1; $i -le $MaxIterations; $i++) {
    Log "=== Iteration $i ==="

    if ($i -eq 1) {
        if (-not (Test-Path $openingPrompt)) {
            Log "FATAL: OPENING_PROMPT.md missing. Create it with the exact prompt you want Claude to start from."
            exit 2
        }
        $prompt = Get-Content $openingPrompt -Raw
        & claude --permission-mode acceptEdits -p $prompt 2>&1 | Tee-Object -FilePath $log -Append
    } else {
        $resumePrompt = "Resume the overnight build from RESUME_STATE.md. Read that file first, identify the next action, and continue. Keep writing RESUME_STATE.md at every section boundary. Exit cleanly with CLAUDE-EXIT-FOR-RESUME if you hit rate-limit pressure again."
        & claude --continue --permission-mode acceptEdits -p $resumePrompt 2>&1 | Tee-Object -FilePath $log -Append
    }

    if (BuildComplete) {
        Log "RESUME_STATE.md shows BUILD-COMPLETE. Exiting successfully."
        break
    }

    if ($i -eq $MaxIterations) {
        Log "Max iterations reached without BUILD-COMPLETE. Check RESUME_STATE.md and BUILD_LOG.md."
        break
    }

    Log "Claude session ended. Sleeping $SleepSeconds seconds before resume (buffers past the 5-hour Max cap reset)."
    # Heartbeat every 15 minutes so Sam can see the script is alive
    $heartbeatInterval = 900
    $elapsed = 0
    while ($elapsed -lt $SleepSeconds) {
        Start-Sleep -Seconds ([Math]::Min($heartbeatInterval, $SleepSeconds - $elapsed))
        $elapsed += $heartbeatInterval
        Log "…sleeping, $([int](($SleepSeconds - $elapsed) / 60)) min remaining"
    }
}

Log "overnight.ps1 exiting."
