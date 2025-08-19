import csv
import os
from typing import List, Dict, Any

def list_segments() -> List[Dict[str, Any]]:
    """
    List available audience segments.
    Currently reads from CSV file.
    """
    segments_path = os.path.join(os.path.dirname(__file__), "..", "data", "segments", "segments.csv")
    segments = []
    
    try:
        with open(segments_path, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                segments.append({
                    "segmentId": int(row["segmentId"]),
                    "name": row["name"],
                    "size": int(row["size"]),
                    "geo": row["geo"],
                    "demoTags": row["demoTags"].strip('"').split(',')
                })
        return segments
    except FileNotFoundError:
        # Return mock data if file not found
        return [
            {
                "segmentId": 1,
                "name": "SportsFansLA",
                "size": 50000,
                "geo": "Los Angeles",
                "demoTags": ["Sports", "18-34"]
            },
            {
                "segmentId": 2,
                "name": "DramaWatchersNY",
                "size": 75000,
                "geo": "New York",
                "demoTags": ["Drama", "25-44"]
            },
            {
                "segmentId": 3,
                "name": "ComedyLoversCHI",
                "size": 60000,
                "geo": "Chicago",
                "demoTags": ["Comedy", "18-49"]
            }
        ] 