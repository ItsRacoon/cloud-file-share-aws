# Windows Quick Start Guide

Get the Cloud File Share system running on Windows in 10 minutes.

## Prerequisites

- AWS Account
- Node.js 18+ installed
- AWS CLI configured
- PowerShell (comes with Windows)

## 1. Install Dependencies (2 minutes)

```powershell
# Navigate to project directory
cd "D:\Projects\Projects\File sharing system"

# Install backend dependencies
npm install

# Install Serverless Framework globally (already done!)
# npm install -g serverless@3

# Verify installation
serverless --version
```

## 2. Configure AWS Credentials (1 minute)

```powershell
# Configure AWS CLI
aws configure
# Enter: Access Key ID, Secret Access Key, Region (e.g., us-east-1)

# Verify credentials
aws sts get-caller-identity
```

## 3. Deploy to AWS (3 minutes)

```powershell
# Deploy to dev environment
npm run deploy:dev

# Or manually
serverless deploy --stage dev
```

**Save the outputs:**
- API Endpoint URL
- User Pool ID
- User Pool Client ID
- Bucket Name

## 4. Test with Demo Script (2 minutes)

```powershell
# Set environment variables (PowerShell syntax)
$env:API_ENDPOINT = "https://xxxxx.execute-api.us-east-1.amazonaws.com"
$env:TOKEN = "demo-token"

# Run demo script
.\scripts\demo.ps1

# Or with parameters
.\scripts\demo.ps1 -ApiEndpoint "https://xxxxx.execute-api.us-east-1.amazonaws.com" -Token "demo-token"
```

Expected output:
```
✓ File ID: abc-123
✓ File uploaded successfully
✓ Processing complete
✓ Share ID: xyz-789
✓ Downloaded file size: 5242880 bytes
✓ Second download successful
✓ Correctly rejected wrong password
✓ Share revoked
✓ Download correctly blocked
✅ Demo completed successfully!
```

## 5. Run Frontend (2 minutes)

```powershell
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create .env file
Copy-Item .env.example .env

# Edit .env file (use notepad or VS Code)
notepad .env
```

Update `.env` with your values:
```env
REACT_APP_API_ENDPOINT=https://xxxxx.execute-api.us-east-1.amazonaws.com
REACT_APP_AUTH_DISABLED=true
```

```powershell
# Start dev server
npm start
```

Browser opens at http://localhost:3000

## PowerShell Commands Reference

### Setting Environment Variables

```powershell
# Set variable for current session
$env:API_ENDPOINT = "https://your-api.execute-api.us-east-1.amazonaws.com"
$env:TOKEN = "demo-token"

# View variable
$env:API_ENDPOINT

# Set permanently (optional)
[System.Environment]::SetEnvironmentVariable('API_ENDPOINT', 'https://your-api', 'User')
```

### Manual API Testing

```powershell
# 1. Get upload URL
$uploadBody = @{
    filename = "test.pdf"
    contentType = "application/pdf"
    size = 1024000
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$env:API_ENDPOINT/upload-url" `
    -Method Post `
    -Headers @{
        "Authorization" = "Bearer $env:TOKEN"
        "Content-Type" = "application/json"
    } `
    -Body $uploadBody

$response | ConvertTo-Json

# 2. Upload file to S3
$uploadUrl = $response.uploadUrl
Invoke-RestMethod -Uri $uploadUrl `
    -Method Put `
    -Headers @{"Content-Type" = "application/pdf"} `
    -InFile "yourfile.pdf"

# 3. Create share
$shareBody = @{
    fileId = $response.fileId
    expiresInSeconds = 3600
    password = "secret"
    maxDownloads = 5
} | ConvertTo-Json

$shareResponse = Invoke-RestMethod -Uri "$env:API_ENDPOINT/shares" `
    -Method Post `
    -Headers @{
        "Authorization" = "Bearer $env:TOKEN"
        "Content-Type" = "application/json"
    } `
    -Body $shareBody

$shareResponse | ConvertTo-Json

# 4. Download file
$downloadResponse = Invoke-RestMethod -Uri "$env:API_ENDPOINT/download/$($shareResponse.shareId)?password=secret" `
    -Method Get

Invoke-WebRequest -Uri $downloadResponse.downloadUrl -OutFile "downloaded.pdf"

# 5. Revoke share
Invoke-RestMethod -Uri "$env:API_ENDPOINT/shares/$($shareResponse.shareId)" `
    -Method Delete `
    -Headers @{"Authorization" = "Bearer $env:TOKEN"}
```

## Troubleshooting

### "serverless is not recognized"
```powershell
# Install globally
npm install -g serverless@3

# Verify
serverless --version
```

### "export is not recognized"
PowerShell uses different syntax:
```powershell
# Wrong (bash syntax)
export API_ENDPOINT=value

# Correct (PowerShell syntax)
$env:API_ENDPOINT = "value"
```

### Deployment fails
```powershell
# Check AWS credentials
aws sts get-caller-identity

# Check Node.js version (need 18+)
node --version

# Clear serverless cache
Remove-Item -Recurse -Force .serverless
serverless deploy --stage dev
```

### Script execution policy error
```powershell
# Check current policy
Get-ExecutionPolicy

# Set policy to allow scripts (run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or run script with bypass
PowerShell -ExecutionPolicy Bypass -File .\scripts\demo.ps1
```

### Port 3000 already in use
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or use different port
$env:PORT = "3001"
npm start
```

## File Paths on Windows

Use quotes for paths with spaces:
```powershell
cd "D:\Projects\Projects\File sharing system"
```

Or use backslashes:
```powershell
cd D:\Projects\Projects\File` sharing` system
```

## Next Steps

After successful deployment:
1. Test all endpoints with PowerShell commands
2. Try the frontend UI
3. Review logs in AWS CloudWatch
4. Check DynamoDB tables in AWS Console
5. See full documentation in README.md

## Cleanup

```powershell
# Remove all AWS resources
serverless remove --stage dev

# Verify removal
aws cloudformation list-stacks --stack-status-filter DELETE_COMPLETE | Select-String "cloud-file-share-aws-dev"
```

## Common PowerShell Tips

```powershell
# List files
Get-ChildItem
# or
ls

# View file content
Get-Content file.txt
# or
cat file.txt

# Create directory
New-Item -ItemType Directory -Path "dirname"
# or
mkdir dirname

# Remove file
Remove-Item file.txt
# or
rm file.txt

# Copy file
Copy-Item source.txt destination.txt
# or
cp source.txt destination.txt

# Find in files
Select-String -Path *.js -Pattern "search term"

# Clear screen
Clear-Host
# or
cls
```

## Support

- Full Documentation: [README.md](README.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Security: [docs/SECURITY.md](docs/SECURITY.md)
- Issues: GitHub Issues
