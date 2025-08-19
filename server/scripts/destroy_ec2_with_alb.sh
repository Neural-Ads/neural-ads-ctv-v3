#!/bin/bash

# AdAgent EC2 Instance and ALB Destruction Script
# Destroys EC2 instances, ALB, target groups, and security groups

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
SECURITY_GROUP_NAME="adagent-sg"
ALB_SECURITY_GROUP_NAME="adagent-alb-sg"
TARGET_GROUP_NAME="adagent-tg"
LOAD_BALANCER_NAME="adagent-alb"

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
    print_warning "WARNING: This will permanently destroy the instance, ALB, target group, and security groups!"
    echo
    if [ -n "$instance_id" ] && [ "$instance_id" != "None" ]; then
        get_instance_details "$instance_id"
        echo
    fi
    echo "Resources that will be destroyed:"
    if [ -n "$instance_id" ] && [ "$instance_id" != "None" ]; then
        echo "  • EC2 Instance: $instance_id"
    fi
    echo "  • Application Load Balancer: $LOAD_BALANCER_NAME"
    echo "  • Target Group: $TARGET_GROUP_NAME"
    echo "  • Security Groups: $SECURITY_GROUP_NAME, $ALB_SECURITY_GROUP_NAME"
    echo
    read -p "Are you sure you want to destroy these resources? (yes/no): " -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_status "Destruction cancelled by user"
        exit 0
    fi
}

# Function to destroy load balancer
destroy_load_balancer() {
    print_status "Destroying load balancer..."
    
    # Check if load balancer exists
    if ! aws elbv2 describe-load-balancers --names "$LOAD_BALANCER_NAME" --region "$AWS_REGION" --profile "$AWS_PROFILE" &> /dev/null; then
        print_warning "Load balancer $LOAD_BALANCER_NAME not found"
        return
    fi
    
    # Get load balancer ARN
    ALB_ARN=$(aws elbv2 describe-load-balancers \
        --names "$LOAD_BALANCER_NAME" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --query 'LoadBalancers[0].LoadBalancerArn' \
        --output text)
    
    # Delete listeners first
    print_status "Deleting load balancer listeners..."
    LISTENER_ARNS=$(aws elbv2 describe-listeners \
        --load-balancer-arn "$ALB_ARN" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --query 'Listeners[*].ListenerArn' \
        --output text)
    
    for listener_arn in $LISTENER_ARNS; do
        if [ "$listener_arn" != "None" ] && [ -n "$listener_arn" ]; then
            print_status "Deleting listener: $listener_arn"
            aws elbv2 delete-listener \
                --listener-arn "$listener_arn" \
                --region "$AWS_REGION" \
                --profile "$AWS_PROFILE"
        fi
    done
    
    # Delete load balancer
    print_status "Deleting load balancer: $ALB_ARN"
    aws elbv2 delete-load-balancer \
        --load-balancer-arn "$ALB_ARN" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE"
    
    print_success "Load balancer deleted"
}

# Function to destroy target group
destroy_target_group() {
    print_status "Destroying target group..."
    
    # Check if target group exists
    if ! aws elbv2 describe-target-groups --names "$TARGET_GROUP_NAME" --region "$AWS_REGION" --profile "$AWS_PROFILE" &> /dev/null; then
        print_warning "Target group $TARGET_GROUP_NAME not found"
        return
    fi
    
    # Get target group ARN
    TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
        --names "$TARGET_GROUP_NAME" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text)
    
    # Deregister targets if any
    print_status "Deregistering targets from target group..."
    TARGETS=$(aws elbv2 describe-target-health \
        --target-group-arn "$TARGET_GROUP_ARN" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --query 'TargetHealthDescriptions[*].Target.Id' \
        --output text)
    
    if [ "$TARGETS" != "None" ] && [ -n "$TARGETS" ]; then
        TARGET_ARRAY=($TARGETS)
        for target_id in "${TARGET_ARRAY[@]}"; do
            if [ "$target_id" != "None" ] && [ -n "$target_id" ]; then
                print_status "Deregistering target: $target_id"
                aws elbv2 deregister-targets \
                    --target-group-arn "$TARGET_GROUP_ARN" \
                    --targets Id="$target_id" \
                    --region "$AWS_REGION" \
                    --profile "$AWS_PROFILE"
            fi
        done
    fi
    
    # Delete target group
    print_status "Deleting target group: $TARGET_GROUP_ARN"
    aws elbv2 delete-target-group \
        --target-group-arn "$TARGET_GROUP_ARN" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE"
    
    print_success "Target group deleted"
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

# Function to destroy security groups
destroy_security_groups() {
    print_status "Destroying security groups..."
    
    # Helper function for retrying security group deletion
    retry_delete_sg() {
        local sg_id=$1
        local sg_name=$2
        local max_attempts=10
        local attempt=1
        while [ $attempt -le $max_attempts ]; do
            if aws ec2 delete-security-group \
                --group-id "$sg_id" \
                --region "$AWS_REGION" \
                --profile "$AWS_PROFILE"; then
                print_success "$sg_name security group deleted"
                return 0
            else
                print_warning "Attempt $attempt: Failed to delete $sg_name (may have dependencies). Retrying in 60 seconds..."
                sleep 60
            fi
            ((attempt++))
        done
        print_error "Failed to delete $sg_name after $max_attempts attempts. Please check for dependent resources in the AWS Console."
        return 1
    }
    
    # Destroy EC2 security group
    if aws ec2 describe-security-groups --group-names "$SECURITY_GROUP_NAME" --region "$AWS_REGION" --profile "$AWS_PROFILE" &> /dev/null; then
        print_status "Deleting EC2 security group: $SECURITY_GROUP_NAME"
        SG_ID=$(aws ec2 describe-security-groups \
            --group-names "$SECURITY_GROUP_NAME" \
            --region "$AWS_REGION" \
            --profile "$AWS_PROFILE" \
            --query 'SecurityGroups[0].GroupId' \
            --output text)
        retry_delete_sg "$SG_ID" "$SECURITY_GROUP_NAME"
    else
        print_warning "EC2 security group $SECURITY_GROUP_NAME not found"
    fi
    
    # Destroy ALB security group
    if aws ec2 describe-security-groups --group-names "$ALB_SECURITY_GROUP_NAME" --region "$AWS_REGION" --profile "$AWS_PROFILE" &> /dev/null; then
        print_status "Deleting ALB security group: $ALB_SECURITY_GROUP_NAME"
        ALB_SG_ID=$(aws ec2 describe-security-groups \
            --group-names "$ALB_SECURITY_GROUP_NAME" \
            --region "$AWS_REGION" \
            --profile "$AWS_PROFILE" \
            --query 'SecurityGroups[0].GroupId' \
            --output text)
        retry_delete_sg "$ALB_SG_ID" "$ALB_SECURITY_GROUP_NAME"
    else
        print_warning "ALB security group $ALB_SECURITY_GROUP_NAME not found"
    fi
}

# Function to display destruction summary
display_destruction_summary() {
    echo
    echo "=================================================="
    echo "🗑️  DESTRUCTION COMPLETE!"
    echo "=================================================="
    echo "The following resources have been destroyed:"
    if [ -n "$INSTANCE_ID" ]; then
        echo "  • EC2 Instance: $INSTANCE_ID"
    fi
    echo "  • Application Load Balancer: $LOAD_BALANCER_NAME"
    echo "  • Target Group: $TARGET_GROUP_NAME"
    echo "  • Security Groups: $SECURITY_GROUP_NAME, $ALB_SECURITY_GROUP_NAME"
    echo
    echo "💡 To deploy again, run: ./deploy_ec2_with_alb.sh"
    echo "=================================================="
    echo
}

# Main destruction function
main() {
    local target=$1
    
    print_status "Starting AdAgent EC2 and ALB destruction..."
    
    # Check prerequisites
    check_prerequisites
    
    # Find instance (optional - we can destroy ALB resources even without instance)
    INSTANCE_ID=""
    if [ -n "$target" ]; then
        if [[ "$target" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            # IP address
            if find_instance_by_ip "$target"; then
                print_status "Found instance: $INSTANCE_ID"
            else
                print_warning "No instance found with IP: $target, but will clean up ALB resources"
            fi
        else
            # Environment name or instance name
            if find_instance_by_name "$target"; then
                print_status "Found instance: $INSTANCE_ID"
            else
                print_warning "No instance found with name: $target, but will clean up ALB resources"
            fi
        fi
    else
        # Try to find by default environment
        if find_instance_by_name "dev"; then
            print_status "Found instance: $INSTANCE_ID"
        else
            print_warning "No instance found, but will clean up ALB resources"
        fi
    fi
    
    # Confirm destruction
    if [ -n "$INSTANCE_ID" ] && [ "$INSTANCE_ID" != "None" ]; then
        confirm_destruction "$INSTANCE_ID"
    else
        echo
        print_warning "WARNING: This will permanently destroy ALB resources!"
        echo
        echo "Resources that will be destroyed:"
        echo "  • Application Load Balancer: $LOAD_BALANCER_NAME"
        echo "  • Target Group: $TARGET_GROUP_NAME"
        echo "  • Security Groups: $SECURITY_GROUP_NAME, $ALB_SECURITY_GROUP_NAME"
        echo
        read -p "Are you sure you want to destroy these resources? (yes/no): " -r
        echo
        
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            print_status "Destruction cancelled by user"
            exit 0
        fi
    fi
    
    # Destroy resources in order
    destroy_load_balancer
    destroy_target_group
    if [ -n "$INSTANCE_ID" ] && [ "$INSTANCE_ID" != "None" ]; then
        destroy_instance "$INSTANCE_ID"
    fi
    destroy_security_groups
    
    # Display summary
    display_destruction_summary
}

# Check if running with correct arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "AdAgent EC2 and ALB Destruction Script"
    echo
    echo "Usage: $0 [target]"
    echo
    echo "This script will destroy:"
    echo "1. Application Load Balancer and listeners"
    echo "2. Target Group"
    echo "3. EC2 Instance"
    echo "4. Security Groups"
    echo
    echo "Arguments:"
    echo "  target         Environment name, instance name, or IP address"
    echo "                 If not specified, will look for 'adagent-server-dev'"
    echo
    echo "Examples:"
    echo "  $0              # Destroy adagent-server-dev"
    echo "  $0 staging      # Destroy adagent-server-staging"
    echo "  $0 prod         # Destroy adagent-server-prod"
    echo "  $0 1.2.3.4      # Destroy instance with IP 1.2.3.4"
    echo
    echo "Prerequisites:"
    echo "- AWS CLI installed and configured"
    echo "- Proper AWS permissions"
    exit 0
fi

# Run main function
main "$@" 