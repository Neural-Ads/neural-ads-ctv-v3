#!/bin/bash
echo "🚀 Starting AdAgent Backend (Development Mode)"
cd server
source .venv/bin/activate
export $(cat .env 2>/dev/null | xargs) 2>/dev/null || true
export $(cat .env.development 2>/dev/null | xargs) 2>/dev/null || true
uvicorn main:app --reload --host 198.179.69.83 --port 8000
