# 🔐 Google Sign-In Setup Guide

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API (for user info)

## Step 2: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in required information:
   - App name: "Cloud File Share"
   - User support email: your-email@example.com
   - Developer contact: your-email@example.com
4. Add scopes:
   - `email`
   - `profile`
   - `openid`
5. Save and continue

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Add authorized origins:
   - `http://localhost:3000` (for development)
   - `https://your-domain.com` (for production)
5. Add authorized redirect URIs:
   - `http://localhost:3000`
   - `https://your-domain.com`
6. Copy the **Client ID**

## Step 4: Configure Frontend

1. Create `frontend/.env` file:
```bash
REACT_APP_API_ENDPOINT=https://syp1o7qfxj.execute-api.us-east-1.amazonaws.com
REACT_APP_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

2. Replace `your-client-id` with your actual Google Client ID

## Step 5: Test Authentication

1. Start the frontend:
```bash
cd frontend
npm start
```

2. Click "Sign In with Google"
3. Complete the OAuth flow
4. Verify user info appears in header

## Features Enabled with Google Sign-In

### For Authenticated Users:
- ✅ **50MB file uploads** (vs 10MB anonymous)
- ✅ **10 uploads per day** (vs 3 anonymous)
- ✅ **Saved link history** in dashboard
- ✅ **Link management** (view, copy, revoke)
- ✅ **Usage statistics**

### For Anonymous Users:
- ✅ **10MB file uploads**
- ✅ **3 uploads per day**
- ❌ No saved history
- ❌ No dashboard

## Security Features

### JWT Token Validation
- Google-issued JWT tokens
- Automatic expiry handling
- Secure user identification

### Rate Limiting
- Different limits for auth vs anonymous
- Daily and monthly quotas
- Cost protection built-in

### Data Privacy
- User data stays in your AWS account
- Google only provides authentication
- No data shared with Google

## Troubleshooting

### Common Issues:

1. **"Invalid Client ID"**
   - Check REACT_APP_GOOGLE_CLIENT_ID is correct
   - Verify domain is authorized in Google Console

2. **"Redirect URI Mismatch"**
   - Add your domain to authorized redirect URIs
   - Include both http://localhost:3000 and production URL

3. **"Access Blocked"**
   - Complete OAuth consent screen setup
   - Add required scopes (email, profile, openid)

4. **Sign-In Button Not Showing**
   - Check browser console for errors
   - Verify Google Client ID is set
   - Ensure internet connection for Google scripts

### Testing Without Google Sign-In

If you don't want to set up Google Sign-In immediately:

1. Set `REACT_APP_GOOGLE_CLIENT_ID=""` (empty)
2. The app will work in anonymous-only mode
3. Users get 10MB uploads, 3 per day
4. No dashboard or saved links

## Production Deployment

### Update Authorized Origins:
1. Add your production domain to Google Console
2. Update environment variables in production
3. Test authentication flow on live site

### Security Considerations:
- Use HTTPS in production
- Keep Client ID public (it's meant to be)
- Never expose Client Secret (not used in frontend)
- Monitor usage for abuse

## Cost Impact

### With Authentication:
- Higher file limits may increase storage costs
- User tracking adds minimal DynamoDB usage
- Overall cost increase: ~$0.10-0.50/month

### Benefits:
- Better user experience
- Reduced anonymous abuse
- User engagement tracking
- Professional appearance

## Next Steps

1. Set up Google Cloud project
2. Get Client ID
3. Update frontend/.env
4. Test locally
5. Deploy to production
6. Update production environment variables

**Your file sharing app now has professional authentication!** 🚀