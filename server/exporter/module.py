from models.campaign import CampaignPlan
import csv
import os

def export_csv(plan: CampaignPlan) -> str:
    """
    Export campaign plan to CSV and return file path.
    """
    # Create exports directory if it doesn't exist
    exports_dir = os.path.join(os.path.dirname(__file__), "..", "data", "exports")
    os.makedirs(exports_dir, exist_ok=True)
    
    # Generate filename
    filename = f"campaign_plan_{plan.campaign.name.replace(' ', '_').lower()}.csv"
    filepath = os.path.join(exports_dir, filename)
    
    # Write CSV
    with open(filepath, 'w', newline='') as csvfile:
        fieldnames = [
            'line_item_id', 'line_item_name', 'budget', 'start_date', 'end_date',
            'networks', 'genres', 'devices', 'locations', 'segment_ids'
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for line_item in plan.line_items:
            writer.writerow({
                'line_item_id': line_item.id,
                'line_item_name': line_item.name,
                'budget': line_item.budget,
                'start_date': line_item.start_date.isoformat(),
                'end_date': line_item.end_date.isoformat(),
                'networks': '|'.join(line_item.networks),
                'genres': '|'.join(line_item.genres),
                'devices': '|'.join(line_item.devices),
                'locations': '|'.join(line_item.locations),
                'segment_ids': '|'.join(map(str, line_item.segment_ids))
            })
    
    # Return relative URL path for frontend
    return f"/exports/{filename}" 