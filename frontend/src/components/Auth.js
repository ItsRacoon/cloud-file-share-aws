import React, { useState } from 'react';

/**
 * Simple auth component
 * In production, integrate with Cognito properly
 */
function Auth({ onLogin, authDisabled }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (authDisabled) {
      // Demo mode - no real auth
      onLogin({ username: 'demo-user', token: 'demo-token' });
      return;
    }

    // In production, implement Cognito authentication here
    // For now, simple demo
    if (username && password) {
      onLogin({ username, token: 'demo-token-' + Date.now() });
    } else {
      setError('Please enter username and password');
    }
  };

  return (
    <div className="card">
      <h2>Login</h2>
      {authDisabled && (
        <div className="alert alert-info">
          Demo mode enabled - authentication disabled
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username / Email</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            disabled={authDisabled}
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            disabled={authDisabled}
          />
        </div>
        <button type="submit" className="btn btn-primary">
          {authDisabled ? 'Continue as Demo User' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default Auth;
