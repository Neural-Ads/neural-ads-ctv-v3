"""
Forecasting Agent - Campaign Spend & Inventory Forecasting
Neural Ads - Connected TV Advertising Platform
"""

import json
import asyncio
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import os

@dataclass
class WeeklyForecast:
    week_number: int
    week_dates: str
    inventory_available_mm: float
    forecasted_impressions_mm: float
    fill_rate_percent: float
    ecpm_dollars: float
    notes: str

@dataclass
class ForecastingResult:
    advertiser: str
    campaign_total_budget: float
    weekly_forecasts: List[WeeklyForecast]
    month_totals: Dict[str, float]
    campaign_totals: Dict[str, float]
    forecasting_insights: List[str]
    confidence: float

class ForecastingAgent:
    """
    Specialized agent for campaign spend and inventory forecasting
    
    Takes line item data from campaign generation and combines it with
    inventory availability data to create weekly spend forecasts with
    fill rates, eCPM projections, and delivery insights.
    """
    
    def __init__(self):
        self.inventory_data = self._load_inventory_data()
    
    def _load_inventory_data(self) -> Dict[str, Any]:
        """Load inventory availability data from JSON file"""
        try:
            # Try to load from the data directory
            inventory_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'inventory_availability.json')
            
            if os.path.exists(inventory_path):
                with open(inventory_path, 'r') as f:
                    return json.load(f)
            else:
                # Return mock inventory data if file doesn't exist
                return self._generate_mock_inventory_data()
                
        except Exception as e:
            print(f"⚠️ Could not load inventory data: {e}")
            return self._generate_mock_inventory_data()
    
    def _generate_mock_inventory_data(self) -> Dict[str, Any]:
        """Generate mock inventory data for demonstration"""
        return {
            "inventory_pools": {
                "premium_ctv": {
                    "weekly_availability_mm": [45.2, 48.1, 52.3, 49.7],
                    "avg_cpm_range": [12.50, 18.00],
                    "fill_rate_range": [0.75, 0.92]
                },
                "standard_ctv": {
                    "weekly_availability_mm": [78.5, 82.1, 85.6, 80.3],
                    "avg_cpm_range": [8.50, 12.00],
                    "fill_rate_range": [0.85, 0.95]
                },
                "sports_content": {
                    "weekly_availability_mm": [25.3, 28.7, 31.2, 29.8],
                    "avg_cpm_range": [15.00, 22.00],
                    "fill_rate_range": [0.65, 0.85]
                }
            },
            "seasonal_factors": {
                "q1_multiplier": 0.85,
                "q2_multiplier": 1.10,
                "q3_multiplier": 0.95,
                "q4_multiplier": 1.25
            },
            "last_updated": "2024-01-15T10:00:00Z"
        }
    
    async def generate_forecast(
        self,
        advertiser: str,
        line_items: List[Dict[str, Any]],
        campaign_budget: float,
        campaign_timeline: str = "4 weeks"
    ) -> ForecastingResult:
        """
        Generate weekly spend forecast based on line items and inventory availability
        
        Args:
            advertiser: Advertiser name
            line_items: List of line item dictionaries from campaign generation
            campaign_budget: Total campaign budget
            campaign_timeline: Campaign duration (default 4 weeks)
        
        Returns:
            ForecastingResult with weekly forecasts and insights
        """
        
        print(f"🔮 Generating forecast for {advertiser} - ${campaign_budget:,.2f} budget")
        
        # Parse timeline to get number of weeks
        num_weeks = self._parse_timeline_to_weeks(campaign_timeline)
        
        # Calculate weekly budget distribution
        weekly_budgets = self._distribute_budget_weekly(campaign_budget, num_weeks)
        
        # Generate weekly forecasts
        weekly_forecasts = []
        for week in range(num_weeks):
            forecast = await self._generate_weekly_forecast(
                week + 1,
                weekly_budgets[week],
                line_items,
                advertiser
            )
            weekly_forecasts.append(forecast)
        
        # Calculate totals
        month_totals = self._calculate_month_totals(weekly_forecasts)
        campaign_totals = self._calculate_campaign_totals(weekly_forecasts)
        
        # Generate insights
        insights = self._generate_forecasting_insights(weekly_forecasts, line_items, advertiser)
        
        # Calculate confidence based on inventory availability and line item quality
        confidence = self._calculate_forecast_confidence(weekly_forecasts, line_items)
        
        return ForecastingResult(
            advertiser=advertiser,
            campaign_total_budget=campaign_budget,
            weekly_forecasts=weekly_forecasts,
            month_totals=month_totals,
            campaign_totals=campaign_totals,
            forecasting_insights=insights,
            confidence=confidence
        )
    
    def _parse_timeline_to_weeks(self, timeline: str) -> int:
        """Parse timeline string to number of weeks"""
        timeline_lower = timeline.lower()
        
        if "week" in timeline_lower:
            # Extract number from timeline
            import re
            numbers = re.findall(r'\d+', timeline_lower)
            if numbers:
                return int(numbers[0])
        
        # Default to 4 weeks
        return 4
    
    def _distribute_budget_weekly(self, total_budget: float, num_weeks: int) -> List[float]:
        """Distribute budget across weeks with realistic pacing"""
        
        # Apply pacing curve (higher spend in middle weeks)
        pacing_weights = []
        for week in range(num_weeks):
            if num_weeks <= 2:
                weight = 1.0  # Even distribution for short campaigns
            elif week == 0:
                weight = 0.8  # Slower start
            elif week == num_weeks - 1:
                weight = 0.9  # Controlled finish
            else:
                weight = 1.1  # Higher mid-campaign spend
            pacing_weights.append(weight)
        
        # Normalize weights
        total_weight = sum(pacing_weights)
        normalized_weights = [w / total_weight for w in pacing_weights]
        
        # Calculate weekly budgets
        return [total_budget * weight for weight in normalized_weights]
    
    async def _generate_weekly_forecast(
        self,
        week_number: int,
        weekly_budget: float,
        line_items: List[Dict[str, Any]],
        advertiser: str
    ) -> WeeklyForecast:
        """Generate forecast for a specific week"""
        
        # Calculate week dates (starting from next Monday)
        today = datetime.now()
        days_ahead = 7 - today.weekday()  # Days until next Monday
        if days_ahead <= 0:  # Today is Monday
            days_ahead += 7
        
        start_date = today + timedelta(days=days_ahead + (week_number - 1) * 7)
        end_date = start_date + timedelta(days=6)
        week_dates = f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"
        
        # Determine inventory pool based on line items
        inventory_pool = self._determine_inventory_pool(line_items)
        pool_data = self.inventory_data["inventory_pools"].get(inventory_pool, 
                                                              self.inventory_data["inventory_pools"]["standard_ctv"])
        
        # Get weekly inventory availability
        week_index = min(week_number - 1, len(pool_data["weekly_availability_mm"]) - 1)
        inventory_available = pool_data["weekly_availability_mm"][week_index]
        
        # Calculate average CPM from line items
        avg_cpm = self._calculate_average_cpm(line_items)
        
        # Estimate impressions based on budget and CPM
        estimated_impressions = (weekly_budget / avg_cpm) * 1000  # Convert to impressions
        estimated_impressions_mm = estimated_impressions / 1_000_000  # Convert to millions
        
        # Calculate fill rate based on demand vs inventory
        demand_ratio = estimated_impressions_mm / inventory_available if inventory_available > 0 else 1.0
        base_fill_rate = pool_data["fill_rate_range"][1] if demand_ratio <= 0.5 else pool_data["fill_rate_range"][0]
        
        # Adjust fill rate based on demand pressure
        if demand_ratio > 1.0:
            fill_rate = max(0.3, base_fill_rate * (1.0 / demand_ratio))
        else:
            fill_rate = min(0.95, base_fill_rate + (1.0 - demand_ratio) * 0.1)
        
        # Adjust impressions based on fill rate
        forecasted_impressions_mm = estimated_impressions_mm * fill_rate
        
        # Calculate effective CPM
        if forecasted_impressions_mm > 0:
            ecpm = (weekly_budget / forecasted_impressions_mm) / 1000  # Per thousand impressions
        else:
            ecpm = avg_cpm
        
        # Generate notes
        notes = self._generate_weekly_notes(fill_rate, demand_ratio, inventory_pool, week_number)
        
        return WeeklyForecast(
            week_number=week_number,
            week_dates=week_dates,
            inventory_available_mm=round(inventory_available, 1),
            forecasted_impressions_mm=round(forecasted_impressions_mm, 1),
            fill_rate_percent=round(fill_rate * 100, 1),
            ecpm_dollars=round(ecpm, 2),
            notes=notes
        )
    
    def _determine_inventory_pool(self, line_items: List[Dict[str, Any]]) -> str:
        """Determine which inventory pool to use based on line items"""
        
        # Analyze line items to determine inventory pool
        premium_indicators = ["premium", "sports", "news", "live"]
        sports_indicators = ["sports", "nfl", "nba", "mlb", "soccer"]
        
        for item in line_items:
            content = str(item.get("content", "")).lower()
            audience = str(item.get("audience", "")).lower()
            
            # Check for sports content
            if any(indicator in content or indicator in audience for indicator in sports_indicators):
                return "sports_content"
            
            # Check for premium content
            if any(indicator in content or indicator in audience for indicator in premium_indicators):
                return "premium_ctv"
        
        # Default to standard CTV
        return "standard_ctv"
    
    def _calculate_average_cpm(self, line_items: List[Dict[str, Any]]) -> float:
        """Calculate weighted average CPM from line items"""
        
        total_budget = 0
        weighted_cpm_sum = 0
        
        for item in line_items:
            budget = float(item.get("budget", 0))
            cpm = float(item.get("cpm", 10.0))  # Default CPM if not specified
            
            total_budget += budget
            weighted_cpm_sum += budget * cpm
        
        if total_budget > 0:
            return weighted_cpm_sum / total_budget
        else:
            return 12.0  # Default CPM
    
    def _generate_weekly_notes(self, fill_rate: float, demand_ratio: float, inventory_pool: str, week_number: int) -> str:
        """Generate contextual notes for weekly forecast"""
        
        notes = []
        
        # Fill rate insights
        if fill_rate >= 0.9:
            notes.append("High fill rate expected")
        elif fill_rate >= 0.7:
            notes.append("Good inventory availability")
        elif fill_rate >= 0.5:
            notes.append("Moderate competition for inventory")
        else:
            notes.append("High demand, consider budget adjustments")
        
        # Inventory pool insights
        if inventory_pool == "premium_ctv":
            notes.append("Premium inventory targeting")
        elif inventory_pool == "sports_content":
            notes.append("Sports content focus")
        
        # Week-specific insights
        if week_number == 1:
            notes.append("Campaign launch week")
        elif week_number >= 4:
            notes.append("Campaign optimization phase")
        
        return "; ".join(notes)
    
    def _calculate_month_totals(self, weekly_forecasts: List[WeeklyForecast]) -> Dict[str, float]:
        """Calculate monthly totals from weekly forecasts"""
        
        total_inventory = sum(f.inventory_available_mm for f in weekly_forecasts)
        total_impressions = sum(f.forecasted_impressions_mm for f in weekly_forecasts)
        avg_fill_rate = sum(f.fill_rate_percent for f in weekly_forecasts) / len(weekly_forecasts) if weekly_forecasts else 0
        avg_ecpm = sum(f.ecpm_dollars for f in weekly_forecasts) / len(weekly_forecasts) if weekly_forecasts else 0
        
        return {
            "inventory_available_mm": round(total_inventory, 1),
            "forecasted_impressions_mm": round(total_impressions, 1),
            "avg_fill_rate_percent": round(avg_fill_rate, 1),
            "avg_ecpm_dollars": round(avg_ecpm, 2)
        }
    
    def _calculate_campaign_totals(self, weekly_forecasts: List[WeeklyForecast]) -> Dict[str, float]:
        """Calculate campaign totals from weekly forecasts"""
        
        # Same as month totals for now (assuming single month campaigns)
        return self._calculate_month_totals(weekly_forecasts)
    
    def _generate_forecasting_insights(
        self,
        weekly_forecasts: List[WeeklyForecast],
        line_items: List[Dict[str, Any]],
        advertiser: str
    ) -> List[str]:
        """Generate strategic insights from forecasting analysis"""
        
        insights = []
        
        # Analyze fill rates
        fill_rates = [f.fill_rate_percent for f in weekly_forecasts]
        avg_fill_rate = sum(fill_rates) / len(fill_rates) if fill_rates else 0
        
        if avg_fill_rate >= 85:
            insights.append("✅ Strong inventory availability across campaign timeline")
        elif avg_fill_rate >= 70:
            insights.append("⚠️ Moderate inventory pressure - monitor pacing closely")
        else:
            insights.append("🔴 High inventory competition - consider budget reallocation")
        
        # Analyze eCPM trends
        ecpms = [f.ecpm_dollars for f in weekly_forecasts]
        if len(ecpms) > 1:
            ecpm_trend = (ecpms[-1] - ecpms[0]) / ecpms[0] * 100
            if ecpm_trend > 10:
                insights.append(f"📈 eCPM trending up {ecpm_trend:.1f}% - early weeks more cost-effective")
            elif ecpm_trend < -10:
                insights.append(f"📉 eCPM trending down {ecpm_trend:.1f}% - later weeks more cost-effective")
        
        # Line item insights
        if len(line_items) > 5:
            insights.append("🎯 Diverse targeting approach with multiple line items")
        elif len(line_items) <= 2:
            insights.append("🔍 Focused targeting strategy - consider expansion if performance allows")
        
        # Advertiser-specific insights
        if "sports" in advertiser.lower():
            insights.append("🏈 Sports advertiser - monitor event schedules for inventory fluctuations")
        elif any(brand in advertiser.lower() for brand in ["automotive", "car", "auto"]):
            insights.append("🚗 Automotive sector - consider seasonal demand patterns")
        
        return insights
    
    def _calculate_forecast_confidence(
        self,
        weekly_forecasts: List[WeeklyForecast],
        line_items: List[Dict[str, Any]]
    ) -> float:
        """Calculate confidence score for the forecast"""
        
        confidence_factors = []
        
        # Fill rate consistency (higher confidence for consistent fill rates)
        fill_rates = [f.fill_rate_percent for f in weekly_forecasts]
        if fill_rates:
            fill_rate_variance = max(fill_rates) - min(fill_rates)
            fill_rate_confidence = max(0.5, 1.0 - (fill_rate_variance / 100))
            confidence_factors.append(fill_rate_confidence)
        
        # Line item data quality
        complete_line_items = sum(1 for item in line_items if item.get("budget") and item.get("cpm"))
        line_item_confidence = min(1.0, complete_line_items / max(1, len(line_items)))
        confidence_factors.append(line_item_confidence)
        
        # Inventory data freshness (mock - would be based on actual data age)
        inventory_confidence = 0.85  # Assuming reasonably fresh data
        confidence_factors.append(inventory_confidence)
        
        # Calculate overall confidence
        if confidence_factors:
            overall_confidence = sum(confidence_factors) / len(confidence_factors)
            return round(overall_confidence, 3)  # Return as 0-1 range like other agents
        else:
            return 0.75  # Default confidence as 0-1 range
    
    async def generate_reasoning(self, forecast_result: ForecastingResult) -> str:
        """Generate human-readable reasoning for the forecasting analysis"""
        
        reasoning_parts = [
            f"📊 **Forecasting Analysis Complete for {forecast_result.advertiser}**",
            "",
            f"**Campaign Overview:**",
            f"• Total Budget: ${forecast_result.campaign_total_budget:,.2f}",
            f"• Timeline: {len(forecast_result.weekly_forecasts)} weeks",
            f"• Forecast Confidence: {(forecast_result.confidence * 100):.1f}%",
            "",
            f"**Weekly Breakdown:**"
        ]
        
        for forecast in forecast_result.weekly_forecasts:
            reasoning_parts.append(
                f"• Week {forecast.week_number}: {forecast.fill_rate_percent}% fill rate, "
                f"${forecast.ecpm_dollars} eCPM, {forecast.forecasted_impressions_mm}M impressions"
            )
        
        reasoning_parts.extend([
            "",
            f"**Campaign Totals:**",
            f"• Total Forecasted Impressions: {forecast_result.campaign_totals['forecasted_impressions_mm']}M",
            f"• Average Fill Rate: {forecast_result.campaign_totals['avg_fill_rate_percent']}%",
            f"• Average eCPM: ${forecast_result.campaign_totals['avg_ecpm_dollars']}",
            "",
            f"**Key Insights:**"
        ])
        
        for insight in forecast_result.forecasting_insights:
            reasoning_parts.append(f"• {insight}")
        
        return "\n".join(reasoning_parts) 