# Reclaim ports used by Next.js dev server before starting a new one.
# Only kills Node processes on ports 3000/3001 — leaves Postgres (5432) alone.

param([int[]]$Ports = @(3000, 3001))

foreach ($port in $Ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if (-not $conn) { continue }
    foreach ($c in $conn) {
        $pid = $c.OwningProcess
        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if (-not $proc) { continue }
        if ($proc.ProcessName -notmatch "node|next") {
            Write-Host "WARN: port $port held by $($proc.ProcessName) (pid $pid) — skipping non-Node process"
            continue
        }
        Write-Host "Killing $($proc.ProcessName) pid $pid on port $port"
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}
