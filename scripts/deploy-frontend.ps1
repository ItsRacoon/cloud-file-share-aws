# Deploy Frontend to S3
# This script builds and deploys the React frontend to S3

Write-Host "🚀 Deploying Frontend to S3..." -ForegroundColor Cyan

# Get bucket name from serverless output
$bucketName = "cloud-file-share-aws-storage-dev"

# Build frontend
Write-Host "`n📦 Building React app..." -ForegroundColor Yellow
Set-Location frontend
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Build complete!" -ForegroundColor Green

# Deploy to S3
Write-Host "`n☁️ Uploading to S3..." -ForegroundColor Yellow
Set-Location ..

# Sync build folder to S3
aws s3 sync frontend/build s3://$bucketName/frontend/ --delete

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Upload failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Upload complete!" -ForegroundColor Green

# Get CloudFront distribution ID if exists
Write-Host "`n🔄 Checking for CloudFront distribution..." -ForegroundColor Yellow
$distributions = aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[?DomainName=='$bucketName.s3.amazonaws.com']].Id" --output text

if ($distributions) {
    Write-Host "Found CloudFront distribution: $distributions" -ForegroundColor Cyan
    Write-Host "Creating invalidation..." -ForegroundColor Yellow
    aws cloudfront create-invalidation --distribution-id $distributions --paths "/*"
    Write-Host "✓ CloudFront cache invalidated!" -ForegroundColor Green
} else {
    Write-Host "No CloudFront distribution found (optional)" -ForegroundColor Gray
}

Write-Host "`n✅ Frontend deployed successfully!" -ForegroundColor Green
Write-Host "Frontend URL: https://$bucketName.s3.amazonaws.com/frontend/index.html" -ForegroundColor Cyan
