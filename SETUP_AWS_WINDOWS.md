# AWS Setup for Windows

## Step 1: Install AWS CLI

### Option A: Using MSI Installer (Recommended)

1. Download AWS CLI installer:
   - Visit: https://awscli.amazonaws.com/AWSCLIV2.msi
   - Or go to: https://aws.amazon.com/cli/

2. Run the installer (double-click the .msi file)

3. Follow the installation wizard

4. Restart PowerShell

5. Verify installation:
```powershell
aws --version
```

### Option B: Using Chocolatey

If you have Chocolatey installed:
```powershell
choco install awscli
```

## Step 2: Get AWS Credentials

You need an AWS account with programmatic access:

1. **Log in to AWS Console**: https://console.aws.amazon.com

2. **Create IAM User** (if you don't have one):
   - Go to IAM → Users → Add User
   - Username: `serverless-deploy`
   - Access type: ✅ Programmatic access
   - Permissions: Attach `AdministratorAccess` policy (for simplicity)
   - Click through and **save the credentials**:
     - Access Key ID
     - Secret Access Key

## Step 3: Configure AWS CLI

```powershell
aws configure
```

Enter when prompted:
```
AWS Access Key ID: YOUR_ACCESS_KEY_ID
AWS Secret Access Key: YOUR_SECRET_ACCESS_KEY
Default region name: us-east-1
Default output format: json
```

Verify configuration:
```powershell
aws sts get-caller-identity
```

Should show your account info.

## Step 4: Alternative - Set Environment Variables

If you don't want to install AWS CLI, you can set environment variables:

```powershell
$env:AWS_ACCESS_KEY_ID = "YOUR_ACCESS_KEY_ID"
$env:AWS_SECRET_ACCESS_KEY = "YOUR_SECRET_ACCESS_KEY"
$env:AWS_DEFAULT_REGION = "us-east-1"
```

To make permanent:
```powershell
[System.Environment]::SetEnvironmentVariable('AWS_ACCESS_KEY_ID', 'YOUR_KEY', 'User')
[System.Environment]::SetEnvironmentVariable('AWS_SECRET_ACCESS_KEY', 'YOUR_SECRET', 'User')
[System.Environment]::SetEnvironmentVariable('AWS_DEFAULT_REGION', 'us-east-1', 'User')
```

## Step 5: Deploy the Application

```powershell
# Navigate to project directory
cd "D:\Projects\Projects\File sharing system"

# Deploy to AWS
serverless deploy --stage dev
```

This will take 2-5 minutes and create:
- 6 Lambda functions
- 2 DynamoDB tables
- 1 S3 bucket
- 1 SQS queue
- 1 Cognito User Pool
- 1 API Gateway

## Step 6: Save the Outputs

After deployment, you'll see outputs like:
```
endpoints:
  POST - https://xxxxx.execute-api.us-east-1.amazonaws.com/upload-url
  POST - https://xxxxx.execute-api.us-east-1.amazonaws.com/shares
  GET - https://xxxxx.execute-api.us-east-1.amazonaws.com/download/{shareId}
  DELETE - https://xxxxx.execute-api.us-east-1.amazonaws.com/shares/{shareId}

Stack Outputs:
  ApiEndpoint: https://xxxxx.execute-api.us-east-1.amazonaws.com
  UserPoolId: us-east-1_xxxxxxxxx
  UserPoolClientId: xxxxxxxxxxxxxxxxxxxxxxxxxx
  BucketName: cloud-file-share-aws-storage-dev
```

**Save these values!** You'll need them for testing.

## Step 7: Test the Deployment

```powershell
# Set environment variables
$env:API_ENDPOINT = "https://xxxxx.execute-api.us-east-1.amazonaws.com"
$env:TOKEN = "demo-token"

# Run demo script
.\scripts\demo.ps1
```

## Troubleshooting

### "aws is not recognized"
- AWS CLI not installed or not in PATH
- Restart PowerShell after installation
- Or use environment variables method

### "Credentials not found"
- Run `aws configure` to set up credentials
- Or set environment variables
- Check credentials file: `%USERPROFILE%\.aws\credentials`

### "Access Denied" errors
- IAM user needs sufficient permissions
- Attach `AdministratorAccess` policy for testing
- Or create custom policy with required permissions

### Deployment takes too long
- First deployment takes 3-5 minutes (normal)
- Subsequent deployments are faster (1-2 minutes)

### Stack creation failed
- Check CloudFormation console for details
- Common issues:
  - Bucket name already exists (change stage name)
  - Region not supported (use us-east-1)
  - Insufficient permissions

## Security Notes

⚠️ **Important:**
- Never commit AWS credentials to git
- Use IAM roles in production
- Rotate access keys regularly
- Use least-privilege permissions
- Enable MFA on AWS account

## Next Steps

After successful deployment:

1. **Test the API**:
```powershell
.\scripts\demo.ps1 -ApiEndpoint "YOUR_API_ENDPOINT" -Token "demo-token"
```

2. **Run the frontend**:
```powershell
cd frontend
npm install
# Edit .env with your API endpoint
npm start
```

3. **View AWS Resources**:
   - Lambda: https://console.aws.amazon.com/lambda
   - DynamoDB: https://console.aws.amazon.com/dynamodb
   - S3: https://console.aws.amazon.com/s3
   - API Gateway: https://console.aws.amazon.com/apigateway

4. **Monitor Logs**:
```powershell
serverless logs -f presigner --stage dev --tail
```

## Cleanup

To remove all AWS resources:
```powershell
serverless remove --stage dev
```

This will delete everything and stop charges.

## Cost Estimate

With minimal usage (testing):
- **Free Tier**: Most services covered for first 12 months
- **After Free Tier**: ~$5-10/month for light usage
- **No usage**: ~$0 (pay-per-use model)

## Support

- AWS Documentation: https://docs.aws.amazon.com
- Serverless Docs: https://www.serverless.com/framework/docs
- Project README: [README.md](README.md)
- Windows Guide: [WINDOWS_QUICKSTART.md](WINDOWS_QUICKSTART.md)
