#!/bin/bash

# Destroy EC2 with API Gateway for AdAgent
# This script removes EC2 instance, security group, and API Gateway

set -e

# Configuration
ENVIRONMENT=${1:-"dev"}
AWS_REGION=${AWS_REGION:-"us-east-1"}
AWS_PROFILE=${AWS_PROFILE:-"AdAgentServer"}

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

echo "🗑️  Destroying AdAgent EC2 + API Gateway deployment"
echo "=================================================="
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo ""

# Check if environment name is provided
if [ -z "$ENVIRONMENT" ]; then
    print_error "Environment name is required"
    print_status "Usage: $0 <environment>"
    print_status "Example: $0 dev"
    exit 1
fi

# Load deployment info if available
DEPLOYMENT_FILE="deployment-$ENVIRONMENT.json"
if [ -f "$DEPLOYMENT_FILE" ]; then
    print_status "Loading deployment info from $DEPLOYMENT_FILE"
    INSTANCE_ID=$(jq -r '.instance_id' "$DEPLOYMENT_FILE")
    SECURITY_GROUP_ID=$(jq -r '.security_group_id' "$DEPLOYMENT_FILE")
    API_GATEWAY_ID=$(jq -r '.api_gateway_id' "$DEPLOYMENT_FILE")
    print_success "Loaded deployment info"
else
    print_warning "Deployment file not found, will search for resources by name"
    INSTANCE_ID=""
    SECURITY_GROUP_ID=""
    API_GATEWAY_ID=""
fi

# Create unique names for resources
SECURITY_GROUP_NAME="adagent-sg-$ENVIRONMENT"
API_GATEWAY_NAME="AdAgent-API-$ENVIRONMENT"

# Function to get instance name from environment
get_instance_name() {
    local env=$1
    if [ -z "$env" ]; then
        echo "adagent-server-dev"
    else
        echo "adagent-server-${env}"
    fi
}

INSTANCE_NAME=$(get_instance_name "$ENVIRONMENT")

# Find and terminate EC2 instance
if [ -n "$INSTANCE_ID" ]; then
    print_status "Terminating EC2 instance: $INSTANCE_ID"
    aws ec2 terminate-instances \
        --instance-ids "$INSTANCE_ID" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" 2>/dev/null || print_warning "Instance not found or already terminated"
else
    print_status "Searching for EC2 instances by name..."
    INSTANCE_IDS=$(aws ec2 describe-instances \
        --filters "Name=tag:Name,Values=$INSTANCE_NAME" "Name=instance-state-name,Values=running,stopped,stopping" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --query 'Reservations[].Instances[].InstanceId' \
        --output text)
    
    if [ -n "$INSTANCE_IDS" ]; then
        print_status "Found instances: $INSTANCE_IDS"
        for INSTANCE_ID in $INSTANCE_IDS; do
            print_status "Terminating instance: $INSTANCE_ID"
            aws ec2 terminate-instances \
                --instance-ids "$INSTANCE_ID" \
                --region "$AWS_REGION" \
                --profile "$AWS_PROFILE"
        done
    else
        print_warning "No EC2 instances found"
    fi
fi

# Wait for instances to terminate
if [ -n "$INSTANCE_IDS" ] || [ -n "$INSTANCE_ID" ]; then
    print_status "Waiting for instances to terminate..."
    aws ec2 wait instance-terminated \
        --instance-ids $INSTANCE_IDS $INSTANCE_ID \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" 2>/dev/null || print_warning "Some instances may still be terminating"
    print_success "Instances terminated"
fi

# Find and delete API Gateway
if [ -n "$API_GATEWAY_ID" ]; then
    print_status "Deleting API Gateway: $API_GATEWAY_ID"
    aws apigateway delete-rest-api \
        --rest-api-id "$API_GATEWAY_ID" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" 2>/dev/null || print_warning "API Gateway not found or already deleted"
else
    print_status "Searching for API Gateway by name..."
    API_GATEWAY_IDS=$(aws apigateway get-rest-apis \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --query "items[?name=='$API_GATEWAY_NAME'].id" \
        --output text)
    
    if [ -n "$API_GATEWAY_IDS" ]; then
        print_status "Found API Gateways: $API_GATEWAY_IDS"
        for API_GATEWAY_ID in $API_GATEWAY_IDS; do
            print_status "Deleting API Gateway: $API_GATEWAY_ID"
            aws apigateway delete-rest-api \
                --rest-api-id "$API_GATEWAY_ID" \
                --region "$AWS_REGION" \
                --profile "$AWS_PROFILE"
        done
    else
        print_warning "No API Gateways found"
    fi
fi

# Find and delete security group
if [ -n "$SECURITY_GROUP_ID" ]; then
    print_status "Deleting security group: $SECURITY_GROUP_ID"
    aws ec2 delete-security-group \
        --group-id "$SECURITY_GROUP_ID" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" 2>/dev/null || print_warning "Security group not found or already deleted"
else
    print_status "Searching for security group by name..."
    SECURITY_GROUP_IDS=$(aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=$SECURITY_GROUP_NAME" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --query 'SecurityGroups[].GroupId' \
        --output text)
    
    if [ -n "$SECURITY_GROUP_IDS" ]; then
        print_status "Found security groups: $SECURITY_GROUP_IDS"
        for SECURITY_GROUP_ID in $SECURITY_GROUP_IDS; do
            print_status "Deleting security group: $SECURITY_GROUP_ID"
            
            # Retry deletion with exponential backoff for security groups that may have dependencies
            for attempt in {1..10}; do
                if aws ec2 delete-security-group \
                    --group-id "$SECURITY_GROUP_ID" \
                    --region "$AWS_REGION" \
                    --profile "$AWS_PROFILE" 2>/dev/null; then
                    print_success "Security group deleted"
                    break
                else
                    print_warning "Security group deletion failed (attempt $attempt/10), retrying in 60 seconds..."
                    sleep 60
                fi
            done
        done
    else
        print_warning "No security groups found"
    fi
fi

# Remove deployment file
if [ -f "$DEPLOYMENT_FILE" ]; then
    print_status "Removing deployment file: $DEPLOYMENT_FILE"
    rm "$DEPLOYMENT_FILE"
    print_success "Deployment file removed"
fi

echo ""
print_success "Destroy completed successfully!"
echo ""
echo "🗑️  Destroyed resources:"
echo "   - EC2 instances"
echo "   - API Gateway"
echo "   - Security groups"
echo "   - Deployment file"
echo "" 