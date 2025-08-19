#!/bin/bash
echo "🚀 Starting Full AdAgent Development Stack"
echo "Backend will run on: http://198.179.69.83:8000"
echo "Frontend will run on: http://198.179.69.83:8081"
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
