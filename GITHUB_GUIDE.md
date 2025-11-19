# GitHub Guide - Push Your Project Safely

## ⚠️ IMPORTANT: Security First!

Before pushing to GitHub, ensure **NO sensitive information** is included:

### ✅ Safe to Push (Already Configured):
- ✓ Source code (all `.js` files)
- ✓ Configuration templates (`.env.example`)
- ✓ Documentation (`.md` files)
- ✓ Infrastructure code (`serverless.yml`)
- ✓ Tests

### ❌ NEVER Push (Already in .gitignore):
- ❌ `.env` files (contain secrets)
- ❌ `node_modules/` (dependencies)
- ❌ AWS credentials
- ❌ `.serverless/` (build artifacts)
- ❌ Personal API keys or tokens

## Step-by-Step: Push to GitHub

### 1. Initialize Git Repository

```powershell
# Navigate to your project
cd "D:\Projects\Projects\File sharing system"

# Initialize git (if not already done)
git init

# Check status
git status
```

### 2. Review What Will Be Committed

```powershell
# See what files will be added
git status

# Make sure you DON'T see:
# - .env files
# - node_modules/
# - AWS credentials
```

### 3. Add Files to Git

```powershell
# Add all files (respects .gitignore)
git add .

# Or add specific files
git add src/
git add frontend/
git add serverless.yml
git add package.json
git add README.md
```

### 4. Create First Commit

```powershell
git commit -m "Initial commit: Cloud file sharing system"
```

### 5. Create GitHub Repository

**Option A: Via GitHub Website**
1. Go to https://github.com
2. Click "+" → "New repository"
3. Name: `cloud-file-share-aws`
4. Description: "Serverless file sharing system on AWS"
5. Choose: **Public** or **Private**
6. **DON'T** initialize with README (you already have one)
7. Click "Create repository"

**Option B: Via GitHub CLI** (if installed)
```powershell
gh repo create cloud-file-share-aws --public --source=. --remote=origin
```

### 6. Connect to GitHub

```powershell
# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/cloud-file-share-aws.git

# Verify
git remote -v
```

### 7. Push to GitHub

```powershell
# Push to main branch
git branch -M main
git push -u origin main
```

### 8. Verify on GitHub

Visit: `https://github.com/YOUR_USERNAME/cloud-file-share-aws`

You should see:
- ✓ All source code
- ✓ Documentation
- ✓ README.md displayed
- ✓ NO .env files
- ✓ NO node_modules/

## Security Checklist Before Pushing

Run this checklist:

```powershell
# 1. Check for .env files
Get-ChildItem -Recurse -Filter ".env" -File

# Should return NOTHING or only .env.example

# 2. Check for AWS credentials
Get-ChildItem -Recurse -Filter "credentials" -File

# Should return NOTHING

# 3. Check .gitignore exists
Get-Content .gitignore

# Should include .env, node_modules, etc.

# 4. Check what will be committed
git status

# Should NOT show .env or node_modules
```

## What to Include in Your GitHub Repository

### ✅ Include:
- Source code (`src/`, `frontend/`)
- Configuration templates (`.env.example`)
- Infrastructure code (`serverless.yml`)
- Documentation (`README.md`, `docs/`)
- Tests (`tests/`)
- Scripts (`scripts/`)
- CI/CD config (`.github/workflows/`)
- Package files (`package.json`)
- License (`LICENSE`)

### ❌ Exclude:
- Environment variables (`.env`)
- Dependencies (`node_modules/`)
- Build artifacts (`.serverless/`)
- AWS credentials
- Personal API keys
- Test files (`.pdf`, downloaded files)

## Update Your README for GitHub

Your README already has your **actual API endpoint**. You should update it:

```powershell
# Open README.md and replace your actual endpoint with placeholder
# Find: https://syp1o7qfxj.execute-api.us-east-1.amazonaws.com
# Replace with: https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com
```

Or keep it if you want to share your working demo!

## Add a Nice README Badge

Add this to the top of your README.md:

```markdown
# Cloud File Share AWS

![AWS](https://img.shields.io/badge/AWS-Lambda-orange)
![Node.js](https://img.shields.io/badge/Node.js-18-green)
![React](https://img.shields.io/badge/React-18-blue)
![Serverless](https://img.shields.io/badge/Serverless-Framework-red)
![License](https://img.shields.io/badge/License-MIT-yellow)
```

## Setup GitHub Actions (CI/CD)

Your project already has `.github/workflows/deploy.yml`!

To enable it:

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Add secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `DEV_API_ENDPOINT`
   - `DEV_AUTH_TOKEN`

Now every push will:
- Run tests
- Deploy to AWS (if on main/dev branch)

## Make Your Repository Look Professional

### 1. Add Topics (Tags)
On GitHub, click "⚙️ Settings" → Add topics:
- `aws`
- `serverless`
- `lambda`
- `s3`
- `dynamodb`
- `react`
- `file-sharing`
- `cloud-computing`

### 2. Add Description
"Serverless file sharing system built with AWS Lambda, S3, DynamoDB, and React"

### 3. Add Website
Your API endpoint or frontend URL (if deployed)

### 4. Enable Issues
Settings → Features → ✓ Issues

### 5. Add License
You already have `LICENSE` file (MIT)

## Common Git Commands

```powershell
# Check status
git status

# Add files
git add .

# Commit changes
git commit -m "Your message"

# Push to GitHub
git push

# Pull latest changes
git pull

# Create new branch
git checkout -b feature-name

# Switch branches
git checkout main

# View commit history
git log --oneline

# Undo last commit (keep changes)
git reset --soft HEAD~1
```

## Collaborate with Others

### Clone Your Repository:
```powershell
git clone https://github.com/YOUR_USERNAME/cloud-file-share-aws.git
cd cloud-file-share-aws
npm install
```

### Create Pull Request:
1. Fork repository
2. Create branch: `git checkout -b feature-name`
3. Make changes
4. Commit: `git commit -m "Add feature"`
5. Push: `git push origin feature-name`
6. Create Pull Request on GitHub

## Protect Your Main Branch

On GitHub:
1. Settings → Branches
2. Add rule for `main`
3. Enable:
   - ✓ Require pull request reviews
   - ✓ Require status checks to pass
   - ✓ Require branches to be up to date

## Update Your Repository

After making changes:

```powershell
# Check what changed
git status

# Add changes
git add .

# Commit with message
git commit -m "Add new feature"

# Push to GitHub
git push
```

## Share Your Project

### Get Repository URL:
```
https://github.com/YOUR_USERNAME/cloud-file-share-aws
```

### Share on:
- LinkedIn (showcase your cloud skills!)
- Twitter/X
- Dev.to
- Reddit (r/aws, r/serverless)
- Your portfolio website

### Add to Your Resume:
```
Cloud File Sharing System
- Built serverless file sharing platform using AWS Lambda, S3, DynamoDB
- Implemented secure file uploads with pre-signed URLs and password protection
- Deployed using Infrastructure as Code (Serverless Framework)
- Automated CI/CD pipeline with GitHub Actions
- Technologies: Node.js, React, AWS, Serverless, DynamoDB, S3
- GitHub: github.com/YOUR_USERNAME/cloud-file-share-aws
```

## Troubleshooting

### "Permission denied (publickey)"
```powershell
# Use HTTPS instead of SSH
git remote set-url origin https://github.com/YOUR_USERNAME/cloud-file-share-aws.git
```

### "Repository not found"
```powershell
# Check remote URL
git remote -v

# Update if wrong
git remote set-url origin https://github.com/YOUR_USERNAME/cloud-file-share-aws.git
```

### "Failed to push"
```powershell
# Pull first
git pull origin main --rebase

# Then push
git push
```

### Accidentally Committed .env File
```powershell
# Remove from git (keeps local file)
git rm --cached .env

# Commit the removal
git commit -m "Remove .env from git"

# Push
git push

# IMPORTANT: Change all secrets in .env!
# They're now in git history
```

## Quick Start Commands

```powershell
# Initialize and push (first time)
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/cloud-file-share-aws.git
git push -u origin main

# Update after changes
git add .
git commit -m "Update description"
git push
```

## Example Repository Description

Use this for your GitHub repository:

```markdown
# ☁️ Cloud File Share AWS

A production-ready serverless file sharing system built with AWS services.

## Features
- 🔐 Secure file uploads with pre-signed URLs
- ⏰ Expiring share links
- 🔒 Password protection
- 📊 Download limits
- 🛡️ Malware scanning
- 🚀 Auto-scaling serverless architecture

## Tech Stack
- **Backend**: AWS Lambda (Node.js 18)
- **Storage**: AWS S3
- **Database**: AWS DynamoDB
- **API**: AWS API Gateway
- **Frontend**: React 18
- **IaC**: Serverless Framework
- **CI/CD**: GitHub Actions

## Quick Start
```bash
npm install
serverless deploy --stage dev
```

## Documentation
See [README.md](README.md) for complete documentation.

## License
MIT
```

## Ready to Push!

Your project is **safe to push** to GitHub. The `.gitignore` is properly configured to exclude sensitive files.

**Run these commands now:**

```powershell
git init
git add .
git commit -m "Initial commit: Serverless file sharing system"
# Then create GitHub repo and push (see steps above)
```

🎉 **Your cloud project will look great on GitHub!**
