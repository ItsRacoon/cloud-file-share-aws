const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { Logger } = require('../utils/logger');
const { success, error } = require('../utils/response');

const s3Client = new S3Client({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const BUCKET_NAME = process.env.BUCKET_NAME;
const SHARES_TABLE = process.env.SHARES_TABLE;
const DOWNLOAD_URL_EXPIRY = 60; // 60 seconds for download URL

/**
 * Handle file downloads via share links
 * Validates share, password, download limits, and generates short-lived pre-signed GET URL
 */
exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || uuidv4();
  const logger = new Logger('downloadHandler', requestId);
  
  try {
    const shareId = event.pathParameters?.shareId;
    
    if (!shareId) {
      return error('Missing shareId', 400);
    }
    
    logger.info('Processing download request', { shareId });
    
    // Get password from query string or body
    const password = event.queryStringParameters?.password || 
                    (event.body ? JSON.parse(event.body).password : null);
    
    // Retrieve share record
    const shareResult = await dynamoClient.send(new GetCommand({
      TableName: SHARES_TABLE,
      Key: { shareId }
    }));
    
    if (!shareResult.Item) {
      logger.warn('Share not found', { shareId });
      return error('Share not found', 404);
    }
    
    const share = shareResult.Item;
    
    // Check if share is revoked
    if (share.revoked) {
      logger.warn('Share revoked', { shareId });
      return error('Share has been revoked', 403);
    }
    
    // Check expiration (DynamoDB TTL may not have cleaned up yet)
    const now = Math.floor(Date.now() / 1000);
    if (share.expiresAt && share.expiresAt < now) {
      logger.warn('Share expired', { shareId, expiresAt: share.expiresAt, now });
      return error('Share has expired', 410);
    }
    
    // Verify password if required
    if (share.passwordHash) {
      if (!password) {
        logger.warn('Password required but not provided', { shareId });
        return error('Password required', 401);
      }
      
      const passwordValid = await bcrypt.compare(password, share.passwordHash);
      if (!passwordValid) {
        logger.warn('Invalid password', { shareId });
        return error('Invalid password', 401);
      }
    }
    
    // Check download limit
    if (share.maxDownloads !== null && share.downloadCount >= share.maxDownloads) {
      logger.warn('Download limit reached', { shareId, maxDownloads: share.maxDownloads });
      return error('Download limit reached', 403);
    }
    
    // Atomically increment download count with conditional check
    try {
      const updateExpression = share.maxDownloads !== null
        ? 'SET downloadCount = downloadCount + :inc'
        : 'SET downloadCount = if_not_exists(downloadCount, :zero) + :inc';
      
      const conditionExpression = share.maxDownloads !== null
        ? 'downloadCount < :max'
        : undefined;
      
      const expressionValues = {
        ':inc': 1,
        ':zero': 0
      };
      
      if (share.maxDownloads !== null) {
        expressionValues[':max'] = share.maxDownloads;
      }
      
      await dynamoClient.send(new UpdateCommand({
        TableName: SHARES_TABLE,
        Key: { shareId },
        UpdateExpression: updateExpression,
        ConditionExpression: conditionExpression,
        ExpressionAttributeValues: expressionValues
      }));
      
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') {
        logger.warn('Download limit reached (race condition)', { shareId });
        return error('Download limit reached', 403);
      }
      throw err;
    }
    
    // Generate short-lived pre-signed GET URL
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: share.objectKey
    });
    
    const downloadUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: DOWNLOAD_URL_EXPIRY 
    });
    
    logger.info('Download URL generated', { 
      shareId, 
      fileId: share.fileId,
      downloadCount: share.downloadCount + 1
    });
    
    return success({
      downloadUrl,
      filename: share.filename,
      contentType: share.contentType,
      expiresIn: DOWNLOAD_URL_EXPIRY
    });
    
  } catch (err) {
    logger.error('Error processing download', { error: err.message, stack: err.stack });
    return error('Internal server error', 500);
  }
};
