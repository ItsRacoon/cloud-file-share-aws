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
 * Generate HTML download page
 */
function generateDownloadPage(shareId, share, errorMessage = null) {
  const requiresPassword = !!share?.passwordHash;
  const filename = share?.filename || 'file';
  const contentType = share?.contentType || 'application/octet-stream';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Download ${filename} - Cloud File Share</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 3rem;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
            max-width: 500px;
            width: 100%;
            text-align: center;
        }
        .icon { font-size: 4rem; margin-bottom: 1rem; }
        h1 { color: #333; font-size: 2rem; margin-bottom: 0.5rem; }
        .subtitle { color: #666; margin-bottom: 2rem; }
        .file-info {
            background: #f8f9ff;
            padding: 1rem;
            border-radius: 10px;
            margin-bottom: 2rem;
            text-align: left;
        }
        .file-info-item {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid #e0e0ff;
        }
        .file-info-item:last-child { border-bottom: none; }
        .label { font-weight: 600; color: #666; }
        .value { color: #333; }
        .form-group { margin-bottom: 1.5rem; text-align: left; }
        label { display: block; font-weight: 600; color: #555; margin-bottom: 0.5rem; }
        input[type="password"] {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .btn {
            width: 100%;
            padding: 1rem 2rem;
            border: none;
            border-radius: 10px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .alert {
            padding: 1rem;
            border-radius: 10px;
            margin-bottom: 1rem;
            font-weight: 500;
        }
        .alert-error { background: #ffebee; color: #d32f2f; border: 1px solid #ef9a9a; }
        .alert-info { background: #e3f2fd; color: #1976d2; border: 1px solid #90caf9; }
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .footer { margin-top: 2rem; color: #666; font-size: 0.9rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">${requiresPassword ? '🔒' : '📥'}</div>
        <h1>${requiresPassword ? 'Password Protected' : 'Download File'}</h1>
        <p class="subtitle">${requiresPassword ? 'This file requires a password' : 'Your file is ready to download'}</p>
        
        <div class="file-info">
            <div class="file-info-item">
                <span class="label">📄 File:</span>
                <span class="value">${filename}</span>
            </div>
            <div class="file-info-item">
                <span class="label">📦 Type:</span>
                <span class="value">${contentType.split('/')[0]}</span>
            </div>
        </div>

        <div id="message">${errorMessage ? '<div class="alert alert-error">' + errorMessage + '</div>' : ''}</div>

        <form id="downloadForm">
            ${requiresPassword ? `
            <div class="form-group">
                <label for="password">🔑 Enter Password</label>
                <input type="password" id="password" name="password" placeholder="Enter password" required autofocus>
            </div>
            ` : ''}
            
            <button type="submit" class="btn" id="downloadBtn">
                ${requiresPassword ? '🔓 Unlock & Download' : '⬇️ Download File'}
            </button>
        </form>

        <div class="footer">
            <p>☁️ Cloud File Share</p>
            <p>Secure serverless file sharing</p>
        </div>
    </div>

    <script>
        const form = document.getElementById('downloadForm');
        const downloadBtn = document.getElementById('downloadBtn');
        const messageDiv = document.getElementById('message');
        const passwordInput = document.getElementById('password');
        const requiresPassword = ${requiresPassword};

        function showMessage(message, type = 'info') {
            messageDiv.innerHTML = '<div class="alert alert-' + type + '">' + message + '</div>';
        }

        function setLoading(loading) {
            downloadBtn.disabled = loading;
            downloadBtn.innerHTML = loading ? '<span class="loading"></span> Downloading...' : (requiresPassword ? '🔓 Unlock & Download' : '⬇️ Download File');
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                setLoading(true);
                showMessage('Preparing download...', 'info');

                const password = passwordInput ? passwordInput.value : '';
                let url = window.location.href;
                
                // Add download=true to trigger actual download
                if (url.includes('?')) {
                    url += '&download=true';
                } else {
                    url += '?download=true';
                }
                
                if (password) {
                    url += '&password=' + encodeURIComponent(password);
                }

                // Redirect to download
                window.location.href = url;
                
            } catch (error) {
                console.error('Download error:', error);
                showMessage('❌ Download failed. Please try again.', 'error');
                setLoading(false);
            }
        });
    </script>
</body>
</html>`;
}

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
    
    // Check if this is a download request or page view
    const isDownloadRequest = event.queryStringParameters?.download === 'true';
    
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
    
    // If not a download request, show the download page
    if (!isDownloadRequest) {
      logger.info('Serving download page', { shareId });
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: generateDownloadPage(shareId, share)
      };
    }
    
    // Verify password if required
    if (share.passwordHash) {
      if (!password) {
        logger.warn('Password required but not provided', { shareId });
        // Return HTML page with error
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
          body: generateDownloadPage(shareId, share, '❌ Password required')
        };
      }
      
      const passwordValid = await bcrypt.compare(password, share.passwordHash);
      if (!passwordValid) {
        logger.warn('Invalid password', { shareId });
        // Return HTML page with error
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
          body: generateDownloadPage(shareId, share, '❌ Incorrect password. Please try again.')
        };
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
    
    // Return 302 redirect for browser downloads
    return {
      statusCode: 302,
      headers: {
        'Location': downloadUrl,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: ''
    };
    
  } catch (err) {
    logger.error('Error processing download', { error: err.message, stack: err.stack });
    return error('Internal server error', 500);
  }
};
