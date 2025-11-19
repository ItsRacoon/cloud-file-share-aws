const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Logger } = require('../utils/logger');
const { success, error } = require('../utils/response');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const FILES_TABLE = process.env.FILES_TABLE;
const SHARES_TABLE = process.env.SHARES_TABLE;

/**
 * Generate secure share ID with HMAC
 * @param {string} fileId - File identifier
 * @returns {string} - Secure share ID
 */
function generateSecureShareId(fileId) {
  const uuid = uuidv4();
  const secret = process.env.SHARE_SECRET || 'default-secret-change-in-production';
  const hmac = crypto.createHmac('sha256', secret)
    .update(`${uuid}-${fileId}`)
    .digest('hex')
    .substring(0, 16);
  return `${uuid}-${hmac}`;
}

/**
 * Create a shareable link for a file
 * Supports expiration, password protection, and download limits
 */
exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || uuidv4();
  const logger = new Logger('createShare', requestId);
  
  try {
    logger.info('Creating share link');
    
    // Extract user ID from JWT claims
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub || 'demo-user';
    
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { 
      fileId, 
      expiresInSeconds = 3600, // Default 1 hour
      password = null,
      maxDownloads = null 
    } = body;
    
    // Validate required fields
    if (!fileId) {
      logger.warn('Missing fileId');
      return error('Missing required field: fileId', 400);
    }
    
    // Verify file exists and belongs to user
    const fileResult = await dynamoClient.send(new GetCommand({
      TableName: FILES_TABLE,
      Key: { fileId }
    }));
    
    if (!fileResult.Item) {
      logger.warn('File not found', { fileId });
      return error('File not found', 404);
    }
    
    if (fileResult.Item.userId !== userId) {
      logger.warn('Unauthorized access attempt', { fileId, userId });
      return error('Unauthorized', 403);
    }
    
    if (fileResult.Item.uploadStatus !== 'completed') {
      logger.warn('File upload not completed', { fileId, status: fileResult.Item.uploadStatus });
      return error('File upload not completed', 400);
    }
    
    // Generate secure share ID
    const shareId = generateSecureShareId(fileId);
    
    // Hash password if provided
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
      logger.info('Password protection enabled for share');
    }
    
    // Calculate expiration timestamp
    const now = Date.now();
    const expiresAt = Math.floor(now / 1000) + expiresInSeconds; // DynamoDB TTL uses seconds
    
    // Create share record
    const shareItem = {
      shareId,
      fileId,
      userId,
      createdAt: now,
      expiresAt,
      passwordHash,
      maxDownloads,
      downloadCount: 0,
      revoked: false,
      objectKey: fileResult.Item.objectKey,
      filename: fileResult.Item.filename,
      contentType: fileResult.Item.contentType
    };
    
    await dynamoClient.send(new PutCommand({
      TableName: SHARES_TABLE,
      Item: shareItem
    }));
    
    logger.info('Share link created', { 
      shareId, 
      fileId, 
      expiresAt,
      hasPassword: !!password,
      maxDownloads 
    });
    
    return success({
      shareId,
      fileId,
      expiresAt,
      expiresInSeconds,
      hasPassword: !!password,
      maxDownloads,
      shareUrl: `/download/${shareId}`
    }, 201);
    
  } catch (err) {
    logger.error('Error creating share', { error: err.message, stack: err.stack });
    return error('Internal server error', 500);
  }
};
