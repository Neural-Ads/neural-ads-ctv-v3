"""
Real Data Forecasting Agent - Enhanced with Actual CTV Data
Neural Ads - Connected TV Advertising Platform

This agent uses real fill rate and inventory data to provide accurate forecasting
"""

import json
import asyncio
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import os
import sys
import logging

# Add parent directory to path to import data_loader
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from data_loader import get_real_data_loader, RealDataLoader

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
class RealDataForecastingResult:
    advertiser: str
    campaign_total_budget: float
    weekly_forecasts: List[WeeklyForecast]
    month_totals: Dict[str, float]
    campaign_totals: Dict[str, float]
    forecasting_insights: List[str]
    confidence: float
    data_source: str  # "real_data" vs "mock_data"
    targeting_breakdown: Dict[str, Any]

class RealDataForecastingAgent:
    """
    Enhanced forecasting agent that uses real CTV fill rate and inventory data
    to provide accurate campaign forecasting and spend projections.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.data_loader = None
        self._initialize_data_loader()
    
    def _initialize_data_loader(self):
        """Initialize the real data loader"""
        try:
            self.data_loader = get_real_data_loader()
            if self.data_loader and self.data_loader.fill_data is not None:
                self.logger.info("✅ Real data loader initialized successfully")
            else:
                self.logger.warning("⚠️ Real data loader initialized but no data loaded")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize real data loader: {e}")
            self.data_loader = None
    
    async def generate_forecast(
        self,
        advertiser: str,
        line_items: List[Dict[str, Any]],
        campaign_budget: float,
        campaign_timeline: str = "4 weeks",
        targeting_criteria: Dict[str, List[str]] = None
    ) -> RealDataForecastingResult:
        """
        Generate enhanced forecast using real fill rate and inventory data
        
        Args:
            advertiser: Advertiser name
            line_items: List of line item dictionaries from campaign generation
            campaign_budget: Total campaign budget
            campaign_timeline: Campaign duration (default 4 weeks)
            targeting_criteria: Dict of targeting types and values (e.g., {'network': ['hulu', 'roku']})
        
        Returns:
            RealDataForecastingResult with enhanced forecasting based on real data
        """
        
        self.logger.info(f"🔮 Generating real-data forecast for {advertiser} - ${campaign_budget:,.2f} budget")
        
        # Parse timeline to get number of weeks
        num_weeks = self._parse_timeline_to_weeks(campaign_timeline)
        
        # Extract targeting criteria from line items if not provided
        if targeting_criteria is None:
            targeting_criteria = self._extract_targeting_from_line_items(line_items)
        
        # Get real data forecasting information
        real_data_info = self._get_real_data_forecasting_info(
            targeting_criteria, campaign_budget, num_weeks
        )
        
        # Calculate weekly budget distribution
        weekly_budgets = self._distribute_budget_weekly(campaign_budget, num_weeks)
        
        # Generate weekly forecasts using real data
        weekly_forecasts = []
        for week in range(num_weeks):
            forecast = await self._generate_real_data_weekly_forecast(
                week + 1,
                weekly_budgets[week],
                real_data_info,
                targeting_criteria,
                advertiser
            )
            weekly_forecasts.append(forecast)
        
        # Calculate totals
        month_totals = self._calculate_month_totals(weekly_forecasts)
        campaign_totals = self._calculate_campaign_totals(weekly_forecasts)
        
        # Generate enhanced insights using real data
        insights = self._generate_real_data_insights(
            weekly_forecasts, targeting_criteria, real_data_info, advertiser
        )
        
        # Calculate confidence based on real data availability
        confidence = self._calculate_real_data_confidence(
            targeting_criteria, real_data_info
        )
        
        return RealDataForecastingResult(
            advertiser=advertiser,
            campaign_total_budget=campaign_budget,
            weekly_forecasts=weekly_forecasts,
            month_totals=month_totals,
            campaign_totals=campaign_totals,
            forecasting_insights=insights,
            confidence=confidence,
            data_source="real_data" if self.data_loader else "mock_data",
            targeting_breakdown=real_data_info.get('targeting_breakdown', {})
        )
    
    def _extract_targeting_from_line_items(self, line_items: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        """Extract targeting criteria from line items"""
        targeting = {}
        
        for item in line_items:
            # Extract network targeting
            content = str(item.get("content", "")).lower()
            audience = str(item.get("audience", "")).lower()
            
            # Network detection
            networks = []
            network_keywords = {
                'hulu': ['hulu', 'streaming'],
                'roku': ['roku', 'ctv'],
                'samsung': ['samsung', 'smart tv'],
                'lg': ['lg tv'],
                'vizio': ['vizio'],
                'accuweather': ['weather', 'accuweather'],
                'aetv': ['ae', 'a&e', 'aetv']
            }
            
            for network, keywords in network_keywords.items():
                if any(keyword in content or keyword in audience for keyword in keywords):
                    networks.append(network)
            
            if networks:
                targeting['network'] = list(set(targeting.get('network', []) + networks))
            
            # Content type detection
            content_types = []
            if 'premium' in content:
                content_types.append('premium')
            if 'sports' in content:
                content_types.append('sports')
            if 'news' in content:
                content_types.append('news')
            
            if content_types:
                targeting['content'] = list(set(targeting.get('content', []) + content_types))
        
        return targeting
    
    def _get_real_data_forecasting_info(self, 
                                      targeting_criteria: Dict[str, List[str]], 
                                      budget: float,
                                      weeks: int) -> Dict[str, Any]:
        """Get forecasting information from real data"""
        if not self.data_loader or self.data_loader.fill_data is None:
            # Fallback to mock data
            return self._generate_mock_forecasting_info(targeting_criteria, budget, weeks)
        
        try:
            return self.data_loader.get_forecasting_data_for_campaign(
                targeting_criteria, budget, weeks
            )
        except Exception as e:
            self.logger.warning(f"⚠️ Error getting real data, falling back to mock: {e}")
            return self._generate_mock_forecasting_info(targeting_criteria, budget, weeks)
    
    def _generate_mock_forecasting_info(self, 
                                      targeting_criteria: Dict[str, List[str]], 
                                      budget: float,
                                      weeks: int) -> Dict[str, Any]:
        """Generate mock forecasting info when real data is unavailable"""
        return {
            'fill_rate_estimate': 0.12,  # 12% default
            'available_inventory_mm': 500.0,  # 500M impressions
            'estimated_cpm': 15.0,
            'confidence_score': 0.75,
            'weekly_distribution': [125.0] * weeks,  # Even distribution
            'targeting_breakdown': {}
        }
    
    async def _generate_real_data_weekly_forecast(
        self,
        week_number: int,
        weekly_budget: float,
        real_data_info: Dict[str, Any],
        targeting_criteria: Dict[str, List[str]],
        advertiser: str
    ) -> WeeklyForecast:
        """Generate weekly forecast using real data"""
        
        # Calculate week dates
        today = datetime.now()
        days_ahead = 7 - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        
        start_date = today + timedelta(days=days_ahead + (week_number - 1) * 7)
        end_date = start_date + timedelta(days=6)
        week_dates = f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"
        
        # Get real data values
        fill_rate = real_data_info['fill_rate_estimate']
        estimated_cpm = real_data_info['estimated_cpm']
        weekly_inventory_mm = real_data_info['weekly_distribution'][min(week_number - 1, len(real_data_info['weekly_distribution']) - 1)]
        
        # Calculate impressions based on budget and CPM
        estimated_impressions = (weekly_budget / estimated_cpm) * 1000  # Convert to impressions
        estimated_impressions_mm = estimated_impressions / 1_000_000
        
        # Ensure minimum impressions for low budgets
        if estimated_impressions_mm < 0.1:
            estimated_impressions_mm = max(0.1, weekly_budget / 10000)  # Minimum viable impressions
        
        # Apply real fill rate
        forecasted_impressions_mm = estimated_impressions_mm * fill_rate
        
        # Adjust for inventory constraints
        final_impressions_mm = min(forecasted_impressions_mm, weekly_inventory_mm)
        actual_fill_rate = final_impressions_mm / estimated_impressions_mm if estimated_impressions_mm > 0 else fill_rate
        
        # Calculate effective CPM
        if final_impressions_mm > 0:
            effective_cpm = (weekly_budget / final_impressions_mm) / 1000
        else:
            effective_cpm = estimated_cpm
        
        # Generate notes based on real data
        notes = self._generate_real_data_notes(
            actual_fill_rate, targeting_criteria, week_number, real_data_info
        )
        
        return WeeklyForecast(
            week_number=week_number,
            week_dates=week_dates,
            inventory_available_mm=round(weekly_inventory_mm, 1),
            forecasted_impressions_mm=round(final_impressions_mm, 1),
            fill_rate_percent=round(actual_fill_rate * 100, 1),
            ecpm_dollars=round(effective_cpm, 2),
            notes=notes
        )
    
    def _generate_real_data_notes(self, 
                                fill_rate: float, 
                                targeting_criteria: Dict[str, List[str]], 
                                week_number: int,
                                real_data_info: Dict[str, Any]) -> str:
        """Generate contextual notes based on real data"""
        notes = []
        
        # Fill rate insights based on real data
        if fill_rate >= 0.15:  # 15%+
            notes.append("Excellent availability")
        elif fill_rate >= 0.10:  # 10-15%
            notes.append("Good inventory access")
        elif fill_rate >= 0.05:  # 5-10%
            notes.append("Moderate competition")
        else:  # <5%
            notes.append("High demand period")
        
        # Targeting-specific insights
        if 'network' in targeting_criteria:
            networks = targeting_criteria['network']
            if any(net in ['hulu', 'roku', 'samsung'] for net in networks):
                notes.append("Premium CTV targeting")
            elif 'accuweather' in networks:
                notes.append("Weather content focus")
        
        # Data confidence indicator
        confidence = real_data_info.get('confidence_score', 0.75)
        if confidence >= 0.9:
            notes.append("High data confidence")
        elif confidence < 0.7:
            notes.append("Limited historical data")
        
        # Week-specific insights
        if week_number == 1:
            notes.append("Campaign launch")
        elif week_number >= 4:
            notes.append("Optimization phase")
        
        return "; ".join(notes)
    
    def _generate_real_data_insights(self,
                                   weekly_forecasts: List[WeeklyForecast],
                                   targeting_criteria: Dict[str, List[str]],
                                   real_data_info: Dict[str, Any],
                                   advertiser: str) -> List[str]:
        """Generate strategic insights using real data"""
        insights = []
        
        # Real data availability insight
        if self.data_loader and self.data_loader.fill_data is not None:
            total_records = len(self.data_loader.fill_data)
            insights.append(f"📊 Analysis based on {total_records:,} real fill rate data points")
        
        # Fill rate analysis using real data
        avg_fill_rate = sum(f.fill_rate_percent for f in weekly_forecasts) / len(weekly_forecasts)
        real_fill_rate = real_data_info['fill_rate_estimate'] * 100
        
        if avg_fill_rate >= 15:
            insights.append(f"✅ Strong {real_fill_rate:.1f}% fill rate - excellent inventory access")
        elif avg_fill_rate >= 10:
            insights.append(f"⚠️ Moderate {real_fill_rate:.1f}% fill rate - monitor pacing closely")
        else:
            insights.append(f"🔴 Low {real_fill_rate:.1f}% fill rate - consider broader targeting")
        
        # Targeting-specific insights from real data
        if targeting_criteria:
            for target_type, values in targeting_criteria.items():
                if values and self.data_loader:
                    avg_type_fill_rate = self.data_loader.get_fill_rate_for_targeting(target_type)
                    insights.append(f"🎯 {target_type.title()} targeting: {avg_type_fill_rate:.1%} avg fill rate")
        
        # Inventory availability insights
        total_inventory = sum(f.inventory_available_mm for f in weekly_forecasts)
        total_demand = sum(f.forecasted_impressions_mm for f in weekly_forecasts)
        
        if total_demand / total_inventory < 0.5:
            insights.append("📈 Low demand pressure - opportunity for expanded reach")
        elif total_demand / total_inventory > 0.8:
            insights.append("⚡ High demand pressure - consider budget optimization")
        
        # CPM trend analysis
        cpms = [f.ecpm_dollars for f in weekly_forecasts]
        if len(cpms) > 1:
            cpm_trend = (cpms[-1] - cpms[0]) / cpms[0] * 100
            if abs(cpm_trend) > 5:
                direction = "increasing" if cpm_trend > 0 else "decreasing"
                insights.append(f"💰 eCPM {direction} by {abs(cpm_trend):.1f}% over campaign")
        
        # Data confidence insight
        confidence = real_data_info.get('confidence_score', 0.75)
        if confidence >= 0.9:
            insights.append("🔍 High confidence forecast based on extensive historical data")
        elif confidence < 0.7:
            insights.append("⚠️ Moderate confidence - limited historical data for this targeting")
        
        return insights
    
    def _calculate_real_data_confidence(self,
                                      targeting_criteria: Dict[str, List[str]],
                                      real_data_info: Dict[str, Any]) -> float:
        """Calculate confidence score based on real data availability"""
        
        base_confidence = real_data_info.get('confidence_score', 0.75)
        
        # Adjust confidence based on data source
        if not self.data_loader or self.data_loader.fill_data is None:
            return max(0.6, base_confidence - 0.2)  # Lower confidence for mock data
        
        # Boost confidence for well-covered targeting
        confidence_adjustments = []
        
        for target_type in targeting_criteria.keys():
            if hasattr(self.data_loader, '_processed_fill_rates'):
                if target_type in self.data_loader._processed_fill_rates:
                    type_data = self.data_loader._processed_fill_rates[target_type]
                    # Higher confidence for more data points
                    data_confidence = min(0.95, 0.7 + (type_data['records_count'] / 1000))
                    confidence_adjustments.append(data_confidence)
        
        if confidence_adjustments:
            final_confidence = (base_confidence + sum(confidence_adjustments)) / (1 + len(confidence_adjustments))
        else:
            final_confidence = base_confidence
        
        return min(0.98, max(0.6, final_confidence))
    
    def _parse_timeline_to_weeks(self, timeline: str) -> int:
        """Parse timeline string to number of weeks"""
        timeline_lower = timeline.lower()
        
        if "week" in timeline_lower:
            import re
            numbers = re.findall(r'\d+', timeline_lower)
            if numbers:
                return int(numbers[0])
        
        return 4  # Default to 4 weeks
    
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
        return self._calculate_month_totals(weekly_forecasts)
    
    async def generate_reasoning(self, forecast_result: RealDataForecastingResult) -> str:
        """Generate human-readable reasoning for the real data forecasting analysis"""
        
        reasoning_parts = [
            f"📊 **Enhanced Forecasting Analysis for {forecast_result.advertiser}**",
            "",
            f"**Data Source**: {forecast_result.data_source.replace('_', ' ').title()}",
            f"**Campaign Overview:**",
            f"• Total Budget: ${forecast_result.campaign_total_budget:,.2f}",
            f"• Timeline: {len(forecast_result.weekly_forecasts)} weeks",
            f"• Forecast Confidence: {(forecast_result.confidence * 100):.1f}%",
            "",
            f"**Real Data Insights:**"
        ]
        
        if forecast_result.data_source == "real_data":
            reasoning_parts.append("✅ Forecast based on actual CTV fill rates and inventory data")
        else:
            reasoning_parts.append("⚠️ Using estimated data - real data integration pending")
        
        reasoning_parts.extend([
            "",
            f"**Weekly Breakdown:**"
        ])
        
        for forecast in forecast_result.weekly_forecasts:
            reasoning_parts.append(
                f"• Week {forecast.week_number}: {forecast.fill_rate_percent}% fill rate, "
                f"${forecast.ecpm_dollars} eCPM, {forecast.forecasted_impressions_mm}M impressions"
            )
        
        reasoning_parts.extend([
            "",
            f"**Campaign Performance Projection:**",
            f"• Total Forecasted Impressions: {forecast_result.campaign_totals['forecasted_impressions_mm']}M",
            f"• Average Fill Rate: {forecast_result.campaign_totals['avg_fill_rate_percent']}%",
            f"• Average eCPM: ${forecast_result.campaign_totals['avg_ecpm_dollars']}",
            "",
            f"**Strategic Recommendations:**"
        ])
        
        for insight in forecast_result.forecasting_insights:
            reasoning_parts.append(f"• {insight}")
        
        if forecast_result.targeting_breakdown:
            reasoning_parts.extend([
                "",
                f"**Targeting Analysis:**"
            ])
            for target_type, data in forecast_result.targeting_breakdown.items():
                reasoning_parts.append(
                    f"• {target_type.title()}: {data.get('fill_rate', 0):.1%} fill rate, "
                    f"{data.get('inventory', 0):,} inventory"
                )
        
        return "\n".join(reasoning_parts)
