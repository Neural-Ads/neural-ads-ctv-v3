"""
COT Reasoning Agent - Primary Intelligence for CTV Campaign Setup
Neural Ads - Connected TV Advertising Platform
"""

import asyncio
import json
import os
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
from openai import AsyncOpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class CampaignStep(Enum):
    PARSING = "campaign_data"
    PREFERENCES = "advertiser_preferences" 
    AUDIENCE = "audience_generation"
    GENERATION = "campaign_generation"
    COMPLETE = "complete"

@dataclass
class AgentThought:
    step: CampaignStep
    reasoning: str
    action: str
    data: Dict[str, Any]
    confidence: float
    next_step: Optional[CampaignStep] = None

class COTReasoningAgent:
    """
    Neural - Sophisticated Ad Planning and Buying Assistant
    
    A Chain of Thought reasoning agent for premium streaming platforms like LG Ads.
    
    Neural helps ad ops professionals by:
    1. Parsing campaign briefs (advertiser, budget, objectives)
    2. Retrieving historical buying patterns and preferences
    3. Simulating yield management signals and pricing insights
    4. Creating custom ACR audience definitions
    5. Building executable ad server line items with detailed targeting
    
    Neural follows a structured workflow with confirmations:
    - "Campaign parameters identified."
    - "Historical patterns retrieved."
    - "Pricing insights gathered."
    - "Audience definition synthesized."
    - "Line items successfully constructed."
    """
    
    def __init__(self):
        self.current_step = CampaignStep.PARSING
        self.campaign_context = {}
        self.thinking_history = []
        self.agents = {}  # Will hold references to specialized agents
        
        # Initialize OpenAI client
        self.client = AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY", "your_api_key_here")
        )
        self.model = os.getenv("AGENT_MODEL", "gpt-4o-mini")
        self.temperature = float(os.getenv("AGENT_TEMPERATURE", "0.7"))
        self.max_tokens = int(os.getenv("AGENT_MAX_TOKENS", "2000"))
        
    async def process_campaign_request(self, user_input: str, uploaded_files: List = None) -> AgentThought:
        """
        Main entry point for campaign processing
        Returns agent's reasoning and next actions
        """
        
        # Generate reasoning using OpenAI
        reasoning = await self._generate_reasoning_with_openai(user_input)
        action = await self._determine_action_with_openai(user_input, reasoning)
        data = await self._extract_data_with_openai(user_input)
        
        thought = AgentThought(
            step=self.current_step,
            reasoning=reasoning,
            action=action,
            data=data,
            confidence=0.85
        )
        
        self.thinking_history.append(thought)
        return thought
    
    async def _generate_reasoning_with_openai(self, user_input: str) -> str:
        """Generate chain of thought reasoning using OpenAI based on current step and input"""
        
        step_context = {
            CampaignStep.PARSING: """
            You are Neural, a sophisticated ad planning and buying assistant helping an ad ops person 
            working at a premium streaming platform like LG Ads.
            
            Your task is to parse the campaign intent from the user's prompt, identifying:
            - Advertiser name
            - Budget amount  
            - Campaign objective (awareness, conversion, etc.)
            - Timeline/duration
            
            After parsing, confirm with: "Campaign parameters identified."
            """,
            CampaignStep.PREFERENCES: """
            You are Neural. Now retrieve historical buying patterns using advertiser-specific data.
            
            Provide 5-10 insights about the advertiser's preferred:
            - Content types (e.g., Family Animation, Reality Shows, News, Sports)
            - Geographic preferences
            - Device targeting patterns
            - Audience segment preferences
            - Historical performance data
            
            After analysis, confirm with: "Historical patterns retrieved."
            """,
            CampaignStep.AUDIENCE: """
            You are Neural. Create audience definitions and simulate yield management signals.
            
            Tasks:
            1. Simulate yield management signals (CPM floors, regional cost variation, content pricing)
            2. Create custom audience definition using ACR segments:
               - Light Streamers
               - Heavy Binge Watchers  
               - Occasional Viewers
               - News Enthusiasts
               - Sports Fans
               - Family Co-Viewers
            
            Confirm with: "Pricing insights gathered." then "Audience definition synthesized."
            """,
            CampaignStep.GENERATION: """
            You are Neural. Build 5-7 executable ad server line items across content types, geographies, and devices.
            
            Each line item MUST include:
            - name (format: ADVERTISER_GEO_CONTENT)
            - content (Family Animation, Lifestyle/Reality, News, Sports, etc.)
            - geo (Midwest, South, Northwest, US excl. NYC/SF, Nationwide, etc.)
            - device (CTV, Mobile, Desktop)
            - audience (use ACR segment names)
            - bid CPM (competitive pricing $28-$40)
            - daily cap (budget allocation)
            - frequency cap (1-3/day)
            
            After completion, confirm with: "Line items successfully constructed."
            Then display a clean table of line items.
            """
        }
        
        system_prompt = f"""
        You are Neural, a sophisticated ad planning and buying assistant for premium streaming platforms like LG Ads.
        
        {step_context.get(self.current_step, "")}
        
        Always be professional, data-driven, and specific. Use industry terminology and provide 
        actionable insights that an ad ops professional would expect.
        
        Provide clear reasoning about your analysis and recommendations.
        """
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Campaign Brief: {user_input}"}
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            # Fallback to original reasoning if OpenAI fails
            return self._generate_fallback_reasoning(user_input)
    
    async def _determine_action_with_openai(self, user_input: str, reasoning: str) -> str:
        """Determine next action using OpenAI"""
        
        action_context = {
            CampaignStep.PARSING: "Parse campaign parameters and identify advertiser, budget, objectives",
            CampaignStep.PREFERENCES: "Analyze historical buying patterns and advertiser preferences", 
            CampaignStep.AUDIENCE: "Create audience segments and gather pricing insights",
            CampaignStep.GENERATION: "Build executable line items with detailed specifications"
        }
        
        system_prompt = f"""
        You are Neural, an ad planning assistant. Based on the current step ({self.current_step.value}), 
        determine the specific next action: {action_context.get(self.current_step, "Continue processing")}
        
        Be specific and actionable in your response.
        """
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Reasoning: {reasoning}\nCampaign Brief: {user_input}"}
                ],
                temperature=0.5,
                max_tokens=200
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return self._determine_fallback_action()
    
    async def _extract_data_with_openai(self, user_input: str) -> Dict[str, Any]:
        """Extract structured campaign data using OpenAI"""
        
        system_prompt = f"""
        You are Neural, extracting campaign data for step: {self.current_step.value}
        
        Extract relevant data based on current step:
        - PARSING: advertiser, budget, objective, timeline
        - PREFERENCES: content_preferences, geo_preferences, device_preferences  
        - AUDIENCE: acr_segments, pricing_signals, audience_insights
        - GENERATION: line_items with all required fields
        
        Return valid JSON with extracted data and confidence score.
        """
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Campaign Brief: {user_input}"}
                ],
                temperature=0.3,
                max_tokens=800
            )
            
            # Try to parse JSON response
            try:
                return json.loads(response.choices[0].message.content)
            except json.JSONDecodeError:
                # If not valid JSON, return a structured fallback
                return self._extract_fallback_data(user_input)
                
        except Exception as e:
            return self._extract_fallback_data(user_input)
    
    def _generate_fallback_reasoning(self, user_input: str) -> str:
        """Fallback reasoning when OpenAI is unavailable"""
        
        if self.current_step == CampaignStep.PARSING:
            return f"""
            📊 Neural - Campaign Analysis
            
            Parsing campaign brief: "{user_input[:100]}..."
            
            Identifying key parameters:
            • Advertiser identification
            • Budget allocation and constraints  
            • Campaign objectives (awareness/conversion/engagement)
            • Timeline and flight dates
            • Target audience requirements
            
            Campaign parameters identified.
            """
            
        elif self.current_step == CampaignStep.PREFERENCES:
            return """
            📈 Neural - Historical Analysis
            
            Retrieving advertiser buying patterns:
            • Content affinity analysis (genres, dayparts)
            • Geographic performance data
            • Device targeting preferences
            • Historical CPM performance
            • Audience segment effectiveness
            
            Historical patterns retrieved.
            """
            
        elif self.current_step == CampaignStep.AUDIENCE:
            return """
            🎯 Neural - Audience & Pricing Intelligence
            
            Generating yield management signals:
            • CPM floor analysis by content type
            • Regional cost variations
            • Content premium pricing
            
            Creating ACR audience segments:
            • Heavy Binge Watchers, Light Streamers
            • News Enthusiasts, Sports Fans
            • Family Co-Viewers, Occasional Viewers
            
            Pricing insights gathered.
            Audience definition synthesized.
            """
            
        elif self.current_step == CampaignStep.GENERATION:
            return """
            ⚡ Neural - Line Item Construction
            
            Building executable ad server line items:
            • Content targeting across genres
            • Geographic distribution strategy
            • Device optimization (CTV/Mobile/Desktop)
            • ACR audience mapping
            • Competitive bid pricing ($28-$40 CPM)
            • Budget allocation and frequency caps
            
            Line items successfully constructed.
            """
        
        return "Neural processing campaign requirements..."
    
    def _determine_fallback_action(self) -> str:
        """Fallback action when OpenAI is unavailable"""
        action_map = {
            CampaignStep.PARSING: "Parse advertiser, budget, and campaign objectives from brief",
            CampaignStep.PREFERENCES: "Analyze historical buying patterns and content preferences", 
            CampaignStep.AUDIENCE: "Generate ACR audience segments and pricing intelligence",
            CampaignStep.GENERATION: "Construct executable line items with targeting specifications",
            CampaignStep.COMPLETE: "Finalize campaign plan and prepare delivery"
        }
        
        return action_map.get(self.current_step, "Continue Neural campaign analysis...")
    
    def _extract_fallback_data(self, user_input: str) -> Dict[str, Any]:
        """Fallback data extraction when OpenAI is unavailable"""
        
        if self.current_step == CampaignStep.PARSING:
            return {
                "advertiser": "Sample Advertiser",
                "budget": 250000,
                "objective": "awareness",
                "timeline": "30 days",
                "confidence": 0.75,
                "source": "neural_fallback"
            }
        elif self.current_step == CampaignStep.PREFERENCES:
            return {
                "content_preferences": ["Family Animation", "Reality Shows", "News"],
                "geo_preferences": ["Midwest", "South", "Northwest"],
                "device_preferences": ["CTV", "Mobile"],
                "historical_cpm": 32,
                "confidence": 0.70,
                "source": "neural_fallback"
            }
        elif self.current_step == CampaignStep.AUDIENCE:
            return {
                "acr_segments": ["Heavy Binge Watchers", "Light Streamers", "News Enthusiasts"],
                "cpm_floors": {"CTV": 28, "Mobile": 24},
                "audience_insights": "High affinity for premium content",
                "confidence": 0.80,
                "source": "neural_fallback"
            }
        elif self.current_step == CampaignStep.GENERATION:
            return {
                "line_items": [
                    {
                        "name": "ADV_Midwest_FamilyAnim",
                        "content": "Family Animation",
                        "geo": "Midwest",
                        "device": "CTV",
                        "audience": "Heavy Binge Watchers",
                        "bid_cpm": "$36",
                        "daily_cap": "$8,000",
                        "frequency_cap": "3/day"
                    }
                ],
                "total_line_items": 6,
                "confidence": 0.85,
                "source": "neural_fallback"
            }
        
        return {
            "status": "processing",
            "confidence": 0.60,
            "source": "neural_fallback"
        }
    
    async def advance_to_next_step(self) -> CampaignStep:
        """Move to next step in campaign setup process"""
        
        step_progression = {
            CampaignStep.PARSING: CampaignStep.PREFERENCES,
            CampaignStep.PREFERENCES: CampaignStep.AUDIENCE,
            CampaignStep.AUDIENCE: CampaignStep.GENERATION,
            CampaignStep.GENERATION: CampaignStep.COMPLETE
        }
        
        if self.current_step in step_progression:
            self.current_step = step_progression[self.current_step]
            
        return self.current_step
    
    def get_thinking_process(self) -> List[AgentThought]:
        """Return full thinking history for UI display"""
        return self.thinking_history
    
    def get_current_status(self) -> Dict[str, Any]:
        """Get current agent status for UI updates"""
        return {
            "current_step": self.current_step.value,
            "progress": len(self.thinking_history) / 4 * 100,  # 4 total steps
            "last_reasoning": self.thinking_history[-1].reasoning if self.thinking_history else "",
            "next_action": self.thinking_history[-1].action if self.thinking_history else "",
            "openai_enabled": bool(os.getenv("OPENAI_API_KEY"))
        } 