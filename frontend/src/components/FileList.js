import React, { useState } from 'react';

function FileList({ apiEndpoint, token, uploadedFileId }) {
  const [files] = useState([]);
  const [shareConfig, setShareConfig] = useState({});
  const [shareLinks, setShareLinks] = useState({});
  const [message, setMessage] = useState('');
  const [currentFileId, setCurrentFileId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Auto-populate file ID when file is uploaded
  React.useEffect(() => {
    if (uploadedFileId) {
      setCurrentFileId(uploadedFileId);
      setProcessing(true);
      setCountdown(20); // Increased to 20 seconds
      setProcessingProgress(0);
      setMessage('File is being processed... Please wait.');
    }
  }, [uploadedFileId]);

  // Countdown timer and progress bar
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
        setProcessingProgress(((20 - countdown) / 20) * 100);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && processing) {
      setProcessing(false);
      setProcessingProgress(100);
      setMessage('✓ Processing complete! You can now create a share link. If it fails, wait a few more seconds and try again.');
    }
  }, [countdown, processing]);

  const handleCreateShare = async (fileId) => {
    const config = shareConfig['manual'] || {};
    
    try {
      setMessage('Creating share link...');
      
      const response = await fetch(`${apiEndpoint}/shares`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId,
          expiresInSeconds: parseInt(config.expiresInSeconds || 3600),
          password: config.password || null,
          maxDownloads: config.maxDownloads ? parseInt(config.maxDownloads) : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || `HTTP error! status: ${response.status}`;
        
        // If file not ready, show helpful message
        if (errorMsg.includes('not completed') || errorMsg.includes('not found')) {
          throw new Error('File is still being processed. Please wait a few more seconds and try again.');
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const { shareId, shareUrl } = data;
      const fullUrl = `${apiEndpoint}${shareUrl}`;
      
      setShareLinks({
        ...shareLinks,
        [fileId]: { url: fullUrl, shareId }
      });
      
      setMessage(`✓ Share link created! Copy the URL below to share.`);
      
    } catch (error) {
      console.error('Share creation error:', error);
      setMessage(error.message || 'Failed to create share link');
    }
  };

  const handleRevokeShare = async (shareId) => {
    try {
      const response = await fetch(`${apiEndpoint}/shares/${shareId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      setMessage('Share link revoked');
      
      // Remove from local state
      const newShareLinks = { ...shareLinks };
      Object.keys(newShareLinks).forEach(fileId => {
        if (newShareLinks[fileId].includes(shareId)) {
          delete newShareLinks[fileId];
        }
      });
      setShareLinks(newShareLinks);
      
    } catch (error) {
      console.error('Revoke error:', error);
      setMessage(error.message || 'Failed to revoke share');
    }
  };

  const updateShareConfig = (fileId, field, value) => {
    setShareConfig({
      ...shareConfig,
      [fileId]: {
        ...(shareConfig[fileId] || {}),
        [field]: value
      }
    });
  };

  // Demo file for testing
  const demoFile = {
    fileId: 'demo-file-id',
    filename: 'example.pdf',
    size: 1024000,
    uploadStatus: 'completed',
    scanStatus: 'clean'
  };

  const displayFiles = files.length > 0 ? files : [demoFile];

  return (
    <div className="card">
      <h2>📁 My Files</h2>
      
      {message && (
        <div className={`alert ${processing ? 'alert-info' : 'alert-success'}`}>
          {message}
        </div>
      )}

      {processing && (
        <div className="card" style={{ marginBottom: '20px', background: '#fff3cd', borderColor: '#ffc107' }}>
          <h3 style={{ color: '#856404', marginBottom: '15px' }}>⏳ Processing File...</h3>
          <div className="progress" style={{ marginBottom: '10px' }}>
            <div 
              className="progress-bar" 
              style={{ 
                width: `${processingProgress}%`,
                background: '#ffc107',
                transition: 'width 1s linear'
              }}
            >
              {Math.round(processingProgress)}%
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#856404', textAlign: 'center' }}>
            {countdown > 0 ? (
              <>⏱️ {countdown} seconds remaining...</>
            ) : (
              <>✓ Ready!</>
            )}
          </div>
          <div style={{ fontSize: '14px', color: '#856404', textAlign: 'center', marginTop: '10px' }}>
            File is being uploaded to S3, scanned for malware, and processed. Please wait...
          </div>
          <div style={{ fontSize: '12px', color: '#856404', textAlign: 'center', marginTop: '5px', fontStyle: 'italic' }}>
            If creation fails after timer, wait a few more seconds and try again.
          </div>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3>Create Share Link</h3>
        <div className="form-group">
          <label>File ID</label>
          <input
            type="text"
            placeholder="File ID will auto-populate after upload"
            value={currentFileId}
            onChange={(e) => setCurrentFileId(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Expires In (seconds)</label>
          <input
            type="number"
            placeholder="3600"
            defaultValue="3600"
            onChange={(e) => updateShareConfig('manual', 'expiresInSeconds', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Password (optional)</label>
          <input
            type="password"
            placeholder="Leave empty for no password"
            onChange={(e) => updateShareConfig('manual', 'password', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Max Downloads (optional)</label>
          <input
            type="number"
            placeholder="Leave empty for unlimited"
            onChange={(e) => updateShareConfig('manual', 'maxDownloads', e.target.value)}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            if (currentFileId) {
              handleCreateShare(currentFileId);
            } else {
              setMessage('Please enter a file ID or upload a file first');
            }
          }}
          disabled={!currentFileId || processing}
          style={{ opacity: processing ? 0.5 : 1 }}
        >
          {processing ? `⏳ Wait ${countdown}s...` : 'Create Share Link'}
        </button>
      </div>

      {Object.keys(shareLinks).length > 0 && (
        <div>
          <h3>Active Share Links</h3>
          {Object.entries(shareLinks).map(([fileId, linkData]) => {
            const url = linkData.url || linkData;
            const shareId = linkData.shareId || url.split('/').pop();
            return (
              <div key={fileId} className="file-item">
                <div className="file-info">
                  <div className="file-name">File ID: {fileId}</div>
                  <div className="share-link">
                    <a href={url} target="_blank" rel="noopener noreferrer" style={{color: '#007bff', textDecoration: 'underline'}}>
                      {url}
                    </a>
                  </div>
                  <div className="file-meta">
                    Click the link above to download
                    {shareConfig['manual']?.password && ' (password required)'}
                  </div>
                </div>
                <div className="file-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(url);
                      setMessage('✓ Link copied to clipboard!');
                    }}
                    style={{marginRight: '10px'}}
                  >
                    Copy Link
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleRevokeShare(shareId)}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h3>Download File</h3>
        <div className="alert alert-info">
          To download a file, use the share link above or make a GET request to:
          <div className="share-link">
            {apiEndpoint}/download/[shareId]?password=[password]
          </div>
        </div>
      </div>
    </div>
  );
}

export default FileList;
