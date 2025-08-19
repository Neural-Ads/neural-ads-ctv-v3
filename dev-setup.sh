#!/bin/bash

# AdAgent Development Environment Setup
# This script sets up your local development environment

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}🚀 $1${NC}"
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

print_step "Setting up AdAgent Development Environment"
echo "================================================"

# Step 1: Check prerequisites
print_step "Checking Prerequisites"
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is required but not installed"
    exit 1
fi

if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is required but not installed"
    exit 1
fi

print_success "All prerequisites found"

# Step 2: Setup Backend
print_step "Setting up Backend Dependencies"
cd server

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    print_step "Creating Python virtual environment"
    python3 -m venv .venv
fi

print_step "Activating virtual environment and installing dependencies"
source .venv/bin/activate
pip install -r requirements.txt

print_success "Backend dependencies installed"

# Step 3: Setup Frontend
print_step "Setting up Frontend Dependencies"
cd ../client

if [ ! -d "node_modules" ]; then
    print_step "Installing npm dependencies"
    npm install
else
    print_success "Node modules already installed"
fi

print_success "Frontend dependencies installed"

# Step 4: Create development configuration
print_step "Creating development configuration files"

cd ..

# Create environment file for backend (if not exists)
if [ ! -f "server/.env.development" ]; then
    cat > server/.env.development << 'EOF'
# Development Environment Variables
OPENAI_API_KEY=your_openai_api_key_here
AGENT_MODEL=gpt-4o-mini
AGENT_TEMPERATURE=0.7
AGENT_MAX_TOKENS=2000
DEBUG=True
ENVIRONMENT=development
EOF
    print_success "Created server/.env.development"
else
    print_warning "server/.env.development already exists"
fi

# Create development scripts
print_step "Creating development helper scripts"

# Backend dev script
cat > dev-backend.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting AdAgent Backend (Development Mode)"
cd server
source .venv/bin/activate
export $(cat .env.development | xargs)
uvicorn main:app --reload --host 127.0.0.1 --port 8000
EOF

# Frontend dev script  
cat > dev-frontend.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting AdAgent Frontend (Development Mode)"
cd client
npm run dev
EOF

# Combined dev script
cat > dev-start.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Full AdAgent Development Stack"
echo "Backend will run on: http://127.0.0.1:8000"
echo "Frontend will run on: http://127.0.0.1:5173"
echo ""
echo "Opening backend and frontend in separate terminal tabs..."

# Start backend in background
echo "Starting backend..."
./dev-backend.sh &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "Starting frontend..."
./dev-frontend.sh &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
EOF

chmod +x dev-backend.sh dev-frontend.sh dev-start.sh

print_success "Created development scripts:"
print_success "  - dev-backend.sh: Start backend only"
print_success "  - dev-frontend.sh: Start frontend only" 
print_success "  - dev-start.sh: Start both backend and frontend"

# Step 5: Setup development environment variables for frontend
print_step "Configuring frontend for local development"

cd client

# Create or update .env.development.local
cat > .env.development.local << 'EOF'
# Local Development Environment
VITE_API_URL=http://127.0.0.1:8000
VITE_APP_ENV=development
VITE_APP_NAME=Neural Ads CTV Platform (Dev)
VITE_APP_VERSION=1.0.0-dev
VITE_DEBUG=true
EOF

print_success "Created client/.env.development.local"

cd ..

print_step "Development Setup Complete!"
echo ""
print_success "🎉 Your AdAgent development environment is ready!"
echo ""
echo "📋 Next Steps:"
echo "  1. Add your OpenAI API key to server/.env.development"
echo "  2. Run './dev-start.sh' to start both backend and frontend"
echo "  3. Visit http://127.0.0.1:5173 to see your app"
echo ""
echo "🔧 Individual Commands:"
echo "  Backend only: ./dev-backend.sh"
echo "  Frontend only: ./dev-frontend.sh" 
echo "  Run tests: cd server/scripts && python3 test_server_comprehensive.py --url http://localhost:8000"
echo ""
print_warning "Don't forget to set your OPENAI_API_KEY in server/.env.development!" 