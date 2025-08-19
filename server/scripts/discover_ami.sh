#!/bin/bash

# Discover AMI from deployed instance
# This script will connect to your deployed instance and extract AMI information

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
KEY_NAME="adagent-key-new"  # Your EC2 key pair name

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

# Function to discover AMI information
discover_ami() {
    print_status "Connecting to deployed instance at $DEPLOYED_IP..."
    
    # Check if we can connect via SSH
    if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "echo 'SSH connection successful'" &> /dev/null; then
        print_error "Cannot connect to deployed instance via SSH"
        print_error "This might be because:"
        print_error "1. The instance is no longer running"
        print_error "2. SSH key is not available"
        print_error "3. Security group doesn't allow SSH"
        return 1
    fi
    
    print_success "SSH connection established"
    
    # Get system information
    print_status "Gathering system information..."
    
    # Get OS information
    OS_INFO=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "cat /etc/os-release")
    echo "$OS_INFO" > ami_info.txt
    
    # Get kernel information
    KERNEL_INFO=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "uname -a")
    echo "Kernel: $KERNEL_INFO" >> ami_info.txt
    
    # Get AWS instance metadata
    print_status "Getting AWS instance metadata..."
    
    # Get instance ID
    INSTANCE_ID=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/instance-id")
    echo "Instance ID: $INSTANCE_ID" >> ami_info.txt
    
    # Get AMI ID
    AMI_ID=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/ami-id")
    echo "AMI ID: $AMI_ID" >> ami_info.txt
    
    # Get AMI launch index
    AMI_LAUNCH_INDEX=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/ami-launch-index")
    echo "AMI Launch Index: $AMI_LAUNCH_INDEX" >> ami_info.txt
    
    # Get AMI manifest path
    AMI_MANIFEST_PATH=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/ami-manifest-path")
    echo "AMI Manifest Path: $AMI_MANIFEST_PATH" >> ami_info.txt
    
    # Get region
    REGION=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/placement/region")
    echo "Region: $REGION" >> ami_info.txt
    
    # Get availability zone
    AZ=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone")
    echo "Availability Zone: $AZ" >> ami_info.txt
    
    # Get instance type
    INSTANCE_TYPE=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/instance-type")
    echo "Instance Type: $INSTANCE_TYPE" >> ami_info.txt
    
    # Get architecture
    ARCH=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/architecture")
    echo "Architecture: $ARCH" >> ami_info.txt
    
    # Get virtualization type
    VIRT_TYPE=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/virtualization-type")
    echo "Virtualization Type: $VIRT_TYPE" >> ami_info.txt
    
    # Get hypervisor
    HYPERVISOR=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/hypervisor")
    echo "Hypervisor: $HYPERVISOR" >> ami_info.txt
    
    # Get kernel ID
    KERNEL_ID=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/kernel-id")
    echo "Kernel ID: $KERNEL_ID" >> ami_info.txt
    
    # Get ramdisk ID
    RAMDISK_ID=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/ramdisk-id")
    echo "RAM Disk ID: $RAMDISK_ID" >> ami_info.txt
    
    # Get security groups
    SECURITY_GROUPS=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/security-groups")
    echo "Security Groups: $SECURITY_GROUPS" >> ami_info.txt
    
    # Get public hostname
    PUBLIC_HOSTNAME=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/public-hostname")
    echo "Public Hostname: $PUBLIC_HOSTNAME" >> ami_info.txt
    
    # Get public IP
    PUBLIC_IP=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/public-ipv4")
    echo "Public IP: $PUBLIC_IP" >> ami_info.txt
    
    # Get local IP
    LOCAL_IP=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/local-ipv4")
    echo "Local IP: $LOCAL_IP" >> ami_info.txt
    
    # Get MAC address
    MAC=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/mac")
    echo "MAC Address: $MAC" >> ami_info.txt
    
    # Get VPC ID
    VPC_ID=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/network/interfaces/macs/$MAC/vpc-id")
    echo "VPC ID: $VPC_ID" >> ami_info.txt
    
    # Get subnet ID
    SUBNET_ID=$(ssh -o StrictHostKeyChecking=no "$SSH_USER@$DEPLOYED_IP" "curl -s http://169.254.169.254/latest/meta-data/network/interfaces/macs/$MAC/subnet-id")
    echo "Subnet ID: $SUBNET_ID" >> ami_info.txt
    
    print_success "AMI information gathered successfully!"
    
    # Display key information
    echo
    echo "=================================================="
    echo "🔍 AMI DISCOVERY RESULTS"
    echo "=================================================="
    echo "AMI ID: $AMI_ID"
    echo "Region: $REGION"
    echo "Instance Type: $INSTANCE_TYPE"
    echo "Architecture: $ARCH"
    echo "OS Info: $(echo "$OS_INFO" | grep PRETTY_NAME | cut -d'"' -f2)"
    echo "=================================================="
    
    # Create a configuration snippet for the deployment script
    cat > ami_config_snippet.txt << EOF
# Configuration for deployment script (extracted from deployed instance)
AWS_REGION="$REGION"
INSTANCE_TYPE="$INSTANCE_TYPE"
AMI_ID="$AMI_ID"
EOF
    
    print_success "Full AMI information saved to: ami_info.txt"
    print_success "Configuration snippet saved to: ami_config_snippet.txt"
    
    echo
    echo "📋 To update your deployment script:"
    echo "1. Copy the AMI_ID from above"
    echo "2. Update the AMI_ID variable in deploy_to_ec2.sh"
    echo "3. Update AWS_REGION if different from your preference"
}

# Function to check if AWS CLI can get AMI details
get_ami_details() {
    if ! command -v aws &> /dev/null; then
        print_warning "AWS CLI not available, skipping AMI details lookup"
        return
    fi
    
    if [ -z "$AMI_ID" ]; then
        print_warning "AMI ID not available, skipping AMI details lookup"
        return
    fi
    
    print_status "Getting AMI details from AWS..."
    
    # Get AMI details
    AMI_DETAILS=$(aws ec2 describe-images --image-ids "$AMI_ID" --region "$REGION" 2>/dev/null || echo "AMI not found or access denied")
    echo "$AMI_DETAILS" >> ami_info.txt
    
    if [[ "$AMI_DETAILS" != *"AMI not found"* ]]; then
        print_success "AMI details retrieved from AWS"
    else
        print_warning "Could not retrieve AMI details from AWS (this is normal if AMI is private or access is restricted)"
    fi
}

# Main function
main() {
    print_status "Starting AMI discovery from deployed instance..."
    
    # Discover AMI information
    if discover_ami; then
        # Try to get additional AMI details from AWS
        get_ami_details
        
        echo
        print_success "AMI discovery completed successfully!"
        echo
        echo "📁 Files created:"
        echo "   ami_info.txt - Complete system and AMI information"
        echo "   ami_config_snippet.txt - Configuration for deployment script"
        echo
        echo "🔧 Next steps:"
        echo "1. Review ami_info.txt for complete details"
        echo "2. Use the AMI_ID in your deployment script"
        echo "3. Update deploy_to_ec2.sh with the correct AMI_ID"
    else
        print_error "AMI discovery failed"
        exit 1
    fi
}

# Check if running with help
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "AMI Discovery Script"
    echo
    echo "Usage: $0"
    echo
    echo "This script will:"
    echo "1. Connect to your deployed instance at $DEPLOYED_IP"
    echo "2. Extract AMI and system information"
    echo "3. Save detailed information to files"
    echo "4. Provide configuration for deployment script"
    echo
    echo "Prerequisites:"
    echo "- SSH access to deployed instance"
    echo "- SSH key for authentication"
    echo "- Instance must be running and accessible"
    echo
    echo "Configuration:"
    echo "- Update DEPLOYED_IP if different"
    echo "- Update SSH_USER if different"
    echo "- Update KEY_NAME if using different key pair"
    exit 0
fi

# Run main function
main "$@" 