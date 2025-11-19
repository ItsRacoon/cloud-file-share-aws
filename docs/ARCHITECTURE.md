# Architecture Documentation

## System Overview

Cloud File Share is a serverless file sharing system built entirely on AWS managed services. It provides secure file uploads, shareable links with expiration, password protection, and download limits.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                              │
│  ┌──────────────────┐              ┌──────────────────┐            │
│  │  React Frontend  │              │   CLI / cURL     │            │
│  │  (localhost:3000)│              │   (API Testing)  │            │
│  └────────┬─────────┘              └────────┬─────────┘            │
└───────────┼──────────────────────────────────┼──────────────────────┘
            │                                  │
            │ HTTPS                            │ HTTPS
            ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (HTTP API)                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Cognito JWT Authorizer (optional)                           │  │
│  │  - Validates JWT tokens                                      │  │
│  │  - Extracts user identity                                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Routes:                                                            │
│  POST   /upload-url        → presigner Lambda                      │
│  POST   /shares            → createShare Lambda                    │
│  GET    /download/{id}     → downloadHandler Lambda (public)       │
│  DELETE /shares/{id}       → revokeShare Lambda                    │
└─────────────────────────────────────────────────────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        LAMBDA FUNCTIONS                             │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  presigner   │  │ createShare  │  │downloadHandler│            │
│  │              │  │              │  │              │            │
│  │ • Validate   │  │ • Verify file│  │ • Validate   │            │
│  │ • Generate   │  │ • Hash pwd   │  │ • Check pwd  │            │
│  │   pre-signed │  │ • Create     │  │ • Increment  │            │
│  │   PUT URL    │  │   share      │  │   counter    │            │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘            │
│         │                  │                  │                     │
│  ┌──────────────┐  ┌──────────────┐                               │
│  │ revokeShare  │  │uploadProcessor│                               │
│  │              │  │              │                               │
│  │ • Mark       │  │ • Update     │                               │
│  │   revoked    │  │   metadata   │                               │
│  │              │  │ • Enqueue    │                               │
│  └──────┬───────┘  │   scan       │                               │
│         │          └──────┬───────┘                               │
│         │                 │                                        │
│         │          ┌──────────────┐                               │
│         │          │ scannerStub  │                               │
│         │          │              │                               │
│         │          │ • Simulate   │                               │
│         │          │   scan       │                               │
│         │          │ • Update     │                               │
│         │          │   status     │                               │
│         │          └──────┬───────┘                               │
└─────────┼──────────────────┼──────────────────────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      STORAGE & DATA LAYER                           │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    S3 BUCKET                                │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │  uploads/{userId}/{fileId}/{filename}                │  │   │
│  │  │  • Server-side encryption (SSE-AES256)               │  │   │
│  │  │  • Lifecycle: Delete after 30 days                   │  │   │
│  │  │  • Versioning: Disabled                              │  │   │
│  │  │  • Public access: Blocked                            │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  │  Event: ObjectCreated → uploadProcessor Lambda             │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │              DYNAMODB TABLES                                │   │
│  │                                                              │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │  Files Table                                         │   │   │
│  │  │  PK: fileId                                          │   │   │
│  │  │  GSI: userId                                         │   │   │
│  │  │  • File metadata                                     │   │   │
│  │  │  • Upload status                                     │   │   │
│  │  │  • Scan results                                      │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │  Shares Table                                        │   │   │
│  │  │  PK: shareId                                         │   │   │
│  │  │  GSI: fileId                                         │   │   │
│  │  │  TTL: expiresAt                                      │   │   │
│  │  │  • Share configuration                               │   │   │
│  │  │  • Password hash                                     │   │   │
│  │  │  • Download counter                                  │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    SQS QUEUE                                │   │
│  │  • Scan job queue                                           │   │
│  │  • Decouples upload from scanning                           │   │
│  │  • Retry logic for failed scans                             │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │              COGNITO USER POOL                              │   │
│  │  • User authentication                                      │   │
│  │  • JWT token generation                                     │   │
│  │  • Email verification                                       │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Upload Flow

```
1. User → API Gateway → presigner Lambda
   ├─ Validate: content type, size, filename
   ├─ Generate: pre-signed PUT URL (15 min expiry)
   └─ Create: Initial record in Files table

2. User → S3 (direct upload via pre-signed URL)
   └─ Upload file to uploads/{userId}/{fileId}/{filename}

3. S3 → uploadProcessor Lambda (ObjectCreated event)
   ├─ Read: Object metadata from S3
   ├─ Update: Files table with actual size
   └─ Enqueue: Scan job to SQS

4. SQS → scannerStub Lambda
   ├─ Simulate: Malware scan
   └─ Update: Files table with scan results
```

### Share Creation Flow

```
1. User → API Gateway → createShare Lambda
   ├─ Verify: File exists and belongs to user
   ├─ Generate: Secure share ID (UUID + HMAC)
   ├─ Hash: Password with bcrypt (if provided)
   └─ Create: Share record in Shares table

2. Response → User
   └─ Share URL: /download/{shareId}
```

### Download Flow

```
1. User → API Gateway → downloadHandler Lambda
   ├─ Retrieve: Share record from Shares table
   ├─ Validate: Not revoked, not expired
   ├─ Verify: Password (if required)
   ├─ Check: Download limit not exceeded
   ├─ Increment: Download counter (atomic)
   └─ Generate: Pre-signed GET URL (60 sec expiry)

2. User → S3 (direct download via pre-signed URL)
   └─ Download file
```

### Revocation Flow

```
1. User → API Gateway → revokeShare Lambda
   ├─ Verify: Share belongs to user
   └─ Update: Set revoked=true in Shares table

2. Future downloads → downloadHandler Lambda
   └─ Reject: Share has been revoked (403)
```

## Security Layers

### Layer 1: API Gateway
- JWT authentication (Cognito)
- Rate limiting
- CORS configuration
- Request validation

### Layer 2: Lambda Functions
- Input validation
- Content type whitelist
- File size limits
- Filename sanitization

### Layer 3: S3
- Pre-signed URLs (time-limited)
- Server-side encryption
- Public access blocked
- Bucket policies

### Layer 4: DynamoDB
- Atomic operations
- Conditional updates
- TTL for automatic cleanup
- Fine-grained access control

### Layer 5: Application Logic
- Password hashing (bcrypt)
- Secure ID generation (UUID + HMAC)
- Download limit enforcement
- Expiration validation

## Scalability

### Horizontal Scaling
- Lambda: Auto-scales to 1000 concurrent executions
- API Gateway: Handles 10,000 requests/second
- DynamoDB: On-demand scaling or provisioned capacity
- S3: Unlimited storage and throughput

### Performance Optimization
- Pre-signed URLs: Direct S3 access (no Lambda proxy)
- DynamoDB GSI: Fast user file lookups
- Lambda cold start: < 1 second with Node.js 18
- S3 Transfer Acceleration: Optional for global users

## High Availability

### Multi-AZ Deployment
- Lambda: Automatically deployed across AZs
- DynamoDB: Multi-AZ replication
- S3: 99.999999999% durability
- API Gateway: Regional endpoint

### Disaster Recovery
- S3: Cross-region replication (optional)
- DynamoDB: Point-in-time recovery
- CloudFormation: Infrastructure as code
- Automated backups: DynamoDB on-demand

## Monitoring & Observability

### CloudWatch Metrics
- Lambda: Invocations, errors, duration
- API Gateway: Request count, latency, 4xx/5xx
- DynamoDB: Read/write capacity, throttles
- S3: Bucket size, request metrics

### CloudWatch Logs
- Structured JSON logging
- Request ID correlation
- Error stack traces
- Audit trail

### CloudWatch Alarms
- High error rates
- Throttling events
- Unusual traffic patterns
- Cost anomalies

## Cost Optimization

### Pay-per-use Model
- Lambda: $0.20 per 1M requests
- DynamoDB: On-demand billing
- S3: $0.023 per GB/month
- API Gateway: $1.00 per 1M requests

### Cost Reduction Strategies
- S3 lifecycle policies: Auto-delete old files
- DynamoDB TTL: Auto-delete expired shares
- Lambda memory optimization: Right-size functions
- Reserved capacity: For predictable workloads

## Compliance & Governance

### Data Residency
- Single region deployment
- No cross-region data transfer
- Configurable retention policies

### Audit & Compliance
- CloudTrail: API call logging
- S3 access logs: Object access tracking
- DynamoDB streams: Change data capture
- VPC Flow Logs: Network traffic (optional)

### Encryption
- At rest: S3 SSE, DynamoDB encryption
- In transit: TLS 1.2+
- Key management: AWS KMS (optional)

## Extension Points

### Malware Scanning
- Replace scannerStub with ClamAV Lambda
- Integrate VirusTotal API
- Use AWS GuardDuty for S3

### Notifications
- SNS topics for events
- Email notifications (SES)
- Webhook integrations

### Analytics
- S3 access logs → Athena
- DynamoDB streams → Kinesis
- CloudWatch Logs → Elasticsearch

### Multi-tenancy
- Cognito user pools per tenant
- S3 bucket per tenant
- DynamoDB table per tenant
- Or: Partition key strategy

## Technology Stack

- **Runtime**: Node.js 18.x
- **IaC**: Serverless Framework 3.x
- **Frontend**: React 18
- **Authentication**: AWS Cognito
- **Storage**: AWS S3
- **Database**: AWS DynamoDB
- **Compute**: AWS Lambda
- **API**: AWS API Gateway (HTTP API)
- **Queue**: AWS SQS
- **Monitoring**: AWS CloudWatch
- **CI/CD**: GitHub Actions
