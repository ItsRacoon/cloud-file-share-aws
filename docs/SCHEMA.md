# Database Schema Documentation

## Files Table

### Primary Key
- **Partition Key**: `fileId` (String)

### Global Secondary Indexes
- **UserIdIndex**: Partition Key = `userId`

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| fileId | String | Yes | Unique file identifier (UUID) |
| userId | String | Yes | Owner user ID from Cognito |
| filename | String | Yes | Sanitized filename |
| originalFilename | String | Yes | Original uploaded filename |
| contentType | String | Yes | MIME type |
| expectedSize | Number | Yes | Expected file size in bytes |
| actualSize | Number | No | Actual uploaded size |
| objectKey | String | Yes | S3 object key |
| uploadStatus | String | Yes | pending \| completed \| failed |
| isScanned | String | Yes | pending \| completed |
| scanStatus | String | No | clean \| suspicious \| infected |
| createdAt | Number | Yes | Unix timestamp (ms) |
| updatedAt | Number | Yes | Unix timestamp (ms) |
| scannedAt | Number | No | Unix timestamp (ms) |

### Sample Queries

```javascript
// Get file by ID
const params = {
  TableName: 'files-table',
  Key: { fileId: 'abc-123' }
};

// List user's files
const params = {
  TableName: 'files-table',
  IndexName: 'UserIdIndex',
  KeyConditionExpression: 'userId = :userId',
  ExpressionAttributeValues: {
    ':userId': 'user-123'
  }
};
```

## Shares Table

### Primary Key
- **Partition Key**: `shareId` (String)

### Global Secondary Indexes
- **FileIdIndex**: Partition Key = `fileId`

### TTL Configuration
- **TTL Attribute**: `expiresAt` (Number, Unix timestamp in seconds)

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| shareId | String | Yes | Secure share identifier (UUID + HMAC) |
| fileId | String | Yes | Reference to Files table |
| userId | String | Yes | Owner user ID |
| objectKey | String | Yes | S3 object key for direct access |
| filename | String | Yes | Filename for download |
| contentType | String | Yes | MIME type |
| passwordHash | String | No | Bcrypt hash if password protected |
| maxDownloads | Number | No | Max download limit (null = unlimited) |
| downloadCount | Number | Yes | Current download count |
| revoked | Boolean | Yes | Revocation status |
| createdAt | Number | Yes | Unix timestamp (ms) |
| expiresAt | Number | Yes | Unix timestamp (seconds) - TTL |
| revokedAt | Number | No | Unix timestamp (ms) |

### Sample Queries

```javascript
// Get share by ID
const params = {
  TableName: 'shares-table',
  Key: { shareId: 'abc-123-hmac' }
};

// List shares for a file
const params = {
  TableName: 'shares-table',
  IndexName: 'FileIdIndex',
  KeyConditionExpression: 'fileId = :fileId',
  ExpressionAttributeValues: {
    ':fileId': 'file-123'
  }
};

// Atomic download count increment with limit check
const params = {
  TableName: 'shares-table',
  Key: { shareId: 'abc-123-hmac' },
  UpdateExpression: 'SET downloadCount = downloadCount + :inc',
  ConditionExpression: 'downloadCount < :max',
  ExpressionAttributeValues: {
    ':inc': 1,
    ':max': 10
  }
};
```

## Access Patterns

### 1. Upload Flow
1. User requests upload URL → Create record in Files table
2. User uploads to S3 → S3 event triggers uploadProcessor
3. uploadProcessor updates Files table with actual size
4. Scanner updates Files table with scan results

### 2. Share Creation Flow
1. User requests share → Verify file exists in Files table
2. Create record in Shares table with expiry and limits
3. Return share URL to user

### 3. Download Flow
1. User accesses share URL → Query Shares table by shareId
2. Validate: not revoked, not expired, password correct, under limit
3. Atomically increment downloadCount
4. Generate pre-signed GET URL from S3

### 4. Revocation Flow
1. User revokes share → Update Shares table set revoked=true
2. Future download attempts fail validation

## Capacity Planning

### Files Table
- **Read**: Low (only on share creation and admin views)
- **Write**: Medium (one write per upload + scan update)
- **Recommendation**: On-demand billing or 5 RCU / 5 WCU

### Shares Table
- **Read**: High (every download request)
- **Write**: High (download count increments)
- **Recommendation**: On-demand billing or 25 RCU / 25 WCU

## TTL Behavior

DynamoDB TTL automatically deletes expired items within 48 hours. The `expiresAt` attribute is checked, but application logic should also validate expiry to handle items not yet deleted by TTL.

```javascript
// Always check expiry in application
const now = Math.floor(Date.now() / 1000);
if (share.expiresAt && share.expiresAt < now) {
  return error('Share has expired', 410);
}
```
