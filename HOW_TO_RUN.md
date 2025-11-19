# How to Run This Project

## Prerequisites

- Node.js 18+
- AWS Account
- AWS CLI configured

## Quick Start (5 minutes)

### 1. Install Dependencies

```powershell
npm install
```

### 2. Configure AWS Credentials

```powershell
aws configure
```

Enter:
- AWS Access Key ID
- AWS Secret Access Key
- Region: `us-east-1`

### 3. Deploy to AWS

```powershell
serverless deploy --stage dev
```

**Save the API endpoint from output!**

### 4. Test the API

```powershell
# Replace with your API endpoint
.\scripts\simple-test.ps1
```

### 5. Run Frontend (Optional)

```powershell
cd frontend
npm install

# Create .env file
@"
REACT_APP_API_ENDPOINT=https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com
REACT_APP_AUTH_DISABLED=true
"@ | Out-File -FilePath .env -Encoding utf8

npm start
```

Browser opens at http://localhost:3000

## Usage

### Upload a File

```powershell
# 1. Get upload URL
$response = Invoke-RestMethod -Uri "YOUR-API-ENDPOINT/upload-url" `
    -Method Post `
    -Headers @{"Authorization"="Bearer demo-token"; "Content-Type"="application/json"} `
    -Body '{"filename":"test.pdf","contentType":"application/pdf","size":1024000}'

# 2. Upload file
Invoke-RestMethod -Uri $response.uploadUrl `
    -Method Put `
    -Headers @{"Content-Type"="application/pdf"} `
    -InFile "yourfile.pdf"
```

### Create Share Link

```powershell
$share = Invoke-RestMethod -Uri "YOUR-API-ENDPOINT/shares" `
    -Method Post `
    -Headers @{"Authorization"="Bearer demo-token"; "Content-Type"="application/json"} `
    -Body "{`"fileId`":`"$($response.fileId)`",`"expiresInSeconds`":3600}"
```

### Download File

```powershell
$download = Invoke-RestMethod -Uri "YOUR-API-ENDPOINT/download/$($share.shareId)"
Invoke-WebRequest -Uri $download.downloadUrl -OutFile "downloaded.pdf"
```

## Cleanup

Remove all AWS resources:

```powershell
serverless remove --stage dev
```

## Troubleshooting

**AWS credentials not found:**
```powershell
aws configure
```

**Deployment fails:**
```powershell
# Check credentials
aws sts get-caller-identity
```

**Port 3000 in use:**
```powershell
$env:PORT = "3001"
npm start
```

## Documentation

- **[README.md](README.md)** - Complete documentation
- **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** - Project overview
- **[CLOUD_COMPUTING_EXPLAINED.md](CLOUD_COMPUTING_EXPLAINED.md)** - Cloud concepts
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture

## Cost

- **Testing**: ~$0.50/month
- **Production (1000 users)**: ~$35/month

## Support

For detailed setup, see:
- [SETUP_AWS_WINDOWS.md](SETUP_AWS_WINDOWS.md) - AWS setup
- [WINDOWS_QUICKSTART.md](WINDOWS_QUICKSTART.md) - Windows guide
