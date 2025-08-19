#!/bin/bash

# Discover AWS Resources from Deployed Instance
# This script will discover all AWS resources used by your current deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYED_IP="44.200.209.135"
SSH_USER="ubuntu"
AWS_PROFILE="AdAgentServer"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check AWS CLI and profile
check_aws_setup() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed"
        exit 1
    fi
    
    # Test the profile
    if ! aws sts get-caller-identity --profile "$AWS_PROFILE" &> /dev/null; then
        print_error "AWS profile '$AWS_PROFILE' is not configured or invalid"
        exit 1
    fi
    
    print_success "AWS CLI configured with profile: $AWS_PROFILE"
    
    # Get account info
    ACCOUNT_ID=$(aws sts get-caller-identity --profile "$AWS_PROFILE" --query 'Account' --output text)
    USER_ARN=$(aws sts get-caller-identity --profile "$AWS_PROFILE" --query 'Arn' --output text)
    
    echo "Account ID: $ACCOUNT_ID"
    echo "User ARN: $USER_ARN"
    echo
}

# Function to discover instance and its resources
discover_instance_resources() {
    print_status "Discovering instance and associated resources..."
    
    # Get instance ID from metadata
    INSTANCE_ID=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/instance-id")
    REGION=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/placement/region")
    
    echo "Instance ID: $INSTANCE_ID"
    echo "Region: $REGION"
    echo
    
    # Get instance details
    print_status "Getting instance details..."
    INSTANCE_DETAILS=$(aws ec2 describe-instances \
        --instance-ids "$INSTANCE_ID" \
        --profile "$AWS_PROFILE" \
        --region "$REGION" \
        --query 'Reservations[0].Instances[0]')
    
    # Extract key information
    INSTANCE_TYPE=$(echo "$INSTANCE_DETAILS" | jq -r '.InstanceType')
    AMI_ID=$(echo "$INSTANCE_DETAILS" | jq -r '.ImageId')
    KEY_NAME=$(echo "$INSTANCE_DETAILS" | jq -r '.KeyName')
    VPC_ID=$(echo "$INSTANCE_DETAILS" | jq -r '.VpcId')
    SUBNET_ID=$(echo "$INSTANCE_DETAILS" | jq -r '.SubnetId')
    SECURITY_GROUPS=$(echo "$INSTANCE_DETAILS" | jq -r '.SecurityGroups[].GroupId' | tr '\n' ' ')
    PUBLIC_IP=$(echo "$INSTANCE_DETAILS" | jq -r '.PublicIpAddress')
    PRIVATE_IP=$(echo "$INSTANCE_DETAILS" | jq -r '.PrivateIpAddress')
    STATE=$(echo "$INSTANCE_DETAILS" | jq -r '.State.Name')
    
    echo "Instance Type: $INSTANCE_TYPE"
    echo "AMI ID: $AMI_ID"
    echo "Key Name: $KEY_NAME"
    echo "VPC ID: $VPC_ID"
    echo "Subnet ID: $SUBNET_ID"
    echo "Security Groups: $SECURITY_GROUPS"
    echo "Public IP: $PUBLIC_IP"
    echo "Private IP: $PRIVATE_IP"
    echo "State: $STATE"
    echo
    
    # Save to file
    cat > aws_resources.txt << EOF
# AWS Resources discovered from deployed instance
# Generated on: $(date)

# Instance Information
INSTANCE_ID="$INSTANCE_ID"
INSTANCE_TYPE="$INSTANCE_TYPE"
AMI_ID="$AMI_ID"
KEY_NAME="$KEY_NAME"
REGION="$REGION"

# Network Information
VPC_ID="$VPC_ID"
SUBNET_ID="$SUBNET_ID"
SECURITY_GROUPS="$SECURITY_GROUPS"
PUBLIC_IP="$PUBLIC_IP"
PRIVATE_IP="$PRIVATE_IP"

# Instance State
STATE="$STATE"
EOF
}

# Function to discover VPC and subnet details
discover_network_resources() {
    print_status "Discovering network resources..."
    
    # Get VPC details
    VPC_DETAILS=$(aws ec2 describe-vpcs \
        --vpc-ids "$VPC_ID" \
        --profile "$AWS_PROFILE" \
        --region "$REGION")
    
    VPC_CIDR=$(echo "$VPC_DETAILS" | jq -r '.Vpcs[0].CidrBlock')
    VPC_NAME=$(echo "$VPC_DETAILS" | jq -r '.Vpcs[0].Tags[]? | select(.Key=="Name").Value // "unnamed"')
    
    echo "VPC Name: $VPC_NAME"
    echo "VPC CIDR: $VPC_CIDR"
    echo
    
    # Get subnet details
    SUBNET_DETAILS=$(aws ec2 describe-subnets \
        --subnet-ids "$SUBNET_ID" \
        --profile "$AWS_PROFILE" \
        --region "$REGION")
    
    SUBNET_CIDR=$(echo "$SUBNET_DETAILS" | jq -r '.Subnets[0].CidrBlock')
    SUBNET_AZ=$(echo "$SUBNET_DETAILS" | jq -r '.Subnets[0].AvailabilityZone')
    SUBNET_NAME=$(echo "$SUBNET_DETAILS" | jq -r '.Subnets[0].Tags[]? | select(.Key=="Name").Value // "unnamed"')
    
    echo "Subnet Name: $SUBNET_NAME"
    echo "Subnet CIDR: $SUBNET_CIDR"
    echo "Availability Zone: $SUBNET_AZ"
    echo
    
    # Append to file
    cat >> aws_resources.txt << EOF

# Network Details
VPC_NAME="$VPC_NAME"
VPC_CIDR="$VPC_CIDR"
SUBNET_NAME="$SUBNET_NAME"
SUBNET_CIDR="$SUBNET_CIDR"
SUBNET_AZ="$SUBNET_AZ"
EOF
}

# Function to discover security group details
discover_security_groups() {
    print_status "Discovering security group details..."
    
    for SG_ID in $SECURITY_GROUPS; do
        echo "Security Group: $SG_ID"
        
        SG_DETAILS=$(aws ec2 describe-security-groups \
            --group-ids "$SG_ID" \
            --profile "$AWS_PROFILE" \
            --region "$REGION")
        
        SG_NAME=$(echo "$SG_DETAILS" | jq -r '.SecurityGroups[0].GroupName')
        SG_DESC=$(echo "$SG_DETAILS" | jq -r '.SecurityGroups[0].Description')
        
        echo "  Name: $SG_NAME"
        echo "  Description: $SG_DESC"
        
        # Get ingress rules
        echo "  Ingress Rules:"
        echo "$SG_DETAILS" | jq -r '.SecurityGroups[0].IpPermissions[] | "    Port: \(.FromPort // "All")-\(.ToPort // "All"), Protocol: \(.IpProtocol), Source: \(.IpRanges[].CidrIp // "Security Group")"'
        
        echo
    done
    
    # Append to file
    cat >> aws_resources.txt << EOF

# Security Groups
EOF
    
    for SG_ID in $SECURITY_GROUPS; do
        SG_DETAILS=$(aws ec2 describe-security-groups \
            --group-ids "$SG_ID" \
            --profile "$AWS_PROFILE" \
            --region "$REGION")
        
        SG_NAME=$(echo "$SG_DETAILS" | jq -r '.SecurityGroups[0].GroupName')
        echo "SECURITY_GROUP_${SG_NAME^^}_ID=\"$SG_ID\"" >> aws_resources.txt
    done
}

# Function to discover available AMIs
discover_available_amis() {
    print_status "Discovering available Ubuntu 22.04 AMIs..."
    
    # Get Ubuntu 22.04 AMIs
    UBUNTU_AMIS=$(aws ec2 describe-images \
        --owners 099720109477 \
        --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
        --profile "$AWS_PROFILE" \
        --region "$REGION" \
        --query 'Images[] | sort_by(@, &CreationDate) | reverse(@) | [0:5] | [].{ID:ImageId,Name:Name,Created:CreationDate,Description:Description}' \
        --output table)
    
    echo "Available Ubuntu 22.04 AMIs (latest 5):"
    echo "$UBUNTU_AMIS"
    echo
    
    # Get the latest AMI ID
    LATEST_AMI_ID=$(aws ec2 describe-images \
        --owners 099720109477 \
        --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
        --profile "$AWS_PROFILE" \
        --region "$REGION" \
        --query 'Images[] | sort_by(@, &CreationDate) | reverse(@) | [0].ImageId' \
        --output text)
    
    echo "Latest Ubuntu 22.04 AMI: $LATEST_AMI_ID"
    echo
    
    # Append to file
    cat >> aws_resources.txt << EOF

# Available AMIs
LATEST_UBUNTU_22_04_AMI="$LATEST_AMI_ID"
CURRENT_AMI="$AMI_ID"
EOF
}

# Function to discover key pairs
discover_key_pairs() {
    print_status "Discovering available key pairs..."
    
    KEY_PAIRS=$(aws ec2 describe-key-pairs \
        --profile "$AWS_PROFILE" \
        --region "$REGION" \
        --query 'KeyPairs[].{Name:KeyName,Type:KeyType}' \
        --output table)
    
    echo "Available Key Pairs:"
    echo "$KEY_PAIRS"
    echo
    
    # Append to file
    cat >> aws_resources.txt << EOF

# Key Pairs
CURRENT_KEY_NAME="$KEY_NAME"
EOF
}

# Function to create deployment configuration
create_deployment_config() {
    print_status "Creating deployment configuration..."
    
    cat > deployment_config.sh << EOF
#!/bin/bash

# AdAgent Deployment Configuration
# Generated from existing AWS resources on $(date)

# AWS Configuration
export AWS_PROFILE="$AWS_PROFILE"
AWS_REGION="$REGION"

# Instance Configuration
INSTANCE_TYPE="$INSTANCE_TYPE"
AMI_ID="$LATEST_AMI_ID"  # Using latest Ubuntu 22.04 AMI
KEY_NAME="$KEY_NAME"

# Network Configuration
VPC_ID="$VPC_ID"
SUBNET_ID="$SUBNET_ID"
SECURITY_GROUP_IDS="$SECURITY_GROUPS"

# Current Instance Information (for reference)
CURRENT_INSTANCE_ID="$INSTANCE_ID"
CURRENT_PUBLIC_IP="$PUBLIC_IP"

# Deployment Options
# 1. Use existing security groups (recommended)
# 2. Create new security group
# 3. Use existing VPC/subnet (recommended)
# 4. Create new VPC/subnet

echo "Deployment configuration loaded:"
echo "  Region: \$AWS_REGION"
echo "  Instance Type: \$INSTANCE_TYPE"
echo "  AMI: \$AMI_ID"
echo "  Key Pair: \$KEY_NAME"
echo "  VPC: \$VPC_ID"
echo "  Subnet: \$SUBNET_ID"
echo "  Security Groups: \$SECURITY_GROUP_IDS"
EOF
    
    chmod +x deployment_config.sh
}

# Function to display summary
display_summary() {
    echo
    echo "=================================================="
    echo "🔍 AWS RESOURCES DISCOVERY SUMMARY"
    echo "=================================================="
    echo "Instance: $INSTANCE_ID ($INSTANCE_TYPE)"
    echo "Region: $REGION"
    echo "AMI: $AMI_ID"
    echo "Key Pair: $KEY_NAME"
    echo "VPC: $VPC_ID"
    echo "Subnet: $SUBNET_ID"
    echo "Security Groups: $SECURITY_GROUPS"
    echo "Public IP: $PUBLIC_IP"
    echo "=================================================="
    echo
    echo "📁 Files created:"
    echo "   aws_resources.txt - Complete resource information"
    echo "   deployment_config.sh - Ready-to-use deployment configuration"
    echo
    echo "🔧 Next steps:"
    echo "1. Review aws_resources.txt for complete details"
    echo "2. Use deployment_config.sh in your deployment script"
    echo "3. Consider reusing existing security groups and VPC"
    echo "4. Update deploy_to_ec2.sh with the discovered resources"
}

# Main function
main() {
    print_status "Starting AWS resources discovery..."
    
    # Check AWS setup
    check_aws_setup
    
    # Discover resources
    discover_instance_resources
    discover_network_resources
    discover_security_groups
    discover_available_amis
    discover_key_pairs
    
    # Create deployment configuration
    create_deployment_config
    
    # Display summary
    display_summary
    
    print_success "AWS resources discovery completed successfully!"
}

# Check if running with help
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "AWS Resources Discovery Script"
    echo
    echo "Usage: $0"
    echo
    echo "This script will:"
    echo "1. Connect to your deployed instance"
    echo "2. Discover all associated AWS resources"
    echo "3. Find available Ubuntu 22.04 AMIs"
    echo "4. Create deployment configuration"
    echo "5. Generate reusable resource information"
    echo
    echo "Prerequisites:"
    echo "- AWS CLI installed"
    echo "- AWS profile '$AWS_PROFILE' configured"
    echo "- SSH access to deployed instance"
    echo "- Instance must be running"
    echo
    echo "This will help you reuse existing resources for new deployments."
    exit 0
fi

# Run main function
main "$@" 