#!/bin/bash

# Comprehensive Server Test Runner for AdAgent
# Usage: ./run_tests.sh [local|deployed|custom_url]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default URLs
LOCAL_URL="http://localhost:8000"
DEPLOYED_URL="https://your-deployed-server.com"  # Update this with your actual deployed URL

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

# Function to check if server is reachable
check_server() {
    local url=$1
    print_status "Checking if server is reachable at $url..."
    
    if curl -s --max-time 10 "$url/health" > /dev/null 2>&1; then
        print_success "Server is reachable!"
        return 0
    else
        print_error "Server is not reachable at $url"
        return 1
    fi
}

# Function to run tests
run_tests() {
    local url=$1
    local test_name=$2
    
    print_status "Running comprehensive tests against $test_name server..."
    print_status "URL: $url"
    echo
    
    # Create timestamp for output file
    timestamp=$(date +"%Y%m%d_%H%M%S")
    output_file="results/test_results_${test_name}_${timestamp}.json"
    
    # Run the test script
    python3 test_server_comprehensive.py --url "$url" --output "$output_file"
    
    if [ $? -eq 0 ]; then
        print_success "All tests passed! Results saved to $output_file"
    else
        print_warning "Some tests failed. Check $output_file for details."
    fi
    
    echo
    print_status "Test results saved to: $output_file"
}

# Check if URL is provided
if [ $# -eq 0 ]; then
    print_error "No server URL provided!"
    echo
    echo "Usage: $0 <server_url>"
    echo
    echo "Examples:"
    echo "  $0 http://localhost:8000"
    echo "  $0 https://my-deployed-server.com"
    echo "  $0 http://192.168.1.100:8000"
    echo
    echo "Always specify the exact server URL you want to test!"
    exit 1
fi

# Get the server URL from command line
SERVER_URL=$1

# Validate URL format (basic check)
if [[ ! "$SERVER_URL" =~ ^https?:// ]]; then
    print_error "Invalid URL format: $SERVER_URL"
    print_error "URL must start with http:// or https://"
    exit 1
fi

print_status "Testing server at: $SERVER_URL"

# Check if server is reachable
if check_server "$SERVER_URL"; then
    # Extract a meaningful name from the URL for the output file
    if [[ "$SERVER_URL" == *"localhost"* ]]; then
        test_name="local"
    elif [[ "$SERVER_URL" == *"127.0.0.1"* ]]; then
        test_name="local"
    else
        # Extract domain name for custom servers
        test_name=$(echo "$SERVER_URL" | sed 's|^https\?://||' | sed 's|[:/].*||' | sed 's/[^a-zA-Z0-9]/_/g')
    fi
    
    run_tests "$SERVER_URL" "$test_name"
else
    print_error "Cannot reach server at: $SERVER_URL"
    print_error "Please check:"
    print_error "  1. Server is running"
    print_error "  2. URL is correct"
    print_error "  3. Network connectivity"
    print_error "  4. Firewall settings"
    exit 1
fi

print_success "Test run completed!" 