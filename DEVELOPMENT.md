# AdAgent Development Guide

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)
```bash
./dev-setup.sh
```

### Option 2: Manual Setup

#### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

#### Backend Setup
```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

#### Frontend Setup  
```bash
cd client
npm install
```

## 🛠️ Development Workflow

### Starting Development Servers

#### Start Both (Backend + Frontend)
```bash
./dev-start.sh
```
- Backend: http://127.0.0.1:8000
- Frontend: http://127.0.0.1:5173

#### Start Individual Services
```bash
./dev-backend.sh    # Backend only
./dev-frontend.sh   # Frontend only
```

### Environment Configuration

#### Backend Environment (`server/.env.development`)
```env
OPENAI_API_KEY=your_actual_openai_key
AGENT_MODEL=gpt-4o-mini
AGENT_TEMPERATURE=0.7
AGENT_MAX_TOKENS=2000
DEBUG=True
ENVIRONMENT=development
```

#### Frontend Environment (`client/.env.development.local`)
```env
VITE_API_URL=http://127.0.0.1:8000
VITE_APP_ENV=development
VITE_DEBUG=true
```

## 🧪 Testing

### Backend API Tests
```bash
cd server/scripts
python3 test_server_comprehensive.py --url http://localhost:8000
```

### Frontend Tests (Coming Soon)
```bash
cd client
npm run test
```

## 📁 Project Structure

```
AdAgentAshuCheckout/
├── server/                 # FastAPI Backend
│   ├── agents/            # AI Agent System  
│   ├── models/            # Pydantic Models
│   ├── scripts/           # Testing & Utilities
│   ├── main.py           # FastAPI App
│   └── requirements.txt   # Python Dependencies
├── client/                # React Frontend
│   ├── src/
│   │   ├── components/   # React Components
│   │   ├── api.ts       # API Client
│   │   └── App.tsx      # Main App
│   └── package.json     # Node Dependencies
├── dev-setup.sh          # Development Setup
├── dev-backend.sh        # Backend Startup
├── dev-frontend.sh       # Frontend Startup
└── dev-start.sh         # Full Stack Startup
```

## 🔄 Development vs Production

| Environment | Backend | Frontend | Database | AI Models |
|------------|---------|----------|----------|-----------|
| **Local Dev** | http://127.0.0.1:8000 | http://127.0.0.1:5173 | Local Files | OpenAI API |
| **Production** | AWS EC2/Lambda | AWS Amplify | AWS RDS | OpenAI API |

## 🚀 Feature Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2. Develop Locally
- Start development servers: `./dev-start.sh`
- Make your changes
- Test with: `cd server/scripts && python3 test_server_comprehensive.py --url http://localhost:8000`

### 3. Test Integration
- Test backend API endpoints
- Test frontend components
- Verify full workflow

### 4. Deploy to Staging/Production
```bash
# Deploy client to Amplify
./deploy-client.sh

# Deploy server (follow deployment docs)
cd server/scripts
./deploy_ec2_with_alb.sh
```

## 🔧 Common Development Tasks

### Adding New API Endpoints
1. Add route in `server/main.py`
2. Create/update models in `server/models/`
3. Add tests in `server/scripts/test_server_comprehensive.py`
4. Update frontend API client in `client/src/api.ts`

### Adding New React Components
1. Create component in `client/src/components/`
2. Add to main app in `client/src/App.tsx`
3. Update API calls to use local backend

### Adding New AI Agents
1. Create agent in `server/agents/`
2. Update orchestrator in `server/agents/multi_agent_orchestrator.py`
3. Add tests for new agent functionality

## 🐛 Troubleshooting

### Server Won't Start
```bash
# Check if you're in the right directory
cd server
# Check dependencies
pip install -r requirements.txt
# Check environment variables
source .env.development
```

### Frontend Can't Connect to Backend
- Ensure backend is running on http://127.0.0.1:8000
- Check `client/.env.development.local` has correct API URL
- Verify CORS settings in `server/main.py`

### Tests Failing
```bash
# Install test dependencies
pip install requests
# Run from correct directory
cd server/scripts
```

## 🎯 Next Steps for Enhancement

### Recommended Development Additions
1. **Hot Reloading**: ✅ Already configured
2. **Automated Testing**: ✅ Comprehensive backend tests ready
3. **Frontend Testing**: Set up Jest/Vitest + React Testing Library
4. **Database Integration**: Add PostgreSQL for development
5. **Docker Setup**: Containerize for consistent environments
6. **CI/CD Pipeline**: GitHub Actions for testing/deployment

### Architecture Enhancements
1. **State Management**: Add Redux Toolkit or Zustand
2. **Error Handling**: Comprehensive error boundaries
3. **Logging**: Structured logging with correlation IDs
4. **Caching**: Redis for API response caching
5. **Authentication**: Add JWT-based authentication
6. **Real-time Updates**: WebSocket integration

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React + Vite Guide](https://vitejs.dev/guide/)
- [AWS Amplify Docs](https://docs.amplify.aws/)
- [OpenAI API Reference](https://platform.openai.com/docs/)

---

**Happy Development! 🎉**

For questions or issues, check the troubleshooting section or create an issue in the repository. 