# Simple API Test Script
param(
    [string]$ApiEndpoint = "https://syp1o7qfxj.execute-api.us-east-1.amazonaws.com",
    [string]$Token = "demo-token"
)

Write-Host "Testing Cloud File Share API" -ForegroundColor Cyan
Write-Host "API: $ApiEndpoint" -ForegroundColor Yellow
Write-Host ""

# Test 1: Request upload URL
Write-Host "Test 1: Request upload URL..." -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "$ApiEndpoint/upload-url" `
        -Method Post `
        -Headers @{"Authorization"="Bearer $Token"; "Content-Type"="application/json"} `
        -Body '{"filename":"test.pdf","contentType":"application/pdf","size":1024000}'
    
    Write-Host "SUCCESS: Got upload URL" -ForegroundColor Green
    Write-Host "File ID: $($response.fileId)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 2: Test download endpoint (should fail with missing shareId)
Write-Host "Test 2: Test download endpoint..." -ForegroundColor Green
try {
    Invoke-RestMethod -Uri "$ApiEndpoint/download/test-share-id" -Method Get
    Write-Host "Got response (unexpected)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "SUCCESS: Correctly returned 404 for invalid share" -ForegroundColor Green
    } else {
        Write-Host "Response: $($_.Exception.Message)" -ForegroundColor White
    }
}
Write-Host ""

# Test 3: List all endpoints
Write-Host "Test 3: Available endpoints:" -ForegroundColor Green
Write-Host "  POST   $ApiEndpoint/upload-url" -ForegroundColor White
Write-Host "  POST   $ApiEndpoint/shares" -ForegroundColor White
Write-Host "  GET    $ApiEndpoint/download/{shareId}" -ForegroundColor White
Write-Host "  DELETE $ApiEndpoint/shares/{shareId}" -ForegroundColor White
Write-Host ""

Write-Host "Basic API tests complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Upload a file using the upload URL" -ForegroundColor White
Write-Host "2. Wait 10-15 seconds for processing" -ForegroundColor White
Write-Host "3. Create a share link with the file ID" -ForegroundColor White
Write-Host "4. Download using the share link" -ForegroundColor White
