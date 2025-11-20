const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { Logger } = require('../utils/logger');
const { success, error } = require('../utils/response');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const SHARES_TABLE = process.env.SHARES_TABLE;

/**
 * Get user's share links
 * Returns all shares created by the authenticated user
 */
exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || uuidv4();
  const logger = new Logger('userLinks', requestId);
  
  try {
    const userId = event.pathParameters?.userId;
    
    if (!userId) {
      return error('Missing userId', 400);
    }
    
    // Verify user is requesting their own links
    const authUserId = event.requestContext?.authorizer?.jwt?.claims?.sub || 
                      event.requestContext?.authorizer?.jwt?.claims?.email;
    
    if (userId !== authUserId) {
      logger.warn('Unauthorized access attempt', { userId, authUserId });
      return error('Unauthorized', 403);
    }
    
    logger.info('Fetching user links', { userId });
    
    // Query shares by userId
    const result = await dynamoClient.send(new QueryCommand({
      TableName: SHARES_TABLE,
      IndexName: 'userId-createdAt-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ScanIndexForward: false // Most recent first
    }));
    
    // Process shares to add status information
    const now = Math.floor(Date.now() / 1000);
    const shares = result.Items.map(share => ({
      ...share,
      expired: share.expiresAt && share.expiresAt < now,
      shareUrl: `${event.requestContext.domainName}/download/${share.shareId}`
    }));
    
    logger.info('User links retrieved', { userId, count: shares.length });
    
    return success({
      shares,
      total: shares.length,
      active: shares.filter(s => !s.expired && !s.revoked).length,
      expired: shares.filter(s => s.expired).length,
      revoked: shares.filter(s => s.revoked).length
    });
    
  } catch (err) {
    logger.error('Error fetching user links', { error: err.message, stack: err.stack });
    return error('Internal server error', 500);
  }
};