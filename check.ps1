$root = $PSScriptRoot

Clear-Host

function Step($label, $dir, $cmd) {
    Write-Host "`n=== $label ===" -ForegroundColor Cyan
    Set-Location "$root\$dir"
    Invoke-Expression $cmd
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n$label failed. Stopping." -ForegroundColor Red
        Set-Location $root
        exit $LASTEXITCODE
    }
}

Step "Web tests"  "web" "npx vitest run"
Step "Web build"  "web" "npm run build"
Step "API tests"  "api" "npm run test"

Write-Host "`nAll checks passed." -ForegroundColor Green
Set-Location $root
