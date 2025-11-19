/**
 * Integration test script for end-to-end workflow
 * Run with: node tests/integration.test.js
 * 
 * Prerequisites:
 * - AWS credentials configured
 * - Stack deployed to AWS
 * - Environment variables set (see below)
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const https = require('https');
const http = require('http');

// Configuration from environment
const API_ENDPOINT = process.env.API_ENDPOINT || 'https://your-api-id.execute-api.us-east-1.amazonaws.com';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'demo-token';
const FILES_TABLE = process.env.FILES_TABLE;
const SHARES_TABLE = process.env.SHARES_TABLE;

const s3Client = new S3Client({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * Make HTTP request helper
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: data ? JSON.parse(data) : null,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: data,
            headers: res.headers
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

/**
 * Test workflow
 */
async function runIntegrationTest() {
  console.log('🚀 Starting integration test...\n');
  
  try {
    // Step 1: Request upload URL
    console.log('Step 1: Requesting upload URL...');
    const uploadUrlResponse = await makeRequest(`${API_ENDPOINT}/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify({
        filename: 'test-integration.pdf',
        contentType: 'application/pdf',
        size: 5242880 // 5MB
      })
    });
    
    if (uploadUrlResponse.statusCode !== 200) {
      throw new Error(`Upload URL request failed: ${JSON.stringify(uploadUrlResponse.body)}`);
    }
    
    const { uploadUrl, fileId, objectKey } = uploadUrlResponse.body;
    console.log(`✓ Upload URL received (fileId: ${fileId})\n`);
    
    // Step 2: Upload file to S3
    console.log('Step 2: Uploading file to S3...');
    const testFileContent = Buffer.alloc(5242880, 'A'); // 5MB of 'A's
    
    const uploadResponse = await makeRequest(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': testFileContent.length
      },
      body: testFileContent
    });
    
    if (uploadResponse.statusCode !== 200) {
      throw new Error(`File upload failed: ${uploadResponse.statusCode}`);
    }
    
    console.log('✓ File uploaded to S3\n');
    
    // Step 3: Wait for upload processor and scanner
    console.log('Step 3: Waiting for upload processor and scanner...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    
    // Check file metadata
    const fileRecord = await dynamoClient.send(new GetCommand({
      TableName: FILES_TABLE,
      Key: { fileId }
    }));
    
    if (!fileRecord.Item) {
      throw new Error('File record not found in DynamoDB');
    }
    
    console.log(`✓ File metadata: uploadStatus=${fileRecord.Item.uploadStatus}, scanStatus=${fileRecord.Item.scanStatus}\n`);
    
    // Step 4: Create share link
    console.log('Step 4: Creating share link...');
    const shareResponse = await makeRequest(`${API_ENDPOINT}/shares`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify({
        fileId,
        expiresInSeconds: 3600,
        password: 'test123',
        maxDownloads: 3
      })
    });
    
    if (shareResponse.statusCode !== 201) {
      throw new Error(`Share creation failed: ${JSON.stringify(shareResponse.body)}`);
    }
    
    const { shareId } = shareResponse.body;
    console.log(`✓ Share link created (shareId: ${shareId})\n`);
    
    // Step 5: Download via share link
    console.log('Step 5: Downloading via share link...');
    const downloadResponse = await makeRequest(`${API_ENDPOINT}/download/${shareId}?password=test123`, {
      method: 'GET'
    });
    
    if (downloadResponse.statusCode !== 200) {
      throw new Error(`Download failed: ${JSON.stringify(downloadResponse.body)}`);
    }
    
    console.log(`✓ Download URL generated\n`);
    
    // Step 6: Verify download count increment
    const shareRecord = await dynamoClient.send(new GetCommand({
      TableName: SHARES_TABLE,
      Key: { shareId }
    }));
    
    if (shareRecord.Item.downloadCount !== 1) {
      throw new Error(`Download count not incremented: ${shareRecord.Item.downloadCount}`);
    }
    
    console.log(`✓ Download count incremented (count: ${shareRecord.Item.downloadCount})\n`);
    
    // Step 7: Revoke share
    console.log('Step 7: Revoking share...');
    const revokeResponse = await makeRequest(`${API_ENDPOINT}/shares/${shareId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    if (revokeResponse.statusCode !== 200) {
      throw new Error(`Revoke failed: ${JSON.stringify(revokeResponse.body)}`);
    }
    
    console.log('✓ Share revoked\n');
    
    // Step 8: Verify download blocked after revocation
    console.log('Step 8: Verifying download blocked after revocation...');
    const blockedDownloadResponse = await makeRequest(`${API_ENDPOINT}/download/${shareId}?password=test123`, {
      method: 'GET'
    });
    
    if (blockedDownloadResponse.statusCode !== 403) {
      throw new Error(`Download should be blocked but got: ${blockedDownloadResponse.statusCode}`);
    }
    
    console.log('✓ Download correctly blocked after revocation\n');
    
    console.log('✅ All integration tests passed!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runIntegrationTest();
}

module.exports = { runIntegrationTest };
