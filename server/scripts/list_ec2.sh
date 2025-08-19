#!/bin/bash

# AdAgent EC2 Instance Listing Script
# Lists AdAgent EC2 instances with their details

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        echo "ERROR: AWS CLI is not installed"
        exit 1
    fi
    
    if ! aws sts get-caller-identity --profile "$AWS_PROFILE" &> /dev/null; then
        echo "ERROR: AWS profile '$AWS_PROFILE' not configured"
        exit 1
    fi
    
    print_success "All prerequisites met"
}

# Function to list instances
list_instances() {
    print_status "Listing AdAgent instances..."
    
    # Get instances with adagent-server-* name tags
    aws ec2 describe-instances \
        --filters "Name=tag:Name,Values=adagent-server-*" \
        "Name=instance-state-name,Values=running,stopped,stopping,starting" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Reservations[].Instances[].[InstanceId,Tags[?Key==`Name`].Value|[0],State.Name,PublicIpAddress,InstanceType]' \
        --output table
}

# Function to show detailed instance info
show_detailed_info() {
    print_status "Getting detailed instance information..."
    
    # Get more detailed information
    aws ec2 describe-instances \
        --filters "Name=tag:Name,Values=adagent-server-*" \
        "Name=instance-state-name,Values=running,stopped,stopping,starting" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Reservations[].Instances[].[
            InstanceId,
            Tags[?Key==`Name`].Value|[0],
            State.Name,
            PublicIpAddress,
            InstanceType,
            LaunchTime,
            SecurityGroups[0].GroupName
        ]' \
        --output table
}

# Function to show instance summary
show_summary() {
    print_status "Instance summary..."
    
    # Count instances by state
    RUNNING=$(aws ec2 describe-instances \
        --filters "Name=tag:Name,Values=adagent-server-*" \
        "Name=instance-state-name,Values=running" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'length(Reservations[].Instances[])' \
        --output text)
    
    STOPPED=$(aws ec2 describe-instances \
        --filters "Name=tag:Name,Values=adagent-server-*" \
        "Name=instance-state-name,Values=stopped" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'length(Reservations[].Instances[])' \
        --output text)
    
    OTHER=$(aws ec2 describe-instances \
        --filters "Name=tag:Name,Values=adagent-server-*" \
        "Name=instance-state-name,Values=stopping,starting" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'length(Reservations[].Instances[])' \
        --output text)
    
    TOTAL=$((RUNNING + STOPPED + OTHER))
    
    echo
    echo "📊 Instance Summary:"
    echo "  Total AdAgent server instances: $TOTAL"
    echo "  Running: $RUNNING"
    echo "  Stopped: $STOPPED"
    echo "  Other (starting/stopping): $OTHER"
    echo
}

# Main function
main() {
    local detail_flag=$1
    
    # Check prerequisites
    check_prerequisites
    
    # Show summary
    show_summary
    
    # Show instances based on detail level
    if [ "$detail_flag" = "--detail" ] || [ "$detail_flag" = "-d" ]; then
        show_detailed_info
    else
        list_instances
    fi
}

# Check for help
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "AdAgent EC2 Instance Listing Script"
    echo
    echo "Usage: $0 [--detail|-d]"
    echo
    echo "This script will:"
    echo "1. List all AdAgent server instances (adagent-server-*) with their basic details"
    echo "2. Show a summary of instance states"
    echo "3. Optionally show detailed information with --detail flag"
    echo
    echo "Examples:"
    echo "  $0              # Basic listing"
    echo "  $0 --detail     # Detailed listing with launch times"
    echo "  $0 -d           # Same as --detail"
    echo
    echo "Prerequisites:"
    echo "- AWS CLI installed and configured with profile '$AWS_PROFILE'"
    echo "- Proper AWS permissions for EC2 describe operations"
    exit 0
fi

# Run main function
main "$@" 