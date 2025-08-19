# AdAgent Server Scripts

This directory contains deployment and utility scripts for the AdAgent server.

## Deployment Scripts

### `deploy_ec2.sh`
Main deployment script for AWS EC2 instances. Creates a complete server deployment with:
- EC2 instance creation (t3.micro, Ubuntu 22.04)
- Security group setup (SSH + HTTP)
- Application deployment and service setup
- Health checks and comprehensive testing

**Prerequisites:**
- AWS CLI installed and configured with profile `AdAgentServer`
- EC2 key pair named `adagent-key-new` (or update `KEY_NAME` in script)
- SSH access to the instance

**Usage:**
```bash
# Deploy to default environment (dev) - creates adagent-server-dev
./deploy_ec2.sh

# Deploy to specific environment - creates adagent-server-{environment}
./deploy_ec2.sh staging    # creates adagent-server-staging
./deploy_ec2.sh prod       # creates adagent-server-prod
```

**Naming Convention:**
- All instances are named `adagent-server-{environment}`
- Default environment is `dev` if none specified
- This ensures consistent naming for management scripts

**Configuration:**
Update these variables at the top of the script:
- `AWS_REGION` - AWS region (default: us-east-1)
- `INSTANCE_TYPE` - EC2 instance type (default: t3.micro)
- `KEY_NAME` - Your EC2 key pair name
- `AMI_ID` - Ubuntu 22.04 AMI ID (currently: ami-05ec1e5f7cfe5ef59)

## Utility Scripts

### `discover_aws_resources.sh`
Discovers AWS resources from an existing deployed instance and generates configuration for reuse.

**Usage:**
```bash
./discover_aws_resources.sh <instance-ip>
```

### `discover_ami.sh`
Discovers the AMI ID and other details from a deployed instance.

**Usage:**
```bash
./discover_ami.sh <instance-ip>
```

### `run_tests.sh`
Runs comprehensive tests against a deployed server.

**Usage:**
```bash
./run_tests.sh <server-url>
```

### `list_ec2.sh`
Instance listing script for AWS EC2 instances. Shows all AdAgent instances with their details.

**Prerequisites:**
- AWS CLI installed and configured with profile `AdAgentServer`
- Proper AWS permissions for EC2 describe operations

**Usage:**
```bash
# Basic listing
./list_ec2.sh

# Detailed listing with launch times and security groups
./list_ec2.sh --detail
```

**Features:**
- Shows instance summary (running/stopped counts)
- Lists instances with basic details
- Optional detailed view with launch times
- Safe read-only operations

### `destroy_ec2.sh`
Instance destruction script for AWS EC2 instances. Safely terminates instances and optionally cleans up resources.

**Prerequisites:**
- AWS CLI installed and configured with profile `AdAgentServer`
- Proper AWS permissions for EC2 termination

**Usage:**
```bash
# Destroy by instance name
./destroy_ec2.sh adagent-server-dev

# Destroy by IP address
./destroy_ec2.sh 3.80.73.248
```

**Safety Features:**
- Confirmation prompt before destruction
- Instance details displayed before action
- Optional security group cleanup
- References `list_ec2.sh` for safe instance discovery

## Deployment Strategy

The deployment approach is designed for different targets and procedures:

1. **EC2 Deployment** (`deploy_ec2.sh`) - Full server deployment to AWS EC2
2. **EC2 Listing** (`list_ec2.sh`) - Safe instance discovery and information
3. **EC2 Destruction** (`destroy_ec2.sh`) - Safe instance termination and cleanup
4. **Future targets** - Additional scripts for Docker, other cloud providers, etc.

Each deployment script is self-contained and handles the complete deployment process for its specific target.

## Naming Conventions

All scripts follow consistent naming conventions:

### Instance Names
- **Pattern**: `adagent-server-{environment}`
- **Examples**: `adagent-server-dev`, `adagent-server-staging`, `adagent-server-prod`
- **Default**: `adagent-server-dev` (if no environment specified)
- **Usage**: `./deploy_ec2.sh dev` creates `adagent-server-dev`

### Key Pairs
- **Name**: `adagent-key-new` (current key pair)
- **File**: `~/.ssh/adagent-key-new.pem`
- **Note**: All scripts use this key pair consistently

### Security Groups
- **Name**: `adagent-sg`
- **Ports**: SSH (22), HTTP (80)
- **Description**: "Security group for AdAgent demo server"

### AWS Profile
- **Profile**: `AdAgentServer`
- **Region**: `us-east-1` (default)

## Notes

- All scripts use the `AdAgentServer` AWS profile
- Security groups are configured for SSH (22) and HTTP (80) only
- The server runs on port 80 and is accessible via HTTP
- Comprehensive error handling and logging is included
- Health checks and testing are performed automatically

## Files

- `test_server_comprehensive.py` - Main test script that validates all server endpoints
- `run_tests.sh` - Convenient shell script to run tests against different environments
- `README.md` - This documentation file

## Quick Start

**Always specify the exact server URL you want to test!**

### Test Local Development Server

```bash
cd server/scripts
./run_tests.sh http://localhost:8000
```

### Test Deployed Server

```bash
cd server/scripts
./run_tests.sh https://your-deployed-server.com
```

### Test Custom Server

```bash
cd server/scripts
./run_tests.sh http://192.168.1.100:8000
```

### Examples

```bash
# Test local development server
./run_tests.sh http://localhost:8000

# Test deployed production server
./run_tests.sh https://adagent-production.example.com

# Test staging server
./run_tests.sh https://adagent-staging.example.com

# Test server on specific port
./run_tests.sh http://localhost:9000
```

## What the Tests Cover

The comprehensive test suite validates:

### Basic Connectivity
- ✅ Health check endpoint (`/health`)
- ✅ Root endpoint (`/`)

### Data Endpoints
- ✅ Segments endpoint (`/segments`)
- ✅ Preferences endpoint (`/preferences/{adv_id}`)

### Core Functionality
- ✅ Parse endpoint (`/parse`) - Campaign text parsing
- ✅ Plan endpoint (`/plan`) - Campaign plan generation

### Agent System
- ✅ Agent status (`/agent/status`)
- ✅ Agent reset (`/agent/reset`)
- ✅ Agent process (`/agent/process`)
- ✅ Agent advance (`/agent/advance`)

### Chat System
- ✅ Chat endpoint (`/chat`)
- ✅ Chat reset (`/chat/reset`)

## Test Output

Tests generate:
- **Console output** with real-time status updates
- **JSON results file** with detailed test results and timestamps
- **Exit codes** (0 for success, 1 for failures)

## Example Output

```
🚀 Starting Comprehensive Server Tests
==================================================
✅ PASS Health Check
   Status: healthy
✅ PASS Root Endpoint
   Message: Neural CTV Campaign Management API
✅ PASS Segments Endpoint
   Found 15 segments
...

📊 TEST SUMMARY
==================================================
Total Tests: 11
Passed: 11
Failed: 0
Success Rate: 100.0%

🎉 ALL TESTS PASSED! Server is working correctly.
```

## Prerequisites

- Python 3.7+
- `requests` library (`pip install requests`)
- `curl` (for server reachability checks)

## Troubleshooting

### Server Not Running
If you get "Server is not reachable" errors:
1. Make sure your server is running
2. Check the URL in the test script
3. Verify firewall/network connectivity

### Missing Dependencies
If you get import errors:
```bash
pip install requests
```

### Permission Denied
If you get permission errors:
```bash
chmod +x run_tests.sh
chmod +x test_server_comprehensive.py
```

## Customization

### Adding New Tests
Edit `test_server_comprehensive.py` and add new test methods to the `ServerTester` class.

### Modifying Test Data
Update the sample data in the test methods to match your expected inputs/outputs.

### Changing URLs
Update the `LOCAL_URL` and `DEPLOYED_URL` variables in `run_tests.sh`.

## Integration

These tests can be integrated into:
- CI/CD pipelines
- Deployment validation
- Development workflow
- Monitoring systems

Use the JSON output files for automated validation and reporting. 