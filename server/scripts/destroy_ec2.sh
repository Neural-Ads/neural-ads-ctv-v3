#!/bin/bash

# AdAgent EC2 Instance Destruction Script
# Destroys EC2 instances by name tag or IP address

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_PROFILE="AdAgentServer"
AWS_REGION="us-east-1"

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

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed"
        exit 1
    fi
    
    if ! aws sts get-caller-identity --profile "$AWS_PROFILE" &> /dev/null; then
        print_error "AWS profile '$AWS_PROFILE' not configured"
        exit 1
    fi
    
    print_success "All prerequisites met"
}

# Function to get instance name from environment
get_instance_name() {
    local env=$1
    if [ -z "$env" ]; then
        echo "adagent-server-dev"
    else
        echo "adagent-server-${env}"
    fi
}

# Function to find instance by name tag
find_instance_by_name() {
    local name=$1
    
    # If name doesn't start with adagent-server-, assume it's an environment name
    if [[ "$name" != adagent-server-* ]]; then
        local full_name=$(get_instance_name "$name")
        print_status "Searching for instance with environment: $name (full name: $full_name)"
    else
        local full_name="$name"
        print_status "Searching for instance with name tag: $name"
    fi
    
    INSTANCE_ID=$(aws ec2 describe-instances \
        --filters "Name=tag:Name,Values=$full_name" \
        "Name=instance-state-name,Values=running,stopped,stopping,starting" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Reservations[0].Instances[0].InstanceId' \
        --output text)
    
    if [ "$INSTANCE_ID" = "None" ] || [ -z "$INSTANCE_ID" ]; then
        print_error "No instance found with name tag: $full_name"
        return 1
    fi
    
    print_success "Found instance: $INSTANCE_ID"
    return 0
}

# Function to find instance by IP address
find_instance_by_ip() {
    local ip=$1
    
    print_status "Searching for instance with IP address: $ip"
    
    INSTANCE_ID=$(aws ec2 describe-instances \
        --filters "Name=ip-address,Values=$ip" \
        "Name=instance-state-name,Values=running,stopped,stopping,starting" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Reservations[0].Instances[0].InstanceId' \
        --output text)
    
    if [ "$INSTANCE_ID" = "None" ] || [ -z "$INSTANCE_ID" ]; then
        print_error "No instance found with IP address: $ip"
        return 1
    fi
    
    print_success "Found instance: $INSTANCE_ID"
    return 0
}

# Function to get instance details
get_instance_details() {
    local instance_id=$1
    
    print_status "Getting instance details..."
    
    INSTANCE_NAME=$(aws ec2 describe-instances \
        --instance-ids "$instance_id" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Reservations[0].Instances[0].Tags[?Key==`Name`].Value' \
        --output text)
    
    INSTANCE_IP=$(aws ec2 describe-instances \
        --instance-ids "$instance_id" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text)
    
    INSTANCE_STATE=$(aws ec2 describe-instances \
        --instance-ids "$instance_id" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Reservations[0].Instances[0].State.Name' \
        --output text)
    
    INSTANCE_TYPE=$(aws ec2 describe-instances \
        --instance-ids "$instance_id" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Reservations[0].Instances[0].InstanceType' \
        --output text)
    
    echo "Instance Details:"
    echo "  ID: $instance_id"
    echo "  Name: $INSTANCE_NAME"
    echo "  IP: $INSTANCE_IP"
    echo "  State: $INSTANCE_STATE"
    echo "  Type: $INSTANCE_TYPE"
}

# Function to confirm destruction
confirm_destruction() {
    local instance_id=$1
    
    echo
    print_warning "WARNING: This will permanently destroy the instance!"
    echo
    get_instance_details "$instance_id"
    echo
    read -p "Are you sure you want to destroy this instance? (yes/no): " -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_status "Destruction cancelled by user"
        exit 0
    fi
}

# Function to destroy instance
destroy_instance() {
    local instance_id=$1
    
    print_status "Destroying instance: $instance_id"
    
    # Terminate the instance
    aws ec2 terminate-instances \
        --instance-ids "$instance_id" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION"
    
    print_success "Instance termination initiated"
    
    # Wait for termination
    print_status "Waiting for instance to terminate..."
    aws ec2 wait instance-terminated \
        --instance-ids "$instance_id" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION"
    
    print_success "Instance terminated successfully"
}

# Function to clean up security groups (optional)
cleanup_security_groups() {
    local instance_id=$1
    
    print_status "Checking for orphaned security groups..."
    
    # Get security groups associated with the terminated instance
    SECURITY_GROUPS=$(aws ec2 describe-instances \
        --instance-ids "$instance_id" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$SECURITY_GROUPS" ] && [ "$SECURITY_GROUPS" != "None" ]; then
        print_status "Found security group: $SECURITY_GROUPS"
        
        # Check if this security group is used by other instances
        OTHER_INSTANCES=$(aws ec2 describe-instances \
            --filters "Name=group-id,Values=$SECURITY_GROUPS" \
            "Name=instance-state-name,Values=running,stopped,stopping,starting" \
            --profile "$AWS_PROFILE" \
            --region "$AWS_REGION" \
            --query 'Reservations[].Instances[].InstanceId' \
            --output text)
        
        if [ -z "$OTHER_INSTANCES" ] || [ "$OTHER_INSTANCES" = "None" ]; then
            print_status "Security group $SECURITY_GROUPS is not used by other instances"
            read -p "Do you want to delete this security group? (yes/no): " -r
            echo
            
            if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
                print_status "Deleting security group: $SECURITY_GROUPS"
                aws ec2 delete-security-group \
                    --group-id "$SECURITY_GROUPS" \
                    --profile "$AWS_PROFILE" \
                    --region "$AWS_REGION"
                print_success "Security group deleted"
            else
                print_status "Security group left intact"
            fi
        else
            print_status "Security group $SECURITY_GROUPS is still used by other instances, leaving intact"
        fi
    fi
}



# Main function
main() {
    local identifier=$1
    
    if [ -z "$identifier" ]; then
        print_error "No instance identifier provided"
        echo
        echo "Usage: $0 <environment-or-ip>"
        echo
        echo "Examples:"
        echo "  $0 dev              # Destroy adagent-server-dev"
        echo "  $0 staging          # Destroy adagent-server-staging"
        echo "  $0 3.80.73.248      # Destroy by IP address"
        echo
        echo "To list available instances, use: ./list_ec2.sh"
        exit 1
    fi
    
    # Check prerequisites
    check_prerequisites
    
    # Try to find instance by name first, then by IP
    if ! find_instance_by_name "$identifier"; then
        if ! find_instance_by_ip "$identifier"; then
            print_error "No instance found with identifier: $identifier"
            echo
            print_status "Use './list_ec2.sh' to see available instances"
            exit 1
        fi
    fi
    
    # Confirm destruction
    confirm_destruction "$INSTANCE_ID"
    
    # Destroy instance
    destroy_instance "$INSTANCE_ID"
    
    # Clean up security groups
    cleanup_security_groups "$INSTANCE_ID"
    
    print_success "Instance destruction completed successfully!"
}

# Check for help
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "AdAgent EC2 Instance Destruction Script"
    echo
    echo "Usage: $0 <environment-or-ip>"
    echo
    echo "This script will:"
    echo "1. Find the specified instance by environment name or IP address"
    echo "2. Display instance details for confirmation"
    echo "3. Terminate the instance"
    echo "4. Optionally clean up orphaned security groups"
    echo
    echo "Arguments:"
    echo "  environment    Environment name (e.g., dev, staging, prod)"
    echo "                 Instance will be found as: adagent-server-{environment}"
    echo "  ip            IP address of the instance"
    echo
    echo "Examples:"
    echo "  $0 dev              # Destroy adagent-server-dev"
    echo "  $0 staging          # Destroy adagent-server-staging"
    echo "  $0 3.80.73.248      # Destroy by IP address"
    echo
    echo "To list available instances, use: ./list_ec2.sh"
    echo
    echo "Prerequisites:"
    echo "- AWS CLI installed and configured with profile '$AWS_PROFILE'"
    echo "- Proper AWS permissions for EC2 termination"
    echo
    echo "Safety Features:"
    echo "- Confirmation prompt before destruction"
    echo "- Instance details displayed before action"
    echo "- Security group cleanup is optional"
    exit 0
fi

# Run main function
main "$@" 