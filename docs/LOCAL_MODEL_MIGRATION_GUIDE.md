# 🏠 Local AI Model Migration Guide

## 📋 Overview

This guide provides comprehensive instructions for migrating the Neural Ads CTV platform from OpenAI's cloud-based models to locally hosted AI models. This migration reduces costs, improves privacy, decreases latency, and eliminates external API dependencies.

---

## 🎯 **Migration Benefits**

### **Cost Savings**
- **Current Cost**: ~$0.02-0.10 per campaign workflow
- **Local Cost**: Only hardware/electricity costs
- **Projected Savings**: 90-95% reduction in AI inference costs

### **Performance Improvements**
- **Latency Reduction**: 1-3 seconds → 0.1-0.5 seconds
- **Availability**: 99.9%+ uptime (self-hosted)
- **Scalability**: No API rate limits

### **Privacy & Security**
- **Data Privacy**: No data sent to external APIs
- **Compliance**: Full control over data processing
- **Security**: Reduced attack surface

---

## 🔧 **Local Model Options**

### **Option 1: Ollama (Recommended)**
**Best for**: Development, small-medium deployments

```bash
# Installation
curl -fsSL https://ollama.com/install.sh | sh

# Model Selection (choose based on hardware)
ollama pull llama3.1:8b      # 4.7GB - Good for 16GB+ RAM
ollama pull llama3.1:13b     # 7.3GB - Good for 32GB+ RAM  
ollama pull llama3.1:70b     # 40GB - Needs 64GB+ RAM
ollama pull codellama:13b    # Better for code/JSON generation
ollama pull mistral:7b       # Alternative, smaller model

# Start server
ollama serve  # http://localhost:11434
```

**Pros**: Easy setup, OpenAI-compatible API, automatic model management  
**Cons**: Limited enterprise features, basic load balancing

### **Option 2: LM Studio**
**Best for**: GUI users, experimentation

- **Download**: https://lmstudio.ai/
- **Features**: Visual model management, built-in chat interface
- **API**: OpenAI-compatible server on http://localhost:1234

**Pros**: User-friendly GUI, model comparison tools  
**Cons**: Less suitable for production deployment

### **Option 3: vLLM (Production)**
**Best for**: High-performance production deployments

```bash
pip install vllm
# Requires CUDA/ROCm setup for GPU acceleration
```

**Pros**: Highest performance, advanced batching, enterprise features  
**Cons**: Complex setup, requires GPU knowledge

### **Option 4: Text Generation WebUI**
**Best for**: Advanced users, custom model formats

```bash
git clone https://github.com/oobabooga/text-generation-webui
# Supports many model formats and fine-tuning
```

---

## 💻 **Hardware Requirements**

### **Model Size vs. Hardware**

| Model Size | RAM Required | GPU VRAM | Performance | Use Case |
|------------|-------------|----------|-------------|----------|
| **7B-8B** | 16GB | 8GB+ | Good | Development, light production |
| **13B** | 32GB | 16GB+ | Better | Production, complex tasks |
| **70B** | 64GB+ | 48GB+ | Best | Enterprise, highest quality |

### **Recommended Configurations**

**Development Setup**:
- CPU: 8+ cores (Intel i7/AMD Ryzen 7+)
- RAM: 32GB
- GPU: RTX 4060/4070 (12GB VRAM) or better
- Storage: 1TB SSD

**Production Setup**:
- CPU: 16+ cores (Intel Xeon/AMD EPYC)
- RAM: 64GB+
- GPU: RTX 4090/A6000 (24GB VRAM) or better
- Storage: 2TB NVMe SSD

---

## 🚀 **Implementation Steps**

### **Phase 1: Environment Setup**

#### **1.1 Create Configuration Structure**
```bash
# Create configuration directory
mkdir -p server/config

# Create environment file
cat > server/.env << 'EOF'
# Model Configuration
USE_LOCAL_MODEL=true
LOCAL_MODEL_BASE_URL=http://localhost:11434/v1  # Ollama
# LOCAL_MODEL_BASE_URL=http://localhost:1234/v1  # LM Studio

# Model Selection
LOCAL_MODEL_NAME=llama3.1:8b
LOCAL_CONVERSATION_MODEL=llama3.1:8b
LOCAL_REASONING_MODEL=llama3.1:13b
LOCAL_GENERATION_MODEL=codellama:13b

# Performance Tuning
LOCAL_MODEL_TEMPERATURE=0.3
LOCAL_MODEL_MAX_TOKENS=500
LOCAL_MODEL_TOP_P=0.9

# OpenAI Fallback (optional)
OPENAI_API_KEY=your_openai_key_here
ENABLE_OPENAI_FALLBACK=false
EOF
```

#### **1.2 Update Dependencies**
```bash
# Add to requirements.txt
echo "python-dotenv>=1.0.0" >> server/requirements.txt

# Install updated dependencies
pip install -r server/requirements.txt
```

### **Phase 2: Model Configuration System**

#### **2.1 Create Model Configuration Manager**
```python
# File: server/config/model_config.py
import os
import logging
from typing import Optional, Dict, Any
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

class ModelConfig:
    """Centralized model configuration and client management."""
    
    def __init__(self):
        # Configuration
        self.use_local = os.getenv("USE_LOCAL_MODEL", "false").lower() == "true"
        self.local_base_url = os.getenv("LOCAL_MODEL_BASE_URL", "http://localhost:11434/v1")
        self.enable_fallback = os.getenv("ENABLE_OPENAI_FALLBACK", "true").lower() == "true"
        
        # Model mappings
        self.model_map = {
            "conversation": os.getenv("LOCAL_CONVERSATION_MODEL", "llama3.1:8b"),
            "reasoning": os.getenv("LOCAL_REASONING_MODEL", "llama3.1:8b"),
            "generation": os.getenv("LOCAL_GENERATION_MODEL", "llama3.1:8b"),
            "parsing": os.getenv("LOCAL_PARSING_MODEL", "llama3.1:8b"),
            "default": os.getenv("LOCAL_MODEL_NAME", "llama3.1:8b")
        }
        
        # Performance settings
        self.default_params = {
            "temperature": float(os.getenv("LOCAL_MODEL_TEMPERATURE", "0.3")),
            "max_tokens": int(os.getenv("LOCAL_MODEL_MAX_TOKENS", "500")),
            "top_p": float(os.getenv("LOCAL_MODEL_TOP_P", "0.9")),
            "frequency_penalty": 0.1,
            "presence_penalty": 0.1
        }
        
        # Initialize clients
        self.local_client = None
        self.openai_client = None
        self._initialize_clients()
    
    def _initialize_clients(self):
        """Initialize AI clients based on configuration."""
        if self.use_local:
            try:
                self.local_client = AsyncOpenAI(
                    base_url=self.local_base_url,
                    api_key="ollama"  # Ollama doesn't need real API key
                )
                logger.info(f"Local model client initialized: {self.local_base_url}")
            except Exception as e:
                logger.error(f"Failed to initialize local client: {e}")
        
        if self.enable_fallback or not self.use_local:
            openai_key = os.getenv("OPENAI_API_KEY")
            if openai_key:
                self.openai_client = AsyncOpenAI(api_key=openai_key)
                logger.info("OpenAI client initialized as fallback")
    
    def get_client(self, prefer_local: bool = True) -> AsyncOpenAI:
        """Get appropriate client based on preferences and availability."""
        if prefer_local and self.local_client and self.use_local:
            return self.local_client
        elif self.openai_client:
            return self.openai_client
        else:
            raise RuntimeError("No AI client available")
    
    def get_model_name(self, model_type: str = "default", use_local: bool = None) -> str:
        """Get model name based on type and local/cloud preference."""
        if use_local is None:
            use_local = self.use_local
        
        if use_local:
            return self.model_map.get(model_type, self.model_map["default"])
        else:
            # OpenAI model mappings
            openai_models = {
                "conversation": "gpt-4",
                "reasoning": "gpt-4o-mini",
                "generation": "gpt-4o-mini",
                "parsing": "gpt-4o-mini",
                "default": "gpt-4o-mini"
            }
            return openai_models.get(model_type, openai_models["default"])
    
    def get_model_params(self, **overrides) -> Dict[str, Any]:
        """Get model parameters with optional overrides."""
        params = self.default_params.copy()
        params.update(overrides)
        return params

# Global configuration instance
model_config = ModelConfig()
```

#### **2.2 Create Base Agent Class**
```python
# File: server/agents/base_agent.py
import asyncio
import logging
import time
from typing import Dict, List, Any, Optional
from openai import AsyncOpenAI
from config.model_config import model_config

logger = logging.getLogger(__name__)

class BaseAgent:
    """Base class for all AI agents with local model support."""
    
    def __init__(self, agent_name: str, model_type: str = "default"):
        self.agent_name = agent_name
        self.model_type = model_type
        self.client = model_config.get_client()
        self.model_name = model_config.get_model_name(model_type)
        
    async def make_request(self, 
                          messages: List[Dict[str, str]], 
                          **kwargs) -> str:
        """Make AI model request with fallback and error handling."""
        
        # Get model parameters
        params = model_config.get_model_params(**kwargs)
        
        # Try local model first
        if model_config.use_local:
            try:
                return await self._make_local_request(messages, params)
            except Exception as e:
                logger.warning(f"{self.agent_name} local request failed: {e}")
                if not model_config.enable_fallback:
                    raise
        
        # Fallback to OpenAI
        if model_config.openai_client:
            logger.info(f"{self.agent_name} falling back to OpenAI")
            return await self._make_openai_request(messages, params)
        
        raise RuntimeError(f"No available AI client for {self.agent_name}")
    
    async def _make_local_request(self, messages: List[Dict[str, str]], params: Dict[str, Any]) -> str:
        """Make request to local model."""
        start_time = time.time()
        
        response = await self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            **params
        )
        
        duration = time.time() - start_time
        logger.info(f"{self.agent_name} local request completed in {duration:.2f}s")
        
        return response.choices[0].message.content
    
    async def _make_openai_request(self, messages: List[Dict[str, str]], params: Dict[str, Any]) -> str:
        """Make request to OpenAI API."""
        start_time = time.time()
        
        # Use OpenAI model names
        openai_model = model_config.get_model_name(self.model_type, use_local=False)
        
        response = await model_config.openai_client.chat.completions.create(
            model=openai_model,
            messages=messages,
            **params
        )
        
        duration = time.time() - start_time
        logger.info(f"{self.agent_name} OpenAI request completed in {duration:.2f}s")
        
        return response.choices[0].message.content
```

### **Phase 3: Agent Migration**

#### **3.1 Update ConversationalAgent**
```python
# File: server/agents/conversational_agent.py (partial update)
from .base_agent import BaseAgent
from config.model_config import model_config

class ConversationalAgent(BaseAgent):
    def __init__(self):
        super().__init__("ConversationalAgent", "conversation")
        # ... existing initialization code ...
    
    async def _handle_conversation(self, message: str, intent: str, context: Dict = None) -> Dict[str, Any]:
        """Handle general conversation using local or cloud models."""
        try:
            # ... existing context preparation ...
            
            # Use base class request method with fallback
            assistant_response = await self.make_request(
                messages=messages,
                max_tokens=150,
                temperature=0.7
            )
            
            # ... rest of existing code ...
```

#### **3.2 Update Other Agents**
Similar pattern for all agents:
- Inherit from `BaseAgent`
- Replace direct OpenAI calls with `self.make_request()`
- Update model selection logic

### **Phase 4: Local Model Optimization**

#### **4.1 Prompt Engineering for Local Models**
```python
# Local models need more explicit instructions
LOCAL_SYSTEM_PROMPTS = {
    "conversation": """You are Peggy, an expert AI assistant for CTV campaigns.

CRITICAL INSTRUCTIONS:
- Be concise and direct
- Always provide helpful, accurate responses
- Use the provided context data
- Format responses clearly

Your expertise includes campaign planning, audience analysis, and media strategy.""",
    
    "parsing": """You are a data extraction specialist.

TASK: Extract structured data from campaign briefs.

REQUIREMENTS:
- Return ONLY valid JSON
- Include all requested fields
- Use null for missing data
- Be precise and accurate""",
    
    "generation": """You are a campaign generation expert.

TASK: Create detailed campaign components.

FORMAT: Return structured data as requested
QUALITY: Ensure all generated content is realistic and actionable
CONSISTENCY: Maintain consistent formatting throughout"""
}
```

#### **4.2 Performance Monitoring**
```python
# File: server/utils/model_monitor.py
import time
import logging
from collections import defaultdict
from typing import Dict, Any

class ModelPerformanceMonitor:
    def __init__(self):
        self.metrics = defaultdict(list)
        self.logger = logging.getLogger(__name__)
    
    def record_request(self, agent_name: str, model_type: str, 
                      duration: float, token_count: int, success: bool):
        """Record model request metrics."""
        self.metrics[f"{agent_name}_{model_type}"].append({
            "duration": duration,
            "tokens": token_count,
            "success": success,
            "timestamp": time.time()
        })
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary for all agents."""
        summary = {}
        for key, records in self.metrics.items():
            if records:
                successful = [r for r in records if r["success"]]
                summary[key] = {
                    "total_requests": len(records),
                    "success_rate": len(successful) / len(records),
                    "avg_duration": sum(r["duration"] for r in successful) / len(successful) if successful else 0,
                    "avg_tokens": sum(r["tokens"] for r in successful) / len(successful) if successful else 0
                }
        return summary

# Global monitor instance
performance_monitor = ModelPerformanceMonitor()
```

---

## 🔄 **Migration Phases**

### **Phase 1: Development Setup (Week 1)**
- [ ] Install Ollama and test models
- [ ] Create configuration system
- [ ] Update one agent (ConversationalAgent)
- [ ] Test basic functionality

### **Phase 2: Core Agent Migration (Week 2)**
- [ ] Update all agents to use BaseAgent
- [ ] Implement fallback mechanisms  
- [ ] Add performance monitoring
- [ ] Comprehensive testing

### **Phase 3: Optimization (Week 3)**
- [ ] Optimize prompts for local models
- [ ] Implement caching strategies
- [ ] Performance tuning
- [ ] Load testing

### **Phase 4: Production Deployment (Week 4)**
- [ ] Production hardware setup
- [ ] Security hardening
- [ ] Monitoring and alerting
- [ ] Documentation and training

---

## 📊 **Testing & Validation**

### **Model Quality Comparison**
```python
# File: server/tests/model_comparison.py
import asyncio
from agents.conversational_agent import ConversationalAgent

async def compare_models():
    """Compare local vs OpenAI model outputs."""
    agent = ConversationalAgent()
    
    test_queries = [
        "What are Amazon's advertising preferences?",
        "Plan a $250K campaign for automotive",
        "Find similar advertisers to Tesla"
    ]
    
    for query in test_queries:
        # Test local model
        local_response = await agent.process_message(query, use_local=True)
        
        # Test OpenAI
        openai_response = await agent.process_message(query, use_local=False)
        
        print(f"Query: {query}")
        print(f"Local: {local_response}")
        print(f"OpenAI: {openai_response}")
        print("-" * 50)

if __name__ == "__main__":
    asyncio.run(compare_models())
```

### **Performance Benchmarking**
```bash
# Load testing script
python -m pytest server/tests/performance_tests.py -v
```

---

## 🛡️ **Security Considerations**

### **Local Model Security**
- **Network Isolation**: Run models on isolated networks
- **Access Control**: Restrict model server access
- **Data Encryption**: Encrypt model files and communications
- **Audit Logging**: Log all model interactions

### **Configuration Security**
```bash
# Secure environment file permissions
chmod 600 server/.env

# Use secrets management for production
export LOCAL_MODEL_API_KEY=$(cat /etc/secrets/model_api_key)
```

---

## 🚨 **Troubleshooting Guide**

### **Common Issues**

#### **Model Loading Errors**
```bash
# Check model availability
ollama list

# Re-pull model if corrupted
ollama pull llama3.1:8b --force

# Check disk space
df -h
```

#### **Memory Issues**
```bash
# Monitor memory usage
htop

# Reduce model size or increase swap
sudo swapon --show
```

#### **Performance Issues**
```bash
# Check GPU utilization
nvidia-smi

# Monitor model server logs
journalctl -u ollama -f
```

### **Fallback Activation**
If local models fail, the system automatically falls back to OpenAI (if enabled):
```python
# Force fallback for testing
export USE_LOCAL_MODEL=false
export ENABLE_OPENAI_FALLBACK=true
```

---

## 📈 **Success Metrics**

### **Key Performance Indicators**
- **Response Time**: < 1 second for simple queries
- **Accuracy**: > 90% compared to OpenAI baseline
- **Uptime**: > 99.5% availability
- **Cost Reduction**: > 90% vs OpenAI costs

### **Monitoring Dashboard**
Create a monitoring dashboard tracking:
- Model response times
- Success/failure rates  
- Resource utilization
- Cost savings
- User satisfaction

---

## 🔮 **Future Enhancements**

### **Advanced Features**
- **Model Fine-tuning**: Train models on campaign data
- **Multi-model Ensemble**: Combine multiple models for better accuracy
- **Dynamic Model Selection**: Choose best model per task
- **Edge Deployment**: Deploy models closer to users

### **Integration Opportunities**
- **Custom Model Training**: Domain-specific model development
- **Real-time Learning**: Update models based on campaign performance
- **Multi-modal Support**: Add support for images and documents
- **Voice Interface**: Speech-to-text integration

---

## 📞 **Support & Resources**

### **Documentation Links**
- [Ollama Documentation](https://ollama.ai/docs)
- [LM Studio Guide](https://lmstudio.ai/docs)
- [vLLM Documentation](https://docs.vllm.ai/)
- [Model Performance Comparison](https://huggingface.co/spaces/lmsys/chatbot-arena-leaderboard)

### **Community Resources**
- [Ollama Discord](https://discord.gg/ollama)
- [Local LLM Reddit](https://reddit.com/r/LocalLLaMA)
- [Hugging Face Forums](https://discuss.huggingface.co/)

---

*Last Updated: January 20, 2025*  
*Version: 1.0*  
*Migration Guide by: AI Development Team*
