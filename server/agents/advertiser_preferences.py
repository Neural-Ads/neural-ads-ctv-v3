"""
Advertiser Preferences Agent - Step 2: Historical Data Analysis
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
class AdvertiserPreferences:
    advertiser: str
    preferred_targeting: List[str]
    content_preferences: List[str]
    channel_preferences: List[str]
    network_preferences: List[str]
    geo_preferences: List[str]
    confidence: float
    insights: List[str]

class AdvertiserPreferencesAgent:
    """
    Specialized agent for analyzing advertiser historical buying patterns
    
    Uses real advertiser vector database to provide:
    - Content type preferences from actual viewing data
    - Channel and network affinities 
    - Geographic targeting patterns
    - Data-driven insights and recommendations
    """
    
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY", "your_api_key_here")
        )
        self.model = os.getenv("AGENT_MODEL", "gpt-4o-mini")
        self.advertiser_data = self._load_advertiser_database()
    
    def _load_advertiser_database(self) -> List[Dict]:
        """Load the advertiser vector database from JSON file"""
        try:
            # Try local file first
            db_path = os.path.join(os.path.dirname(__file__), "../advertiser_vector_database_full.json")
            if not os.path.exists(db_path):
                # Fallback to original path
                db_path = os.path.join(os.path.dirname(__file__), "../../advertiser_vector_database_full.json")
            
            with open(db_path, 'r') as f:
                data = json.load(f)
                print(f"✅ Loaded advertiser database with {len(data)} advertisers")
                return data
        except Exception as e:
            print(f"❌ Error loading advertiser database: {e}")
            return []
    
    def _find_advertiser_data(self, advertiser_name: str) -> Dict[str, Any]:
        """Find advertiser data by name (fuzzy matching)"""
        advertiser_lower = advertiser_name.lower()
        
        # Try exact match first
        for record in self.advertiser_data:
            if record['metadata']['advertiser'].lower() == advertiser_lower:
                return record
        
        # Try partial match
        for record in self.advertiser_data:
            if advertiser_lower in record['metadata']['advertiser'].lower():
                return record
        
        # Try reverse partial match
        for record in self.advertiser_data:
            if record['metadata']['advertiser'].lower() in advertiser_lower:
                return record
        
        return None
    
    def _extract_top_preferences(self, vector_data: Dict[str, float], prefix: str, top_n: int = 5) -> List[str]:
        """Extract top preferences from vector data for a given prefix"""
        filtered = {k: v for k, v in vector_data.items() if k.startswith(prefix) and v > 0}
        sorted_items = sorted(filtered.items(), key=lambda x: x[1], reverse=True)
        return [item.replace(f"{prefix}:", "").replace(";", " + ") for item, score in sorted_items[:top_n]]
    
    def _extract_top_preferences_with_scores(self, vector_data: Dict[str, float], prefix: str, top_n: int = 5) -> List[Dict]:
        """Extract top preferences from vector data with their engagement scores"""
        filtered = {k: v for k, v in vector_data.items() if k.startswith(prefix) and v > 0}
        sorted_items = sorted(filtered.items(), key=lambda x: x[1], reverse=True)
        return [
            {
                "name": item.replace(f"{prefix}:", "").replace(";", " + "),
                "engagement": round(score * 100, 1)
            }
            for item, score in sorted_items[:top_n]
        ]
        
    def _analyze_geographic_patterns(self, vector_data: Dict[str, float]) -> List[str]:
        """Analyze geographic targeting patterns from zipcode data"""
        geo_data = {k: v for k, v in vector_data.items() if k.startswith('zip:') and v > 0}
        
        if not geo_data:
            return ["Nationwide targeting recommended"]
        
        # Sort by engagement and get top markets
        sorted_geos = sorted(geo_data.items(), key=lambda x: x[1], reverse=True)
        top_zips = [zip_code.replace('zip:', '') for zip_code, score in sorted_geos[:5]]
        
        insights = [f"Strong performance in ZIP codes: {', '.join(top_zips[:3])}" if top_zips else "Nationwide targeting"]
        
        # Add regional insights based on zip patterns
        if len(top_zips) >= 3:
            insights.append(f"Geographic concentration in {len(top_zips)} key markets")
        
        return insights
    
    async def analyze_advertiser_patterns(self, advertiser: str, campaign_objective: str) -> AdvertiserPreferences:
        """Analyze historical patterns using real advertiser data"""
        
        # Find advertiser in database
        advertiser_data = self._find_advertiser_data(advertiser)
        
        if not advertiser_data:
            print(f"No data found for advertiser: {advertiser}, using fallback")
            return self._fallback_analysis(advertiser, campaign_objective)
        
        vector = advertiser_data['vector']
        total_count = advertiser_data['metadata']['total_count']
        
        # Extract detailed preferences from vector data
        content_preferences = self._extract_top_preferences(vector, 'genre', 6)
        channel_preferences = self._extract_top_preferences(vector, 'channel', 8)
        network_preferences = self._extract_top_preferences(vector, 'network', 5)
        
        # Analyze geographic patterns
        geo_insights = self._analyze_geographic_patterns(vector)
        
        # Generate targeting recommendations based on actual data patterns
        preferred_targeting = [
            f"Historical TV viewer base: {total_count:,} impressions",
            f"Strongest content affinity: {content_preferences[0] if content_preferences else 'Mixed content'}",
            f"Primary network concentration: {network_preferences[0] if network_preferences else 'Multi-network'}"
        ]
        
        # Generate comprehensive insights from real data patterns
        insights = await self._generate_comprehensive_insights(advertiser, vector, campaign_objective, content_preferences, channel_preferences, network_preferences)
        
        return AdvertiserPreferences(
            advertiser=advertiser,
            preferred_targeting=preferred_targeting,
            content_preferences=content_preferences or ["Mixed Content", "Reality TV", "Entertainment"],
            channel_preferences=channel_preferences or ["Multi-channel approach"],
            network_preferences=network_preferences or ["Cross-network strategy"],
            geo_preferences=geo_insights,
            confidence=0.92,  # High confidence with real data
            insights=insights
        )
    
    async def _generate_comprehensive_insights(self, advertiser: str, vector_data: Dict, objective: str, 
                                             genres: List[str], channels: List[str], networks: List[str]) -> List[str]:
        """Generate AI-powered insights focusing on networks, channels, genres, and geographic patterns"""
        
        # Get zipcode patterns for geographic insights
        geo_data = {k: v for k, v in vector_data.items() if k.startswith('zip:') and v > 0}
        top_zips = sorted(geo_data.items(), key=lambda x: x[1], reverse=True)[:3] if geo_data else []
        
        system_prompt = f"""
        You are Neural, analyzing real historical viewing data for {advertiser}.
        
        REAL DATA PATTERNS:
        - Top Genres: {', '.join(genres[:3])}
        - Top Channels: {', '.join(channels[:3])}
        - Top Networks: {', '.join(networks[:3])}
        - Geographic Focus: {', '.join([z[0].replace('zip:', '') for z in top_zips]) if top_zips else 'Nationwide'}
        - Campaign Objective: {objective}
        
        Generate 4 specific, actionable insights focusing on:
        1. Content strategy based on genre preferences
        2. Network/channel optimization opportunities  
        3. Geographic targeting recommendations
        4. Cross-platform strategy suggestions
        
        Each insight should be 1-2 sentences and data-driven.
        """
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Provide targeting insights for {advertiser} based on historical viewing patterns"}
                ],
                temperature=0.3,
                max_tokens=300
            )
            
            # Parse insights from response
            insights_text = response.choices[0].message.content
            insights = [insight.strip() for insight in insights_text.split('\n') if insight.strip() and not insight.strip().startswith(('1.', '2.', '3.', '4.'))]
            
            # If AI fails, provide data-driven fallback insights
            if len(insights) < 3:
                insights = self._generate_fallback_insights(genres, channels, networks, top_zips)
            
            return insights[:4]  # Limit to 4 insights
            
        except Exception as e:
            print(f"AI insights generation error: {e}")
            return self._generate_fallback_insights(genres, channels, networks, top_zips)
    
    def _generate_fallback_insights(self, genres: List[str], channels: List[str], networks: List[str], top_zips: List) -> List[str]:
        """Generate fallback insights based on data patterns"""
        insights = []
        
        if genres:
            insights.append(f"Strong {genres[0]} content affinity suggests targeting similar programming blocks")
        
        if networks and len(networks) >= 2:
            insights.append(f"Multi-network strategy recommended: focus on {networks[0]} and {networks[1]}")
        elif networks:
            insights.append(f"High concentration on {networks[0]} network - consider expansion opportunities")
        
        if channels and len(channels) >= 3:
            insights.append(f"Diverse channel portfolio with {channels[0]}, {channels[1]}, {channels[2]} showing strong engagement")
        
        if top_zips:
            zip_codes = [z[0].replace('zip:', '') for z in top_zips[:2]]
            insights.append(f"Geographic targeting opportunity in ZIP codes: {', '.join(zip_codes)}")
        else:
            insights.append("Nationwide targeting strategy recommended based on broad geographic distribution")
        
        return insights[:4]
    
    def _fallback_analysis(self, advertiser: str, campaign_objective: str) -> AdvertiserPreferences:
        """Fallback analysis when advertiser not found in database"""
        
        return AdvertiserPreferences(
            advertiser=advertiser,
            preferred_targeting=["Adults 25-54", "Household Income $50K+", "Urban/Suburban"],
            content_preferences=["Reality TV", "Entertainment", "News", "Sports"],
            channel_preferences=["Multi-channel approach", "Premium networks", "Broad reach strategy"],
            network_preferences=["Cross-network strategy", "Premium content focus"],
            geo_preferences=["Nationwide targeting", "Top DMAs"],
            confidence=0.65,
            insights=[
                "No historical data available - using industry benchmarks",
                "Consider test campaigns across multiple networks for data collection",
                "Monitor performance to identify optimal content partnerships",
                "Geographic testing recommended to identify high-performing markets"
            ]
        )
    
    async def generate_reasoning(self, preferences: AdvertiserPreferences) -> str:
        """Generate reasoning text for the preferences analysis"""
        
        data_source = "real historical data" if preferences.confidence > 0.85 else "industry benchmarks"
        
        return f"""
        📈 Neural - Historical Pattern Analysis
        
        Retrieved buying patterns for {preferences.advertiser} using {data_source}:
        
        Content Preferences:
        {chr(10).join([f"• {pref}" for pref in preferences.content_preferences[:4]])}
        
        Network Preferences:
        {chr(10).join([f"• {pref}" for pref in preferences.network_preferences[:3]])}
        
        Channel Strategy:
        {chr(10).join([f"• {pref}" for pref in preferences.channel_preferences[:3]])}
        
        Geographic Insights:
        {chr(10).join([f"• {pref}" for pref in preferences.geo_preferences[:2]])}
        
        Key Targeting Insights:
        {chr(10).join([f"• {insight}" for insight in preferences.preferred_targeting[:2]])}
        
        Strategic Recommendations:
        {chr(10).join([f"• {insight}" for insight in preferences.insights[:3]])}
        
        Historical patterns successfully retrieved and analyzed.
        """ 