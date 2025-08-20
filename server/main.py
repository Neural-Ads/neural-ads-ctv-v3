from fastapi import FastAPI, UploadFile, File, HTTPException, Request
import shutil
import csv
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from parser.module import parse_campaign
from prefs.module import get_preferences
from audience.module import list_segments
from planner.module import build_plan
from exporter.module import export_csv
from models.campaign import CampaignSpec, CampaignPlan
from agents.multi_agent_orchestrator import MultiAgentOrchestrator
from agents.conversational_agent import ConversationalAgent
from pydantic import BaseModel
from openai import AsyncOpenAI
from vector_api import setup_vector_routes
import os

# Create FastAPI app
app = FastAPI(title="CTV Campaign Management API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Multi-Agent Orchestrator and Conversational Agent
orchestrator = MultiAgentOrchestrator()
conversational_agent = ConversationalAgent()

# Mount static files for exports
exports_dir = os.path.join(os.path.dirname(__file__), "data", "exports")
os.makedirs(exports_dir, exist_ok=True)
app.mount("/exports", StaticFiles(directory=exports_dir), name="exports")

class AgentRequest(BaseModel):
    input: str
    files: list = []

class ChatRequest(BaseModel):
    message: str

@app.get("/")
async def root():
    return {"message": "Neural CTV Campaign Management API", "status": "running", "system": "multi-agent"}



@app.post("/agent/process")
async def process_agent_request(request: AgentRequest):
    """Process campaign request through Multi-Agent Orchestrator"""
    try:
        # Process through orchestrator
        result = await orchestrator.process_step(request.input)
        
        # Get current status
        status = orchestrator.get_current_status()
        
        return {
            "step": result.step.value,
            "reasoning": result.reasoning,
            "action": result.action,
            "data": result.data,
            "confidence": result.confidence,
            "progress": status["progress"],
            "current_step": status["current_step"],
            "avatar_state": status["avatar_state"],
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent processing error: {str(e)}")

@app.get("/agent/status")
async def get_agent_status():
    """Get current multi-agent orchestrator status"""
    try:
        status = orchestrator.get_current_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status error: {str(e)}")

@app.post("/agent/advance")
async def advance_agent_step():
    """Advance orchestrator to next step"""
    try:
        next_step = orchestrator.advance_step()
        status = orchestrator.get_current_status()
        return {
            "current_step": next_step.value,
            "status": status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Advance error: {str(e)}")

@app.post("/agent/reset")
async def reset_workflow():
    """Reset workflow to initial state"""
    try:
        orchestrator.reset_workflow()
        status = orchestrator.get_current_status()
        return {
            "message": "Workflow reset successfully",
            "status": status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset error: {str(e)}")

@app.post("/parse", response_model=CampaignSpec)
async def parse_endpoint(file: UploadFile = File(...)):
    """Parse campaign specification from uploaded text file."""
    try:
        content = await file.read()
        text = content.decode('utf-8')
        campaign_spec = parse_campaign(text)
        return campaign_spec
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")

@app.get("/preferences/{adv_id}")
async def prefs_endpoint(adv_id: str):
    """Get advertiser preferences by ID."""
    try:
        preferences = get_preferences(adv_id)
        return preferences
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Preferences not found: {str(e)}")

@app.get("/advertisers")
async def advertisers_endpoint():
    """List all available advertisers from real data."""
    try:
        from mcp.advertiser_preferences import advertiser_prefs_db
        advertisers = await advertiser_prefs_db.get_advertiser_preferences()
        
        # Return a summary of advertisers
        advertiser_list = []
        for adv in advertisers:
            advertiser_list.append({
                "advertiser_id": adv.advertiser_id,
                "brand": adv.brand,
                "category": adv.category,
                "confidence_score": adv.confidence_score,
                "avg_cpm": adv.performance_metrics.get("Avg_CPM", 0),
                "total_packets": adv.performance_metrics.get("Total_Packets", 0)
            })
        
        return {
            "total_count": len(advertiser_list),
            "advertisers": advertiser_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching advertisers: {str(e)}")

@app.get("/advertisers/{advertiser_id}")
async def advertiser_detail_endpoint(advertiser_id: str):
    """Get detailed advertiser preferences from real data."""
    try:
        from mcp.advertiser_preferences import advertiser_prefs_db
        advertisers = await advertiser_prefs_db.get_advertiser_preferences(advertiser_id=advertiser_id)
        
        if not advertisers:
            raise HTTPException(status_code=404, detail=f"Advertiser {advertiser_id} not found")
        
        advertiser = advertisers[0]
        return {
            "advertiser_id": advertiser.advertiser_id,
            "brand": advertiser.brand,
            "category": advertiser.category,
            "network_affinities": advertiser.network_affinities,
            "genre_preferences": advertiser.genre_preferences,
            "audience_segments": advertiser.audience_segments,
            "device_targeting": advertiser.device_targeting,
            "os_preferences": advertiser.os_preferences,
            "geo_preferences": advertiser.geo_preferences,
            "daypart_patterns": advertiser.daypart_patterns,
            "budget_allocation": advertiser.budget_allocation,
            "performance_metrics": advertiser.performance_metrics,
            "confidence_score": advertiser.confidence_score
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching advertiser details: {str(e)}")

@app.get("/segments")
async def segments_endpoint():
    """List all available audience segments."""
    try:
        segments = list_segments()
        return {"segments": segments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading segments: {str(e)}")

@app.post("/plan")
async def plan_endpoint(spec: CampaignSpec):
    """Generate campaign plan and export to CSV."""
    try:
        # Build the plan
        plan = build_plan(spec)
        
        # Export to CSV
        csv_url = export_csv(plan)
        
        return {
            "plan": plan.dict(),
            "csvUrl": csv_url,
            "summary": plan.summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating plan: {str(e)}")

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Enhanced chat endpoint using conversational agent"""
    try:
        # Get current orchestrator status for context
        orchestrator_status = orchestrator.get_current_status()
        
        # Process message through conversational agent
        result = await conversational_agent.process_message(
            request.message, 
            context=orchestrator_status
        )
        
        # If the agent wants to trigger a workflow, do it
        if result.get("trigger_workflow", False):
            try:
                # Reset orchestrator and start fresh workflow
                orchestrator.reset_workflow()
                
                # Process the workflow input
                workflow_result = await orchestrator.process_step(
                    result.get("workflow_input", request.message)
                )
                
                # Get updated status
                updated_status = orchestrator.get_current_status()
                
                return {
                    "response": result["response"],
                    "status": "success",
                    "type": result["type"],
                    "workflow_triggered": True,
                    "workflow_result": {
                        "step": workflow_result.step.value,
                        "action": workflow_result.action,
                        "data": workflow_result.data,
                        "confidence": workflow_result.confidence,
                        "progress": updated_status["progress"],
                        "current_step": updated_status["current_step"]
                    },
                    "campaign_params": result.get("campaign_params", {}),
                    "intent": result.get("intent")
                }
            except Exception as workflow_error:
                return {
                    "response": result["response"],
                    "status": "success",
                    "type": result["type"],
                    "workflow_triggered": False,
                    "workflow_error": str(workflow_error)
                }
        else:
            # Regular conversation response
            return {
                "response": result["response"],
                "status": "success",
                "type": result["type"],
                "workflow_triggered": False,
                "suggest_workflow": result.get("suggest_workflow", False),
                "intent": result.get("intent")
            }
            
    except Exception as e:
        return {
            "response": f"I'm having trouble processing your request right now. Let me try again - what can I help you with?",
            "status": "error",
            "error": str(e)
        }

@app.post("/chat/reset")
async def reset_chat():
    """Reset the conversation history"""
    try:
        conversational_agent.reset_conversation()
        orchestrator.reset_workflow()
        return {
            "message": "Conversation and workflow reset successfully",
            "status": "success"
        }
    except Exception as e:
        return {
            "message": f"Error resetting conversation: {str(e)}",
            "status": "error"
        }

@app.get("/chat/summary")
async def get_chat_summary():
    """Get a summary of the current conversation"""
    try:
        summary = conversational_agent.get_conversation_summary()
        orchestrator_status = orchestrator.get_current_status()
        
        return {
            "conversation_summary": summary,
            "workflow_status": orchestrator_status,
            "status": "success"
        }
    except Exception as e:
        return {
            "conversation_summary": "No conversation history",
            "error": str(e),
            "status": "error"
        }

@app.post("/chat/workflow-continue")
async def continue_workflow(request: Request = None):
    """Continue the current workflow to the next step"""
    try:
        # Parse request body if provided
        forecasting_params = None
        if request:
            try:
                body = await request.json()
                if "forecasting_params" in body:
                    forecasting_params = body["forecasting_params"]
                    print(f"🔄 Received forecasting parameters: {forecasting_params}")
            except:
                pass  # No body or invalid JSON, continue without params
        
        # Get current step before advancing
        current_step_before = orchestrator.current_step
        
        # If we're already in forecasting and have parameters, don't advance - just reforecast
        if current_step_before.value == "forecasting" and forecasting_params:
            # Update orchestrator with new forecasting parameters
            orchestrator.update_forecasting_params(forecasting_params)
            print(f"🔄 Reforecasting with updated parameters: budget=${forecasting_params.get('budget', 'N/A')}, timeline={forecasting_params.get('timeline', 'N/A')}, frequency={forecasting_params.get('frequency', 'N/A')}")
            next_step = current_step_before  # Stay in forecasting step
        else:
            # Normal workflow advancement
            next_step = orchestrator.advance_step()
            
            # If we're advancing to forecasting and have parameters, update them
            if next_step.value == "forecasting" and forecasting_params:
                # Update orchestrator with new forecasting parameters
                orchestrator.update_forecasting_params(forecasting_params)
                print(f"📊 Updated forecasting parameters: budget=${forecasting_params.get('budget', 'N/A')}, timeline={forecasting_params.get('timeline', 'N/A')}, frequency={forecasting_params.get('frequency', 'N/A')}")
        
        # Process the step
        message = "Continue workflow"
        if forecasting_params:
            # Create a more descriptive message with the parameters
            budget = forecasting_params.get('budget', 'N/A')
            timeline = forecasting_params.get('timeline', 'N/A')
            frequency = forecasting_params.get('frequency', 'N/A')
            message = f"Generate forecast with budget ${budget}, timeline {timeline}, frequency {frequency}x"
        
        # If we're reforecasting (staying in same step), use rerun method
        if current_step_before.value == "forecasting" and forecasting_params:
            print("🔄 Using rerun method for reforecasting...")
            result = await orchestrator.rerun_current_step(message)
            print(f"✅ Reforecast completed: {result.action}")
        else:
            print("🔄 Using normal process step...")
            result = await orchestrator.process_step(message)
            print(f"✅ Step processed: {result.action}")
        
        # Get updated status
        status = orchestrator.get_current_status()
        
        return {
            "message": f"Advanced to {next_step.value}",
            "workflow_result": {
                "step": result.step.value,
                "action": result.action,
                "data": result.data,
                "confidence": result.confidence,
                "progress": status["progress"],
                "current_step": status["current_step"]
            },
            "status": "success"
        }
    except Exception as e:
        return {
            "message": f"Error continuing workflow: {str(e)}",
            "status": "error"
        }

@app.post("/api/upload-audience")
async def upload_audience_csv(audience_file: UploadFile = File(...)):
    """Upload and store audience CSV file in the data folder."""
    try:
        # Validate file type
        if not audience_file.filename.lower().endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are allowed for audience uploads")
        
        # Create data directory if it doesn't exist
        data_dir = Path("data")
        data_dir.mkdir(exist_ok=True)
        
        # Create unique filename with timestamp
        import datetime
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"audience_{timestamp}_{audience_file.filename}"
        file_path = data_dir / safe_filename
        
        # Save the file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(audience_file.file, buffer)
        
        # Count rows for feedback
        rows_processed = 0
        try:
            with open(file_path, 'r', newline='', encoding='utf-8') as csvfile:
                csv_reader = csv.reader(csvfile)
                rows_processed = sum(1 for row in csv_reader) - 1  # Subtract header row
        except Exception as e:
            print(f"Warning: Could not count CSV rows: {e}")
            rows_processed = None
        
        return {
            "message": f"Audience file uploaded successfully",
            "filename": safe_filename,
            "original_filename": audience_file.filename,
            "file_path": str(file_path),
            "rows_processed": rows_processed,
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload audience file: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "neural-backend", "system": "multi-agent"}

# Setup vector database routes
setup_vector_routes(app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 