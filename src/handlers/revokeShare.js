const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uu
id');
const { Logger } = require('../utils/logger');
const { success, error } = require('../utils/response');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const SHARES_TABLE = process.env.SHARES_TABLE;

/**
 * Revoke a share link
 * Only the owner can revoke their shares
 */
exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || uuidv4();
  const logger = new Logger('revokeShare', requestId);
  
  try {
    const shareId = event.pathParameters?.shareId;
    
    if (!shareId) {
      return error('Missing shareId', 400);
    }
    
    logger.info('Revoking share', { shareId });
    
    // Extract user ID from JWT claims
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub || 'demo-user';
    
    // Get share to verify ownership
    const shareResult = await dynamoClient.send(new GetCommand({
      TableName: SHARES_TABLE,
      Key: { shareId }
    }));
    
    if (!shareResult.Item) {
      logger.warn('Share not found', { shareId });
      return error('Share not found', 404);
    }
    
    if (shareResult.Item.userId !== userId) {
      logger.warn('Unauthorized revoke attempt', { shareId, userId });
      return error('Unauthorized', 403);
    }
    
    // Mark share as revoked
    await dynamoClient.send(new UpdateCommand({
      TableName: SHARES_TABLE,
      Key: { shareId },
      UpdateExpression: 'SET revoked = :true, revokedAt = :now',
      ExpressionAttributeValues: {
        ':true': true,
        ':now': Date.now()
      }
    }));
    
    logger.info('Share revoked successfully', { shareId });
    
    return success({
      message: 'Share revoked successfully',
      shareId
    });
    
  } catch (err) {
    logger.error('Error revoking share', { error: err.message, stack: err.stack });
    return error('Internal server error', 500);
  }
};
