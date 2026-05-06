# Reclaim ports used by Next.js dev server before starting a new one.
# Only kills Node processes on ports 3000/3001. Leaves Postgres (5432) alone.

param([int[]]$Ports = @(3000, 3001))

foreach ($port in $Ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if (-not $conn) { continue }

    $processIds = $conn | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processIds) {
        if ($processId -eq 0) { continue }

        $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if (-not $proc) { continue }

        if ($proc.ProcessName -notmatch "node|next") {
            Write-Host "WARN: port $port held by $($proc.ProcessName) (pid $processId). Skipping non-Node process."
            continue
        }

        Write-Host "Killing $($proc.ProcessName) pid $processId on port $port"
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
}
