const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { Logger } = require('../utils/logger');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const FILES_TABLE = process.env.FILES_TABLE;

/**
 * Stub malware scanner
 * Simulates scanning and marks files as clean
 * In production, integrate with actual AV service (ClamAV, VirusTotal, etc.)
 */
exports.handler = async (event) => {
  const logger = new Logger('scannerStub', event.Records?.[0]?.messageId);
  
  try {
    for (const record of event.Records) {
      const message = JSON.parse(record.body);
      const { fileId, key, size, contentType } = message;
      
      logger.info('Processing scan job', { fileId, key, size, contentType });
      
      // Simulate scan delay (100-500ms)
      const scanDelay = Math.floor(Math.random() * 400) + 100;
      await new Promise(resolve => setTimeout(resolve, scanDelay));
      
      // In production, perform actual malware scan here
      // For demo, randomly mark 1% as suspicious for testing
      const isSuspicious = Math.random() < 0.01;
      const scanStatus = isSuspicious ? 'suspicious' : 'clean';
      
      // Update file record with scan results
      await dynamoClient.send(new UpdateCommand({
        TableName: FILES_TABLE,
        Key: { fileId },
        UpdateExpression: 'SET isScanned = :scanned, scanStatus = :status, scannedAt = :now',
        ExpressionAttributeValues: {
          ':scanned': 'completed',
          ':status': scanStatus,
          ':now': Date.now()
        }
      }));
      
      logger.info('Scan completed', { fileId, scanStatus, scanDelay });
    }
    
    return { statusCode: 200, body: 'Scan complete' };
    
  } catch (err) {
    logger.error('Error processing scan', { error: err.message, stack: err.stack });
    throw err;
  }
};
