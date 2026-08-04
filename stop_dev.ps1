$root = $PSScriptRoot

function Stop-Port($port) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if (-not $connections) {
        Write-Host "  :$port  nothing listening" -ForegroundColor DarkGray
        return
    }
    $connections | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        Write-Host "  :$port  killed PID $_" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Stopping dev servers..." -ForegroundColor Cyan

Stop-Port 12099   # api
Stop-Port 2099    # web

# Close the terminal windows that dev.ps1 opened (best-effort)
$pidFile = "$root\.dev-pids.json"
if (Test-Path $pidFile) {
    $pids = Get-Content $pidFile | ConvertFrom-Json
    foreach ($id in @($pids.api, $pids.web)) {
        if ($id) {
            Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
        }
    }
    Remove-Item $pidFile -Force
}

Write-Host "Done." -ForegroundColor Green
Write-Host ""
