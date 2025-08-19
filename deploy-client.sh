#!/bin/bash

# AdAgent Client Deployment Script
# This script syncs the client code from the main repository to the deployment repository

set -e  # Exit on any error

# Configuration
CLIENT_DIR="client"
DEPLOY_DIR="../adagent-client-deploy"
DEPLOY_REPO="https://github.com/Neural-Ads/adagent-client-deploy.git"

echo "🚀 Starting AdAgent Client Deployment..."

# Check if we're in the right directory
if [ ! -d "$CLIENT_DIR" ]; then
    echo "❌ Error: client directory not found. Run this script from the AdAgent root directory."
    exit 1
fi

# Check if deployment directory exists
if [ ! -d "$DEPLOY_DIR" ]; then
    echo "❌ Error: Deployment directory not found at $DEPLOY_DIR"
    echo "Please ensure adagent-client-deploy exists at the same level as AdAgent"
    exit 1
fi

echo "📁 Syncing files from $CLIENT_DIR to $DEPLOY_DIR..."

# Copy all client files to deployment directory
rsync -av --delete \
    --exclude 'node_modules/' \
    --exclude 'dist/' \
    --exclude '.git/' \
    --exclude '.env*' \
    "$CLIENT_DIR/" "$DEPLOY_DIR/"

echo "✅ Files synced successfully"

# Navigate to deployment directory
cd "$DEPLOY_DIR"

# Check git status
if [ -z "$(git status --porcelain)" ]; then
    echo "ℹ️  No changes to commit"
else
    echo "📝 Committing changes..."
    
    # Add all files
    git add .
    
    # Create commit message with timestamp
    COMMIT_MSG="Deploy: Sync from main repository $(date '+%Y-%m-%d %H:%M:%S')"
    git commit -m "$COMMIT_MSG"
    
    echo "🚀 Pushing to GitHub..."
    git push origin main
    
    echo "✅ Deployment pushed successfully!"
    echo "🌐 Amplify will automatically start building..."
fi

echo "🎉 Deployment process completed!"
echo ""
echo "Next steps:"
echo "1. Check AWS Amplify Console for build status"
echo "2. Monitor the deployment at: https://console.aws.amazon.com/amplify/"
echo "3. Your app will be available at the Amplify URL once built" 