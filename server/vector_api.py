"""
Vector Database API endpoints for advertiser data
"""

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import logging
from vector_db import advertiser_vector_db

logger = logging.getLogger(__name__)

class AdvertiserSearchRequest(BaseModel):
    query: str
    limit: int = 10
    category: Optional[str] = None
    min_cpm: Optional[float] = None
    max_cpm: Optional[float] = None

class AdvertiserSearchResponse(BaseModel):
    advertisers: List[Dict[str, Any]]
    total_found: int
    query_time_ms: float

def setup_vector_routes(app: FastAPI):
    """Setup vector database routes"""
    
    @app.get("/vector/advertisers")
    async def get_all_advertisers_vector(
        limit: int = Query(default=100, le=1000),
        offset: int = Query(default=0, ge=0),
        category: Optional[str] = Query(default=None)
    ):
        """Get all advertisers from vector database with pagination and filtering"""
        try:
            # Apply category filter if specified
            filters = {}
            if category:
                filters['category'] = category
            
            if filters:
                # Use search with empty query to apply filters
                advertisers = advertiser_vector_db.search_advertisers("", limit=limit, filters=filters)
            else:
                # Get all advertisers
                advertisers = advertiser_vector_db.get_all_advertisers(limit=limit, offset=offset)
            
            return {
                "advertisers": advertisers,
                "total_count": len(advertisers),
                "limit": limit,
                "offset": offset,
                "filters": filters
            }
            
        except Exception as e:
            logger.error(f"Error getting advertisers: {e}")
            raise HTTPException(status_code=500, detail=f"Error retrieving advertisers: {str(e)}")
    
    @app.get("/vector/advertisers/{advertiser_id}")
    async def get_advertiser_by_id_vector(advertiser_id: str):
        """Get specific advertiser by ID from vector database"""
        try:
            advertiser = advertiser_vector_db.get_advertiser_by_id(advertiser_id)
            if not advertiser:
                raise HTTPException(status_code=404, detail="Advertiser not found")
            
            return advertiser
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting advertiser {advertiser_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Error retrieving advertiser: {str(e)}")
    
    @app.post("/vector/search")
    async def search_advertisers_vector(request: AdvertiserSearchRequest):
        """Search advertisers using semantic similarity"""
        try:
            import time
            start_time = time.time()
            
            # Prepare filters
            filters = {}
            if request.category:
                filters['category'] = request.category
            if request.min_cpm:
                filters['min_cpm_range'] = request.min_cpm
            if request.max_cpm:
                filters['max_cpm_range'] = request.max_cpm
            
            # Perform search
            advertisers = advertiser_vector_db.search_advertisers(
                query=request.query,
                limit=request.limit,
                filters=filters if filters else None
            )
            
            query_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            return AdvertiserSearchResponse(
                advertisers=advertisers,
                total_found=len(advertisers),
                query_time_ms=query_time
            )
            
        except Exception as e:
            logger.error(f"Error searching advertisers: {e}")
            raise HTTPException(status_code=500, detail=f"Error searching advertisers: {str(e)}")
    
    @app.get("/vector/stats")
    async def get_vector_db_stats():
        """Get vector database statistics"""
        try:
            stats = advertiser_vector_db.get_stats()
            return stats
            
        except Exception as e:
            logger.error(f"Error getting vector DB stats: {e}")
            raise HTTPException(status_code=500, detail=f"Error retrieving stats: {str(e)}")
    
    @app.post("/vector/initialize")
    async def initialize_vector_db(force_reload: bool = False):
        """Initialize or reload the vector database from parquet file"""
        try:
            parquet_path = "data/real_data/resp.parquet"
            
            # Initialize if not already done
            if not advertiser_vector_db.is_initialized:
                advertiser_vector_db.initialize()
            
            # Load parquet data
            advertiser_vector_db.load_parquet_to_vector_db(parquet_path, force_reload=force_reload)
            
            stats = advertiser_vector_db.get_stats()
            
            return {
                "message": "Vector database initialized successfully",
                "stats": stats,
                "force_reload": force_reload
            }
            
        except Exception as e:
            logger.error(f"Error initializing vector database: {e}")
            raise HTTPException(status_code=500, detail=f"Error initializing vector database: {str(e)}")
    
    @app.get("/vector/categories")
    async def get_advertiser_categories():
        """Get all available advertiser categories"""
        try:
            stats = advertiser_vector_db.get_stats()
            categories = list(stats.get('categories', {}).keys())
            
            return {
                "categories": categories,
                "category_counts": stats.get('categories', {})
            }
            
        except Exception as e:
            logger.error(f"Error getting categories: {e}")
            raise HTTPException(status_code=500, detail=f"Error retrieving categories: {str(e)}")
    
    @app.get("/vector/advertisers/{advertiser_id}/similar")
    async def find_similar_advertisers(
        advertiser_id: str,
        limit: int = Query(default=10, le=50),
        exclude_self: bool = Query(default=True)
    ):
        """Find advertisers similar to the specified advertiser"""
        try:
            import time
            start_time = time.time()
            
            similar_advertisers = advertiser_vector_db.find_similar_advertisers(
                advertiser_id=advertiser_id,
                limit=limit,
                exclude_self=exclude_self
            )
            
            if not similar_advertisers:
                raise HTTPException(status_code=404, detail="No similar advertisers found or advertiser not found")
            
            query_time = (time.time() - start_time) * 1000
            
            return {
                "reference_advertiser_id": advertiser_id,
                "similar_advertisers": similar_advertisers,
                "total_found": len(similar_advertisers),
                "query_time_ms": query_time,
                "exclude_self": exclude_self
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error finding similar advertisers for {advertiser_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Error finding similar advertisers: {str(e)}")
    
    @app.get("/vector/categories/{category}/top")
    async def get_category_top_advertisers(
        category: str,
        limit: int = Query(default=10, le=100)
    ):
        """Get top advertisers in a specific category"""
        try:
            advertisers = advertiser_vector_db.get_category_recommendations(
                category=category,
                limit=limit
            )
            
            if not advertisers:
                raise HTTPException(status_code=404, detail=f"No advertisers found in category: {category}")
            
            return {
                "category": category,
                "advertisers": advertisers,
                "total_found": len(advertisers)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting top advertisers for category {category}: {e}")
            raise HTTPException(status_code=500, detail=f"Error retrieving category advertisers: {str(e)}")
    
    @app.post("/vector/recommendations")
    async def get_advertiser_recommendations(
        request: dict = None
    ):
        """Get advertiser recommendations based on criteria"""
        try:
            # Default request if none provided
            if not request:
                request = {}
            
            category = request.get('category')
            min_cpm = request.get('min_cpm')
            max_cpm = request.get('max_cpm')
            min_activity = request.get('min_activity')
            limit = request.get('limit', 10)
            
            # Build filters
            filters = {}
            if category:
                filters['category'] = category
            if min_cpm:
                filters['min_cpm_range'] = min_cpm
            if max_cpm:
                filters['max_cpm_range'] = max_cpm
            
            # Use search with a general query to get recommendations
            query = "high performing advertiser with good CPM and activity"
            if category:
                query += f" in {category} category"
            
            advertisers = advertiser_vector_db.search_advertisers(
                query=query,
                limit=limit,
                filters=filters if filters else None
            )
            
            # Additional filtering by activity if specified
            if min_activity:
                advertisers = [adv for adv in advertisers if adv.get('activity_score', 0) >= min_activity]
            
            return {
                "recommendations": advertisers,
                "criteria": {
                    "category": category,
                    "min_cpm": min_cpm,
                    "max_cpm": max_cpm,
                    "min_activity": min_activity
                },
                "total_found": len(advertisers)
            }
            
        except Exception as e:
            logger.error(f"Error getting recommendations: {e}")
            raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")
