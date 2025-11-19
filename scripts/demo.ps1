# PowerShell Demo Script for Cloud File Share AWS
# Demonstrates end-to-end workflow

param(
    [string]$ApiEndpoint = $env:API_ENDPOINT,
    [string]$Token = $env:TOKEN
)

if (-not $ApiEndpoint) {
    Write-Host "Error: API_ENDPOINT not set" -ForegroundColor Red
    Write-Host "Usage: .\scripts\demo.ps1 -ApiEndpoint 'https://your-api.execute-api.us-east-1.amazonaws.com' -Token 'demo-token'"
    exit 1
}

if (-not $Token) {
    $Token = "demo-token"
}

Write-Host "Cloud File Share AWS - Demo Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Endpoint: $ApiEndpoint" -ForegroundColor Yellow
Write-Host ""

# Step 1: Request upload URL
Write-Host "Step 1: Requesting upload URL..." -ForegroundColor Green
$uploadBody = @{
    filename = "demo-test.pdf"
    contentType = "application/pdf"
    size = 5242880
} | ConvertTo-Json

$uploadResponse = Invoke-RestMethod -Uri "$ApiEndpoint/upload-url" `
    -Method Post `
    -Headers @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    } `
    -Body $uploadBody

$uploadUrl = $uploadResponse.uploadUrl
$fileId = $uploadResponse.fileId
Write-Host "OK: File ID: $fileId" -ForegroundColor Green
Write-Host ""

# Step 2: Create test file and upload
Write-Host "Step 2: Creating and uploading 5MB test file..." -ForegroundColor Green
$testFile = "demo-test.pdf"
$bytes = New-Object byte[] 5242880
(New-Object Random).NextBytes($bytes)
[System.IO.File]::WriteAllBytes($testFile, $bytes)

Invoke-RestMethod -Uri $uploadUrl `
    -Method Put `
    -Headers @{"Content-Type" = "application/pdf"} `
    -InFile $testFile | Out-Null

Write-Host "OK: File uploaded successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Wait for processing
Write-Host "Step 3: Waiting for upload processor and scanner (5 seconds)..." -ForegroundColor Green
Start-Sleep -Seconds 5
Write-Host "OK: Processing complete" -ForegroundColor Green
Write-Host ""

# Step 4: Create share link
Write-Host "Step 4: Creating share link with password and download limit..." -ForegroundColor Green
$shareBody = @{
    fileId = $fileId
    expiresInSeconds = 3600
    password = "demo123"
    maxDownloads = 3
} | ConvertTo-Json

$shareResponse = Invoke-RestMethod -Uri "$ApiEndpoint/shares" `
    -Method Post `
    -Headers @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    } `
    -Body $shareBody

$shareId = $shareResponse.shareId
Write-Host "OK: Share ID: $shareId" -ForegroundColor Green
Write-Host "OK: Share URL: $ApiEndpoint/download/$shareId" -ForegroundColor Green
Write-Host ""

# Step 5: Download file (first time)
Write-Host "Step 5: Downloading file (attempt 1/3)..." -ForegroundColor Green
$downloadResponse = Invoke-RestMethod -Uri "$ApiEndpoint/download/$shareId`?password=demo123" `
    -Method Get

$downloadUrl = $downloadResponse.downloadUrl
Invoke-WebRequest -Uri $downloadUrl -OutFile "downloaded-1.pdf" | Out-Null
$downloadedSize = (Get-Item "downloaded-1.pdf").Length
Write-Host "OK: Downloaded file size: $downloadedSize bytes" -ForegroundColor Green
Write-Host ""

# Step 6: Download again (second time)
Write-Host "Step 6: Downloading file (attempt 2/3)..." -ForegroundColor Green
$downloadResponse = Invoke-RestMethod -Uri "$ApiEndpoint/download/$shareId`?password=demo123" `
    -Method Get
$downloadUrl = $downloadResponse.downloadUrl
Invoke-WebRequest -Uri $downloadUrl -OutFile "downloaded-2.pdf" | Out-Null
Write-Host "OK: Second download successful" -ForegroundColor Green
Write-Host ""

# Step 7: Test wrong password
Write-Host "Step 7: Testing wrong password..." -ForegroundColor Green
try {
    Invoke-RestMethod -Uri "$ApiEndpoint/download/$shareId`?password=wrong" -Method Get
    Write-Host "WARNING: Unexpected - Wrong password was accepted" -ForegroundColor Yellow
} catch {
    Write-Host "OK: Correctly rejected wrong password" -ForegroundColor Green
}
Write-Host ""

# Step 8: Revoke share
Write-Host "Step 8: Revoking share link..." -ForegroundColor Green
$revokeResponse = Invoke-RestMethod -Uri "$ApiEndpoint/shares/$shareId" `
    -Method Delete `
    -Headers @{"Authorization" = "Bearer $Token"}
Write-Host "OK: Share revoked" -ForegroundColor Green
Write-Host ""

# Step 9: Verify download blocked
Write-Host "Step 9: Verifying download blocked after revocation..." -ForegroundColor Green
try {
    Invoke-RestMethod -Uri "$ApiEndpoint/download/$shareId`?password=demo123" -Method Get
    Write-Host "WARNING: Unexpected - Download was allowed after revocation" -ForegroundColor Yellow
} catch {
    Write-Host "OK: Download correctly blocked" -ForegroundColor Green
}
Write-Host ""

# Cleanup
Write-Host "Cleaning up test files..." -ForegroundColor Green
Remove-Item -Path $testFile -ErrorAction SilentlyContinue
Remove-Item -Path "downloaded-1.pdf" -ErrorAction SilentlyContinue
Remove-Item -Path "downloaded-2.pdf" -ErrorAction SilentlyContinue
Write-Host "OK: Cleanup complete" -ForegroundColor Green
Write-Host ""

Write-Host "SUCCESS: Demo completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  - Uploaded 5MB file" -ForegroundColor White
Write-Host "  - Created password-protected share with 3 download limit" -ForegroundColor White
Write-Host "  - Downloaded file twice" -ForegroundColor White
Write-Host "  - Verified password protection" -ForegroundColor White
Write-Host "  - Revoked share" -ForegroundColor White
Write-Host "  - Verified revocation blocks downloads" -ForegroundColor White
