from models.campaign import CampaignSpec, CampaignPlan, LineItem
from typing import Dict, Any
from datetime import datetime, timedelta

def build_plan(spec: CampaignSpec) -> CampaignPlan:
    """
    Build a campaign plan based on the specification.
    TODO: implement sophisticated planning logic
    """
    # Simple mock implementation - split budget evenly across line items
    num_line_items = 3
    budget_per_item = spec.total_budget / num_line_items
    
    line_items = []
    for i in range(num_line_items):
        line_item = LineItem(
            id=f"line_{i+1}",
            name=f"{spec.name} - Line Item {i+1}",
            budget=budget_per_item,
            start_date=spec.start_date,
            end_date=spec.end_date,
            networks=["Hulu", "Roku"][i:i+1] if i < 2 else ["Tubi"],
            genres=["Sports", "Comedy", "Drama"][i:i+1],
            devices=["SmartTV", "Mobile"][i % 2:i % 2 + 1],
            locations=["Los Angeles", "New York", "Chicago"][i:i+1],
            segment_ids=[i+1]
        )
        line_items.append(line_item)
    
    return CampaignPlan(
        campaign=spec,
        line_items=line_items,
        total_budget_allocated=spec.total_budget,
        summary={
            "total_line_items": len(line_items),
            "average_budget_per_line": budget_per_item,
            "networks_covered": ["Hulu", "Roku", "Tubi"],
            "locations_covered": ["Los Angeles", "New York", "Chicago"]
        }
    ) 