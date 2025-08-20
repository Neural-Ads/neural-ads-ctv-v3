"""
Multi-Agent Orchestrator - Coordinates Specialized Campaign Agents
Neural Ads - Connected TV Advertising Platform
"""

import asyncio
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
import threading
import time

from .campaign_parser import CampaignParserAgent, CampaignParameters
from .advertiser_preferences import AdvertiserPreferencesAgent, AdvertiserPreferences
from .real_data_advertiser_preferences import RealDataAdvertiserPreferencesAgent, RealAdvertiserPreferences
from .audience_generation import AudienceGenerationAgent, AudienceAnalysis
from .lineitem_generator import LineItemGeneratorAgent, CampaignStructure
from .forecasting_agent import ForecastingAgent, ForecastingResult
from .real_data_forecasting_agent import RealDataForecastingAgent

class WorkflowStep(Enum):
    CAMPAIGN_DATA = "campaign_data"
    ADVERTISER_PREFERENCES = "advertiser_preferences" 
    AUDIENCE_GENERATION = "audience_generation"
    CAMPAIGN_GENERATION = "campaign_generation"
    FORECASTING = "forecasting"
    COMPLETE = "complete"

@dataclass
class WorkflowResult:
    step: WorkflowStep
    reasoning: str
    action: str
    data: Dict[str, Any]
    confidence: float

class MultiAgentOrchestrator:
    """
    Orchestrates specialized agents for CTV campaign planning
    
    Workflow:
    1. CampaignParserAgent - Parse campaign requirements
    2. AdvertiserPreferencesAgent - Analyze historical patterns  
    3. AudienceGenerationAgent - Create ACR segments
    4. LineItemGeneratorAgent - Build executable campaigns
    5. ForecastingAgent - Generate spend forecasts and inventory analysis
    
    Each agent receives structured output from the previous agent,
    ensuring clean data flow and proper step progression.
    """
    
    def __init__(self):
        self.current_step = WorkflowStep.CAMPAIGN_DATA
        self.campaign_context = {}
        
        # Thread lock to prevent race conditions
        self._lock = threading.Lock()
        self._last_advance_time = 0
        self._processing = False
        
        # Initialize specialized agents
        self.campaign_parser = CampaignParserAgent()
        self.preferences_agent = RealDataAdvertiserPreferencesAgent()  # Use real data preferences
        self.audience_agent = AudienceGenerationAgent()
        self.lineitem_agent = LineItemGeneratorAgent()
        self.forecasting_agent = RealDataForecastingAgent()  # Use real data forecasting
        
        # Store results from each step
        self.campaign_parameters: Optional[CampaignParameters] = None
        self.advertiser_preferences: Optional[AdvertiserPreferences] = None
        self.audience_analysis: Optional[AudienceAnalysis] = None
        self.campaign_structure: Optional[CampaignStructure] = None
        self.forecasting_result: Optional[ForecastingResult] = None
    
    def _validate_step_transition(self, current: WorkflowStep, next_step: WorkflowStep) -> bool:
        """Validate that step transition is valid"""
        valid_transitions = {
            WorkflowStep.CAMPAIGN_DATA: WorkflowStep.ADVERTISER_PREFERENCES,
            WorkflowStep.ADVERTISER_PREFERENCES: WorkflowStep.AUDIENCE_GENERATION,  # Include audience generation
            WorkflowStep.AUDIENCE_GENERATION: WorkflowStep.CAMPAIGN_GENERATION,
            WorkflowStep.CAMPAIGN_GENERATION: WorkflowStep.FORECASTING,
            WorkflowStep.FORECASTING: WorkflowStep.COMPLETE
        }
        
        return valid_transitions.get(current) == next_step
    
    def _validate_step_prerequisites(self, step: WorkflowStep) -> bool:
        """Validate that prerequisites for a step are met"""
        if step == WorkflowStep.CAMPAIGN_DATA:
            return True
        elif step == WorkflowStep.ADVERTISER_PREFERENCES:
            return self.campaign_parameters is not None
        elif step == WorkflowStep.AUDIENCE_GENERATION:
            return self.campaign_parameters is not None and self.advertiser_preferences is not None
        elif step == WorkflowStep.CAMPAIGN_GENERATION:
            return all([self.campaign_parameters, self.advertiser_preferences, self.audience_analysis])
        elif step == WorkflowStep.FORECASTING:
            # Forecasting needs campaign params, advertiser preferences, and campaign structure
            return all([self.campaign_parameters, self.advertiser_preferences, self.campaign_structure])
        
        return False
    
    async def process_step(self, user_input: str = "") -> WorkflowResult:
        """Process the current workflow step with robust error handling"""
        
        with self._lock:
            if self._processing:
                raise ValueError("Another request is already being processed")
            self._processing = True
        
        try:
            print(f"🔄 Processing step: {self.current_step.value}")
            
            # Validate prerequisites
            if not self._validate_step_prerequisites(self.current_step):
                raise ValueError(f"Prerequisites not met for step: {self.current_step.value}")
            
            if self.current_step == WorkflowStep.CAMPAIGN_DATA:
                return await self._process_campaign_parsing(user_input)
            elif self.current_step == WorkflowStep.ADVERTISER_PREFERENCES:
                return await self._process_advertiser_analysis()
            elif self.current_step == WorkflowStep.AUDIENCE_GENERATION:
                return await self._process_audience_generation()
            elif self.current_step == WorkflowStep.CAMPAIGN_GENERATION:
                return await self._process_line_item_generation()
            elif self.current_step == WorkflowStep.FORECASTING:
                return await self._process_forecasting()
            else:
                return WorkflowResult(
                    step=self.current_step,
                    reasoning="Workflow complete",
                    action="Campaign ready for deployment",
                    data={"status": "complete"},
                    confidence=1.0
                )
        except Exception as e:
            print(f"❌ Error processing step {self.current_step.value}: {str(e)}")
            raise
        finally:
            with self._lock:
                self._processing = False
    
    async def _process_campaign_parsing(self, user_input: str) -> WorkflowResult:
        """Step 1: Parse campaign requirements"""
        
        try:
            self.campaign_parameters = await self.campaign_parser.parse_campaign_brief(user_input)
            reasoning = await self.campaign_parser.generate_reasoning(self.campaign_parameters)
            
            # Convert to dict for frontend
            data = {
                "advertiser": self.campaign_parameters.advertiser,
                "budget": self.campaign_parameters.budget,
                "objective": self.campaign_parameters.objective,
                "timeline": self.campaign_parameters.timeline,
                "targetFrequency": self.campaign_parameters.target_frequency,
                "additional_requirements": self.campaign_parameters.additional_requirements or {}
            }
            
            print(f"✅ Campaign parsing complete for: {self.campaign_parameters.advertiser}")
            
            return WorkflowResult(
                step=WorkflowStep.CAMPAIGN_DATA,
                reasoning=reasoning,
                action="Proceed to historical pattern analysis",
                data=data,
                confidence=self.campaign_parameters.confidence
            )
        except Exception as e:
            print(f"❌ Campaign parsing failed: {str(e)}")
            raise ValueError(f"Campaign parsing failed: {str(e)}")
    
    async def _process_advertiser_analysis(self) -> WorkflowResult:
        """Step 2: Analyze advertiser historical patterns"""
        
        if not self.campaign_parameters:
            raise ValueError("Campaign parameters required for advertiser analysis")
        
        try:
            self.advertiser_preferences = await self.preferences_agent.analyze_advertiser_preferences(
                self.campaign_parameters.advertiser
            )
            
            reasoning = await self.preferences_agent.generate_reasoning(self.advertiser_preferences)
            
            # Convert to dict for frontend
            data = {
                "advertiser": self.advertiser_preferences.advertiser,
                "preferred_targeting": self.advertiser_preferences.preferred_targeting,
                "content_preferences": self.advertiser_preferences.content_preferences,
                "channel_preferences": self.advertiser_preferences.channel_preferences,
                "network_preferences": self.advertiser_preferences.network_preferences,
                "geo_preferences": self.advertiser_preferences.geo_preferences,
                "insights": self.advertiser_preferences.insights
            }
            
            print(f"✅ Advertiser analysis complete for: {self.advertiser_preferences.advertiser}")
            
            return WorkflowResult(
                step=WorkflowStep.ADVERTISER_PREFERENCES,
                reasoning=reasoning,
                action="Generate ACR audience segments",
                data=data,
                confidence=self.advertiser_preferences.confidence
            )
        except Exception as e:
            print(f"❌ Advertiser analysis failed: {str(e)}")
            raise ValueError(f"Advertiser analysis failed: {str(e)}")
    
    async def _process_audience_generation(self) -> WorkflowResult:
        """Step 3: Generate ACR audience segments"""
        
        if not self.campaign_parameters or not self.advertiser_preferences:
            raise ValueError("Campaign parameters and preferences required for audience generation")
        
        try:
            # Convert preferences to dict for audience agent
            preferences_dict = {
                "content_preferences": self.advertiser_preferences.content_preferences,
                "channel_preferences": self.advertiser_preferences.channel_preferences,
                "network_preferences": self.advertiser_preferences.network_preferences,
                "geo_preferences": self.advertiser_preferences.geo_preferences
            }
            
            self.audience_analysis = await self.audience_agent.generate_audience_segments(
                self.campaign_parameters.advertiser,
                preferences_dict,
                self.campaign_parameters.budget
            )
            
            reasoning = await self.audience_agent.generate_reasoning(
                self.audience_analysis,
                self.campaign_parameters.advertiser
            )
            
            # Convert segments to dict for frontend
            segments_data = []
            for segment in self.audience_analysis.segments:
                segments_data.append({
                    "name": segment.name,
                    "description": segment.description,
                    "scale": segment.scale,
                    "cpm": segment.cpm,
                    "reach": segment.reach,
                    "targeting_criteria": segment.targeting_criteria,
                    "demographics": "Adults 25-54, Various Income Levels",  # Default demographics
                    "behaviors": segment.targeting_criteria  # Map targeting_criteria to behaviors
                })
            
            data = {
                "segments": segments_data,
                "pricing_insights": self.audience_analysis.pricing_insights,
                "yield_signals": self.audience_analysis.yield_signals,
                "recommendations": self.audience_analysis.recommendations
            }
            
            print(f"✅ Audience generation complete: {len(segments_data)} segments")
            
            return WorkflowResult(
                step=WorkflowStep.AUDIENCE_GENERATION,
                reasoning=reasoning,
                action="Build executable line items",
                data=data,
                confidence=self.audience_analysis.confidence
            )
        except Exception as e:
            print(f"❌ Audience generation failed: {str(e)}")
            raise ValueError(f"Audience generation failed: {str(e)}")
    
    async def _process_line_item_generation(self) -> WorkflowResult:
        """Step 4: Generate executable line items"""
        
        if not all([self.campaign_parameters, self.advertiser_preferences, self.audience_analysis]):
            raise ValueError("All previous steps required for line item generation")
        
        try:
            # Convert preferences to dict
            preferences_dict = {
                "content_preferences": self.advertiser_preferences.content_preferences,
                "channel_preferences": self.advertiser_preferences.channel_preferences,
                "network_preferences": self.advertiser_preferences.network_preferences,
                "geo_preferences": self.advertiser_preferences.geo_preferences
            }
            
            # Convert audience segments to dict list
            audience_segments = []
            for segment in self.audience_analysis.segments:
                audience_segments.append({
                    "name": segment.name,
                    "cpm": segment.cpm,
                    "scale": segment.scale,
                    "reach": segment.reach
                })
            
            self.campaign_structure = await self.lineitem_agent.generate_line_items(
                self.campaign_parameters.advertiser,
                self.campaign_parameters.budget,
                preferences_dict,
                audience_segments
            )
            
            reasoning = await self.lineitem_agent.generate_reasoning(
                self.campaign_structure,
                self.campaign_parameters.advertiser
            )
            
            # Convert line items to dict for frontend
            line_items_data = []
            for item in self.campaign_structure.line_items:
                line_items_data.append({
                    "name": item.name,
                    "content": item.content,
                    "geo": item.geo,
                    "device": item.device,
                    "audience": item.audience,
                    "cpm": item.bid_cpm,
                    "budget": item.budget,
                    "daily_cap": item.daily_cap,
                    "frequency_cap": item.frequency_cap,
                    "targeting_criteria": item.targeting_criteria
                })
            
            data = {
                "line_items": line_items_data,
                "total_budget": self.campaign_structure.total_budget,
                "total_line_items": self.campaign_structure.total_line_items,
                "budget_allocation": self.campaign_structure.budget_allocation,
                "deployment_notes": self.campaign_structure.deployment_notes
            }
            
            print(f"✅ Line item generation complete: {len(line_items_data)} items")
            
            return WorkflowResult(
                step=WorkflowStep.CAMPAIGN_GENERATION,
                reasoning=reasoning,
                action="Generate spend forecast and inventory analysis",
                data=data,
                confidence=self.campaign_structure.confidence
            )
        except Exception as e:
            print(f"❌ Line item generation failed: {str(e)}")
            raise ValueError(f"Line item generation failed: {str(e)}")
    
    async def _process_forecasting(self) -> WorkflowResult:
        """Step 5: Generate spend forecast and inventory analysis"""
        
        if not all([self.campaign_parameters, self.advertiser_preferences]):
            raise ValueError("Campaign parameters and advertiser preferences required for real data forecasting")
        
        try:
            # Create simplified line items based on real advertiser preferences
            line_items_data = []
            
            # Use real advertiser preferences to create targeting (no assumptions)
            num_line_items = min(3, len(self.advertiser_preferences.content_preferences))
            budget_per_item = self.campaign_parameters.budget / max(1, num_line_items)
            
            for i in range(num_line_items):
                content = self.advertiser_preferences.content_preferences[i] if i < len(self.advertiser_preferences.content_preferences) else "General Content"
                geo = self.advertiser_preferences.geo_preferences[i % len(self.advertiser_preferences.geo_preferences)] if self.advertiser_preferences.geo_preferences else "Nationwide"
                
                line_items_data.append({
                    "content": content,
                    "audience": "Real data targeting",  # Based on actual preferences
                    "geo": geo
                })
            
            self.forecasting_result = await self.forecasting_agent.generate_forecast(
                advertiser=self.campaign_parameters.advertiser,
                line_items=line_items_data,
                campaign_budget=self.campaign_parameters.budget,
                campaign_timeline=self.campaign_parameters.timeline or "4 weeks",
                targeting_criteria={
                    "networks": self.advertiser_preferences.network_preferences,
                    "content": self.advertiser_preferences.content_preferences,
                    "geo": self.advertiser_preferences.geo_preferences
                },
                target_frequency=self.campaign_parameters.target_frequency
            )
            
            reasoning = await self.forecasting_agent.generate_reasoning(self.forecasting_result)
            
            # Convert forecasting result to dict for frontend (campaign-level instead of weekly)
            campaign_forecast_data = {
                "campaign_duration": self.forecasting_result.campaign_forecast.campaign_duration,
                "campaign_dates": self.forecasting_result.campaign_forecast.campaign_dates,
                "total_inventory_available_mm": self.forecasting_result.campaign_forecast.total_inventory_available_mm,
                "forecasted_impressions_mm": self.forecasting_result.campaign_forecast.forecasted_impressions_mm,
                "fill_rate_percent": self.forecasting_result.campaign_forecast.fill_rate_percent,
                "effective_cpm_dollars": self.forecasting_result.campaign_forecast.effective_cpm_dollars,
                "estimated_reach": self.forecasting_result.campaign_forecast.estimated_reach,
                "frequency": self.forecasting_result.campaign_forecast.frequency,
                "notes": self.forecasting_result.campaign_forecast.notes
            }
            
            data = {
                "advertiser": self.forecasting_result.advertiser,
                "campaign_total_budget": self.forecasting_result.campaign_total_budget,
                "campaign_forecast": campaign_forecast_data,
                "performance_breakdown": self.forecasting_result.performance_breakdown,
                "forecasting_insights": self.forecasting_result.forecasting_insights
            }
            
            print(f"✅ Forecasting complete: Campaign-level analysis for {self.forecasting_result.campaign_forecast.campaign_duration}")
            
            return WorkflowResult(
                step=WorkflowStep.FORECASTING,
                reasoning=reasoning,
                action="Campaign forecasting complete - ready for deployment",
                data=data,
                confidence=self.forecasting_result.confidence
            )
        except Exception as e:
            print(f"❌ Forecasting failed: {str(e)}")
            raise ValueError(f"Forecasting failed: {str(e)}")
    
    def advance_step(self) -> WorkflowStep:
        """Advance to the next workflow step with validation"""
        
        with self._lock:
            # Prevent rapid successive advances
            current_time = time.time()
            if current_time - self._last_advance_time < 1.0:  # 1 second debounce
                print(f"⏳ Advance debounced, too recent")
                return self.current_step
            
            self._last_advance_time = current_time
            
            # Skip validation for now - we'll validate in the process_step method instead
            
            step_progression = {
                WorkflowStep.CAMPAIGN_DATA: WorkflowStep.ADVERTISER_PREFERENCES,
                WorkflowStep.ADVERTISER_PREFERENCES: WorkflowStep.AUDIENCE_GENERATION,
                WorkflowStep.AUDIENCE_GENERATION: WorkflowStep.CAMPAIGN_GENERATION,
                WorkflowStep.CAMPAIGN_GENERATION: WorkflowStep.FORECASTING,
                WorkflowStep.FORECASTING: WorkflowStep.COMPLETE
            }
            
            if self.current_step in step_progression:
                next_step = step_progression[self.current_step]
                
                # Validate transition
                if not self._validate_step_transition(self.current_step, next_step):
                    raise ValueError(f"Invalid transition: {self.current_step.value} → {next_step.value}")
                
                print(f"🔄 Advancing: {self.current_step.value} → {next_step.value}")
                self.current_step = next_step
            else:
                print(f"⚠️ Cannot advance from step: {self.current_step.value}")
        
        return self.current_step
    
    def get_current_status(self) -> Dict[str, Any]:
        """Get current orchestrator status"""
        
        step_mapping = {
            WorkflowStep.CAMPAIGN_DATA: "campaign_data",
            WorkflowStep.ADVERTISER_PREFERENCES: "advertiser_preferences",
            WorkflowStep.AUDIENCE_GENERATION: "audience_generation", 
            WorkflowStep.CAMPAIGN_GENERATION: "campaign_generation",
            WorkflowStep.FORECASTING: "forecasting",
            WorkflowStep.COMPLETE: "complete"
        }
        
        progress_mapping = {
            WorkflowStep.CAMPAIGN_DATA: 20,
            WorkflowStep.ADVERTISER_PREFERENCES: 40,
            WorkflowStep.AUDIENCE_GENERATION: 60,
            WorkflowStep.CAMPAIGN_GENERATION: 80,
            WorkflowStep.FORECASTING: 100,
            WorkflowStep.COMPLETE: 100
        }
        
        return {
            "current_step": step_mapping[self.current_step],
            "progress": progress_mapping[self.current_step],
            "avatar_state": "complete" if self.current_step == WorkflowStep.COMPLETE else "thinking",
            "processing": self._processing
        }
    
    def reset_workflow(self):
        """Reset workflow to initial state"""
        with self._lock:
            print("🔄 Resetting workflow to initial state")
            self.current_step = WorkflowStep.CAMPAIGN_DATA
            self.campaign_context = {}
            self.campaign_parameters = None
            self.advertiser_preferences = None
            self.audience_analysis = None
            self.campaign_structure = None
            self.forecasting_result = None
            self._processing = False
            self._last_advance_time = 0
            print("✅ Workflow reset complete") 