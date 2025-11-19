# Security Best Practices

## Authentication & Authorization

### Cognito Integration
- JWT tokens validated by API Gateway authorizer
- User identity extracted from `sub` claim
- All protected endpoints require valid token

### Demo Mode
- Set `AUTH_DISABLED=true` for testing only
- Never use in production
- Bypasses all authentication checks

## File Upload Security

### Content Type Validation
Whitelist approach prevents malicious file types:
- `image/*` - All image types
- `application/pdf` - PDF documents
- `text/*` - Text files
- `video/*` - Video files

**Blocked**: Executables (.exe, .sh, .bat), scripts (.js, .py), archives (.zip)

### Size Limits
- Default: 100MB per file
- Configurable via `MAX_FILE_SIZE` environment variable
- Enforced at presigner stage before upload

### Filename Sanitization
```javascript
// Removes path traversal and special characters
filename.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255)
```

## Share Link Security

### Secure ID Generation
```javascript
// UUID + HMAC prevents enumeration attacks
const uuid = uuidv4();
const hmac = crypto.createHmac('sha256', secret)
  .update(`${uuid}-${fileId}`)
  .digest('hex')
  .substring(0, 16);
const shareId = `${uuid}-${hmac}`;
```

### Password Protection
- Bcrypt with 10 rounds (cost factor)
- Passwords never stored in plaintext
- Compared server-side before generating download URL

### Download Limits
- Atomic counter with conditional updates
- Prevents race conditions
- Enforced before URL generation

### Expiration
- Time-based expiry (configurable)
- DynamoDB TTL for automatic cleanup
- Application-level validation for immediate enforcement

## S3 Security

### Bucket Configuration
- Server-side encryption (SSE-AES256)
- Public access blocked
- Versioning disabled (reduces costs)
- Lifecycle rules for automatic deletion

### Pre-signed URLs
- Short expiry times (15 min upload, 60 sec download)
- Scoped to specific object and operation
- Cannot be reused after expiry

### Object Keys
```
uploads/{userId}/{fileId}/{filename}
```
- User isolation via prefix
- Prevents unauthorized access
- Enables per-user policies if needed

## IAM Least Privilege

### Presigner Lambda
```json
{
  "Effect": "Allow",
  "Action": ["s3:PutObject"],
  "Resource": "arn:aws:s3:::bucket/uploads/*"
}
```

### Download Handler Lambda
```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject"],
  "Resource": "arn:aws:s3:::bucket/*"
}
```

### Upload Processor Lambda
```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:GetObjectMetadata"],
  "Resource": "arn:aws:s3:::bucket/uploads/*"
}
```

## Malware Scanning

### Current Implementation
- Stub scanner for demonstration
- Marks files as pending → clean/suspicious
- Updates DynamoDB with scan results

### Production Integration
Integrate with:
- **ClamAV**: Open-source antivirus
- **VirusTotal API**: Multi-engine scanning
- **AWS GuardDuty**: Malware detection for S3

### Quarantine Flow
```javascript
if (scanStatus === 'infected') {
  // Move to quarantine prefix
  await s3.copyObject({
    CopySource: `${bucket}/${key}`,
    Bucket: bucket,
    Key: key.replace('uploads/', 'quarantine/')
  });
  
  // Delete original
  await s3.deleteObject({ Bucket: bucket, Key: key });
  
  // Block share creation
  // Notify user
}
```

## Logging & Monitoring

### Structured Logging
```javascript
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "INFO",
  "functionName": "downloadHandler",
  "requestId": "abc-123",
  "message": "Download URL generated",
  "shareId": "xyz-789",
  "userId": "user-123"
}
```

### CloudWatch Alarms
- High error rates
- Unusual download patterns
- Failed authentication attempts
- Scan failures

### Audit Trail
All operations logged with:
- Request ID for correlation
- User ID for accountability
- Timestamp for forensics
- Action and result

## Secrets Management

### Environment Variables
- Use AWS Systems Manager Parameter Store
- Or AWS Secrets Manager for rotation
- Never commit secrets to git

### Share Secret
```bash
# Generate strong secret
openssl rand -base64 32

# Store in Parameter Store
aws ssm put-parameter \
  --name /cloud-file-share/share-secret \
  --value "your-secret" \
  --type SecureString
```

## Rate Limiting

### API Gateway Throttling
```yaml
# serverless.yml
provider:
  apiGateway:
    throttle:
      burstLimit: 200
      rateLimit: 100
```

### Per-User Limits
Implement in Lambda:
```javascript
// Track requests per user in DynamoDB
const requestCount = await getRequestCount(userId);
if (requestCount > LIMIT) {
  return error('Rate limit exceeded', 429);
}
```

## CORS Configuration

```yaml
# serverless.yml
functions:
  downloadHandler:
    events:
      - httpApi:
          cors:
            allowedOrigins:
              - https://yourdomain.com
            allowedHeaders:
              - Content-Type
              - Authorization
            allowedMethods:
              - GET
              - POST
```

## Incident Response

### Compromised Share Link
1. Revoke share immediately
2. Check download logs for abuse
3. Rotate share secret if needed
4. Notify affected users

### Malware Detection
1. Quarantine infected file
2. Revoke all shares for file
3. Notify uploader
4. Review scan logs

### Data Breach
1. Rotate all credentials
2. Review CloudTrail logs
3. Notify affected users
4. Update security policies

## Compliance

### GDPR
- User data deletion on request
- Audit logs for data access
- Encryption at rest and in transit

### HIPAA
- Enable S3 bucket logging
- Use KMS for encryption
- Implement access controls
- Regular security audits

## Security Checklist

- [ ] Cognito authentication enabled in production
- [ ] Strong share secret configured
- [ ] S3 bucket encryption enabled
- [ ] Public access blocked on S3
- [ ] IAM roles follow least privilege
- [ ] CloudWatch alarms configured
- [ ] Malware scanning integrated
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Secrets in Parameter Store
- [ ] Audit logging enabled
- [ ] Regular security reviews scheduled
