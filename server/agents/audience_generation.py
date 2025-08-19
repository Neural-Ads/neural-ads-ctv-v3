"""
Audience Generation Agent - Step 3: ACR Segments & Pricing Intelligence
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
class AudienceSegment:
    name: str
    description: str
    scale: int  # Household scale
    cpm: float
    reach: float  # Percentage reach
    targeting_criteria: List[str]

@dataclass
class AudienceAnalysis:
    segments: List[AudienceSegment]
    pricing_insights: Dict[str, Any]
    yield_signals: Dict[str, float]
    confidence: float
    recommendations: List[str]

class AudienceGenerationAgent:
    """
    Specialized agent for creating ACR audience segments and pricing intelligence
    
    Generates:
    - Custom ACR audience segments
    - CPM floor pricing by content/device
    - Yield management signals
    - Audience reach estimates
    """
    
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY", "your_api_key_here")
        )
        self.model = os.getenv("AGENT_MODEL", "gpt-4o-mini")
    
    async def generate_audience_segments(self, advertiser: str, preferences: Dict[str, Any], budget: float) -> AudienceAnalysis:
        """Generate ACR audience segments and pricing intelligence"""
        
        system_prompt = f"""
        You are Neural, creating ACR audience segments for {advertiser} with budget ${budget:,.0f}.
        
        Based on the advertiser preferences, create 4-6 audience segments using these ACR segment types:
        - Heavy Binge Watchers
        - Light Streamers  
        - News Enthusiasts
        - Sports Fans
        - Family Co-Viewers
        - Occasional Viewers
        
        Return ONLY a valid JSON object:
        
        {{
            "segments": [
                {{
                    "name": "Heavy Binge Watchers",
                    "description": "Viewers who stream 4+ hours daily, high content engagement",
                    "scale": 2500000,
                    "cpm": 34,
                    "reach": 12.5,
                    "targeting_criteria": ["High viewing frequency", "Premium content affinity"]
                }}
            ],
            "pricing_insights": {{
                "content_premiums": {{"Sports": 1.25, "News": 1.15, "Animation": 1.1}},
                "device_multipliers": {{"CTV": 1.0, "Mobile": 0.85, "Desktop": 0.75}},
                "regional_variance": {{"West Coast": 1.2, "East Coast": 1.15, "Midwest": 0.95}}
            }},
            "yield_signals": {{
                "inventory_pressure": 0.75,
                "seasonal_adjustment": 1.05,
                "advertiser_premium": 1.1
            }},
            "recommendations": [
                "Focus on premium CTV inventory for brand safety",
                "Target evening dayparts for higher completion rates"
            ]
        }}
        
        Make CPM pricing realistic ($28-$45 range) and scale appropriate (1M-5M households per segment).
        """
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Generate ACR segments for {advertiser} campaign"}
                ],
                temperature=0.5,
                max_tokens=1000
            )
            
            data = json.loads(response.choices[0].message.content)
            
            # Convert segments data to AudienceSegment objects
            segments = []
            for seg_data in data.get("segments", []):
                segments.append(AudienceSegment(
                    name=seg_data.get("name"),
                    description=seg_data.get("description"),
                    scale=seg_data.get("scale"),
                    cpm=seg_data.get("cpm"),
                    reach=seg_data.get("reach"),
                    targeting_criteria=seg_data.get("targeting_criteria", [])
                ))
            
            return AudienceAnalysis(
                segments=segments,
                pricing_insights=data.get("pricing_insights", {}),
                yield_signals=data.get("yield_signals", {}),
                confidence=0.82,
                recommendations=data.get("recommendations", [])
            )
            
        except Exception as e:
            print(f"Audience generation error: {e}")
            return self._fallback_audience_generation(advertiser, budget)
    
    def _fallback_audience_generation(self, advertiser: str, budget: float) -> AudienceAnalysis:
        """Fallback audience generation when OpenAI is unavailable"""
        
        segments = [
            AudienceSegment(
                name="Heavy Binge Watchers",
                description="Viewers who stream 4+ hours daily with high engagement",
                scale=2800000,
                cpm=36.0,
                reach=14.2,
                targeting_criteria=["High viewing frequency", "Premium content affinity"]
            ),
            AudienceSegment(
                name="News Enthusiasts", 
                description="Regular consumers of news and current events content",
                scale=1900000,
                cpm=32.0,
                reach=9.8,
                targeting_criteria=["News content viewing", "Morning/evening dayparts"]
            ),
            AudienceSegment(
                name="Sports Fans",
                description="Engaged sports content viewers across multiple sports",
                scale=3200000,
                cpm=38.0,
                reach=16.1,
                targeting_criteria=["Sports content affinity", "Weekend viewing"]
            ),
            AudienceSegment(
                name="Family Co-Viewers",
                description="Households with shared viewing experiences",
                scale=2100000,
                cpm=30.0,
                reach=10.7,
                targeting_criteria=["Family content", "Prime time viewing"]
            )
        ]
        
        return AudienceAnalysis(
            segments=segments,
            pricing_insights={
                "content_premiums": {"Sports": 1.25, "News": 1.15, "Animation": 1.1},
                "device_multipliers": {"CTV": 1.0, "Mobile": 0.85, "Desktop": 0.75}
            },
            yield_signals={
                "inventory_pressure": 0.75,
                "seasonal_adjustment": 1.05
            },
            confidence=0.70,
            recommendations=[
                "Focus on CTV inventory for premium brand environment",
                "Target evening dayparts for optimal completion rates"
            ]
        )
    
    async def generate_reasoning(self, analysis: AudienceAnalysis, advertiser: str) -> str:
        """Generate reasoning text for the audience analysis"""
        
        segment_details = []
        for segment in analysis.segments[:3]:  # Show top 3
            segment_details.append(
                f"• {segment.name}: {segment.scale:,} HH @ ${segment.cpm} CPM ({segment.reach:.1f}% reach)"
            )
        
        return f"""
        🎯 Neural - Audience & Pricing Intelligence
        
        Generated ACR audience segments for {advertiser}:
        
        {chr(10).join(segment_details)}
        
        Pricing Intelligence:
        • Content Premiums: Sports (+25%), News (+15%), Animation (+10%)
        • Device Performance: CTV (baseline), Mobile (-15%), Desktop (-25%)
        • Inventory Pressure: {analysis.yield_signals.get('inventory_pressure', 0.75):.0%} utilization
        
        Key Recommendations:
        {chr(10).join([f"• {rec}" for rec in analysis.recommendations[:2]])}
        
        Pricing insights gathered.
        Audience definition synthesized.
        
        Total addressable scale: {sum(s.scale for s in analysis.segments):,} households across {len(analysis.segments)} segments.
        """ 