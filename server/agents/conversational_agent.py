import json
import re
from typing import Dict, List, Optional, Tuple, Any
from openai import AsyncOpenAI
import os
from .multi_agent_orchestrator import MultiAgentOrchestrator

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
        
        # Simplified keyword-based intent detection
        self.campaign_keywords = [
            "campaign", "setup", "forecast", "budget", "awareness", "performance", 
            "targeting", "audience", "plan", "create", "build", "launch", "start",
            "advertising", "marketing", "conversion", "brand", "spend", "allocation",
            "reach", "impressions", "optimization", "analysis", "demographics"
        ]
        
        # Context-aware system prompts
        self.system_prompt = """You are Peggy, an expert AI assistant specializing in Connected TV (CTV) campaign planning and media strategy. You have access to:

1. Historical advertiser data for 5+ major brands (Tide, Unilever, McDonald's, etc.)
2. Real-time audience segmentation capabilities
3. Advanced campaign planning and forecasting tools
4. Media buying insights and pricing data

Your personality:
- Professional but friendly and conversational
- Data-driven but explain insights in accessible terms
- Proactive in suggesting optimizations
- Confident in your expertise but humble about limitations

Your capabilities:
- Analyze campaign requirements and provide strategic recommendations
- Generate targeted audience segments based on historical data
- Create comprehensive media plans with budget allocations
- Provide performance forecasts and reach estimates
- Optimize campaigns for different objectives (awareness, conversion, brand building)

When users mention campaign planning, budgets, targeting, or forecasting, you should offer to help them create a complete campaign plan using your advanced tools.

Always be helpful, insightful, and ready to dive deep into campaign strategy while keeping explanations clear and actionable."""

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
        """Detect user intent from message using simple keyword matching."""
        message_lower = message.lower()
        
        # Count campaign-related keywords
        keyword_matches = 0
        for keyword in self.campaign_keywords:
            if keyword in message_lower:
                keyword_matches += 1
        
        # If any campaign keywords found, it's a campaign setup intent
        if keyword_matches > 0:
            # Calculate confidence based on number of keywords (max out at 1.0)
            confidence = min(keyword_matches / 3.0, 1.0)  # 3+ keywords = 100% confidence
            return "setup_campaign", confidence
        
        return "general_conversation", 0.0

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
        """Handle general conversation using OpenAI."""
        try:
            # Prepare context-aware messages
            messages = [{"role": "system", "content": self.system_prompt}]
            
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
                max_tokens=300,
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