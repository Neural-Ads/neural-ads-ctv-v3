#!/bin/bash

# Neural Ads CTV Platform Stop Script

echo "🛑 Stopping Neural Ads CTV Platform..."

# Kill processes by PID files
if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    kill $BACKEND_PID 2>/dev/null || true
    rm backend.pid
    echo "✅ Backend stopped (PID: $BACKEND_PID)"
fi

if [ -f frontend.pid ]; then
    FRONTEND_PID=$(cat frontend.pid)
    kill $FRONTEND_PID 2>/dev/null || true
    rm frontend.pid
    echo "✅ Frontend stopped (PID: $FRONTEND_PID)"
fi

# Additional cleanup - kill any remaining processes
echo "🧹 Cleaning up any remaining processes..."
pkill -f "python3.*main.py" 2>/dev/null || true
pkill -f "uvicorn.*main" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

echo "✅ All services stopped successfully!"
