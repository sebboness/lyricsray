$root = $PSScriptRoot

# Launches separate terminals with the api and web dev servers.
# Run stop_dev.ps1 (or press the VS Code keyboard shortcut you bind to it) to stop both.

$api = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\api'; npm run dev" -PassThru
$web = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\web'; npm run dev" -PassThru

# Persist window PIDs so stop_dev.ps1 can close the terminal windows too
@{ api = $api.Id; web = $web.Id } | ConvertTo-Json | Set-Content "$root\.dev-pids.json"

Write-Host ""
Write-Host "Dev servers starting..." -ForegroundColor Green
Write-Host "  API  -> http://localhost:12099"
Write-Host "  Web  -> http://localhost:2099"
Write-Host ""
Write-Host "Run stop_dev.ps1 to stop both." -ForegroundColor DarkGray
