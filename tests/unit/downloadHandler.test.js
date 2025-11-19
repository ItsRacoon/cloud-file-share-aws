const { handler } = require('../../src/handlers/downloadHandler');

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('bcryptjs');

const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');

describe('DownloadHandler', () => {
  let mockSend;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BUCKET_NAME = 'test-bucket';
    process.env.SHARES_TABLE = 'test-shares-table';
    
    mockSend = jest.fn();
    DynamoDBDocumentClient.from = jest.fn().mockReturnValue({
      send: mockSend
    });
    
    getSignedUrl.mockResolvedValue('https://s3.amazonaws.com/download-url');
    bcrypt.compare = jest.fn().mockResolvedValue(true);
  });

  test('should generate download URL for valid share', async () => {
    const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
    
    mockSend.mockResolvedValueOnce({
      Item: {
        shareId: 'share-123',
        fileId: 'file-123',
        revoked: false,
        expiresAt: futureTimestamp,
        downloadCount: 0,
        maxDownloads: null,
        objectKey: 'uploads/user-123/file-123/test.pdf',
        filename: 'test.pdf',
        contentType: 'application/pdf'
      }
    });
    
    mockSend.mockResolvedValueOnce({});

    const event = {
      requestContext: { requestId: 'test-request-id' },
      pathParameters: { shareId: 'share-123' }
    };

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.downloadUrl).toBeDefined();
    expect(body.filename).toBe('test.pdf');
  });

  test('should reject revoked share', async () => {
    mockSend.mockResolvedValueOnce({
      Item: {
        shareId: 'share-123',
        revoked: true
      }
    });

    const event = {
      requestContext: { requestId: 'test-request-id' },
      pathParameters: { shareId: 'share-123' }
    };

    const result = await handler(event);
    expect(result.statusCode).toBe(403);
    expect(result.body).toContain('revoked');
  });

  test('should reject expired share', async () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 3600;
    
    mockSend.mockResolvedValueOnce({
      Item: {
        shareId: 'share-123',
        revoked: false,
        expiresAt: pastTimestamp
      }
    });

    const event = {
      requestContext: { requestId: 'test-request-id' },
      pathParameters: { shareId: 'share-123' }
    };

    const result = await handler(event);
    expect(result.statusCode).toBe(410);
    expect(result.body).toContain('expired');
  });

  test('should validate password for protected share', async () => {
    const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
    
    mockSend.mockResolvedValueOnce({
      Item: {
        shareId: 'share-123',
        revoked: false,
        expiresAt: futureTimestamp,
        passwordHash: 'hashed-password',
        downloadCount: 0,
        objectKey: 'uploads/user-123/file-123/test.pdf',
        filename: 'test.pdf',
        contentType: 'application/pdf'
      }
    });
    
    mockSend.mockResolvedValueOnce({});

    const event = {
      requestContext: { requestId: 'test-request-id' },
      pathParameters: { shareId: 'share-123' },
      queryStringParameters: { password: 'correct-password' }
    };

    const result = await handler(event);
    expect(result.statusCode).toBe(200);
    expect(bcrypt.compare).toHaveBeenCalledWith('correct-password', 'hashed-password');
  });

  test('should reject download limit exceeded', async () => {
    const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
    
    mockSend.mockResolvedValueOnce({
      Item: {
        shareId: 'share-123',
        revoked: false,
        expiresAt: futureTimestamp,
        downloadCount: 5,
        maxDownloads: 5
      }
    });

    const event = {
      requestContext: { requestId: 'test-request-id' },
      pathParameters: { shareId: 'share-123' }
    };

    const result = await handler(event);
    expect(result.statusCode).toBe(403);
    expect(result.body).toContain('Download limit reached');
  });
});
