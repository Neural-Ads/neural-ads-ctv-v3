#!/bin/bash

# API Gateway Setup Script for AdAgent
# This script creates an API Gateway that provides HTTPS access to our ALB

set -e

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-1"}
AWS_PROFILE=${AWS_PROFILE:-"default"}
ALB_DNS=${ALB_DNS:-"adagent-alb-1033327405.us-east-1.elb.amazonaws.com"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "🚀 Setting up API Gateway for HTTPS access to AdAgent ALB"
echo "=================================================="

# Check if ALB DNS is provided
if [ -z "$ALB_DNS" ]; then
    print_error "ALB_DNS environment variable is required"
    print_status "Please set ALB_DNS to your ALB DNS name"
    exit 1
fi

print_status "Using ALB DNS: $ALB_DNS"
print_status "AWS Region: $AWS_REGION"
print_status "AWS Profile: $AWS_PROFILE"

# Create API Gateway
print_status "Creating API Gateway..."

API_ID=$(aws apigateway create-rest-api \
    --name "AdAgent-API" \
    --description "HTTPS proxy for AdAgent ALB" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    --query 'id' \
    --output text)

print_success "API Gateway created: $API_ID"

# Get root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id "$API_ID" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    --query 'items[?path==`/`].id' \
    --output text)

print_success "Root resource ID: $ROOT_RESOURCE_ID"

# Create proxy resource
print_status "Creating proxy resource..."

PROXY_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id "$API_ID" \
    --parent-id "$ROOT_RESOURCE_ID" \
    --path-part "{proxy+}" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    --query 'id' \
    --output text)

print_success "Proxy resource created: $PROXY_RESOURCE_ID"

# Create GET method for proxy
print_status "Creating GET method..."

aws apigateway put-method \
    --rest-api-id "$API_ID" \
    --resource-id "$PROXY_RESOURCE_ID" \
    --http-method GET \
    --authorization-type NONE \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE"

# Create POST method for proxy
print_status "Creating POST method..."

aws apigateway put-method \
    --rest-api-id "$API_ID" \
    --resource-id "$PROXY_RESOURCE_ID" \
    --http-method POST \
    --authorization-type NONE \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE"

# Create PUT method for proxy
print_status "Creating PUT method..."

aws apigateway put-method \
    --rest-api-id "$API_ID" \
    --resource-id "$PROXY_RESOURCE_ID" \
    --http-method PUT \
    --authorization-type NONE \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE"

# Create DELETE method for proxy
print_status "Creating DELETE method..."

aws apigateway put-method \
    --rest-api-id "$API_ID" \
    --resource-id "$PROXY_RESOURCE_ID" \
    --http-method DELETE \
    --authorization-type NONE \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE"

# Create integration for GET method
print_status "Creating integration for GET method..."

aws apigateway put-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$PROXY_RESOURCE_ID" \
    --http-method GET \
    --type HTTP_PROXY \
    --integration-http-method GET \
    --uri "http://$ALB_DNS/{proxy}" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE"

# Create integration for POST method
print_status "Creating integration for POST method..."

aws apigateway put-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$PROXY_RESOURCE_ID" \
    --http-method POST \
    --type HTTP_PROXY \
    --integration-http-method POST \
    --uri "http://$ALB_DNS/{proxy}" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE"

# Create integration for PUT method
print_status "Creating integration for PUT method..."

aws apigateway put-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$PROXY_RESOURCE_ID" \
    --http-method PUT \
    --type HTTP_PROXY \
    --integration-http-method PUT \
    --uri "http://$ALB_DNS/{proxy}" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE"

# Create integration for DELETE method
print_status "Creating integration for DELETE method..."

aws apigateway put-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$PROXY_RESOURCE_ID" \
    --http-method DELETE \
    --type HTTP_PROXY \
    --integration-http-method DELETE \
    --uri "http://$ALB_DNS/{proxy}" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE"

# Create deployment
print_status "Creating deployment..."

DEPLOYMENT_ID=$(aws apigateway create-deployment \
    --rest-api-id "$API_ID" \
    --stage-name "prod" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    --query 'id' \
    --output text)

print_success "Deployment created: $DEPLOYMENT_ID"

# Get the API Gateway URL
API_URL="https://$API_ID.execute-api.$AWS_REGION.amazonaws.com/prod"

print_success "API Gateway setup complete!"
echo ""
echo "🌐 Your HTTPS API endpoint is:"
echo "   $API_URL"
echo ""
echo "📝 Next steps:"
echo "1. Update your Amplify environment variable VITE_API_URL to:"
echo "   $API_URL"
echo ""
echo "2. Test the endpoint:"
echo "   curl $API_URL/health"
echo ""
echo "3. The API Gateway will proxy all requests to your ALB over HTTP"
echo "   while providing HTTPS access to clients"
echo ""

# Save the API URL to a file
echo "$API_URL" > .api_gateway_url
print_success "API URL saved to .api_gateway_url"

echo "🎉 Setup complete! Your AdAgent API is now available over HTTPS." 