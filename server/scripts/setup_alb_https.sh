#!/bin/bash

# ALB HTTPS Setup Script for AdAgent
# This script sets up HTTPS for the ALB using a domain and ACM certificate

set -e

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-1"}
AWS_PROFILE=${AWS_PROFILE:-"default"}
ALB_DNS=${ALB_DNS:-"adagent-alb-1033327405.us-east-1.elb.amazonaws.com"}
DOMAIN_NAME=${DOMAIN_NAME:-""}  # e.g., "yourdomain.com"
SUBDOMAIN=${SUBDOMAIN:-"api"}   # e.g., "api.yourdomain.com"

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

echo "🚀 Setting up HTTPS for AdAgent ALB"
echo "=================================================="

# Check if domain name is provided
if [ -z "$DOMAIN_NAME" ]; then
    print_error "DOMAIN_NAME environment variable is required"
    print_status "Please set DOMAIN_NAME to your domain (e.g., yourdomain.com)"
    print_status "Example: DOMAIN_NAME=yourdomain.com ./setup_alb_https.sh"
    exit 1
fi

print_status "Using domain: $DOMAIN_NAME"
print_status "Using subdomain: $SUBDOMAIN.$DOMAIN_NAME"
print_status "ALB DNS: $ALB_DNS"
print_status "AWS Region: $AWS_REGION"
print_status "AWS Profile: $AWS_PROFILE"

# Check if domain is registered in Route 53
print_status "Checking if domain is registered in Route 53..."

HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    --query "HostedZones[?Name=='$DOMAIN_NAME.'].Id" \
    --output text)

if [ -z "$HOSTED_ZONE_ID" ]; then
    print_error "Domain $DOMAIN_NAME is not registered in Route 53"
    print_status "Please register your domain in Route 53 first"
    print_status "You can do this through the AWS Console or AWS CLI"
    exit 1
fi

print_success "Found hosted zone: $HOSTED_ZONE_ID"

# Create ACM certificate
print_status "Creating ACM certificate for *.$DOMAIN_NAME..."

CERTIFICATE_ARN=$(aws acm request-certificate \
    --domain-name "*.$DOMAIN_NAME" \
    --validation-method DNS \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    --query 'CertificateArn' \
    --output text)

print_success "Certificate requested: $CERTIFICATE_ARN"

# Get validation records
print_status "Getting certificate validation records..."

VALIDATION_RECORDS=$(aws acm describe-certificate \
    --certificate-arn "$CERTIFICATE_ARN" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    --query 'Certificate.DomainValidationOptions[0].ResourceRecord')

print_status "Certificate validation records:"
echo "$VALIDATION_RECORDS"

# Wait for certificate to be validated
print_status "Waiting for certificate to be validated..."
print_warning "You need to add the validation records to your Route 53 hosted zone"
print_status "Please add the following DNS records to your hosted zone:"
echo "$VALIDATION_RECORDS"

# Check certificate status
while true; do
    CERT_STATUS=$(aws acm describe-certificate \
        --certificate-arn "$CERTIFICATE_ARN" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --query 'Certificate.Status' \
        --output text)
    
    if [ "$CERT_STATUS" = "ISSUED" ]; then
        print_success "Certificate is issued!"
        break
    elif [ "$CERT_STATUS" = "FAILED" ]; then
        print_error "Certificate validation failed"
        exit 1
    else
        print_status "Certificate status: $CERT_STATUS (waiting...)"
        sleep 30
    fi
done

# Create A record for subdomain pointing to ALB
print_status "Creating A record for $SUBDOMAIN.$DOMAIN_NAME..."

# Get ALB hosted zone ID
ALB_HOSTED_ZONE_ID=$(aws elbv2 describe-load-balancers \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    --query 'LoadBalancers[?DNSName==`'$ALB_DNS'`].CanonicalHostedZoneId' \
    --output text)

# Create Route 53 change batch
cat > route53_change.json << EOF
{
    "Changes": [
        {
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": "$SUBDOMAIN.$DOMAIN_NAME",
                "Type": "A",
                "AliasTarget": {
                    "HostedZoneId": "$ALB_HOSTED_ZONE_ID",
                    "DNSName": "$ALB_DNS",
                    "EvaluateTargetHealth": true
                }
            }
        }
    ]
}
EOF

# Apply Route 53 changes
aws route53 change-resource-record-sets \
    --hosted-zone-id "$HOSTED_ZONE_ID" \
    --change-batch file://route53_change.json \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE"

print_success "A record created for $SUBDOMAIN.$DOMAIN_NAME"

# Get ALB ARN
print_status "Getting ALB ARN..."

ALB_ARN=$(aws elbv2 describe-load-balancers \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    --query 'LoadBalancers[?DNSName==`'$ALB_DNS'`].LoadBalancerArn' \
    --output text)

print_success "ALB ARN: $ALB_ARN"

# Get target group ARN
print_status "Getting target group ARN..."

TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

print_success "Target Group ARN: $TARGET_GROUP_ARN"

# Create HTTPS listener
print_status "Creating HTTPS listener..."

HTTPS_LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn "$ALB_ARN" \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn="$CERTIFICATE_ARN" \
    --default-actions Type=forward,TargetGroupArn="$TARGET_GROUP_ARN" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    --query 'Listeners[0].ListenerArn' \
    --output text)

print_success "HTTPS listener created: $HTTPS_LISTENER_ARN"

# Update HTTP listener to redirect to HTTPS
print_status "Updating HTTP listener to redirect to HTTPS..."

HTTP_LISTENER_ARN=$(aws elbv2 describe-listeners \
    --load-balancer-arn "$ALB_ARN" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    --query 'Listeners[?Port==`80`].ListenerArn' \
    --output text)

aws elbv2 modify-listener \
    --listener-arn "$HTTP_LISTENER_ARN" \
    --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE"

print_success "HTTP listener updated to redirect to HTTPS"

# Clean up temporary file
rm -f route53_change.json

print_success "HTTPS setup complete!"
echo ""
echo "🌐 Your HTTPS API endpoint is:"
echo "   https://$SUBDOMAIN.$DOMAIN_NAME"
echo ""
echo "📝 Next steps:"
echo "1. Update your Amplify environment variable VITE_API_URL to:"
echo "   https://$SUBDOMAIN.$DOMAIN_NAME"
echo ""
echo "2. Test the endpoint:"
echo "   curl https://$SUBDOMAIN.$DOMAIN_NAME/health"
echo ""
echo "3. The ALB now accepts both HTTP (redirects to HTTPS) and HTTPS"
echo ""

# Save the HTTPS URL to a file
echo "https://$SUBDOMAIN.$DOMAIN_NAME" > .https_url
print_success "HTTPS URL saved to .https_url"

echo "🎉 Setup complete! Your AdAgent API is now available over HTTPS." 