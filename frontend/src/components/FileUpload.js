import React, { useState } from 'react';

function FileUpload({ apiEndpoint, token, onFileUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file size (100MB limit)
      if (selectedFile.size > 104857600) {
        setMessage('File size exceeds 100MB limit');
        setMessageType('error');
        return;
      }
      setFile(selectedFile);
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file');
      setMessageType('error');
      return;
    }

    setUploading(true);
    setProgress(0);
    setMessage('');

    try {
      // Debug: Log API endpoint
      console.log('=== Upload Debug ===');
      console.log('API Endpoint:', apiEndpoint);
      console.log('Upload URL:', `${apiEndpoint}/upload-url`);
      console.log('File:', file.name, file.size, file.type);
      console.log('==================');
      
      // Step 1: Request pre-signed URL
      setMessage('Requesting upload URL...');
      const response = await fetch(`${apiEndpoint}/upload-url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const { uploadUrl, fileId } = data;
      setMessage(`Uploading file (ID: ${fileId})...`);

      // Step 2: Upload file to S3 with progress tracking
      const xhr = new XMLHttpRequest();
      
      await new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentCompleted = Math.round((e.loaded * 100) / e.total);
            setProgress(percentCompleted);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      setMessage(`File uploaded successfully! File ID: ${fileId}\n\nScroll down to create a share link (wait 10-15 seconds for processing).`);
      setMessageType('success');
      setFile(null);
      setProgress(0);
      
      // Notify parent component
      if (onFileUploaded) {
        onFileUploaded(fileId);
      }
      
      // Reset file input
      document.getElementById('file-input').value = '';

    } catch (error) {
      console.error('Upload error:', error);
      setMessage(error.message || 'Upload failed. Please try again.');
      setMessageType('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card">
      <h2>📤 Upload File</h2>
      
      {message && (
        <div className={`alert alert-${messageType || 'info'}`}>
          {message}
        </div>
      )}

      <div className="form-group">
        <label>Select File (Max 100MB)</label>
        <input
          id="file-input"
          type="file"
          onChange={handleFileSelect}
          disabled={uploading}
        />
      </div>

      {file && (
        <div className="alert alert-info">
          Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
        </div>
      )}

      {uploading && progress > 0 && (
        <div className="progress">
          <div className="progress-bar" style={{ width: `${progress}%` }}>
            {progress}%
          </div>
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={handleUpload}
        disabled={!file || uploading}
      >
        {uploading ? 'Uploading...' : 'Upload File'}
      </button>
    </div>
  );
}

export default FileUpload;
