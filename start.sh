#!/bin/bash

# Neural Ads CTV Platform Startup Script
# Backend: port 8000, Frontend: port 8081

echo "🚀 Starting Neural Ads CTV Platform..."
echo "Backend will run on: http://198.179.69.83:8000"
echo "Frontend will run on: http://198.179.69.83:8081"
echo ""

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "python3.*main.py" 2>/dev/null || true
pkill -f "uvicorn.*main" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Wait a moment for processes to terminate
sleep 2

# Start backend server
echo "🔧 Starting backend server (port 8000)..."
cd server
python3 main.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 3

# Start frontend server
echo "🎨 Starting frontend server (port 8081)..."
cd ../client
npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Store PIDs for later cleanup
echo $BACKEND_PID > ../backend.pid
echo $FRONTEND_PID > ../frontend.pid

echo ""
echo "✅ Services started successfully!"
echo "🌐 Frontend: http://198.179.69.83:8081"
echo "⚙️  Backend:  http://198.179.69.83:8000"
echo "📊 API Docs: http://198.179.69.83:8000/docs"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    
    if [ -f ../backend.pid ]; then
        BACKEND_PID=$(cat ../backend.pid)
        kill $BACKEND_PID 2>/dev/null || true
        rm ../backend.pid
    fi
    
    if [ -f ../frontend.pid ]; then
        FRONTEND_PID=$(cat ../frontend.pid)
        kill $FRONTEND_PID 2>/dev/null || true
        rm ../frontend.pid
    fi
    
    # Additional cleanup
    pkill -f "python3.*main.py" 2>/dev/null || true
    pkill -f "uvicorn.*main" 2>/dev/null || true
    pkill -f "npm.*dev" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    
    echo "✅ Services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for processes to finish
wait
