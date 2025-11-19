const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { Logger } = require('../utils/logger');

const s3Client = new S3Client({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sqsClient = new SQSClient({});

const FILES_TABLE = process.env.FILES_TABLE;
const SCAN_QUEUE_URL = process.env.SCAN_QUEUE_URL;

/**
 * Process uploaded files from S3 ObjectCreated events
 * Updates metadata and enqueues scan job
 */
exports.handler = async (event) => {
  const logger = new Logger('uploadProcessor', event.Records?.[0]?.responseElements?.['x-amz-request-id']);
  
  try {
    // Process each S3 event record
    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
      const size = record.s3.object.size;
      
      logger.info('Processing uploaded file', { bucket, key, size });
      
      // Extract fileId from object key pattern: uploads/{userId}/{fileId}/{filename}
      const keyParts = key.split('/');
      if (keyParts.length < 3 || keyParts[0] !== 'uploads') {
        logger.warn('Invalid object key format', { key });
        continue;
      }
      
      const fileId = keyParts[2];
      
      // Get object metadata from S3
      const headCommand = new HeadObjectCommand({ Bucket: bucket, Key: key });
      const headResult = await s3Client.send(headCommand);
      
      // Update file metadata in DynamoDB
      const now = Date.now();
      await dynamoClient.send(new UpdateCommand({
        TableName: FILES_TABLE,
        Key: { fileId },
        UpdateExpression: 'SET actualSize = :size, uploadStatus = :status, isScanned = :scanned, updatedAt = :now, contentType = :ct',
        ExpressionAttributeValues: {
          ':size': size,
          ':status': 'completed',
          ':scanned': 'pending',
          ':now': now,
          ':ct': headResult.ContentType
        }
      }));
      
      logger.info('File metadata updated', { fileId, actualSize: size });
      
      // Enqueue scan job
      await sqsClient.send(new SendMessageCommand({
        QueueUrl: SCAN_QUEUE_URL,
        MessageBody: JSON.stringify({
          fileId,
          bucket,
          key,
          size,
          contentType: headResult.ContentType
        })
      }));
      
      logger.info('Scan job enqueued', { fileId });
    }
    
    return { statusCode: 200, body: 'Processing complete' };
    
  } catch (err) {
    logger.error('Error processing upload', { error: err.message, stack: err.stack });
    throw err;
  }
};
