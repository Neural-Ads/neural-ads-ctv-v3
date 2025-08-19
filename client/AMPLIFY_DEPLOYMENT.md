# AWS Amplify Deployment Guide

## Overview
This guide explains how to deploy the AdAgent client to AWS Amplify.

## Prerequisites
1. AWS Account with Amplify access
2. Git repository (GitHub, GitLab, Bitbucket, or AWS CodeCommit)
3. Code pushed to the repository

## Deployment Steps

### 1. Prepare Your Repository
```bash
# Ensure your code is committed and pushed
git add .
git commit -m "Prepare for Amplify deployment"
git push origin main
```

### 2. Connect to AWS Amplify
1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "New app" → "Host web app"
3. Choose your Git provider (GitHub, GitLab, etc.)
4. Select your repository and branch (usually `main`)

### 3. Configure Build Settings
Amplify will auto-detect this is a React app. The `amplify.yml` file is already configured.

**Build Settings:**
- **Build command**: `npm run build` (auto-detected)
- **Output directory**: `dist` (auto-detected)
- **Node.js version**: 18.x or higher

### 4. Environment Variables
Set these environment variables in Amplify Console:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_URL` | `http://107.20.8.84` | Backend API URL |
| `VITE_APP_ENV` | `production` | Application environment |
| `VITE_APP_NAME` | `Neural Ads CTV Platform` | Application name |
| `VITE_APP_VERSION` | `1.0.0` | Application version |

### 5. Deploy
1. Click "Save and deploy"
2. Amplify will build and deploy your app
3. You'll get a URL like: `https://main.d1234567890.amplifyapp.com`

### 6. Custom Domain (Optional)
1. In Amplify Console, go to "Domain management"
2. Add your custom domain
3. Configure DNS settings as instructed

## Build Configuration
The `amplify.yml` file configures:
- **Pre-build**: Install dependencies with `npm ci`
- **Build**: Build the app with `npm run build`
- **Artifacts**: Serve files from `dist` directory
- **Cache**: Cache `node_modules` for faster builds

## Environment Variables Explained
- `VITE_API_URL`: Points to your backend server
- `VITE_APP_ENV`: Set to 'production' for production builds
- `VITE_APP_NAME`: Application name displayed in the UI
- `VITE_APP_VERSION`: Version number for tracking

## Troubleshooting
- **Build fails**: Check the build logs in Amplify Console
- **API not connecting**: Verify `VITE_API_URL` is correct
- **CORS issues**: Ensure backend allows Amplify domain

## Post-Deployment
1. Test all functionality on the deployed site
2. Verify API connections work
3. Check that the multi-agent system is accessible
4. Monitor performance and errors

## Cost Considerations
- Amplify hosting: ~$0.15 per GB served
- Build minutes: ~$0.01 per minute
- Custom domains: ~$12/year (if using Route 53) 