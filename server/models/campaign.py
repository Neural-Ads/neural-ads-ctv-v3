from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class LineItem(BaseModel):
    id: Optional[str] = None
    name: str
    budget: float
    start_date: datetime
    end_date: datetime
    networks: List[str]
    genres: List[str]
    devices: List[str]
    locations: List[str]
    segment_ids: List[int]
    targeting: Optional[Dict[str, Any]] = None

class CampaignSpec(BaseModel):
    name: str
    total_budget: float
    start_date: datetime
    end_date: datetime
    objective: str
    description: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    line_items: Optional[List[LineItem]] = None

class CampaignPlan(BaseModel):
    campaign: CampaignSpec
    line_items: List[LineItem]
    total_budget_allocated: float
    summary: Dict[str, Any] 