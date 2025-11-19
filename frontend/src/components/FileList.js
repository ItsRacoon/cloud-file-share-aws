import React, { useState } from 'react';
import axios from 'axios';

function FileList({ apiEndpoint, token }) {
  const [files] = useState([]);
  const [shareConfig, setShareConfig] = useState({});
  const [shareLinks, setShareLinks] = useState({});
  const [message, setMessage] = useState('');

  const handleCreateShare = async (fileId) => {
    const config = shareConfig[fileId] || {};
    
    try {
      const response = await axios.post(
        `${apiEndpoint}/shares`,
        {
          fileId,
          expiresInSeconds: parseInt(config.expiresInSeconds || 3600),
          password: config.password || null,
          maxDownloads: config.maxDownloads ? parseInt(config.maxDownloads) : null
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const { shareId, shareUrl } = response.data;
      const fullUrl = `${apiEndpoint}${shareUrl}`;
      
      setShareLinks({
        ...shareLinks,
        [fileId]: fullUrl
      });
      
      setMessage(`Share link created for file ${fileId}`);
      
    } catch (error) {
      console.error('Share creation error:', error);
      setMessage(error.response?.data?.error || 'Failed to create share link');
    }
  };

  const handleRevokeShare = async (shareId) => {
    try {
      await axios.delete(
        `${apiEndpoint}/shares/${shareId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
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
      setMessage(error.response?.data?.error || 'Failed to revoke share');
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
        <div className="alert alert-info">
          {message}
        </div>
      )}

      <div className="alert alert-info">
        <strong>Demo Mode:</strong> After uploading a file, use the File ID from the upload 
        success message to create share links below. In production, this would automatically 
        list your uploaded files.
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Create Share Link</h3>
        <div className="form-group">
          <label>File ID</label>
          <input
            type="text"
            placeholder="Enter file ID from upload"
            onChange={(e) => updateShareConfig('manual', 'fileId', e.target.value)}
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
            const fileId = shareConfig['manual']?.fileId;
            if (fileId) {
              handleCreateShare(fileId);
            } else {
              setMessage('Please enter a file ID');
            }
          }}
        >
          Create Share Link
        </button>
      </div>

      {Object.keys(shareLinks).length > 0 && (
        <div>
          <h3>Active Share Links</h3>
          {Object.entries(shareLinks).map(([fileId, url]) => {
            const shareId = url.split('/').pop();
            return (
              <div key={fileId} className="file-item">
                <div className="file-info">
                  <div className="file-name">File ID: {fileId}</div>
                  <div className="share-link">{url}</div>
                  <div className="file-meta">
                    Click the link or use: GET {url}
                    {shareConfig[fileId]?.password && ' (password required)'}
                  </div>
                </div>
                <div className="file-actions">
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
