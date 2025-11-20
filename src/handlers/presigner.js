const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { Logger } = require('../utils/logger');
const { success, error } = require('../utils/response');
const { isAllowedContentType, isValidFileSize, sanitizeFilename } = require('../utils/validation');

const s3Client = new S3Client({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const BUCKET_NAME = process.env.BUCKET_NAME;
const FILES_TABLE = process.env.FILES_TABLE;
// Billing protection limits
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB (reduced for cost protection)
const DAILY_UPLOAD_LIMIT = parseInt(process.env.DAILY_UPLOAD_LIMIT || '10'); // 10 files per day
const MONTHLY_STORAGE_LIMIT = parseInt(process.env.MONTHLY_STORAGE_LIMIT || '1073741824'); // 1GB per month
const MAX_FILE_SIZE_ANONYMOUS = parseInt(process.env.MAX_FILE_SIZE_ANONYMOUS || '10485760'); // 10MB for anonymous users
const DAILY_UPLOAD_LIMIT_ANONYMOUS = parseInt(process.env.DAILY_UPLOAD_LIMIT_ANONYMOUS || '3'); // 3 files per day for anonymous
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
    
    // Extract user info from JWT or mark as anonymous
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    const isAuthenticated = authHeader && authHeader.startsWith('Bearer ') && authHeader !== 'Bearer demo-token';
    const userId = isAuthenticated 
      ? event.requestContext?.authorizer?.jwt?.claims?.sub || event.requestContext?.authorizer?.jwt?.claims?.email
      : `anonymous-${event.requestContext?.identity?.sourceIp?.replace(/\./g, '-') || 'unknown'}`;
    
    logger.info('User authentication status', { userId, isAuthenticated });
    
    // Apply different limits based on authentication
    const maxFileSize = isAuthenticated ? MAX_FILE_SIZE : MAX_FILE_SIZE_ANONYMOUS;
    const dailyLimit = isAuthenticated ? DAILY_UPLOAD_LIMIT : DAILY_UPLOAD_LIMIT_ANONYMOUS;
    
    // Check daily upload limit to prevent abuse
    const today = new Date().toISOString().split('T')[0];
    const dailyUploads = await dynamoClient.send(new QueryCommand({
      TableName: FILES_TABLE,
      IndexName: 'userId-createdAt-index',
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: 'begins_with(createdAt, :today)',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':today': today
      }
    }));
    
    if (dailyUploads.Count >= dailyLimit) {
      logger.warn('Daily upload limit exceeded', { userId, count: dailyUploads.Count, limit: dailyLimit });
      return error(`Daily upload limit reached (${dailyLimit} files). ${isAuthenticated ? 'Try again tomorrow.' : 'Sign in for higher limits.'}`, 429);
    }
    
    // Check monthly storage limit for cost protection
    const thisMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const monthlyUploads = await dynamoClient.send(new QueryCommand({
      TableName: FILES_TABLE,
      IndexName: 'userId-createdAt-index',
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: 'begins_with(createdAt, :month)',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':month': thisMonth
      }
    }));
    
    const monthlyStorageUsed = monthlyUploads.Items?.reduce((total, item) => total + (item.actualSize || item.expectedSize || 0), 0) || 0;
    
    if (monthlyStorageUsed + size > MONTHLY_STORAGE_LIMIT) {
      logger.warn('Monthly storage limit exceeded', { userId, monthlyStorageUsed, requestedSize: size });
      return error(`Monthly storage limit reached (${Math.round(MONTHLY_STORAGE_LIMIT / 1024 / 1024)}MB). ${isAuthenticated ? 'Contact support for higher limits.' : 'Sign in for higher limits.'}`, 429);
    }
    
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
    
    // Validate file size based on user type
    if (!isValidFileSize(size, maxFileSize)) {
      logger.warn('Invalid file size', { size, maxSize: maxFileSize, isAuthenticated });
      return error(`File size exceeds limit (${Math.round(maxFileSize / 1024 / 1024)}MB)`, 400, { 
        maxSize: maxFileSize,
        providedSize: size,
        suggestion: isAuthenticated ? 'Try a smaller file' : 'Sign in for higher limits (50MB)'
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
