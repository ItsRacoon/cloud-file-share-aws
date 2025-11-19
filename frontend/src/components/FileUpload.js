import React, { useState } from 'react';
import axios from 'axios';

function FileUpload({ apiEndpoint, token }) {
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
      // Step 1: Request pre-signed URL
      setMessage('Requesting upload URL...');
      const urlResponse = await axios.post(
        `${apiEndpoint}/upload-url`,
        {
          filename: file.name,
          contentType: file.type,
          size: file.size
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const { uploadUrl, fileId } = urlResponse.data;
      setMessage(`Uploading file (ID: ${fileId})...`);

      // Step 2: Upload file to S3
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        }
      });

      setMessage(`File uploaded successfully! File ID: ${fileId}`);
      setMessageType('success');
      setFile(null);
      setProgress(0);
      
      // Reset file input
      document.getElementById('file-input').value = '';

    } catch (error) {
      console.error('Upload error:', error);
      setMessage(
        error.response?.data?.error || 
        'Upload failed. Please try again.'
      );
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
