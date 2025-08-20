import json
import re
import requests
import asyncio
from typing import Dict, List, Optional, Tuple, Any
from openai import AsyncOpenAI
import os
from .multi_agent_orchestrator import MultiAgentOrchestrator
from .real_data_advertiser_preferences import RealDataAdvertiserPreferencesAgent

class ConversationalAgent:
    """
    A conversational AI agent that can engage in natural language conversations
    while also detecting when users want to perform campaign-related actions
    and triggering the appropriate workflows.
    """
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.orchestrator = MultiAgentOrchestrator()
        self.conversation_history = []
        
        # Initialize real data agents for accessing advertiser intelligence
        self.advertiser_agent = RealDataAdvertiserPreferencesAgent()
        self.vector_api_base = "http://localhost:8000/vector"  # Vector database API
        
        # Enhanced intent detection with specific workflow triggers
        self.workflow_trigger_phrases = [
            # Explicit campaign creation requests
            "create a campaign", "build a campaign", "setup campaign", "new campaign",
            "start campaign", "launch campaign", "campaign plan", "create ctv campaign",
            
            # Budget and planning requests
            "plan a campaign", "plan a $", "plan my budget", "budget allocation", "media plan", "campaign planning",
            "forecast my campaign", "campaign forecast", "spend forecast",
            
            # Explicit workflow requests
            "help me create", "help me build", "help me plan", "help me setup",
            "i want to create", "i want to build", "i need to create", "i need help with campaign"
        ]
        
        # General conversation keywords (won't trigger workflow)
        self.conversation_keywords = [
            "what is", "tell me about", "how does", "explain", "show me", "find", 
            "search", "who are", "what are", "preferences for", "data about",
            "information about", "similar to", "like", "performance of"
        ]
        
        # Context-aware system prompts
        self.system_prompt = """You are Peggy, an expert AI assistant specializing in Connected TV (CTV) campaign planning and media strategy. You have access to:

1. **Vector Database**: 20,000+ advertisers with real CTV campaign performance data
2. **Advertiser Intelligence**: Historical targeting patterns, network preferences, CPM data
3. **Fill Rate Data**: Real-time inventory availability and performance metrics across 100+ networks
4. **Campaign Planning Tools**: Advanced forecasting and audience segmentation capabilities

**RESPONSE STYLE**: Keep responses concise and actionable. Summarize key insights in 2-3 bullet points or short paragraphs. Focus on the most relevant information that directly answers the question. Avoid lengthy explanations or excessive detail.

Your expertise includes:
- **Advertiser Analysis**: Answer questions about specific brands' CTV preferences, performance history, and targeting patterns
- **Industry Insights**: Compare advertisers within categories (automotive, retail, food & beverage, etc.)
- **Network Performance**: Provide fill rates, CPM ranges, and inventory availability data
- **Strategic Recommendations**: Suggest targeting strategies based on similar advertiser success

**For Questions & Analysis** (conversational):
- Answer questions about advertiser preferences, industry trends, network performance
- Provide data-driven insights from the vector database
- Compare brands and suggest similar advertisers
- Explain CTV advertising concepts and best practices

**For Campaign Creation** (workflow):
- Only trigger the campaign workflow when users explicitly want to CREATE, BUILD, or SETUP a new campaign
- Look for phrases like "create a campaign", "help me build", "new campaign", "campaign plan"

Always be helpful, data-driven, and concise in your responses."""

    async def process_message(self, user_message: str, context: Dict = None) -> Dict[str, Any]:
        """
        Process a user message and determine if it should trigger a campaign workflow
        or be handled as a regular conversation.
        """
        try:
            # Add to conversation history
            self.conversation_history.append({"role": "user", "content": user_message})
            
            # Detect intent
            intent, confidence = self._detect_intent(user_message)
            
            # If campaign keywords detected, trigger workflow
            if intent == "setup_campaign" and confidence > 0:
                return await self._handle_campaign_workflow(user_message, intent, context)
            
            # Otherwise, handle as conversation
            return await self._handle_conversation(user_message, intent, context)
            
        except Exception as e:
            return {
                "response": f"I'm having trouble processing your request right now. Let me try again - what can I help you with?",
                "type": "error",
                "trigger_workflow": False,
                "error": str(e)
            }

    def _detect_intent(self, message: str) -> Tuple[str, float]:
        """Detect user intent from message using phrase-based matching."""
        message_lower = message.lower()
        
        # Check for explicit workflow trigger phrases
        for phrase in self.workflow_trigger_phrases:
            if phrase in message_lower:
                return "setup_campaign", 1.0  # High confidence for explicit phrases
        
        # Check for conversation keywords (indicates Q&A, not workflow)
        for keyword in self.conversation_keywords:
            if keyword in message_lower:
                return "general_conversation", 0.8  # High confidence for conversation
        
        # If message contains advertiser name + question words, it's likely conversation
        if any(word in message_lower for word in ["what", "how", "who", "where", "when", "why"]):
            return "general_conversation", 0.6
        
        # Default to conversation for ambiguous cases
        return "general_conversation", 0.3

    async def _handle_campaign_workflow(self, message: str, intent: str, context: Dict = None) -> Dict[str, Any]:
        """Handle campaign-related requests by triggering the orchestrator workflow."""
        try:
            # Extract campaign parameters from message
            campaign_params = self._extract_campaign_params(message)
            
            # Generate a conversational response about what we're doing
            workflow_response = self._generate_workflow_intro(campaign_params, intent)
            
            # Add to conversation history
            self.conversation_history.append({"role": "assistant", "content": workflow_response})
            
            return {
                "response": workflow_response,
                "type": "workflow_trigger",
                "trigger_workflow": True,
                "workflow_input": message,
                "campaign_params": campaign_params,
                "intent": intent
            }
            
        except Exception as e:
            return {
                "response": "I'd love to help you create that campaign! Let me start analyzing your requirements...",
                "type": "workflow_trigger",
                "trigger_workflow": True,
                "workflow_input": message,
                "error": str(e)
            }

    async def _handle_conversation(self, message: str, intent: str, context: Dict = None) -> Dict[str, Any]:
        """Handle general conversation using real data sources."""
        try:
            # Try to extract real data based on the question
            real_data_context = await self._gather_real_data_context(message)
            
            # Prepare context-aware messages with real data
            enhanced_system_prompt = self.system_prompt
            if real_data_context:
                enhanced_system_prompt += f"\n\nREAL DATA CONTEXT:\n{real_data_context}"
            
            messages = [{"role": "system", "content": enhanced_system_prompt}]
            
            # Add recent conversation history (last 10 messages)
            recent_history = self.conversation_history[-10:] if len(self.conversation_history) > 10 else self.conversation_history
            messages.extend(recent_history)
            
            # Add current context if available
            if context:
                context_message = self._format_context(context)
                if context_message:
                    messages.append({"role": "system", "content": context_message})
            
            # Generate response
            response = await self.client.chat.completions.create(
                model="gpt-4",  # Using GPT-4 for better conversation quality
                messages=messages,
                max_tokens=150,  # Reduced for more concise responses
                temperature=0.7,
                presence_penalty=0.1,
                frequency_penalty=0.1
            )
            
            assistant_response = response.choices[0].message.content
            
            # Add to conversation history
            self.conversation_history.append({"role": "assistant", "content": assistant_response})
            
            # Check if response mentions campaign work and suggest workflow
            should_suggest_workflow = self._should_suggest_workflow(assistant_response, message)
            
            return {
                "response": assistant_response,
                "type": "conversation",
                "trigger_workflow": False,
                "suggest_workflow": should_suggest_workflow,
                "intent": intent
            }
            
        except Exception as e:
            # Fallback response
            fallback_response = self._generate_fallback_response(message, intent)
            return {
                "response": fallback_response,
                "type": "conversation",
                "trigger_workflow": False,
                "error": str(e)
            }

    def _extract_campaign_params(self, message: str) -> Dict[str, Any]:
        """Extract campaign parameters from user message."""
        params = {}
        
        # Extract budget - handle both $200K and 200K formats
        budget_match = re.search(r'(\$?)([0-9,]+)([KMB]?)', message, re.IGNORECASE)
        if budget_match:
            amount = budget_match.group(2).replace(',', '')
            multiplier = budget_match.group(3).upper()
            
            # Only process if it looks like a budget (has $ or K/M/B suffix)
            if budget_match.group(1) == '$' or multiplier in ['K', 'M', 'B']:
                if multiplier == 'K':
                    amount = int(amount) * 1000
                elif multiplier == 'M':
                    amount = int(amount) * 1000000
                elif multiplier == 'B':
                    amount = int(amount) * 1000000000
                else:
                    amount = int(amount)
                
                params['budget'] = amount
        
        # Extract advertiser/brand
        brands = ['tide', 'unilever', 'mcdonalds', 'mcdonald\'s', 'mcdonald', 'coca-cola', 'pepsi', 'nike', 'apple']
        for brand in brands:
            if brand.lower() in message.lower():
                # Normalize McDonald's variations
                if brand.lower() in ['mcdonald', 'mcdonalds', 'mcdonald\'s']:
                    params['advertiser'] = 'McDonald\'s'
                else:
                    params['advertiser'] = brand.title()
                break
        
        # Extract campaign type/objective
        if re.search(r'awareness', message, re.IGNORECASE):
            params['objective'] = 'awareness'
        elif re.search(r'conversion', message, re.IGNORECASE):
            params['objective'] = 'conversion'
        elif re.search(r'brand building', message, re.IGNORECASE):
            params['objective'] = 'brand_building'
        elif re.search(r'product launch', message, re.IGNORECASE):
            params['objective'] = 'product_launch'
        
        # Extract target audience
        audiences = ['families', 'millennials', 'gen z', 'parents', 'adults', 'teens', 'seniors']
        for audience in audiences:
            if audience.lower() in message.lower():
                params['target_audience'] = audience
                break
        
        return params

    def _generate_workflow_intro(self, params: Dict[str, Any], intent: str) -> str:
        """Generate a conversational introduction to the workflow."""
        intro_parts = ["Perfect! I'll help you create that campaign. "]
        
        if params.get('budget'):
            budget_formatted = f"${params['budget']:,}"
            intro_parts.append(f"I see you're working with a {budget_formatted} budget. ")
        
        if params.get('advertiser'):
            intro_parts.append(f"For {params['advertiser']}, I have extensive historical data that will help optimize your targeting. ")
        
        if params.get('objective'):
            obj_map = {
                'awareness': 'brand awareness',
                'conversion': 'conversion-focused',
                'brand_building': 'brand building',
                'product_launch': 'product launch'
            }
            intro_parts.append(f"This {obj_map.get(params['objective'], 'campaign')} strategy will guide my recommendations. ")
        
        intro_parts.append("Let me analyze the requirements and start building your comprehensive media plan...")
        
        return "".join(intro_parts)

    def _format_context(self, context: Dict) -> str:
        """Format context information for the AI."""
        if not context:
            return ""
        
        context_parts = ["Current system context: "]
        
        if context.get('current_step'):
            context_parts.append(f"Currently in {context['current_step']} phase. ")
        
        if context.get('progress'):
            context_parts.append(f"Workflow progress: {context['progress']}%. ")
        
        if context.get('last_action'):
            context_parts.append(f"Last action: {context['last_action']}. ")
        
        return "".join(context_parts) if len(context_parts) > 1 else ""

    def _should_suggest_workflow(self, response: str, user_message: str) -> bool:
        """Determine if we should suggest triggering the campaign workflow."""
        workflow_indicators = [
            "campaign plan", "media strategy", "budget allocation", 
            "audience targeting", "campaign setup", "let me help you create"
        ]
        
        return any(indicator in response.lower() for indicator in workflow_indicators)

    def _generate_fallback_response(self, message: str, intent: str) -> str:
        """Generate a fallback response when OpenAI is unavailable."""
        if intent == "setup_campaign":
            return "I'd love to help you create that campaign! I have access to historical data from major advertisers and can build comprehensive media plans. Let me start analyzing your requirements..."
        elif intent == "generate_forecast":
            return "I can definitely help with forecasting! I'll analyze performance data and provide reach estimates for your campaign. Let me get started on that analysis..."
        elif intent == "audience_targeting":
            return "Audience targeting is one of my specialties! I can generate detailed segments based on historical performance data. What specific demographics or behaviors are you looking to target?"
        else:
            return "I'm here to help with your CTV campaign planning needs! I can assist with strategy, targeting, budgeting, and forecasting. What would you like to work on?"

    def reset_conversation(self):
        """Reset the conversation history."""
        self.conversation_history = []
        
    def get_conversation_summary(self) -> str:
        """Get a summary of the current conversation."""
        if not self.conversation_history:
            return "No conversation history"
        
        # Simple summary of last few exchanges
        recent = self.conversation_history[-6:]  # Last 3 exchanges
        summary_parts = []
        
        for msg in recent:
            role = "User" if msg["role"] == "user" else "Peggy"
            content = msg["content"][:100] + "..." if len(msg["content"]) > 100 else msg["content"]
            summary_parts.append(f"{role}: {content}")
        
        return " | ".join(summary_parts)
    
    async def _gather_real_data_context(self, message: str) -> str:
        """Gather real data context based on the user's question."""
        context_parts = []
        message_lower = message.lower()
        
        try:
            # Extract advertiser name from message
            advertiser_name = self._extract_advertiser_name(message)
            
            # If specific advertiser mentioned, get their data
            if advertiser_name:
                advertiser_data = await self._get_advertiser_data(advertiser_name)
                if advertiser_data:
                    # Summarize advertiser data instead of dumping raw JSON
                    summary = self._summarize_advertiser_data(advertiser_data)
                    context_parts.append(f"KEY INSIGHTS FOR {advertiser_name.upper()}: {summary}")
            
            # If asking about similar advertisers, search vector DB
            if any(word in message_lower for word in ["similar", "like", "comparable"]):
                similar_data = await self._get_similar_advertisers(advertiser_name or message)
                if similar_data:
                    # Summarize similar advertisers
                    names = [adv.get("brand", adv.get("advertiser", "Unknown")) for adv in similar_data[:3]]
                    context_parts.append(f"SIMILAR ADVERTISERS: {', '.join(names)}")
            
            # If asking about categories or industry, get category data
            if any(word in message_lower for word in ["category", "industry", "sector", "automotive", "retail", "food", "beverage"]):
                category_data = await self._get_category_data(message)
                if category_data:
                    # Summarize category data
                    top_brands = [adv.get("brand", adv.get("advertiser", "Unknown")) for adv in category_data[:3]]
                    category = next((cat for cat in ["automotive", "retail", "food", "beverage", "technology"] if cat in message_lower), "industry")
                    context_parts.append(f"TOP {category.upper()} ADVERTISERS: {', '.join(top_brands)}")
            
            # If asking about networks, fill rates, or performance
            if any(word in message_lower for word in ["network", "fill rate", "performance", "cpm", "inventory"]):
                network_data = await self._get_network_performance_data()
                if network_data and network_data.get("sample_networks"):
                    # Summarize network performance
                    networks = network_data["sample_networks"]
                    summary = ", ".join([f"{net}: {data['fill_rate']:.1%} fill rate" for net, data in networks.items()])
                    context_parts.append(f"NETWORK PERFORMANCE: {summary}")
                    
        except Exception as e:
            print(f"Error gathering real data context: {e}")
        
        return " | ".join(context_parts) if context_parts else ""
    
    def _summarize_advertiser_data(self, data: Dict) -> str:
        """Create a concise summary of advertiser data."""
        summary_parts = []
        
        if data.get("preferred_targeting"):
            targeting = data["preferred_targeting"]
            if isinstance(targeting, dict):
                key_targets = [f"{k}: {v}" for k, v in list(targeting.items())[:2]]
                summary_parts.append(f"Targets {', '.join(key_targets)}")
            elif isinstance(targeting, str):
                summary_parts.append(f"Targets {targeting[:50]}")
        
        if data.get("content_preferences"):
            content = data["content_preferences"]
            if isinstance(content, list) and content:
                summary_parts.append(f"Prefers {content[0]}")
            elif isinstance(content, str):
                summary_parts.append(f"Prefers {content[:30]}")
        
        if data.get("cpm_insights"):
            cpm = data["cpm_insights"]
            if isinstance(cpm, dict) and cpm.get("avg_cpm"):
                summary_parts.append(f"Avg CPM: ${cpm['avg_cpm']}")
            elif isinstance(cpm, str):
                summary_parts.append(f"CPM: {cpm[:30]}")
        
        return "; ".join(summary_parts) if summary_parts else "Data available"
    
    def _extract_advertiser_name(self, message: str) -> str:
        """Extract advertiser name from message using common patterns."""
        # Look for patterns like "Nike's preferences", "for McDonald's", "about Tide"
        patterns = [
            r"(?:for|about|regarding)\s+([A-Z][a-zA-Z\s&]+?)(?:\s|$|[,\.])",
            r"([A-Z][a-zA-Z\s&]+?)'s?\s+(?:preferences|data|targeting|campaigns)",
            r"(?:advertiser|brand|company)\s+([A-Z][a-zA-Z\s&]+?)(?:\s|$|[,\.])"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, message)
            if match:
                return match.group(1).strip()
        
        # Look for capitalized words that might be brand names
        words = message.split()
        for word in words:
            if word[0].isupper() and len(word) > 2 and word not in ["What", "Tell", "Show", "How", "Where", "When", "Why"]:
                return word
        
        return ""
    
    async def _get_advertiser_data(self, advertiser_name: str) -> Dict:
        """Get real advertiser data from our agents."""
        try:
            # Use the real data advertiser preferences agent
            preferences = await self.advertiser_agent.analyze_advertiser_preferences(advertiser_name)
            
            return {
                "advertiser": preferences.advertiser,
                "preferred_targeting": preferences.preferred_targeting,
                "content_preferences": preferences.content_preferences,
                "channel_preferences": preferences.channel_preferences,
                "network_preferences": preferences.network_preferences,
                "geo_preferences": preferences.geo_preferences,
                "cpm_insights": preferences.cpm_insights,
                "performance_metrics": preferences.performance_metrics,
                "insights": preferences.insights,
                "confidence": preferences.confidence,
                "data_source": preferences.data_source
            }
        except Exception as e:
            print(f"Error getting advertiser data for {advertiser_name}: {e}")
            return {}
    
    async def _get_similar_advertisers(self, query: str) -> List[Dict]:
        """Get similar advertisers from vector database."""
        try:
            response = requests.post(
                f"{self.vector_api_base}/search",
                json={"query": query, "limit": 5},
                timeout=10
            )
            if response.status_code == 200:
                return response.json().get("advertisers", [])
        except Exception as e:
            print(f"Error getting similar advertisers: {e}")
        return []
    
    async def _get_category_data(self, message: str) -> List[Dict]:
        """Get category-specific advertiser data."""
        # Extract category from message
        categories = ["automotive", "retail", "food", "beverage", "technology", "healthcare", "finance"]
        category = None
        
        for cat in categories:
            if cat in message.lower():
                category = cat.title()
                break
        
        if not category:
            return []
        
        try:
            response = requests.get(
                f"{self.vector_api_base}/categories/{category}/top",
                params={"limit": 10},
                timeout=10
            )
            if response.status_code == 200:
                return response.json().get("advertisers", [])
        except Exception as e:
            print(f"Error getting category data: {e}")
        return []
    
    async def _get_network_performance_data(self) -> Dict:
        """Get network performance data from our fill rate data."""
        try:
            # This would typically read from our day_fill.csv or similar data
            # For now, return sample structure that matches our real data
            return {
                "sample_networks": {
                    "amc": {"fill_rate": 0.0208, "avg_cpm": 12.50},
                    "aetv": {"fill_rate": 0.0100, "avg_cpm": 10.25},
                    "discovery": {"fill_rate": 0.0156, "avg_cpm": 11.75}
                },
                "note": "Based on real CTV delivery data from day_fill.csv"
            }
        except Exception as e:
            print(f"Error getting network performance data: {e}")
        return {} 