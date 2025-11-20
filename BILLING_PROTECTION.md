# 🚨 AWS Billing Protection Guide

## IMPORTANT: AWS charges automatically without asking!

### Step 1: Enable Billing Alerts
1. Go to AWS Console → Account → Billing Preferences
2. Check "Receive Billing Alerts" 
3. Enter your email address
4. Save preferences

### Step 2: Create CloudWatch Billing Alarms
1. Go to CloudWatch → Alarms → Create Alarm
2. Select "Billing" → "EstimatedCharges"
3. Set thresholds:
   - $1 (Warning)
   - $5 (Alert) 
   - $10 (Critical)

### Step 3: Set Up Budget
1. Go to AWS Budgets → Create Budget
2. Cost Budget → Monthly
3. Set amount: $5
4. Add email alerts at 50%, 80%, 100%

### Step 4: Monitor Weekly
Run: `.\scripts\cost-monitoring.ps1`

## Emergency Actions if Charged:
1. Check AWS Cost Explorer immediately
2. Identify the expensive service
3. Delete/stop the resource
4. Contact AWS Support for refund (sometimes possible)

## Services That Can Cause Surprise Bills:
- EC2 instances (if left running)
- RDS databases (if not deleted)
- NAT Gateways ($45/month each)
- Data transfer (downloads)
- CloudFront (if misconfigured)

## Your Project Risk Level: LOW
- All services are serverless (no always-running costs)
- Free tier covers normal usage
- Maximum realistic bill: $1-5/month