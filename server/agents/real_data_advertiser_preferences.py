"""
Real Data Advertiser Preferences Agent - Enhanced with Actual CTV Response Data
Neural Ads - Connected TV Advertising Platform

This agent uses real advertiser response data from resp.parquet to provide accurate insights
"""

import pandas as pd
import numpy as np
import json
import os
import sys
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from openai import AsyncOpenAI
from dotenv import load_dotenv
import logging

# Add parent directory to path to import data_loader
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from data_loader import get_real_data_loader

load_dotenv()

@dataclass
class RealAdvertiserPreferences:
    advertiser: str
    preferred_targeting: List[str]
    content_preferences: List[str]
    channel_preferences: List[str]
    network_preferences: List[str]
    geo_preferences: List[str]
    confidence: float
    insights: List[str]
    cpm_insights: Dict[str, float]  # New: Real CPM data
    performance_metrics: Dict[str, Any]  # New: Real performance data
    data_source: str  # "real_data" vs "fallback"

class RealDataAdvertiserPreferencesAgent:
    """
    Enhanced advertiser preferences agent that uses real CTV response data
    from resp.parquet to provide accurate historical insights and patterns.
    """
    
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY", "your_api_key_here")
        )
        self.model = os.getenv("AGENT_MODEL", "gpt-4o-mini")
        self.logger = logging.getLogger(__name__)
        
        # Load real data
        self.data_loader = None
        self.advertiser_response_data = None
        self._initialize_real_data()
        
        # Fallback to original database
        self.fallback_data = self._load_fallback_database()
    
    def _initialize_real_data(self):
        """Initialize real advertiser response data"""
        try:
            self.data_loader = get_real_data_loader()
            if self.data_loader and not self.data_loader.preferences_data.empty:
                self.advertiser_response_data = self.data_loader.preferences_data
                self.logger.info(f"✅ Loaded real advertiser response data: {len(self.advertiser_response_data)} records")
            else:
                self.logger.warning("⚠️ Real advertiser data not available, using fallback")
        except Exception as e:
            self.logger.error(f"❌ Failed to load real advertiser data: {e}")
    
    def _load_fallback_database(self) -> List[Dict]:
        """Load the fallback advertiser database"""
        try:
            db_path = os.path.join(os.path.dirname(__file__), "../advertiser_vector_database_full.json")
            if not os.path.exists(db_path):
                db_path = os.path.join(os.path.dirname(__file__), "../../advertiser_vector_database_full.json")
            
            with open(db_path, 'r') as f:
                data = json.load(f)
                self.logger.info(f"✅ Loaded fallback advertiser database with {len(data)} advertisers")
                return data
        except Exception as e:
            self.logger.warning(f"⚠️ Could not load fallback database: {e}")
            return []
    
    def _find_advertiser_in_real_data(self, advertiser_name: str) -> Optional[pd.Series]:
        """Find advertiser in real response data"""
        if self.advertiser_response_data is None or self.advertiser_response_data.empty:
            return None
        
        advertiser_lower = advertiser_name.lower()
        
        # Try exact domain match
        exact_match = self.advertiser_response_data[
            self.advertiser_response_data['adomain'].str.lower() == advertiser_lower
        ]
        if not exact_match.empty:
            return exact_match.iloc[0]
        
        # Try partial domain match
        partial_matches = self.advertiser_response_data[
            self.advertiser_response_data['adomain'].str.lower().str.contains(advertiser_lower, na=False)
        ]
        if not partial_matches.empty:
            # Return the one with highest total_packets (most active)
            return partial_matches.loc[partial_matches['total_packets'].idxmax()]
        
        # Try reverse partial match (advertiser name contains domain)
        for idx, row in self.advertiser_response_data.iterrows():
            domain_parts = row['adomain'].lower().split('.')
            for part in domain_parts:
                if len(part) > 3 and part in advertiser_lower:
                    return row
        
        return None
    
    def _extract_network_preferences(self, advertiser_data: pd.Series) -> Tuple[List[str], Dict[str, float]]:
        """Extract network preferences from real data"""
        network_preferences = []
        network_performance = {}
        
        # Get all network columns
        network_cols = [col for col in advertiser_data.index if col.startswith('network_')]
        
        # Calculate network performance (packets per network)
        total_packets = advertiser_data['total_packets']
        network_data = []
        
        for col in network_cols:
            network_name = col.replace('network_', '')
            packets = advertiser_data[col]
            if packets > 0:
                percentage = (packets / total_packets) * 100
                network_data.append({
                    'network': network_name,
                    'packets': packets,
                    'percentage': percentage
                })
        
        # Sort by performance
        network_data.sort(key=lambda x: x['packets'], reverse=True)
        
        # Extract top networks
        for net_data in network_data[:5]:  # Top 5 networks
            network_name = net_data['network'].title()
            if net_data['percentage'] > 1.0:  # Only include significant networks
                network_preferences.append(network_name)
                network_performance[network_name] = net_data['percentage']
        
        return network_preferences, network_performance
    
    def _extract_geographic_preferences(self, advertiser_data: pd.Series) -> List[str]:
        """Extract geographic preferences from zip code data"""
        geo_preferences = []
        
        # Get zip code columns
        zip_cols = [col for col in advertiser_data.index if col.startswith('zip_')]
        
        if not zip_cols:
            return ["Nationwide targeting"]
        
        # Find top zip codes
        zip_data = []
        for col in zip_cols:
            if advertiser_data[col] > 0:
                zip_code = col.replace('zip_', '')
                zip_data.append({
                    'zip': zip_code,
                    'packets': advertiser_data[col]
                })
        
        if not zip_data:
            return ["Nationwide targeting"]
        
        # Sort by performance
        zip_data.sort(key=lambda x: x['packets'], reverse=True)
        
        # Group by regions (simple state-based grouping)
        state_performance = {}
        for zip_info in zip_data[:50]:  # Top 50 zips
            zip_code = zip_info['zip']
            if len(zip_code) >= 2:
                # Simple state mapping based on zip code prefixes
                state = self._zip_to_state_region(zip_code)
                if state:
                    state_performance[state] = state_performance.get(state, 0) + zip_info['packets']
        
        # Extract top states/regions
        if state_performance:
            sorted_states = sorted(state_performance.items(), key=lambda x: x[1], reverse=True)
            for state, _ in sorted_states[:3]:  # Top 3 regions
                geo_preferences.append(state)
        
        if not geo_preferences:
            geo_preferences = ["Top DMAs", "Urban markets"]
        
        return geo_preferences
    
    def _zip_to_state_region(self, zip_code: str) -> Optional[str]:
        """Simple mapping of zip code prefixes to regions"""
        if not zip_code or len(zip_code) < 2:
            return None
        
        prefix = zip_code[:2]
        zip_to_region = {
            '90': 'California', '91': 'California', '92': 'California', '93': 'California',
            '94': 'California', '95': 'California', '96': 'California',
            '10': 'New York', '11': 'New York', '12': 'New York', '13': 'New York', '14': 'New York',
            '60': 'Illinois', '61': 'Illinois', '62': 'Illinois',
            '75': 'Texas', '76': 'Texas', '77': 'Texas', '78': 'Texas', '79': 'Texas',
            '33': 'Florida', '34': 'Florida', '32': 'Florida',
            '98': 'Washington', '99': 'Washington',
            '80': 'Colorado', '81': 'Colorado',
            '30': 'Georgia', '31': 'Georgia',
            '85': 'Arizona', '86': 'Arizona',
            '97': 'Oregon',
            '89': 'Nevada',
            '84': 'Utah',
            '87': 'New Mexico', '88': 'New Mexico',
            '83': 'Idaho',
            '59': 'Montana',
            '82': 'Wyoming',
            '58': 'North Dakota',
            '57': 'South Dakota',
            '68': 'Nebraska', '69': 'Nebraska',
            '66': 'Kansas', '67': 'Kansas',
            '73': 'Oklahoma', '74': 'Oklahoma',
            '72': 'Arkansas',
            '70': 'Louisiana', '71': 'Louisiana',
            '63': 'Missouri', '64': 'Missouri', '65': 'Missouri',
            '50': 'Iowa', '51': 'Iowa', '52': 'Iowa',
            '55': 'Minnesota', '56': 'Minnesota',
            '54': 'Wisconsin', '53': 'Wisconsin',
            '49': 'Michigan', '48': 'Michigan',
            '43': 'Ohio', '44': 'Ohio', '45': 'Ohio',
            '46': 'Indiana', '47': 'Indiana',
            '40': 'Kentucky', '41': 'Kentucky', '42': 'Kentucky',
            '37': 'North Carolina', '28': 'North Carolina',
            '29': 'South Carolina',
            '35': 'Alabama', '36': 'Alabama',
            '38': 'Mississippi', '39': 'Mississippi',
            '20': 'Washington DC', '21': 'Maryland', '22': 'Virginia',
            '23': 'Virginia', '24': 'Virginia',
            '25': 'Massachusetts', '26': 'Massachusetts', '27': 'Massachusetts',
            '06': 'Connecticut', '07': 'New Jersey', '08': 'New Jersey', '09': 'New Jersey',
            '19': 'Pennsylvania', '15': 'Pennsylvania', '16': 'Pennsylvania', '17': 'Pennsylvania', '18': 'Pennsylvania'
        }
        
        return zip_to_region.get(prefix, f"Region {prefix}")
    
    def _extract_cpm_insights(self, advertiser_data: pd.Series) -> Dict[str, float]:
        """Extract CPM insights from real data"""
        cpm_insights = {}
        
        cpm_fields = ['total_cpm', 'max_cpm', 'min_cpm', 'avg_cpm', 'median_cpm']
        for field in cpm_fields:
            if field in advertiser_data.index and not pd.isna(advertiser_data[field]):
                cpm_insights[field.replace('_cpm', '')] = round(float(advertiser_data[field]), 2)
        
        return cpm_insights
    
    def _generate_real_data_insights(self, 
                                   advertiser_name: str,
                                   advertiser_data: pd.Series,
                                   network_performance: Dict[str, float]) -> List[str]:
        """Generate insights based on real data analysis"""
        insights = []
        
        # Total activity insight
        total_packets = advertiser_data['total_packets']
        insights.append(f"Historical data shows {total_packets:,} total ad requests")
        
        # Network performance insights
        if network_performance:
            top_network = max(network_performance.items(), key=lambda x: x[1])
            insights.append(f"Strongest performance on {top_network[0]} network ({top_network[1]:.1f}% of traffic)")
            
            if len(network_performance) > 1:
                insights.append(f"Active across {len(network_performance)} networks - multi-channel approach preferred")
        
        # CPM insights
        if 'avg_cpm' in advertiser_data.index and not pd.isna(advertiser_data['avg_cpm']):
            avg_cpm = advertiser_data['avg_cpm']
            if avg_cpm > 15:
                insights.append(f"Premium CPM strategy (${avg_cpm:.2f} average) - quality-focused approach")
            elif avg_cpm > 10:
                insights.append(f"Competitive CPM range (${avg_cpm:.2f} average) - balanced efficiency")
            else:
                insights.append(f"Cost-efficient approach (${avg_cpm:.2f} average) - volume-focused")
        
        # Geographic diversity insight
        zip_cols = [col for col in advertiser_data.index if col.startswith('zip_') and advertiser_data[col] > 0]
        if len(zip_cols) > 100:
            insights.append("Broad geographic reach - nationwide targeting strategy")
        elif len(zip_cols) > 20:
            insights.append("Selective geographic targeting - focused regional approach")
        else:
            insights.append("Highly targeted geographic strategy - premium market focus")
        
        return insights
    
    def _fallback_to_vector_database(self, advertiser_name: str) -> RealAdvertiserPreferences:
        """Fallback to original vector database when real data is unavailable"""
        # Use original logic from advertiser_preferences.py
        advertiser_data = self._find_advertiser_in_fallback(advertiser_name)
        
        if not advertiser_data:
            return self._generate_industry_fallback(advertiser_name)
        
        vector_data = advertiser_data.get('vector_data', {})
        
        return RealAdvertiserPreferences(
            advertiser=advertiser_name,
            preferred_targeting=self._extract_top_preferences(vector_data, "targeting", 3),
            content_preferences=self._extract_top_preferences(vector_data, "content", 4),
            channel_preferences=self._extract_top_preferences(vector_data, "channel", 3),
            network_preferences=self._extract_top_preferences(vector_data, "network", 4),
            geo_preferences=self._extract_top_preferences(vector_data, "geo", 3),
            confidence=0.75,  # Medium confidence for vector data
            insights=self._generate_vector_insights(advertiser_name, vector_data),
            cpm_insights={},
            performance_metrics={},
            data_source="fallback_vector"
        )
    
    def _find_advertiser_in_fallback(self, advertiser_name: str) -> Optional[Dict]:
        """Find advertiser in fallback vector database"""
        if not self.fallback_data:
            return None
        
        advertiser_lower = advertiser_name.lower()
        
        # Try exact match first
        for record in self.fallback_data:
            if record['metadata']['advertiser'].lower() == advertiser_lower:
                return record
        
        # Try partial match
        for record in self.fallback_data:
            if advertiser_lower in record['metadata']['advertiser'].lower():
                return record
        
        return None
    
    def _extract_top_preferences(self, vector_data: Dict[str, float], prefix: str, top_n: int = 5) -> List[str]:
        """Extract top preferences from vector data for a given prefix"""
        filtered = {k: v for k, v in vector_data.items() if k.startswith(prefix) and v > 0}
        sorted_items = sorted(filtered.items(), key=lambda x: x[1], reverse=True)
        return [item.replace(f"{prefix}:", "").replace(";", " + ") for item, score in sorted_items[:top_n]]
    
    def _generate_vector_insights(self, advertiser_name: str, vector_data: Dict[str, float]) -> List[str]:
        """Generate insights from vector database"""
        insights = []
        insights.append("Analysis based on historical industry patterns")
        insights.append("Consider test campaigns across multiple networks for data collection")
        insights.append("Monitor performance to identify optimal content partnerships")
        insights.append("Geographic testing recommended to identify high-performing markets")
        return insights
    
    def _generate_industry_fallback(self, advertiser_name: str) -> RealAdvertiserPreferences:
        """Generate industry-standard fallback when no data is available"""
        return RealAdvertiserPreferences(
            advertiser=advertiser_name,
            preferred_targeting=["Adults 25-54", "Household Income $50K+", "Urban/Suburban"],
            content_preferences=["Reality TV", "Entertainment", "News", "Sports"],
            channel_preferences=["Multi-channel approach", "Premium networks", "Broad reach strategy"],
            network_preferences=["Cross-network strategy", "Premium content focus"],
            geo_preferences=["Nationwide targeting", "Top DMAs"],
            confidence=0.65,  # Lower confidence for industry defaults
            insights=[
                "No historical data available - using industry benchmarks",
                "Consider test campaigns across multiple networks for data collection",
                "Monitor performance to identify optimal content partnerships",
                "Geographic testing recommended to identify high-performing markets"
            ],
            cpm_insights={"estimated_range": 12.0},
            performance_metrics={},
            data_source="industry_fallback"
        )
    
    async def analyze_advertiser_preferences(self, advertiser_name: str) -> RealAdvertiserPreferences:
        """
        Analyze advertiser preferences using real response data
        
        Args:
            advertiser_name: Name of the advertiser to analyze
            
        Returns:
            RealAdvertiserPreferences with enhanced data-driven insights
        """
        self.logger.info(f"🔍 Analyzing advertiser preferences for: {advertiser_name}")
        
        # Try to find in real data first
        real_data = self._find_advertiser_in_real_data(advertiser_name)
        
        if real_data is not None:
            return await self._analyze_from_real_data(advertiser_name, real_data)
        else:
            self.logger.info(f"No real data found for {advertiser_name}, using fallback")
            return self._fallback_to_vector_database(advertiser_name)
    
    async def _analyze_from_real_data(self, advertiser_name: str, advertiser_data: pd.Series) -> RealAdvertiserPreferences:
        """Analyze preferences from real advertiser response data"""
        
        # Extract network preferences
        network_preferences, network_performance = self._extract_network_preferences(advertiser_data)
        
        # Extract geographic preferences
        geo_preferences = self._extract_geographic_preferences(advertiser_data)
        
        # Extract CPM insights
        cpm_insights = self._extract_cpm_insights(advertiser_data)
        
        # Generate insights
        insights = self._generate_real_data_insights(advertiser_name, advertiser_data, network_performance)
        
        # Performance metrics
        performance_metrics = {
            'total_packets': int(advertiser_data['total_packets']),
            'domain': advertiser_data['adomain'],
            'active_networks': len(network_performance),
            'geographic_reach': len([col for col in advertiser_data.index if col.startswith('zip_') and advertiser_data[col] > 0])
        }
        
        # Determine content and channel preferences based on network performance and industry
        content_preferences = self._infer_content_preferences(network_performance, advertiser_name, advertiser_data)
        channel_preferences = self._infer_channel_preferences(network_performance, performance_metrics)
        
        # Determine targeting preferences
        targeting_preferences = self._infer_targeting_preferences(advertiser_data, cpm_insights)
        
        return RealAdvertiserPreferences(
            advertiser=advertiser_name,
            preferred_targeting=targeting_preferences,
            content_preferences=content_preferences,
            channel_preferences=channel_preferences,
            network_preferences=network_preferences,
            geo_preferences=geo_preferences,
            confidence=0.90,  # High confidence for real data
            insights=insights,
            cpm_insights=cpm_insights,
            performance_metrics=performance_metrics,
            data_source="real_data"
        )
    
    def _infer_content_preferences(self, network_performance: Dict[str, float], advertiser_name: str, advertiser_data: pd.Series) -> List[str]:
        """Infer content preferences based on network performance and industry knowledge"""
        content_preferences = []
        domain = advertiser_data['adomain'].lower()
        
        # Industry-specific content preferences
        if any(x in domain for x in ['nike', 'adidas', 'reebok', 'puma']):
            content_preferences.extend(["Sports Programming", "Fitness Content", "Outdoor Adventures", "Youth Entertainment"])
        elif any(x in domain for x in ['mcdonalds', 'kfc', 'subway', 'pizzahut']):
            content_preferences.extend(["Family Entertainment", "Comedy Shows", "Reality TV", "Local News"])
        elif any(x in domain for x in ['pepsi', 'coke', 'cocacola', 'sprite']):
            content_preferences.extend(["Music Programming", "Youth Entertainment", "Sports Events", "Social Content"])
        elif any(x in domain for x in ['ford', 'toyota', 'honda', 'chevrolet', 'bmw']):
            content_preferences.extend(["Sports Programming", "News", "Adventure Shows", "Lifestyle Content"])
        elif any(x in domain for x in ['apple', 'samsung', 'google', 'microsoft']):
            content_preferences.extend(["Tech Reviews", "Innovation Shows", "News", "Premium Content"])
        elif any(x in domain for x in ['walmart', 'target', 'amazon', 'costco']):
            content_preferences.extend(["Family Entertainment", "Lifestyle Shows", "Reality TV", "Local Programming"])
        else:
            # Network-based content mapping for other advertisers
            network_content_mapping = {
                'accuweather': ['News', 'Weather Content'],
                'aetv': ['Reality TV', 'Drama', 'Documentary'],
                'alliant': ['Targeted Programming'],
                'roku': ['Streaming Content', 'Premium CTV'],
                'hulu': ['Premium Streaming', 'Original Content'],
                'samsung': ['Smart TV Content'],
                'lg': ['Connected TV'],
                'vizio': ['CTV Platform Content'],
                'viacom': ['Entertainment', 'Reality TV', 'Comedy'],
                'discovery': ['Documentary', 'Reality TV', 'Educational']
            }
            
            for network, percentage in network_performance.items():
                network_lower = network.lower()
                if network_lower in network_content_mapping and percentage > 5.0:
                    content_preferences.extend(network_content_mapping[network_lower])
        
        # Remove duplicates and limit
        content_preferences = list(dict.fromkeys(content_preferences))[:4]
        
        if not content_preferences:
            content_preferences = ["Premium Content", "Entertainment", "News", "Sports"]
        
        return content_preferences
    
    def _infer_channel_preferences(self, network_performance: Dict[str, float], performance_metrics: Dict) -> List[str]:
        """Infer channel preferences based on network distribution"""
        channel_preferences = []
        
        active_networks = performance_metrics.get('active_networks', 0)
        
        if active_networks >= 5:
            channel_preferences.append("Multi-channel approach")
            channel_preferences.append("Broad reach strategy")
        elif active_networks >= 3:
            channel_preferences.append("Selective network strategy")
            channel_preferences.append("Balanced approach")
        else:
            channel_preferences.append("Focused network strategy")
            channel_preferences.append("Premium content focus")
        
        # Check for premium networks
        premium_networks = ['hulu', 'roku', 'samsung']
        has_premium = any(net.lower() in premium_networks for net in network_performance.keys())
        if has_premium:
            channel_preferences.append("Premium networks")
        
        return channel_preferences[:3]
    
    def _infer_targeting_preferences(self, advertiser_data: pd.Series, cpm_insights: Dict[str, float]) -> List[str]:
        """Infer targeting preferences based on data patterns and industry knowledge"""
        targeting_preferences = []
        domain = advertiser_data['adomain'].lower()
        avg_cpm = cpm_insights.get('avg', 0) if 'avg' in cpm_insights else 0
        total_packets = advertiser_data['total_packets']
        
        # Industry-specific targeting based on domain
        if any(x in domain for x in ['nike', 'adidas', 'reebok', 'puma']):
            targeting_preferences.extend(["Sports Enthusiasts", "Active Lifestyle", "Ages 18-45", "Urban Demographics"])
        elif any(x in domain for x in ['mcdonalds', 'kfc', 'subway', 'pizzahut']):
            targeting_preferences.extend(["Families with Children", "Convenience Seekers", "Ages 25-54", "All Income Levels"])
        elif any(x in domain for x in ['pepsi', 'coke', 'cocacola', 'sprite']):
            targeting_preferences.extend(["Young Adults", "Social Occasions", "Ages 18-34", "Entertainment Viewers"])
        elif any(x in domain for x in ['ford', 'toyota', 'honda', 'chevrolet', 'bmw']):
            targeting_preferences.extend(["Auto Intenders", "Household Income $50K+", "Ages 25-65", "Suburban/Rural"])
        elif any(x in domain for x in ['apple', 'samsung', 'google', 'microsoft']):
            targeting_preferences.extend(["Tech Early Adopters", "High Income", "Ages 25-54", "Urban/Suburban"])
        elif any(x in domain for x in ['walmart', 'target', 'amazon', 'costco']):
            targeting_preferences.extend(["Value Shoppers", "Families", "Ages 25-65", "All Demographics"])
        else:
            # Fallback based on CPM and activity patterns
            if avg_cpm > 15:
                targeting_preferences.extend(["Premium Audiences", "High-value Demographics", "Ages 25-54"])
            elif avg_cpm > 10:
                targeting_preferences.extend(["Middle Income", "Suburban Demographics", "Ages 25-54"])
            else:
                targeting_preferences.extend(["Broad Reach", "Cost-efficient Targeting", "Ages 18-54"])
        
        # Add scale-based targeting
        if total_packets > 100000:
            targeting_preferences.append("Mass Market Reach")
        elif total_packets > 10000:
            targeting_preferences.append("Targeted Campaigns")
        else:
            targeting_preferences.append("Niche Targeting")
        
        # Geographic targeting based on zip diversity
        zip_cols = [col for col in advertiser_data.index if col.startswith('zip_') and advertiser_data[col] > 0]
        if len(zip_cols) > 100:
            targeting_preferences.append("Nationwide Reach")
        elif len(zip_cols) > 20:
            targeting_preferences.append("Regional Focus")
        else:
            targeting_preferences.append("Local Markets")
        
        return targeting_preferences[:5]
    
    async def generate_reasoning(self, preferences: RealAdvertiserPreferences) -> str:
        """Generate human-readable reasoning for the advertiser analysis"""
        
        reasoning_parts = [
            f"📊 **Real Data Analysis for {preferences.advertiser}**",
            "",
            f"**Data Source**: {preferences.data_source.replace('_', ' ').title()}",
            f"**Analysis Confidence**: {(preferences.confidence * 100):.1f}%",
            ""
        ]
        
        if preferences.data_source == "real_data":
            reasoning_parts.extend([
                f"**Performance Metrics**:",
                f"• Total Ad Requests: {preferences.performance_metrics.get('total_packets', 'N/A'):,}",
                f"• Active Networks: {preferences.performance_metrics.get('active_networks', 'N/A')}",
                f"• Geographic Reach: {preferences.performance_metrics.get('geographic_reach', 'N/A')} markets",
                f"• Domain: {preferences.performance_metrics.get('domain', 'N/A')}",
                ""
            ])
        
        if preferences.cpm_insights:
            reasoning_parts.extend([
                f"**CPM Analysis**:"
            ])
            for cpm_type, value in preferences.cpm_insights.items():
                reasoning_parts.append(f"• {cpm_type.title()} CPM: ${value}")
            reasoning_parts.append("")
        
        reasoning_parts.extend([
            f"**Targeting Preferences**:",
            f"• {', '.join(preferences.preferred_targeting)}",
            "",
            f"**Content Preferences**:",
            f"• {', '.join(preferences.content_preferences)}",
            "",
            f"**Network Strategy**:",
            f"• {', '.join(preferences.network_preferences)}",
            "",
            f"**Geographic Strategy**:",
            f"• {', '.join(preferences.geo_preferences)}",
            "",
            f"**Key Insights**:"
        ])
        
        for insight in preferences.insights:
            reasoning_parts.append(f"• {insight}")
        
        return "\n".join(reasoning_parts)
