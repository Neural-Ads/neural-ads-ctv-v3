"""
Campaign Parser Agent - Step 1: Parse Campaign Requirements
Neural Ads - Connected TV Advertising Platform
"""

import json
import os
from typing import Dict, Any, Optional
from dataclasses import dataclass
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

@dataclass
class CampaignParameters:
    advertiser: str
    budget: float
    objective: str
    timeline: str
    confidence: float
    additional_requirements: Optional[Dict[str, Any]] = None

class CampaignParserAgent:
    """
    Specialized agent for parsing campaign requirements
    
    Extracts:
    - Advertiser name
    - Budget amount
    - Campaign objective (awareness, conversion, etc.)
    - Timeline/duration
    - Additional requirements
    """
    
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY", "your_api_key_here")
        )
        self.model = os.getenv("AGENT_MODEL", "gpt-4o-mini")
    
    async def parse_campaign_brief(self, user_input: str) -> CampaignParameters:
        """Parse campaign brief and extract structured parameters"""
        
        system_prompt = """
        You are Neural, a sophisticated ad planning assistant for premium streaming platforms like LG Ads.
        
        Your task is to parse campaign requirements and extract structured data.
        
        Extract the following from the user's campaign brief:
        - advertiser: Company/brand name
        - budget: Campaign budget amount (convert to numeric value)
        - objective: Campaign goal (awareness, conversion, engagement, etc.)
        - timeline: Campaign duration or dates
        - additional_requirements: Any special targeting, creative, or technical requirements
        
        Return ONLY a valid JSON object with these fields. If information is missing, use reasonable defaults or "Not specified".
        
        Example response:
        {
            "advertiser": "Nike",
            "budget": 250000,
            "objective": "awareness", 
            "timeline": "30 days",
            "additional_requirements": {
                "target_audience": "sports enthusiasts",
                "geographic_focus": "nationwide"
            }
        }
        """
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_input}
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            # Parse JSON response
            data = json.loads(response.choices[0].message.content)
            
            return CampaignParameters(
                advertiser=data.get("advertiser", "Unknown Advertiser"),
                budget=float(data.get("budget", 100000)),
                objective=data.get("objective", "awareness"),
                timeline=data.get("timeline", "30 days"),
                confidence=0.85,
                additional_requirements=data.get("additional_requirements", {})
            )
            
        except Exception as e:
            print(f"Campaign parsing error: {e}")
            # Fallback parsing
            return self._fallback_parse(user_input)
    
    def _fallback_parse(self, user_input: str) -> CampaignParameters:
        """Fallback parsing when OpenAI is unavailable"""
        
        # Simple keyword extraction
        budget = 100000
        if "$" in user_input:
            # Try to extract budget numbers
            import re
            budget_matches = re.findall(r'\$[\d,]+', user_input)
            if budget_matches:
                budget_str = budget_matches[0].replace('$', '').replace(',', '')
                try:
                    budget = float(budget_str)
                except:
                    budget = 100000
        
        return CampaignParameters(
            advertiser="Sample Advertiser",
            budget=budget,
            objective="awareness",
            timeline="30 days",
            confidence=0.60,
            additional_requirements={"source": "fallback_parsing"}
        )
    
    async def generate_reasoning(self, parameters: CampaignParameters) -> str:
        """Generate reasoning text for the parsed parameters"""
        
        return f"""
        📊 Neural - Campaign Parameters Analysis
        
        Successfully parsed campaign brief:
        
        ✓ Advertiser: {parameters.advertiser}
        ✓ Budget: ${parameters.budget:,.0f}
        ✓ Objective: {parameters.objective.title()}
        ✓ Timeline: {parameters.timeline}
        
        Campaign parameters identified.
        
        Ready to proceed with historical pattern analysis for {parameters.advertiser}.
        """ 