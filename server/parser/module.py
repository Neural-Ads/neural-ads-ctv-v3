from models.campaign import CampaignSpec
from typing import Dict, Any
import json
import re
from datetime import datetime

def parse_campaign(text: str) -> CampaignSpec:
    """
    Parse campaign specification from text input.
    TODO: implement LLM+regex parsing
    """
    # For now, return a basic mock campaign spec
    # In the future, this would use OpenAI API + regex patterns
    return CampaignSpec(
        name="Parsed Campaign",
        total_budget=100000.0,
        start_date=datetime.now(),
        end_date=datetime.now(),
        objective="Awareness",
        description=f"Parsed from: {text[:100]}..."
    ) 