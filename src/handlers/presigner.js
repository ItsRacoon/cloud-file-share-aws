const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { Logger } = require('../utils/logger');
const { success, error } = require('../utils/response');
const { isAllowedContentType, isValidFileSize, sanitizeFilename } = require('../utils/validation');

const s3Client = new S3Client({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const BUCKET_NAME = process.env.BUCKET_NAME;
const FILES_TABLE = process.env.FILES_TABLE;
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '104857600'); // 100MB
const PRESIGNED_URL_EXPIRY = 900; // 15 minutes

/**
 * Generate pre-signed PUT URL for file upload
 * Validates content type, size, and creates initial metadata record
 */
exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || uuidv4();
  const logger = new Logger('presigner', requestId);
  
  try {
    logger.info('Processing upload URL request');
    
    // Extract user ID from JWT claims (or use demo user if auth disabled)
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub || 'demo-user';
    
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { filename, contentType, size } = body;
    
    // Validate required fields
    if (!filename || !contentType || !size) {
      logger.warn('Missing required fields', { filename, contentType, size });
      return error('Missing required fields: filename, contentType, size', 400);
    }
    
    // Validate content type
    if (!isAllowedContentType(contentType)) {
      logger.warn('Invalid content type', { contentType });
      return error('Content type not allowed', 400, { 
        allowedTypes: 'image/*, application/pdf, text/*, video/*' 
      });
    }
    
    // Validate file size
    if (!isValidFileSize(size, MAX_FILE_SIZE)) {
      logger.warn('Invalid file size', { size, maxSize: MAX_FILE_SIZE });
      return error('File size exceeds limit', 400, { 
        maxSize: MAX_FILE_SIZE,
        providedSize: size
      });
    }
    
    // Generate unique file ID and sanitize filename
    const fileId = uuidv4();
    const safeName = sanitizeFilename(filename);
    const objectKey = `uploads/${userId}/${fileId}/${safeName}`;
    
    // Create pre-signed PUT URL
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
      ContentType: contentType,
      Metadata: {
        fileId,
        userId,
        originalFilename: filename
      }
    });
    
    const uploadUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: PRESIGNED_URL_EXPIRY 
    });
    
    // Create initial metadata record in DynamoDB
    const now = Date.now();
    await dynamoClient.send(new PutCommand({
      TableName: FILES_TABLE,
      Item: {
        fileId,
        userId,
        filename: safeName,
        originalFilename: filename,
        contentType,
        expectedSize: size,
        actualSize: null,
        objectKey,
        uploadStatus: 'pending',
        isScanned: 'pending',
        scanStatus: null,
        createdAt: now,
        updatedAt: now
      }
    }));
    
    logger.info('Pre-signed URL generated', { fileId, objectKey });
    
    return success({
      uploadUrl,
      fileId,
      objectKey,
      expiresIn: PRESIGNED_URL_EXPIRY
    });
    
  } catch (err) {
    logger.error('Error generating pre-signed URL', { error: err.message, stack: err.stack });
    return error('Internal server error', 500);
  }
};
