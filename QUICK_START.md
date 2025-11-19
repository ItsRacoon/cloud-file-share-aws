# 🚀 Quick Start Guide - Cloud File Share

## Get Started in 3 Minutes!

### 1️⃣ Start the Frontend

```powershell
cd frontend
npm install
npm start
```

The app will open at: **http://localhost:3000**

### 2️⃣ Use the App

#### Upload & Share a File

1. **Select File**
   - Click the file input or drag & drop
   - See your file name and size

2. **Configure Options** (Optional)
   - **Expires In**: Choose 5 min to 7 days
   - **Password**: Add protection (optional)
   - **Max Downloads**: Limit downloads (optional)

3. **Upload**
   - Click: **"🚀 Upload & Create Share Link"**
   - Watch the progress bar
   - Wait 20 seconds for processing

4. **Share**
   - Your link appears automatically!
   - Click **"📋 Copy Link"** to copy
   - Click **"🔗 Open Link"** to test
   - Share the link with anyone!

### 3️⃣ Download a File

1. Open the share link in a browser
2. Enter password if required
3. File downloads automatically!

---

## 🎯 Example Workflow

### Share a Photo with a Friend

```
1. Open app → http://localhost:3000
2. Click file input → Select "vacation.jpg"
3. Set expiry → "24 hours"
4. Set password → "summer2024"
5. Click "🚀 Upload & Create Share Link"
6. Wait 20 seconds
7. Click "📋 Copy Link"
8. Send link to friend via text/email
9. Friend opens link, enters password, downloads photo
10. Done! ✓
```

**Total time: ~30 seconds**

---

## 🔧 Configuration

### Set Your API Endpoint

Create `frontend/.env`:
```
REACT_APP_API_ENDPOINT=https://syp1o7qfxj.execute-api.us-east-1.amazonaws.com
```

Or use the default (already configured).

---

## 📱 Features at a Glance

### Security
- 🔒 Password protection
- ⏱️ Expiring links (5 min - 7 days)
- 📊 Download limits
- 🛡️ Malware scanning
- 🔐 Encrypted storage

### User Experience
- 📁 Drag & drop upload
- 📊 Real-time progress
- ⚡ Automatic share creation
- 📋 One-click copy
- 📱 Mobile responsive

### Technical
- ☁️ AWS Lambda (serverless)
- 🗄️ S3 storage
- 💾 DynamoDB metadata
- 🚀 API Gateway
- ⚛️ React frontend

---

## 🎨 UI Overview

### Main Screen
```
┌─────────────────────────────────────┐
│     ☁️ Cloud File Share             │
│   Secure serverless file sharing    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ① Select File                       │
│                                     │
│  ┌───────────────────────────────┐ │
│  │     📁 Choose a file or       │ │
│  │        drag it here           │ │
│  └───────────────────────────────┘ │
│                                     │
│ ② Share Options (Optional)          │
│                                     │
│  ⏱️ Expires In    🔒 Password       │
│  [1 hour ▼]      [optional]        │
│                                     │
│  📊 Max Downloads                   │
│  [unlimited]                        │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ 🚀 Upload & Create Share Link │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Success Screen
```
┌─────────────────────────────────────┐
│              ✓                      │
│   Your Share Link is Ready!         │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ https://api.../download/abc123│ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌──────────────┐ ┌──────────────┐ │
│  │ 📋 Copy Link │ │ 🔗 Open Link │ │
│  └──────────────┘ └──────────────┘ │
│                                     │
│  Share Details                      │
│  File: vacation.jpg                 │
│  Expires: 1 hour(s)                 │
│  Password: Protected 🔒             │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   📤 Share Another File       │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### Frontend won't start
```powershell
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

### API errors
Check your `.env` file has the correct endpoint:
```
REACT_APP_API_ENDPOINT=https://your-api-url.amazonaws.com
```

### Upload fails
- Check file size (max 100MB)
- Check file type (images, PDFs, text, video allowed)
- Wait for processing (20 seconds)

### Share link doesn't work
- Wait 20 seconds after upload
- Try creating share again
- Check AWS Lambda logs

---

## 📚 More Information

- **Full Documentation**: See `README.md`
- **UI Guide**: See `FRONTEND_GUIDE.md`
- **Architecture**: See `docs/ARCHITECTURE.md`
- **Security**: See `docs/SECURITY.md`

---

## 🎉 That's It!

You now have a fully functional, professional file sharing application!

### What You Can Do
- ✅ Upload files securely
- ✅ Create expiring share links
- ✅ Add password protection
- ✅ Limit downloads
- ✅ Share with anyone
- ✅ Track downloads

### Perfect For
- 📸 Sharing photos
- 📄 Sending documents
- 🎥 Sharing videos
- 💼 Business files
- 🎓 School projects
- 👥 Team collaboration

**Start sharing files securely now!** 🚀

---

## 💡 Pro Tips

1. **Quick Share**: Skip options for instant sharing (1 hour expiry, no password)
2. **Secure Share**: Add password + short expiry for sensitive files
3. **One-Time Share**: Set max downloads to 1 for single-use links
4. **Long-Term Share**: Use 7 days expiry for files you want to keep available
5. **Test First**: Click "🔗 Open Link" to test before sharing

**Enjoy your new file sharing app!** ✨
