# Debug Network Error - Step by Step

## Current Issue
Frontend shows "Network Error" when trying to upload.

## Debugging Steps

### Step 1: Check Browser Console

1. Open browser (where frontend is running)
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Look for these debug messages:

```
=== Environment Variables ===
API_ENDPOINT: https://syp1o7qfxj.execute-api.us-east-1.amazonaws.com
REACT_APP_API_ENDPOINT: https://syp1o7qfxj.execute-api.us-east-1.amazonaws.com
AUTH_DISABLED: true
============================
```

**If you see `http://localhost:3000` instead:**
- ❌ Environment variable not loaded
- ✅ Solution: Restart React (see below)

### Step 2: Check Network Tab

1. In Developer Tools, go to **Network** tab
2. Try to upload a file
3. Look for the failed request
4. Click on it to see details

**What to check:**
- Request URL: Should be `https://syp1o7qfxj.execute-api.us-east-1.amazonaws.com/upload-url`
- Status: What error code?
- Headers: Are CORS headers present?

### Step 3: Restart React Properly

**Important:** React only loads `.env` on startup!

```powershell
# 1. Stop React completely
# Press Ctrl + C in terminal
# Wait for "Terminated" message

# 2. Verify .env file exists
Get-Content frontend\.env

# Should show:
# REACT_APP_API_ENDPOINT=https://syp1o7qfxj.execute-api.us-east-1.amazonaws.com
# REACT_APP_AUTH_DISABLED=true

# 3. Delete node_modules/.cache (if exists)
Remove-Item -Recurse -Force frontend\node_modules\.cache -ErrorAction SilentlyContinue

# 4. Restart React
cd frontend
npm start
```

### Step 4: Test API Directly

Test if the API itself works:

```powershell
# Test from PowerShell
$response = Invoke-RestMethod -Uri "https://syp1o7qfxj.execute-api.us-east-1.amazonaws.com/upload-url" `
    -Method Post `
    -Headers @{"Authorization"="Bearer demo-token"; "Content-Type"="application/json"} `
    -Body '{"filename":"test.pdf","contentType":"application/pdf","size":1024000}'

$response
```

**If this works:** API is fine, issue is in frontend
**If this fails:** API has a problem

### Step 5: Check CORS Headers

In browser Network tab, check the response headers for:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

**If missing:** CORS not configured properly

### Step 6: Try Direct API Call from Browser Console

In browser console, paste this:

```javascript
fetch('https://syp1o7qfxj.execute-api.us-east-1.amazonaws.com/upload-url', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer demo-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    filename: 'test.pdf',
    contentType: 'application/pdf',
    size: 1024000
  })
})
.then(r => r.json())
.then(d => console.log('Success:', d))
.catch(e => console.error('Error:', e));
```

**If this works:** Frontend code has an issue
**If this fails:** CORS or API issue

## Common Issues & Solutions

### Issue 1: Environment Variable Not Loaded

**Symptoms:**
- Console shows `http://localhost:3000`
- Network tab shows request to localhost

**Solution:**
```powershell
# Stop React (Ctrl + C)
# Verify .env exists
Get-Content frontend\.env

# Clear cache
Remove-Item -Recurse -Force frontend\node_modules\.cache

# Restart
cd frontend
npm start
```

### Issue 2: CORS Not Configured

**Symptoms:**
- Console shows CORS error
- Network tab shows failed preflight request

**Solution:**
```powershell
# Redeploy with CORS
serverless deploy --stage dev

# Verify deployment
serverless info --stage dev
```

### Issue 3: API Gateway Not Responding

**Symptoms:**
- Network tab shows timeout
- No response from server

**Solution:**
```powershell
# Check Lambda logs
serverless logs -f presigner --stage dev --tail

# Test API directly
.\scripts\simple-test.ps1
```

### Issue 4: Wrong API Endpoint

**Symptoms:**
- 404 Not Found
- Request goes to wrong URL

**Solution:**
```powershell
# Check .env file
Get-Content frontend\.env

# Should match your API endpoint
# If wrong, edit and restart React
```

## Step-by-Step Fix

### Fix 1: Complete React Restart

```powershell
# 1. Stop React (Ctrl + C)

# 2. Verify .env
Get-Content frontend\.env

# 3. Clear cache
Remove-Item -Recurse -Force frontend\node_modules\.cache

# 4. Clear browser cache
# In browser: Ctrl + Shift + Delete
# Clear "Cached images and files"

# 5. Restart React
cd frontend
npm start

# 6. Hard refresh browser
# Ctrl + Shift + R
```

### Fix 2: Redeploy with CORS

```powershell
# Deploy
serverless deploy --stage dev

# Wait for completion

# Test API
.\scripts\simple-test.ps1
```

### Fix 3: Check Lambda Function

```powershell
# View logs
serverless logs -f presigner --stage dev --tail

# Invoke directly
serverless invoke -f presigner --stage dev --data '{"body":"{\"filename\":\"test.pdf\",\"contentType\":\"application/pdf\",\"size\":1024000}"}'
```

## What to Report

If still not working, check these and report:

1. **Browser Console Output:**
   - What does `API_ENDPOINT` show?
   - Any error messages?

2. **Network Tab:**
   - What URL is being called?
   - What's the status code?
   - What are the response headers?

3. **PowerShell Test:**
   - Does `.\scripts\simple-test.ps1` work?

4. **Environment File:**
   - What does `Get-Content frontend\.env` show?

5. **Deployment Status:**
   - What does `serverless info --stage dev` show?

## Quick Diagnostic

Run this complete diagnostic:

```powershell
Write-Host "=== Diagnostic Report ===" -ForegroundColor Cyan

Write-Host "`n1. Frontend .env file:" -ForegroundColor Yellow
Get-Content frontend\.env

Write-Host "`n2. API Test:" -ForegroundColor Yellow
.\scripts\simple-test.ps1

Write-Host "`n3. Deployment Info:" -ForegroundColor Yellow
serverless info --stage dev

Write-Host "`n4. Recent Logs:" -ForegroundColor Yellow
serverless logs -f presigner --stage dev --startTime 5m

Write-Host "`n=== End Report ===" -ForegroundColor Cyan
```

## Expected Working State

When everything works, you should see:

**Browser Console:**
```
=== Environment Variables ===
API_ENDPOINT: https://syp1o7qfxj.execute-api.us-east-1.amazonaws.com
REACT_APP_API_ENDPOINT: https://syp1o7qfxj.execute-api.us-east-1.amazonaws.com
AUTH_DISABLED: true
============================

=== Upload Debug ===
API Endpoint: https://syp1o7qfxj.execute-api.us-east-1.amazonaws.com
Upload URL: https://syp1o7qfxj.execute-api.us-east-1.amazonaws.com/upload-url
File: test.pdf 1024000 application/pdf
==================
```

**Network Tab:**
- Request to: `https://syp1o7qfxj.execute-api.us-east-1.amazonaws.com/upload-url`
- Status: 200 OK
- Response: JSON with uploadUrl and fileId

## Next Steps

1. **Check browser console** for debug output
2. **Check Network tab** for actual request
3. **Run diagnostic** script above
4. **Report findings** if still not working

The debug output will tell us exactly what's wrong!
