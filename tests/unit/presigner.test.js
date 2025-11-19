const { handler } = require('../../src/handlers/presigner');

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

describe('Presigner Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BUCKET_NAME = 'test-bucket';
    process.env.FILES_TABLE = 'test-files-table';
    process.env.MAX_FILE_SIZE = '104857600';
    
    // Mock getSignedUrl
    getSignedUrl.mockResolvedValue('https://s3.amazonaws.com/presigned-url');
    
    // Mock DynamoDB send
    DynamoDBDocumentClient.from = jest.fn().mockReturnValue({
      send: jest.fn().mockResolvedValue({})
    });
  });

  test('should generate pre-signed URL for valid request', async () => {
    const event = {
      requestContext: {
        requestId: 'test-request-id',
        authorizer: {
          jwt: {
            claims: { sub: 'user-123' }
          }
        }
      },
      body: JSON.stringify({
        filename: 'test.pdf',
        contentType: 'application/pdf',
        size: 1024000
      })
    };

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.uploadUrl).toBeDefined();
    expect(body.fileId).toBeDefined();
    expect(body.objectKey).toContain('uploads/user-123');
  });

  test('should reject invalid content type', async () => {
    const event = {
      requestContext: { requestId: 'test-request-id' },
      body: JSON.stringify({
        filename: 'test.exe',
        contentType: 'application/x-msdownload',
        size: 1024000
      })
    };

    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    expect(result.body).toContain('Content type not allowed');
  });

  test('should reject oversized file', async () => {
    const event = {
      requestContext: { requestId: 'test-request-id' },
      body: JSON.stringify({
        filename: 'large.pdf',
        contentType: 'application/pdf',
        size: 200000000 // 200MB
      })
    };

    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    expect(result.body).toContain('File size exceeds limit');
  });

  test('should reject missing required fields', async () => {
    const event = {
      requestContext: { requestId: 'test-request-id' },
      body: JSON.stringify({
        filename: 'test.pdf'
        // Missing contentType and size
      })
    };

    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    expect(result.body).toContain('Missing required fields');
  });
});
