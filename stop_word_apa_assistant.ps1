$ErrorActionPreference = "Stop"

$connections = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if (-not $connections) {
    Write-Host "No listener found on port 3000."
    exit 0
}

$pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $pids) {
    try {
        $proc = Get-Process -Id $procId -ErrorAction Stop
        Stop-Process -Id $procId -Force -ErrorAction Stop
        Write-Host "Stopped process $($proc.ProcessName) (PID $procId) on port 3000."
    } catch {
        Write-Host "Failed to stop PID ${procId}: $($_.Exception.Message)"
    }
}
