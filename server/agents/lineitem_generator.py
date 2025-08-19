"""
Line Item Generator Agent - Step 4: Build Executable Campaign Structure
Neural Ads - Connected TV Advertising Platform
"""

import json
import os
from typing import Dict, Any, List
from dataclasses import dataclass
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

@dataclass
class LineItem:
    name: str
    content: str
    geo: str
    device: str
    audience: str
    bid_cpm: float
    daily_cap: float
    frequency_cap: str
    budget: float
    targeting_criteria: Dict[str, Any]

@dataclass
class CampaignStructure:
    line_items: List[LineItem]
    total_budget: float
    total_line_items: int
    budget_allocation: Dict[str, float]
    confidence: float
    deployment_notes: List[str]

class LineItemGeneratorAgent:
    """
    Specialized agent for building executable ad server line items
    
    Creates:
    - Detailed line item specifications
    - Budget allocation across segments
    - Targeting combinations
    - Frequency and daily caps
    - Ad server-ready configurations
    """
    
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY", "your_api_key_here")
        )
        self.model = os.getenv("AGENT_MODEL", "gpt-4o-mini")
    
    async def generate_line_items(self, 
                                 advertiser: str, 
                                 budget: float,
                                 preferences: Dict[str, Any], 
                                 audience_segments: List[Dict[str, Any]]) -> CampaignStructure:
        """Generate executable line items based on all previous analysis"""
        
        # Create simplified segment info for prompt
        segment_info = []
        for seg in audience_segments:
            segment_info.append({
                "name": seg.get("name", seg.get("audience", "Unknown")),
                "cpm": seg.get("cpm", 32),
                "scale": seg.get("scale", 2000000)
            })
        
        system_prompt = f"""
        You are Neural, building executable line items for {advertiser} with ${budget:,.0f} budget.
        
        Create 5-7 line items that distribute budget across:
        - Content types: {preferences.get('content_preferences', ['Family Animation', 'Reality Shows', 'News', 'Sports'])}
        - Geographies: {preferences.get('geo_preferences', ['Midwest', 'South', 'Northwest'])}
        - Devices: {preferences.get('device_preferences', ['CTV', 'Mobile'])}
        - Audience segments: {[s['name'] for s in segment_info]}
        
        Return ONLY a valid JSON object:
        
        {{
            "line_items": [
                {{
                    "name": "ADVERTISER_Midwest_FamilyAnim",
                    "content": "Family Animation", 
                    "geo": "Midwest",
                    "device": "CTV",
                    "audience": "Heavy Binge Watchers",
                    "bid_cpm": 36,
                    "daily_cap": 8000,
                    "frequency_cap": "3/day",
                    "budget": 42000,
                    "targeting_criteria": {{
                        "daypart": "Prime Time",
                        "content_safety": "Brand Safe",
                        "viewability": "70%+"
                    }}
                }}
            ],
            "budget_allocation": {{
                "CTV": 0.70,
                "Mobile": 0.25,
                "Desktop": 0.05
            }},
            "deployment_notes": [
                "Prioritize premium content environments",
                "Monitor completion rates and adjust frequency"
            ]
        }}
        
        Ensure budget allocation adds up to ${budget:,.0f} and CPM pricing is realistic ($28-$45).
        """
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Generate line items for {advertiser} campaign"}
                ],
                temperature=0.4,
                max_tokens=1200
            )
            
            data = json.loads(response.choices[0].message.content)
            
            # Convert to LineItem objects
            line_items = []
            for item_data in data.get("line_items", []):
                line_items.append(LineItem(
                    name=item_data.get("name"),
                    content=item_data.get("content"),
                    geo=item_data.get("geo"),
                    device=item_data.get("device"),
                    audience=item_data.get("audience"),
                    bid_cpm=float(item_data.get("bid_cpm", 32)),
                    daily_cap=float(item_data.get("daily_cap", 5000)),
                    frequency_cap=item_data.get("frequency_cap", "3/day"),
                    budget=float(item_data.get("budget", budget / len(data.get("line_items", [1])))),
                    targeting_criteria=item_data.get("targeting_criteria", {})
                ))
            
            return CampaignStructure(
                line_items=line_items,
                total_budget=budget,
                total_line_items=len(line_items),
                budget_allocation=data.get("budget_allocation", {}),
                confidence=0.88,
                deployment_notes=data.get("deployment_notes", [])
            )
            
        except Exception as e:
            print(f"Line item generation error: {e}")
            return self._fallback_line_items(advertiser, budget, audience_segments)
    
    def _fallback_line_items(self, advertiser: str, budget: float, audience_segments: List[Dict[str, Any]]) -> CampaignStructure:
        """Fallback line item generation when OpenAI is unavailable"""
        
        # Create 5 sample line items
        line_items = [
            LineItem(
                name=f"{advertiser.replace(' ', '')}_Midwest_FamilyAnim",
                content="Family Animation",
                geo="Midwest", 
                device="CTV",
                audience="Heavy Binge Watchers",
                bid_cpm=36.0,
                daily_cap=8000.0,
                frequency_cap="3/day",
                budget=budget * 0.25,
                targeting_criteria={"daypart": "Prime Time", "content_safety": "Brand Safe"}
            ),
            LineItem(
                name=f"{advertiser.replace(' ', '')}_South_Sports",
                content="Sports",
                geo="South",
                device="CTV", 
                audience="Sports Fans",
                bid_cpm=38.0,
                daily_cap=7000.0,
                frequency_cap="2/day",
                budget=budget * 0.20,
                targeting_criteria={"daypart": "Weekend", "content_safety": "Brand Safe"}
            ),
            LineItem(
                name=f"{advertiser.replace(' ', '')}_Northwest_News",
                content="News",
                geo="Northwest",
                device="Mobile",
                audience="News Enthusiasts", 
                bid_cpm=28.0,
                daily_cap=5000.0,
                frequency_cap="3/day",
                budget=budget * 0.15,
                targeting_criteria={"daypart": "Morning", "content_safety": "Brand Safe"}
            ),
            LineItem(
                name=f"{advertiser.replace(' ', '')}_Nationwide_Reality",
                content="Reality Shows",
                geo="Nationwide",
                device="CTV",
                audience="Family Co-Viewers",
                bid_cpm=32.0,
                daily_cap=6000.0,
                frequency_cap="2/day", 
                budget=budget * 0.25,
                targeting_criteria={"daypart": "Prime Time", "content_safety": "Brand Safe"}
            ),
            LineItem(
                name=f"{advertiser.replace(' ', '')}_Mobile_Lifestyle",
                content="Lifestyle",
                geo="Nationwide",
                device="Mobile",
                audience="Light Streamers",
                bid_cpm=24.0,
                daily_cap=4000.0,
                frequency_cap="4/day",
                budget=budget * 0.15,
                targeting_criteria={"daypart": "All Day", "content_safety": "Brand Safe"}
            )
        ]
        
        return CampaignStructure(
            line_items=line_items,
            total_budget=budget,
            total_line_items=len(line_items),
            budget_allocation={"CTV": 0.70, "Mobile": 0.25, "Desktop": 0.05},
            confidence=0.75,
            deployment_notes=[
                "Line items ready for ad server deployment",
                "Monitor performance and optimize based on completion rates"
            ]
        )
    
    async def generate_reasoning(self, structure: CampaignStructure, advertiser: str) -> str:
        """Generate reasoning text for the line item structure"""
        
        device_breakdown = []
        for device, percentage in structure.budget_allocation.items():
            device_breakdown.append(f"• {device}: ${structure.total_budget * percentage:,.0f} ({percentage:.0%})")
        
        return f"""
        ⚡ Neural - Line Item Construction
        
        Built {structure.total_line_items} executable line items for {advertiser}:
        
        Budget Allocation:
        {chr(10).join(device_breakdown)}
        
        Line Item Highlights:
        • Premium CTV targeting across content types
        • Geographic diversification for optimal reach
        • Competitive CPM pricing ($24-$38 range)
        • Frequency caps for brand safety (2-4/day)
        
        Deployment Ready:
        {chr(10).join([f"• {note}" for note in structure.deployment_notes[:2]])}
        
        Line items successfully constructed.
        
        Total campaign budget: ${structure.total_budget:,.0f} across {structure.total_line_items} line items.
        Ready for ad server deployment.
        """ 