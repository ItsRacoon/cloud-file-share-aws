# Test Frontend Configuration

## Quick Test

### 1. Check What Browser Console Shows

After restarting React, open browser console (F12) and look for:

```
=== Environment Variables ===
API_ENDPOINT: ???
```

**Tell me what you see for API_ENDPOINT:**
- [ ] `https://syp1o7qfxj.execute-api.us-east-1.amazonaws.com` ✅ GOOD
- [ ] `http://localhost:3000` ❌ BAD - .env not loaded
- [ ] `undefined` ❌ BAD - .env not loaded

### 2. If You See localhost or undefined

The `.env` file isn't being loaded. Try this:

```powershell
# Stop React (Ctrl + C)

# Verify .env exists and has content
Get-Content frontend\.env

# Delete React cache
Remove-Item -Recurse -Force frontend\node_modules\.cache -ErrorAction SilentlyContinue

# Restart React
cd frontend
$env:REACT_APP_API_ENDPOINT = "https://syp1o7qfxj.execute-api.us-east-1.amazonaws.com"
$env:REACT_APP_AUTH_DISABLED = "true"
npm start
```

This sets the environment variables directly before starting React.

### 3. Alternative: Hardcode for Testing

If environment variables still don't work, temporarily hardcode it:

Edit `frontend/src/App.js`:

```javascript
// Change this line:
const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || 'http://localhost:3000';

// To this:
const API_ENDPOINT = 'https://syp1o7qfxj.execute-api.us-east-1.amazonaws.com';
```

Save and React will hot-reload. Try upload again.

### 4. Check Network Tab

In browser Developer Tools → Network tab:
- Try to upload
- Look at the failed request
- What URL does it show?

**Report back:**
- Request URL: _______________
- Status Code: _______________
- Error Message: _______________

## Most Likely Issues

### Issue 1: .env Not Loaded (90% chance)
**Symptom:** Console shows `localhost:3000`
**Fix:** Set env vars before starting React (see step 2 above)

### Issue 2: CORS (5% chance)
**Symptom:** Console shows CORS error
**Fix:** Already deployed, should work

### Issue 3: API Down (5% chance)
**Symptom:** Timeout or 5xx error
**Fix:** Check `.\scripts\simple-test.ps1`

## Quick Commands

```powershell
# Test API works
.\scripts\simple-test.ps1

# Check .env
Get-Content frontend\.env

# Start with env vars
cd frontend
$env:REACT_APP_API_ENDPOINT = "https://syp1o7qfxj.execute-api.us-east-1.amazonaws.com"
$env:REACT_APP_AUTH_DISABLED = "true"
npm start

# Check logs
serverless logs -f presigner --stage dev --tail
```

## What to Check

1. **Browser console** - What does API_ENDPOINT show?
2. **Network tab** - What URL is being called?
3. **PowerShell test** - Does `.\scripts\simple-test.ps1` work?

Tell me what you see and I can help fix it!
