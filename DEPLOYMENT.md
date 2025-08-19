# AdAgent Deployment Guide

## Overview
This guide explains how to deploy the AdAgent client to AWS Amplify.

## Repository Structure
```
/home/mykland/work/
├── AdAgent/                    # Main development repository
│   ├── client/                 # Frontend source code
│   ├── server/                 # Backend source code
│   ├── deploy-client.sh        # Deployment script
│   └── DEPLOYMENT.md           # This file
└── adagent-client-deploy/      # Deployment repository (separate)
```

## Quick Deployment

### 1. Deploy Client to AWS Amplify
```bash
# From the AdAgent root directory
./deploy-client.sh
```

This script will:
- ✅ Sync all client files to the deployment repository
- ✅ Exclude build artifacts (node_modules, dist)
- ✅ Commit changes with timestamp
- ✅ Push to GitHub
- ✅ Trigger automatic Amplify build

### 2. Monitor Deployment
- Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
- Check build status for `adagent-client-deploy`
- Wait for deployment to complete

## Manual Deployment Steps

If you prefer to deploy manually:

### 1. Sync Files
```bash
# Copy client files to deployment repo
rsync -av --delete \
    --exclude 'node_modules/' \
    --exclude 'dist/' \
    --exclude '.git/' \
    client/ ../adagent-client-deploy/
```

### 2. Commit and Push
```bash
cd ../adagent-client-deploy
git add .
git commit -m "Deploy: Sync from main repository"
git push origin main
```

## Environment Variables

The following environment variables are configured in AWS Amplify:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_URL` | `http://107.20.8.84` | Backend API URL |
| `VITE_APP_ENV` | `development` | Application environment |
| `VITE_APP_NAME` | `Neural Ads CTV Platform` | Application name |
| `VITE_APP_VERSION` | `1.0.0` | Application version |

## Troubleshooting

### Build Failures
- Check Amplify build logs for specific errors
- Ensure `package-lock.json` is present
- Verify Node.js version (should be 18+)

### Sync Issues
- Ensure deployment repository exists at `../adagent-client-deploy`
- Check git credentials are configured
- Verify GitHub PAT has correct permissions

## Server Deployment

Server deployment is handled separately via EC2:
- See `server/scripts/` for server deployment scripts
- Server runs at `107.20.8.84`

## Support

For deployment issues:
1. Check Amplify build logs
2. Verify environment variables
3. Test locally with `npm run build`
4. Check GitHub repository permissions 