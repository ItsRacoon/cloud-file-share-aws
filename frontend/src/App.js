import { useState, useEffect } from 'react';
import './index.css';

// Google Sign-In configuration
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || ''; // Add your Google Client ID

// Debug logging
console.log('Google Client ID:', GOOGLE_CLIENT_ID ? 'Set' : 'Not set');
console.log('Environment:', process.env.NODE_ENV);

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || 'https://syp1o7qfxj.execute-api.us-east-1.amazonaws.com';

function App() {
  // Authentication state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authMode, setAuthMode] = useState('anonymous'); // 'anonymous' or 'google'
  
  // File upload state
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [fileId, setFileId] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [message, setMessage] = useState('');
  const [shareConfig, setShareConfig] = useState({
    expiresInSeconds: 3600,
    password: '',
    maxDownloads: ''
  });
  
  // User dashboard state
  const [userLinks, setUserLinks] = useState([]);
  const [showDashboard, setShowDashboard] = useState(false);

  // Google Sign-In handler (defined before useEffect)
  const handleGoogleSignIn = (response) => {
    try {
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      setUser({
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      });
      setToken(response.credential);
      setAuthMode('google');
      setMessage('✓ Signed in successfully!');
      loadUserLinks(payload.sub);
    } catch (error) {
      console.error('Google Sign-In error:', error);
      setMessage('❌ Sign-in failed. Please try again.');
    }
  };

  // Load Google Sign-In
  useEffect(() => {
    const loadGoogleSignIn = () => {
      if (window.google && GOOGLE_CLIENT_ID) {
        console.log('Initializing Google Sign-In with Client ID:', GOOGLE_CLIENT_ID);
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleSignIn,
          auto_select: false,
          cancel_on_tap_outside: false
        });
      }
    };

    if (GOOGLE_CLIENT_ID) {
      console.log('Loading Google Sign-In script...');
      if (window.google) {
        loadGoogleSignIn();
      } else {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = () => {
          console.log('Google Sign-In script loaded');
          loadGoogleSignIn();
        };
        script.onerror = () => {
          console.error('Failed to load Google Sign-In script');
        };
        document.head.appendChild(script);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [GOOGLE_CLIENT_ID]);

  // Render Google Sign-In button when authMode changes
  useEffect(() => {
    if (authMode === 'google' && window.google && GOOGLE_CLIENT_ID) {
      const renderButton = () => {
        const buttonElement = document.getElementById('google-signin-button');
        if (buttonElement) {
          console.log('Rendering Google Sign-In button');
          // Clear any existing content
          buttonElement.innerHTML = '';
          
          window.google.accounts.id.renderButton(buttonElement, {
            theme: 'filled_black',
            size: 'large',
            type: 'standard',
            text: 'signin_with',
            width: 250
          });
        } else {
          console.log('Button element not found, retrying...');
          setTimeout(renderButton, 100);
        }
      };
      
      setTimeout(renderButton, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authMode]);

  // Processing countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
        setProcessingProgress(((20 - countdown) / 20) * 100);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && processing) {
      setProcessing(false);
      setProcessingProgress(100);
      handleAutoCreateShare();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown, processing]);



  // Sign out handler
  const handleSignOut = () => {
    setUser(null);
    setToken(null);
    setAuthMode('anonymous');
    setUserLinks([]);
    setShowDashboard(false);
    setMessage('Signed out successfully');
  };

  // Load user's links
  const loadUserLinks = async (userId) => {
    try {
      const response = await fetch(`${API_ENDPOINT}/user/${userId}/shares`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserLinks(data.shares || []);
      }
    } catch (error) {
      console.error('Failed to load user links:', error);
    }
  };

  // Revoke link handler
  const handleRevokeLink = async (shareId) => {
    try {
      const response = await fetch(`${API_ENDPOINT}/shares/${shareId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setMessage('✓ Link revoked successfully');
        // Refresh user links
        if (user) {
          loadUserLinks(user.id);
        }
      } else {
        throw new Error('Failed to revoke link');
      }
    } catch (error) {
      console.error('Revoke error:', error);
      setMessage('❌ Failed to revoke link');
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMessage('');
      setShareUrl('');
      setFileId('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file first');
      return;
    }

    // Check file size limits based on authentication
    const maxSize = user ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB for authenticated, 10MB for anonymous
    if (file.size > maxSize) {
      setMessage(`❌ File too large. Maximum size: ${user ? '50MB' : '10MB'}. ${!user ? 'Sign in for higher limits.' : ''}`);
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setMessage('Requesting upload URL...');

      // Get pre-signed URL
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_ENDPOINT}/upload-url`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, fileId: newFileId } = await response.json();
      setFileId(newFileId);

      // Upload file to S3
      setMessage('Uploading file...');
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          setUploading(false);
          setUploadProgress(100);
          setProcessing(true);
          setCountdown(20);
          setMessage('File uploaded! Processing...');
        } else {
          throw new Error('Upload failed');
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error('Upload failed');
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);

    } catch (error) {
      console.error('Upload error:', error);
      setMessage(`Error: ${error.message}`);
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleAutoCreateShare = async () => {
    if (!fileId) return;

    try {
      setMessage('Creating share link...');

      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_ENDPOINT}/shares`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fileId,
          expiresInSeconds: parseInt(shareConfig.expiresInSeconds),
          password: shareConfig.password || null,
          maxDownloads: shareConfig.maxDownloads ? parseInt(shareConfig.maxDownloads) : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create share link');
      }

      const data = await response.json();
      const fullUrl = `${API_ENDPOINT}${data.shareUrl}`;
      setShareUrl(fullUrl);
      setMessage('✓ Share link ready!');

    } catch (error) {
      console.error('Share creation error:', error);
      setMessage(`Error: ${error.message}. Wait a few seconds and try again.`);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setMessage('✓ Link copied to clipboard!');
    setTimeout(() => setMessage('✓ Share link ready!'), 2000);
  };

  const handleReset = () => {
    setFile(null);
    setFileId('');
    setShareUrl('');
    setMessage('');
    setUploading(false);
    setProcessing(false);
    setUploadProgress(0);
    setProcessingProgress(0);
    setCountdown(0);
    setShareConfig({
      expiresInSeconds: 3600,
      password: '',
      maxDownloads: ''
    });
  };

  const isProcessingOrUploading = uploading || processing;

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <h1>☁️ Cloud File Share</h1>
            <p>Secure serverless file sharing</p>
          </div>
          
          <div className="auth-section">
            {user ? (
              <div className="user-info">
                <img src={user.picture} alt={user.name} className="user-avatar" />
                <div className="user-details">
                  <span className="user-name">{user.name}</span>
                  <span className="user-email">{user.email}</span>
                </div>
                <button className="btn btn-outline btn-small" onClick={() => setShowDashboard(!showDashboard)}>
                  {showDashboard ? 'Hide' : 'My Links'}
                </button>
                <button className="btn btn-outline btn-small" onClick={handleSignOut}>
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="auth-options">
                <div className="auth-toggle">
                  <button 
                    className={`btn ${authMode === 'anonymous' ? 'btn-primary' : 'btn-outline'} btn-small`}
                    onClick={() => setAuthMode('anonymous')}
                  >
                    Share Anonymously
                  </button>
                  <button 
                    className={`btn ${authMode === 'google' ? 'btn-primary' : 'btn-outline'} btn-small`}
                    onClick={() => setAuthMode('google')}
                  >
                    Sign In with Google
                  </button>
                </div>
                
                {authMode === 'google' && (
                  <div className="google-signin">
                    {GOOGLE_CLIENT_ID ? (
                      <div className="google-signin-container">
                        <div id="google-signin-button"></div>
                        <button 
                          className="btn btn-primary btn-small manual-signin"
                          onClick={() => {
                            if (window.google) {
                              window.google.accounts.id.prompt();
                            } else {
                              setMessage('❌ Google Sign-In not loaded. Please refresh the page.');
                            }
                          }}
                        >
                          🔐 Sign In with Google (Manual)
                        </button>
                        <p className="signin-help">
                          If the Google button doesn't appear, try the manual button above or refresh the page.
                        </p>
                      </div>
                    ) : (
                      <div className="google-setup-message">
                        <p>🔧 Google Sign-In not configured</p>
                        <p>Add REACT_APP_GOOGLE_CLIENT_ID to your .env file</p>
                        <p>See GOOGLE_SIGNIN_SETUP.md for instructions</p>
                        <button 
                          className="btn btn-outline btn-small"
                          onClick={() => setAuthMode('anonymous')}
                        >
                          Use Anonymous Mode
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="limits-info">
                  <p className="limits-text">
                    {authMode === 'anonymous' ? (
                      <>📊 Anonymous: 10MB files, 3 uploads/day</>
                    ) : (
                      <>🔐 Signed in: 50MB files, 10 uploads/day, saved links</>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container">
        {/* User Dashboard */}
        {user && showDashboard && (
          <div className="card dashboard-card">
            <div className="dashboard-header">
              <h2>📊 My Dashboard</h2>
              <button className="btn btn-outline btn-small" onClick={() => setShowDashboard(false)}>
                ✕ Close
              </button>
            </div>
            
            <div className="dashboard-stats">
              <div className="stat-item">
                <span className="stat-label">Total Links:</span>
                <span className="stat-value">{userLinks.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Active Links:</span>
                <span className="stat-value">{userLinks.filter(link => !link.expired && !link.revoked).length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Expired Links:</span>
                <span className="stat-value">{userLinks.filter(link => link.expired).length}</span>
              </div>
            </div>
            
            <div className="links-list">
              <h3>Your Share Links</h3>
              {userLinks.length === 0 ? (
                <p className="no-links">No share links yet. Upload a file to create your first link!</p>
              ) : (
                <div className="links-grid">
                  {userLinks.map((link, index) => (
                    <div key={index} className={`link-item ${link.expired ? 'expired' : link.revoked ? 'revoked' : 'active'}`}>
                      <div className="link-info">
                        <div className="link-filename">📄 {link.filename}</div>
                        <div className="link-created">Created: {new Date(link.createdAt).toLocaleDateString()}</div>
                        <div className="link-status">
                          Status: {link.revoked ? '🚫 Revoked' : link.expired ? '⏰ Expired' : '✅ Active'}
                        </div>
                        <div className="link-downloads">Downloads: {link.downloadCount || 0}</div>
                      </div>
                      <div className="link-actions">
                        {!link.expired && !link.revoked && (
                          <>
                            <button 
                              className="btn btn-secondary btn-small"
                              onClick={() => navigator.clipboard.writeText(link.shareUrl)}
                            >
                              📋 Copy
                            </button>
                            <button 
                              className="btn btn-danger btn-small"
                              onClick={() => handleRevokeLink(link.shareId)}
                            >
                              🗑️ Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="card main-card">
          
          {/* Step 1: File Selection */}
          {!shareUrl && (
            <>
              <div className="step-header">
                <span className="step-number">1</span>
                <h2>Select File</h2>
              </div>
              
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id="file-input"
                  onChange={handleFileSelect}
                  disabled={isProcessingOrUploading}
                  className="file-input"
                />
                <label htmlFor="file-input" className="file-input-label">
                  {file ? (
                    <>
                      <span className="file-icon">📄</span>
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </>
                  ) : (
                    <>
                      <span className="upload-icon">📁</span>
                      <span>Choose a file or drag it here</span>
                    </>
                  )}
                </label>
              </div>

              {/* Step 2: Share Options */}
              {file && !isProcessingOrUploading && (
                <>
                  <div className="step-header">
                    <span className="step-number">2</span>
                    <h2>Share Options (Optional)</h2>
                  </div>

                  <div className="options-grid">
                    <div className="form-group">
                      <label>⏱️ Expires In</label>
                      <select
                        value={shareConfig.expiresInSeconds}
                        onChange={(e) => setShareConfig({...shareConfig, expiresInSeconds: e.target.value})}
                      >
                        <option value="300">5 minutes</option>
                        <option value="1800">30 minutes</option>
                        <option value="3600">1 hour</option>
                        <option value="86400">24 hours</option>
                        <option value="604800">7 days</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>🔒 Password (Optional)</label>
                      <input
                        type="password"
                        placeholder="Leave empty for no password"
                        value={shareConfig.password}
                        onChange={(e) => setShareConfig({...shareConfig, password: e.target.value})}
                      />
                    </div>

                    <div className="form-group">
                      <label>📊 Max Downloads (Optional)</label>
                      <input
                        type="number"
                        placeholder="Unlimited"
                        value={shareConfig.maxDownloads}
                        onChange={(e) => setShareConfig({...shareConfig, maxDownloads: e.target.value})}
                        min="1"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Upload Button */}
              {file && !isProcessingOrUploading && (
                <button
                  className="btn btn-primary btn-large"
                  onClick={handleUpload}
                >
                  🚀 Upload & Create Share Link
                </button>
              )}

              {/* Progress Indicators */}
              {uploading && (
                <div className="progress-section">
                  <div className="progress-header">
                    <span>📤 Uploading...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}

              {processing && (
                <div className="progress-section processing">
                  <div className="progress-header">
                    <span>⚙️ Processing & Creating Share Link...</span>
                    <span>{countdown}s</span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar processing" style={{ width: `${processingProgress}%` }}></div>
                  </div>
                  <p className="progress-note">File is being scanned and processed on AWS</p>
                </div>
              )}

              {message && !shareUrl && (
                <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-info'}`}>
                  {message}
                </div>
              )}
            </>
          )}

          {/* Step 3: Share Link Ready */}
          {shareUrl && (
            <div className="success-section">
              <div className="success-icon">✓</div>
              <h2>Your Share Link is Ready!</h2>
              
              <div className="share-link-container">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="share-link-input"
                  onClick={(e) => e.target.select()}
                />
              </div>

              <div className="action-buttons">
                <button className="btn btn-primary btn-large" onClick={handleCopyLink}>
                  📋 Copy Link
                </button>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-large"
                >
                  🔗 Open Link
                </a>
              </div>

              {message && (
                <div className="alert alert-success">
                  {message}
                </div>
              )}

              <div className="share-info">
                <h3>Share Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">File:</span>
                    <span className="info-value">{file?.name}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Expires:</span>
                    <span className="info-value">
                      {shareConfig.expiresInSeconds < 3600 
                        ? `${shareConfig.expiresInSeconds / 60} minutes`
                        : shareConfig.expiresInSeconds < 86400
                        ? `${shareConfig.expiresInSeconds / 3600} hour(s)`
                        : `${shareConfig.expiresInSeconds / 86400} day(s)`
                      }
                    </span>
                  </div>
                  {shareConfig.password && (
                    <div className="info-item">
                      <span className="info-label">Password:</span>
                      <span className="info-value">Protected 🔒</span>
                    </div>
                  )}
                  {shareConfig.maxDownloads && (
                    <div className="info-item">
                      <span className="info-label">Max Downloads:</span>
                      <span className="info-value">{shareConfig.maxDownloads}</span>
                    </div>
                  )}
                </div>
              </div>

              <button className="btn btn-outline" onClick={handleReset}>
                📤 Share Another File
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>Powered by AWS Lambda, S3, DynamoDB • Secure • Serverless • Scalable</p>
      </footer>
    </div>
  );
}

export default App;
