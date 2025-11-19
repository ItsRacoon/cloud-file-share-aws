const { handler } = require('../../src/handlers/createShare');

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('bcryptjs');

const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');

describe('CreateShare Handler', () => {
  let mockSend;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FILES_TABLE = 'test-files-table';
    process.env.SHARES_TABLE = 'test-shares-table';
    
    mockSend = jest.fn();
    DynamoDBDocumentClient.from = jest.fn().mockReturnValue({
      send: mockSend
    });
    
    bcrypt.hash = jest.fn().mockResolvedValue('hashed-password');
  });

  test('should create share link for valid file', async () => {
    // Mock file exists
    mockSend.mockResolvedValueOnce({
      Item: {
        fileId: 'file-123',
        userId: 'user-123',
        uploadStatus: 'completed',
        objectKey: 'uploads/user-123/file-123/test.pdf',
        filename: 'test.pdf',
        contentType: 'application/pdf'
      }
    });
    
    // Mock share creation
    mockSend.mockResolvedValueOnce({});

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
        fileId: 'file-123',
        expiresInSeconds: 3600
      })
    };

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.shareId).toBeDefined();
    expect(body.fileId).toBe('file-123');
    expect(body.shareUrl).toContain('/download/');
  });

  test('should create password-protected share', async () => {
    mockSend.mockResolvedValueOnce({
      Item: {
        fileId: 'file-123',
        userId: 'user-123',
        uploadStatus: 'completed',
        objectKey: 'uploads/user-123/file-123/test.pdf',
        filename: 'test.pdf',
        contentType: 'application/pdf'
      }
    });
    
    mockSend.mockResolvedValueOnce({});

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
        fileId: 'file-123',
        expiresInSeconds: 3600,
        password: 'secret123'
      })
    };

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.hasPassword).toBe(true);
    expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 10);
  });

  test('should reject non-existent file', async () => {
    mockSend.mockResolvedValueOnce({ Item: null });

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
        fileId: 'non-existent'
      })
    };

    const result = await handler(event);
    expect(result.statusCode).toBe(404);
  });

  test('should reject unauthorized access', async () => {
    mockSend.mockResolvedValueOnce({
      Item: {
        fileId: 'file-123',
        userId: 'other-user',
        uploadStatus: 'completed'
      }
    });

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
        fileId: 'file-123'
      })
    };

    const result = await handler(event);
    expect(result.statusCode).toBe(403);
  });
});
