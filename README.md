# ☁️ Cloud File Share AWS

Serverless file sharing system built on AWS with secure uploads, expiring share links, password protection, download limits, and malware scanning.

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
│  (React)    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         API Gateway (HTTP API)          │
│  + Cognito JWT Authorizer (optional)    │
└──────┬──────────────────────────────────┘
       │
       ├──► Lambda: presigner
       │    └─► S3 (pre-signed PUT URL)
       │    └─► DynamoDB Files table
       │
       ├──► Lambda: createShare
       │    └─► DynamoDB Shares table
       │
       ├──► Lambda: downloadHandler
       │    └─► S3 (pre-signed GET URL)
       │    └─► DynamoDB Shares table
       │
       └──► Lambda: revokeShare
            └─► DynamoDB Shares table

┌─────────────────────────────────────────┐
│         S3 Bucket (uploads/)            │
└──────┬──────────────────────────────────┘
       │ ObjectCreated event
       ▼
┌─────────────────────────────────────────┐
│    Lambda: uploadProcessor              │
│    └─► DynamoDB Files table             │
│    └─► SQS scan queue                   │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│    Lambda: scannerStub                  │
│    └─► DynamoDB Files table             │
└─────────────────────────────────────────┘
```

## 🚀 Features

- **Secure Uploads**: Pre-signed PUT URLs with content-type and size validation
- **Expiring Share Links**: Time-limited access with configurable TTL
- **Password Protection**: Optional bcrypt-hashed passwords for shares
- **Download Limits**: Atomic counter with max download enforcement
- **Malware Scanning**: Stub scanner (integrate with ClamAV/VirusTotal)
- **Audit Logging**: Structured JSON logs with request correlation
- **Lifecycle Policies**: Automatic object deletion after TTL
- **Serverless**: Pay-per-use with auto-scaling

## 📋 Prerequisites

- AWS Account with CLI configured
- Node.js 18+ and npm
- Serverless Framework 3.x (`npm install -g serverless`)
- IAM user with permissions for:
  - Lambda, API Gateway, S3, DynamoDB, SQS, Cognito, CloudFormation

## 🛠️ Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd cloud-file-share-aws
npm install
```

### 2. Configure AWS Credentials

```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and region
```

### 3. Deploy to AWS

```bash
# Deploy to dev environment
npm run deploy:dev

# Deploy to production
npm run deploy:prod
```

After deployment, note the outputs:
- `ApiEndpoint`: Your API Gateway URL
- `UserPoolId`: Cognito User Pool ID
- `UserPoolClientId`: Cognito Client ID
- `BucketName`: S3 bucket name

### 4. Setup Frontend

```bash
cd frontend
npm install

# Create .env file
cp .env.example .env
```

Edit `frontend/.env`:
```env
REACT_APP_API_ENDPOINT=https://your-api-id.execute-api.us-east-1.amazonaws.com
REACT_APP_AUTH_DISABLED=true
REACT_APP_USER_POOL_ID=us-east-1_xxxxxxxxx
REACT_APP_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 5. Run Frontend

```bash
npm start
# Opens http://localhost:3000
```

## 🔐 Environment Variables

### Backend (serverless.yml)

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_FILE_SIZE` | 104857600 | Max upload size in bytes (100MB) |
| `OBJECT_TTL_DAYS` | 30 | S3 object lifecycle TTL |
| `AUTH_DISABLED` | false | Disable Cognito auth for demo |
| `SHARE_SECRET` | (auto) | HMAC secret for share IDs |

### Frontend (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_API_ENDPOINT` | Yes | API Gateway URL |
| `REACT_APP_AUTH_DISABLED` | No | Match backend setting |
| `REACT_APP_USER_POOL_ID` | No | Cognito User Pool ID |
| `REACT_APP_USER_POOL_CLIENT_ID` | No | Cognito Client ID |

## 📊 Database Schema

### Files Table

```javascript
{
  fileId: "uuid",              // Partition key
  userId: "user-id",
  filename: "sanitized.pdf",
  originalFilename: "original.pdf",
  contentType: "application/pdf",
  expectedSize: 1024000,
  actualSize: 1024000,
  objectKey: "uploads/user/file/name.pdf",
  uploadStatus: "completed",   // pending | completed | failed
  isScanned: "completed",      // pending | completed
  scanStatus: "clean",         // clean | suspicious | infected
  createdAt: 1234567890,
  updatedAt: 1234567890,
  scannedAt: 1234567890
}
```

### Shares Table

```javascript
{
  shareId: "uuid-hmac",        // Partition key
  fileId: "uuid",
  userId: "user-id",
  objectKey: "uploads/...",
  filename: "file.pdf",
  contentType: "application/pdf",
  passwordHash: "bcrypt-hash", // null if no password
  maxDownloads: 10,            // null for unlimited
  downloadCount: 3,
  revoked: false,
  createdAt: 1234567890,
  expiresAt: 1234567890,       // TTL attribute (seconds)
  revokedAt: 1234567890
}
```

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
# Set environment variables
export API_ENDPOINT=https://your-api-id.execute-api.us-east-1.amazonaws.com
export AUTH_TOKEN=your-jwt-token
export FILES_TABLE=cloud-file-share-aws-files-dev
export SHARES_TABLE=cloud-file-share-aws-shares-dev

# Run integration tests
npm run test:integration
```

## 📝 API Endpoints

### POST /upload-url
Request pre-signed upload URL

**Request:**
```json
{
  "filename": "document.pdf",
  "contentType": "application/pdf",
  "size": 1024000
}
```

**Response:**
```json
{
  "uploadUrl": "https://s3.amazonaws.com/...",
  "fileId": "uuid",
  "objectKey": "uploads/user/uuid/document.pdf",
  "expiresIn": 900
}
```

### POST /shares
Create share link

**Request:**
```json
{
  "fileId": "uuid",
  "expiresInSeconds": 3600,
  "password": "optional-password",
  "maxDownloads": 10
}
```

**Response:**
```json
{
  "shareId": "uuid-hmac",
  "fileId": "uuid",
  "expiresAt": 1234567890,
  "hasPassword": true,
  "maxDownloads": 10,
  "shareUrl": "/download/uuid-hmac"
}
```

### GET /download/{shareId}
Download file via share link

**Query Parameters:**
- `password` (optional): Password if share is protected

**Response:**
```json
{
  "downloadUrl": "https://s3.amazonaws.com/...",
  "filename": "document.pdf",
  "contentType": "application/pdf",
  "expiresIn": 60
}
```

### DELETE /shares/{shareId}
Revoke share link

**Response:**
```json
{
  "message": "Share revoked successfully",
  "shareId": "uuid-hmac"
}
```

## 🎯 Acceptance Criteria

✅ User can request upload URL and PUT 5MB file to S3
✅ Files table contains metadata after uploadProcessor runs
✅ User can create share link with 1-hour expiry
✅ Download via pre-signed GET URL works
✅ Download count increments atomically
✅ Revocation blocks downloads immediately
✅ Scan stub updates scanStatus to clean

## 🔒 IAM Policy Examples

### Lambda Execution Role (Presigner)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::bucket-name/uploads/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem"
      ],
      "Resource": "arn:aws:dynamodb:region:account:table/files-table"
    }
  ]
}
```

### Lambda Execution Role (DownloadHandler)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::bucket-name/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:UpdateItem"
      ],
      "Resource": "arn:aws:dynamodb:region:account:table/shares-table"
    }
  ]
}
```

## 🚦 Demo Script

Run this script to verify end-to-end functionality:

```bash
#!/bin/bash

API_ENDPOINT="https://your-api-id.execute-api.us-east-1.amazonaws.com"
TOKEN="your-jwt-token"

echo "1. Request upload URL..."
UPLOAD_RESPONSE=$(curl -s -X POST "$API_ENDPOINT/upload-url" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.pdf","contentType":"application/pdf","size":5242880}')

UPLOAD_URL=$(echo $UPLOAD_RESPONSE | jq -r '.uploadUrl')
FILE_ID=$(echo $UPLOAD_RESPONSE | jq -r '.fileId')
echo "File ID: $FILE_ID"

echo "2. Upload 5MB test file..."
dd if=/dev/zero of=test.pdf bs=1M count=5
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: application/pdf" \
  --data-binary @test.pdf

echo "3. Wait for processing..."
sleep 5

echo "4. Create share link..."
SHARE_RESPONSE=$(curl -s -X POST "$API_ENDPOINT/shares" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"fileId\":\"$FILE_ID\",\"expiresInSeconds\":3600,\"password\":\"test123\",\"maxDownloads\":3}")

SHARE_ID=$(echo $SHARE_RESPONSE | jq -r '.shareId')
echo "Share ID: $SHARE_ID"

echo "5. Download file..."
DOWNLOAD_RESPONSE=$(curl -s "$API_ENDPOINT/download/$SHARE_ID?password=test123")
DOWNLOAD_URL=$(echo $DOWNLOAD_RESPONSE | jq -r '.downloadUrl')

curl -o downloaded.pdf "$DOWNLOAD_URL"
echo "Downloaded file size: $(wc -c < downloaded.pdf) bytes"

echo "6. Revoke share..."
curl -X DELETE "$API_ENDPOINT/shares/$SHARE_ID" \
  -H "Authorization: Bearer $TOKEN"

echo "7. Verify download blocked..."
BLOCKED_RESPONSE=$(curl -s "$API_ENDPOINT/download/$SHARE_ID?password=test123")
echo "Response: $BLOCKED_RESPONSE"

echo "✅ Demo complete!"
```

## 🔧 Troubleshooting

### Lambda Cold Starts
- Keep functions warm with CloudWatch Events
- Use provisioned concurrency for critical functions

### DynamoDB Throttling
- Increase provisioned capacity or use on-demand billing
- Implement exponential backoff

### S3 Pre-signed URL Expiry
- Ensure system clocks are synchronized
- Adjust expiry times based on network conditions

### Cognito Authentication
- Verify JWT token format and expiry
- Check authorizer configuration in API Gateway

## 📦 Project Structure

```
cloud-file-share-aws/
├── src/
│   ├── handlers/          # Lambda function handlers
│   │   ├── presigner.js
│   │   ├── uploadProcessor.js
│   │   ├── createShare.js
│   │   ├── downloadHandler.js
│   │   ├── revokeShare.js
│   │   └── scannerStub.js
│   └── utils/             # Shared utilities
│       ├── logger.js
│       ├── response.js
│       └── validation.js
├── tests/
│   ├── unit/              # Jest unit tests
│   └── integration.test.js
├── frontend/              # React application
│   ├── src/
│   │   ├── components/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── .github/workflows/     # CI/CD pipelines
├── serverless.yml         # Infrastructure as code
├── package.json
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- AWS SDK v3 for modern JavaScript AWS integration
- Serverless Framework for infrastructure management
- React for frontend UI
- Jest for testing framework
