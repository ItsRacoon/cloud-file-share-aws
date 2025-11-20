# AWS Cost Monitoring Script
# Run this weekly to check your usage

Write-Host "🔍 Checking AWS Usage and Costs..." -ForegroundColor Cyan

# Check current month billing
Write-Host "`n💰 Current Month Costs:" -ForegroundColor Yellow
aws ce get-cost-and-usage `
  --time-period Start=2024-12-01,End=2024-12-31 `
  --granularity MONTHLY `
  --metrics BlendedCost `
  --group-by Type=DIMENSION,Key=SERVICE

# Check Lambda invocations
Write-Host "`n⚡ Lambda Usage:" -ForegroundColor Yellow
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/cloud-file-share"

# Check S3 storage usage
Write-Host "`n📦 S3 Storage Usage:" -ForegroundColor Yellow
aws s3 ls s3://cloud-file-share-aws-storage-dev --recursive --human-readable --summarize

# Check DynamoDB usage
Write-Host "`n🗄️ DynamoDB Usage:" -ForegroundColor Yellow
aws dynamodb describe-table --table-name cloud-file-share-aws-dev-files --query 'Table.TableSizeBytes'
aws dynamodb describe-table --table-name cloud-file-share-aws-dev-shares --query 'Table.TableSizeBytes'

Write-Host "`n✅ Usage check complete!" -ForegroundColor Green
Write-Host "💡 Tip: Stay under these limits to remain free:" -ForegroundColor Cyan
Write-Host "   - Lambda: 1M requests/month" -ForegroundColor Gray
Write-Host "   - S3: 5GB storage, 1GB downloads" -ForegroundColor Gray
Write-Host "   - DynamoDB: 25GB storage" -ForegroundColor Gray