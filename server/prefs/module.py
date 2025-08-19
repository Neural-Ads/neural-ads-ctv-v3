import json
import os
from typing import Dict, Any

def get_preferences(adv_id: str) -> Dict[str, Any]:
    """
    Get advertiser preferences by ID.
    Currently reads from sample JSON file.
    """
    # For now, return the sample preferences regardless of adv_id
    prefs_path = os.path.join(os.path.dirname(__file__), "..", "data", "prefs", "sample_adv.json")
    
    try:
        with open(prefs_path, 'r') as f:
            prefs = json.load(f)
        return {
            "advertiser_id": adv_id,
            "preferences": prefs
        }
    except FileNotFoundError:
        return {
            "advertiser_id": adv_id,
            "preferences": {
                "networks": ["Hulu", "Roku", "Tubi"],
                "genres": ["Sports", "Comedy", "Drama"],
                "devices": ["SmartTV", "Mobile"],
                "locations": ["Los Angeles", "New York", "Chicago"]
            }
        } 