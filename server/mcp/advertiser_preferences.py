"""
MCP Resource: Advertiser Preferences Database
Simulates behavioral data from programmatic buying encoder

This would normally be connected to the actual encoder database
that processes log files from programmatic buying to learn
advertiser preferences and behaviors.
"""

import json
import random
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict

@dataclass
class AdvertiserPreference:
    advertiser_id: str
    brand: str
    category: str
    network_affinities: List[str]
    genre_preferences: List[str] 
    audience_segments: List[str]
    device_targeting: List[str]
    os_preferences: List[str]
    geo_preferences: List[str]
    daypart_patterns: Dict[str, float]
    budget_allocation: Dict[str, float]
    performance_metrics: Dict[str, float]
    confidence_score: float

class AdvertiserPreferencesDB:
    """
    Simulated MCP Resource for Advertiser Behavioral Intelligence
    
    In production, this would connect to the encoder database that
    processes programmatic buying logs to extract advertiser patterns.
    """
    
    def __init__(self):
        self.preferences_cache = {}
        self._initialize_sample_data()
    
    def _initialize_sample_data(self):
        """Initialize with real advertiser data from parquet file"""
        
        try:
            # Try to load real data from parquet file
            from pathlib import Path
            import pandas as pd
            
            parquet_path = Path(__file__).parent / ".." / "data" / "real_data" / "resp.parquet"
            
            if parquet_path.exists():
                print(f"📊 Loading advertiser data from {parquet_path}")
                df = pd.read_parquet(parquet_path)
                
                # Get unique advertisers with their data
                unique_advertisers = df.groupby('adomain').agg({
                    'total_packets': 'sum',
                    'avg_cpm': 'mean',
                    'median_cpm': 'mean'
                }).reset_index()
                
                # Sort by total packets/activity and take top advertisers for better performance
                unique_advertisers = unique_advertisers.sort_values('total_packets', ascending=False).head(1000)
                
                print(f"✅ Loading {len(unique_advertisers)} advertisers from parquet data")
                
                # Convert to advertiser preferences format
                for _, row in unique_advertisers.iterrows():
                    domain = row['adomain']
                    
                    # Generate advertiser preference data based on real metrics
                    advertiser_data = {
                        "advertiser_id": f"real_{domain.replace('.', '_')}",
                        "brand": domain.replace('.com', '').replace('.', ' ').title(),
                        "category": self._categorize_domain(domain),
                        "network_affinities": ["Hulu", "Netflix", "Disney+", "Paramount+", "Prime Video"],
                        "genre_preferences": ["Drama", "Comedy", "Sports", "News"],
                        "audience_segments": ["Adults_18-54", "HHI_50K+", "Connected_TV_Users"],
                        "device_targeting": ["Connected TV", "Mobile", "Desktop"],
                        "os_preferences": ["Roku", "Apple TV", "Android TV", "Fire TV"],
                        "geo_preferences": ["National", "Top_DMAs"],
                        "daypart_patterns": {
                            "Prime_Time": 0.4,
                            "Daytime": 0.3,
                            "Late_Night": 0.3
                        },
                        "budget_allocation": {
                            "Brand_Awareness": 0.5,
                            "Consideration": 0.3,
                            "Conversion": 0.2
                        },
                        "performance_metrics": {
                            "Avg_CPM": round(float(row['avg_cpm']), 2) if row['avg_cpm'] > 0 else 5.0,
                            "Median_CPM": round(float(row['median_cpm']), 2) if row['median_cpm'] > 0 else 5.0,
                            "Total_Packets": int(row['total_packets']),
                            "Activity_Score": round(float(row['total_packets']) / 1000000, 2)
                        },
                        "confidence_score": min(0.95, max(0.5, float(row['total_packets']) / 10000))
                    }
                    
                    preference = AdvertiserPreference(**advertiser_data)
                    self.preferences_cache[preference.advertiser_id] = preference
                    
                print(f"🎯 Successfully loaded {len(self.preferences_cache)} real advertisers")
                return
                
        except Exception as e:
            print(f"⚠️ Could not load parquet data: {e}")
        
        # Fallback to sample data if parquet loading fails
        print("📝 Using fallback sample advertiser data")
        sample_advertisers = [
            {
                "advertiser_id": "automotive_luxury_001",
                "brand": "Premium Auto Brand",
                "category": "Automotive",
                "network_affinities": ["Hulu", "Paramount+", "HBO Max", "Netflix"],
                "genre_preferences": ["Sports", "News", "Drama", "Documentary"],
                "audience_segments": ["HHI_100K+", "Male_35-54", "Urban_Metro", "Auto_Intenders"],
                "device_targeting": ["Connected TV", "Tablet", "Desktop"],
                "os_preferences": ["Android TV", "Apple TV", "Roku", "Samsung Tizen"],
                "geo_preferences": ["New York", "Los Angeles", "Chicago", "Dallas"],
                "daypart_patterns": {
                    "Prime_Time": 0.4,
                    "Late_Night": 0.25,
                    "Weekend_Sports": 0.35
                },
                "budget_allocation": {
                    "Brand_Awareness": 0.6,
                    "Consideration": 0.3,
                    "Conversion": 0.1
                },
                "performance_metrics": {
                    "CTR": 0.0234,
                    "Completion_Rate": 0.892,
                    "CPA": 45.67
                },
                "confidence_score": 0.91
            },
            {
                "advertiser_id": "retail_fashion_002", 
                "brand": "Fashion Retailer",
                "category": "Retail/Fashion",
                "network_affinities": ["Netflix", "Disney+", "Prime Video", "Peacock"],
                "genre_preferences": ["Reality", "Comedy", "Lifestyle", "Drama"],
                "audience_segments": ["Female_25-44", "HHI_50K-100K", "Suburban", "Fashion_Shoppers"],
                "device_targeting": ["Mobile", "Connected TV", "Tablet"],
                "os_preferences": ["iOS", "Android", "Roku", "Fire TV"],
                "geo_preferences": ["California", "Texas", "Florida", "New York"],
                "daypart_patterns": {
                    "Daytime": 0.3,
                    "Prime_Time": 0.45,
                    "Weekend": 0.25
                },
                "budget_allocation": {
                    "Brand_Awareness": 0.3,
                    "Consideration": 0.4,
                    "Conversion": 0.3
                },
                "performance_metrics": {
                    "CTR": 0.0189,
                    "Completion_Rate": 0.834,
                    "CPA": 28.45
                },
                "confidence_score": 0.87
            },
            {
                "advertiser_id": "tech_saas_003",
                "brand": "B2B SaaS Platform", 
                "category": "Technology/SaaS",
                "network_affinities": ["YouTube TV", "Hulu", "LinkedIn Video", "Paramount+"],
                "genre_preferences": ["News", "Business", "Documentary", "Tech"],
                "audience_segments": ["Business_Decision_Makers", "Male_28-55", "HHI_75K+", "Tech_Users"],
                "device_targeting": ["Desktop", "Connected TV", "Mobile"],
                "os_preferences": ["Windows", "macOS", "Apple TV", "Chromecast"],
                "geo_preferences": ["San Francisco", "Seattle", "Austin", "Boston"],
                "daypart_patterns": {
                    "Business_Hours": 0.5,
                    "Early_Evening": 0.3,
                    "Weekends": 0.2
                },
                "budget_allocation": {
                    "Brand_Awareness": 0.4,
                    "Lead_Generation": 0.6
                },
                "performance_metrics": {
                    "CTR": 0.0312,
                    "Completion_Rate": 0.756,
                    "CPL": 125.89
                },
                "confidence_score": 0.83
            }
        ]
        
        for adv_data in sample_advertisers:
            preference = AdvertiserPreference(**adv_data)
            self.preferences_cache[preference.advertiser_id] = preference
    
    def _categorize_domain(self, domain: str) -> str:
        """Categorize advertiser based on domain name"""
        domain_lower = domain.lower()
        
        # Define category keywords
        categories = {
            "Automotive": ["auto", "car", "ford", "toyota", "honda", "chevy", "bmw", "mercedes", "vehicle", "truck", "motor"],
            "Retail/Fashion": ["shop", "store", "fashion", "clothing", "retail", "outlet", "mall", "apparel"],
            "Technology/SaaS": ["tech", "software", "app", "digital", "cloud", "data", "ai", "cyber", "web"],
            "Healthcare": ["health", "medical", "hospital", "clinic", "pharma", "care", "wellness"],
            "Financial": ["bank", "finance", "loan", "credit", "insurance", "invest", "capital"],
            "Food & Beverage": ["food", "restaurant", "coffee", "pizza", "burger", "drink", "beverage"],
            "Entertainment": ["game", "music", "movie", "tv", "entertainment", "casino", "sport"],
            "Education": ["edu", "school", "university", "college", "learn", "academy"],
            "Real Estate": ["real", "estate", "property", "home", "house", "apartment"],
            "Travel": ["travel", "hotel", "flight", "vacation", "tourism", "resort"]
        }
        
        # Check for category matches
        for category, keywords in categories.items():
            if any(keyword in domain_lower for keyword in keywords):
                return category
        
        return "General/Other"
    
    async def get_advertiser_preferences(self, 
                                       advertiser_id: Optional[str] = None,
                                       category: Optional[str] = None,
                                       brand: Optional[str] = None) -> List[AdvertiserPreference]:
        """
        Retrieve advertiser preferences from encoder database
        
        Args:
            advertiser_id: Specific advertiser ID
            category: Filter by advertiser category
            brand: Filter by brand name
            
        Returns:
            List of matching advertiser preferences
        """
        
        if advertiser_id and advertiser_id in self.preferences_cache:
            return [self.preferences_cache[advertiser_id]]
        
        results = list(self.preferences_cache.values())
        
        if category:
            results = [p for p in results if category.lower() in p.category.lower()]
        
        if brand:
            results = [p for p in results if brand.lower() in p.brand.lower()]
        
        return results
    
    async def get_network_recommendations(self, advertiser_category: str) -> List[Dict[str, Any]]:
        """Get network recommendations based on category performance"""
        
        category_networks = {
            "Automotive": [
                {"network": "Hulu", "performance_score": 0.92, "reach": "High"},
                {"network": "Paramount+", "performance_score": 0.87, "reach": "Medium"},
                {"network": "HBO Max", "performance_score": 0.89, "reach": "Medium"},
                {"network": "ESPN+", "performance_score": 0.94, "reach": "High"}
            ],
            "Retail": [
                {"network": "Netflix", "performance_score": 0.88, "reach": "Very High"},
                {"network": "Disney+", "performance_score": 0.85, "reach": "High"},
                {"network": "Prime Video", "performance_score": 0.91, "reach": "High"},
                {"network": "Peacock", "performance_score": 0.82, "reach": "Medium"}
            ],
            "Technology": [
                {"network": "YouTube TV", "performance_score": 0.89, "reach": "High"},
                {"network": "Hulu", "performance_score": 0.86, "reach": "High"},
                {"network": "LinkedIn Video", "performance_score": 0.93, "reach": "Low"},
                {"network": "Apple TV+", "performance_score": 0.84, "reach": "Medium"}
            ]
        }
        
        return category_networks.get(advertiser_category, [])
    
    async def get_audience_insights(self, campaign_objective: str) -> Dict[str, Any]:
        """Get audience targeting insights based on campaign objectives"""
        
        objective_insights = {
            "awareness": {
                "recommended_segments": ["Broad_Demo_25-54", "High_Reach_Audiences", "Lookalike_Existing"],
                "targeting_strategy": "Broad reach with frequency capping",
                "optimal_frequency": "3-5x per week",
                "budget_allocation": {"Video": 0.7, "Display": 0.3}
            },
            "consideration": {
                "recommended_segments": ["In_Market_Audiences", "Interest_Based", "Behavioral_Segments"],
                "targeting_strategy": "Mid-funnel engagement focus",
                "optimal_frequency": "5-8x per week", 
                "budget_allocation": {"Video": 0.6, "Interactive": 0.4}
            },
            "conversion": {
                "recommended_segments": ["High_Intent", "Retargeting", "Custom_Audiences"],
                "targeting_strategy": "Precision targeting with higher frequency",
                "optimal_frequency": "8-12x per week",
                "budget_allocation": {"Video": 0.5, "Performance": 0.5}
            }
        }
        
        return objective_insights.get(campaign_objective.lower(), {})

# Global instance for MCP access
advertiser_prefs_db = AdvertiserPreferencesDB()

async def query_advertiser_preferences(query_params: Dict[str, Any]) -> Dict[str, Any]:
    """
    MCP Resource Interface for Advertiser Preferences
    
    This function would be called by the COT Agent to access
    advertiser behavioral intelligence from the encoder database.
    """
    
    try:
        preferences = await advertiser_prefs_db.get_advertiser_preferences(
            advertiser_id=query_params.get('advertiser_id'),
            category=query_params.get('category'),
            brand=query_params.get('brand')
        )
        
        return {
            "status": "success",
            "preferences": [asdict(p) for p in preferences],
            "count": len(preferences),
            "source": "encoder_database"
        }
        
    except Exception as e:
        return {
            "status": "error", 
            "message": str(e),
            "preferences": [],
            "count": 0
        } 