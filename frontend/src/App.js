import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import FileUpload from './components/FileUpload';
import FileList from './components/FileList';
import './App.css';

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || 'http://localhost:3000';
const AUTH_DISABLED = process.env.REACT_APP_AUTH_DISABLED === 'true';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadedFileId, setUploadedFileId] = useState(null);

  useEffect(() => {
    // Debug: Log environment variables
    console.log('=== Environment Variables ===');
    console.log('API_ENDPOINT:', API_ENDPOINT);
    console.log('REACT_APP_API_ENDPOINT:', process.env.REACT_APP_API_ENDPOINT);
    console.log('AUTH_DISABLED:', AUTH_DISABLED);
    console.log('============================');
    
    // Check for existing session
    if (AUTH_DISABLED) {
      setUser({ username: 'demo-user', token: 'demo-token' });
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleFileUploaded = (fileId) => {
    setUploadedFileId(fileId);
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="App">
      <div className="container">
        <div className="header">
          <h1>☁️ Cloud File Share</h1>
          <p>Secure serverless file sharing on AWS</p>
          {user && (
            <div style={{ marginTop: '10px' }}>
              <span>Logged in as: {user.username}</span>
              {!AUTH_DISABLED && (
                <button 
                  className="btn btn-secondary" 
                  onClick={handleLogout}
                  style={{ marginLeft: '15px' }}
                >
                  Logout
                </button>
              )}
            </div>
          )}
        </div>

        {!user ? (
          <Auth onLogin={handleLogin} authDisabled={AUTH_DISABLED} />
        ) : (
          <>
            <FileUpload 
              apiEndpoint={API_ENDPOINT} 
              token={user.token} 
              onFileUploaded={handleFileUploaded}
            />
            <FileList 
              apiEndpoint={API_ENDPOINT} 
              token={user.token}
              uploadedFileId={uploadedFileId}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
