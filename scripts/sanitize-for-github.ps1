# Sanitize Project for GitHub
# Replaces actual API endpoint with placeholder

Write-Host "Sanitizing project for GitHub..." -ForegroundColor Cyan
Write-Host ""

$apiId = "syp1o7qfxj"
$placeholder = "YOUR-API-ID"

$files = @(
    "SUCCESS.md",
    "scripts/simple-test.ps1",
    "PROJECT_OVERVIEW.md",
    "CORS_FIX.md",
    "FRONTEND_FIX.md"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Processing: $file" -ForegroundColor Yellow
        (Get-Content $file) -replace $apiId, $placeholder | Set-Content $file
        Write-Host "  OK: Replaced API ID" -ForegroundColor Green
    } else {
        Write-Host "  SKIP: File not found" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Sanitization complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Your actual API endpoint has been replaced with placeholder." -ForegroundColor White
Write-Host "You can now safely push to GitHub." -ForegroundColor White
Write-Host ""
Write-Host "To restore your API endpoint later:" -ForegroundColor Yellow
Write-Host "  Run: (Get-Content file.md) -replace '$placeholder', '$apiId' | Set-Content file.md" -ForegroundColor Gray
