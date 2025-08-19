"""
Vector Database for Advertiser Data
Converts parquet file to ChromaDB for fast similarity search and retrieval
"""

import chromadb
import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Any
import json
import os
from sentence_transformers import SentenceTransformer
import logging

logger = logging.getLogger(__name__)

class AdvertiserVectorDB:
    """Vector database for advertiser data using ChromaDB"""
    
    def __init__(self, db_path: str = "./chroma_db", model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize the vector database
        
        Args:
            db_path: Path to store the ChromaDB database
            model_name: Sentence transformer model for embeddings
        """
        self.db_path = db_path
        self.model_name = model_name
        self.model = None
        self.client = None
        self.collection = None
        self.is_initialized = False
        
    def initialize(self):
        """Initialize ChromaDB client and collection"""
        try:
            # Initialize ChromaDB client
            self.client = chromadb.PersistentClient(path=self.db_path)
            
            # Initialize sentence transformer model
            logger.info(f"Loading sentence transformer model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            
            # Get or create collection
            self.collection = self.client.get_or_create_collection(
                name="advertisers",
                metadata={"description": "Advertiser data with embeddings"}
            )
            
            self.is_initialized = True
            logger.info("Vector database initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize vector database: {e}")
            raise
    
    def load_parquet_to_vector_db(self, parquet_path: str, force_reload: bool = False):
        """
        Load parquet data into vector database
        
        Args:
            parquet_path: Path to the parquet file
            force_reload: If True, reload data even if collection has data
        """
        if not self.is_initialized:
            self.initialize()
            
        # Check if data already loaded
        if self.collection.count() > 0 and not force_reload:
            logger.info(f"Vector database already contains {self.collection.count()} records")
            return
            
        logger.info(f"Loading parquet data from: {parquet_path}")
        
        try:
            # Load parquet file
            df = pd.read_parquet(parquet_path)
            logger.info(f"Loaded parquet with shape: {df.shape}")
            
            # Process advertiser data
            advertiser_data = self._process_advertiser_data(df)
            logger.info(f"Processed {len(advertiser_data)} unique advertisers")
            
            # Create embeddings and store in vector DB
            self._store_advertisers_in_vector_db(advertiser_data)
            
            logger.info("Successfully loaded data into vector database")
            
        except Exception as e:
            logger.error(f"Failed to load parquet data: {e}")
            raise
    
    def _process_advertiser_data(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Process raw parquet data into structured advertiser records
        
        Args:
            df: Raw parquet DataFrame
            
        Returns:
            List of advertiser dictionaries
        """
        # Group by advertiser domain
        advertiser_groups = df.groupby('adomain').agg({
            'total_packets': 'sum',
            'avg_cpm': 'mean',
            'median_cpm': 'mean',
            'max_cpm': 'max',
            'min_cpm': 'min'
        }).reset_index()
        
        # Get geographic data (top ZIP codes for each advertiser)
        zip_columns = [col for col in df.columns if col.startswith('zip_')]
        
        advertisers = []
        
        for _, row in advertiser_groups.iterrows():
            adomain = row['adomain']
            
            # Get geographic distribution for this advertiser
            advertiser_df = df[df['adomain'] == adomain]
            geo_data = self._extract_geographic_data(advertiser_df, zip_columns)
            
            # Create advertiser record with CPM validation
            # Cap unrealistic CPM values to reasonable ranges
            avg_cpm = float(row['avg_cpm']) if not pd.isna(row['avg_cpm']) else 5.0
            median_cpm = float(row['median_cpm']) if not pd.isna(row['median_cpm']) else 5.0
            max_cpm = float(row['max_cpm']) if not pd.isna(row['max_cpm']) else 10.0
            min_cpm = float(row['min_cpm']) if not pd.isna(row['min_cpm']) else 1.0
            
            # Apply realistic CPM caps (typical CTV CPMs range from $1-$100)
            avg_cpm = min(avg_cpm, 100.0)  # Cap at $100
            median_cpm = min(median_cpm, 100.0)  # Cap at $100
            max_cpm = min(max_cpm, 150.0)  # Allow slightly higher for max, but cap at $150
            min_cpm = max(min_cpm, 0.50)  # Ensure minimum of $0.50
            
            advertiser = {
                'advertiser_id': f"real_{adomain.replace('.', '_').replace('-', '_')}",
                'domain': adomain,
                'brand': self._extract_brand_name(adomain),
                'category': self._categorize_advertiser(adomain),
                'total_packets': int(row['total_packets']),
                'avg_cpm': avg_cpm,
                'median_cpm': median_cpm,
                'max_cpm': max_cpm,
                'min_cpm': min_cpm,
                'geographic_data': geo_data,
                'activity_score': min(100, (row['total_packets'] / 1000) * 10)  # Normalized activity score
            }
            
            # Create searchable text for embeddings
            advertiser['searchable_text'] = self._create_searchable_text(advertiser)
            
            advertisers.append(advertiser)
        
        # Sort by activity (total packets) and limit to top advertisers for performance
        advertisers.sort(key=lambda x: x['total_packets'], reverse=True)
        return advertisers[:5000]  # Limit to top 5000 most active advertisers
    
    def _extract_geographic_data(self, advertiser_df: pd.DataFrame, zip_columns: List[str]) -> Dict[str, Any]:
        """Extract geographic distribution data for an advertiser"""
        geo_data = {'top_zip_codes': [], 'geographic_reach': 0}
        
        try:
            # Sum up activity across ZIP codes
            zip_sums = {}
            for zip_col in zip_columns[:100]:  # Limit to first 100 ZIP columns for performance
                if zip_col in advertiser_df.columns:
                    zip_sum = advertiser_df[zip_col].sum()
                    if zip_sum > 0:
                        zip_code = zip_col.replace('zip_', '')
                        zip_sums[zip_code] = zip_sum
            
            # Get top ZIP codes
            if zip_sums:
                top_zips = sorted(zip_sums.items(), key=lambda x: x[1], reverse=True)[:10]
                geo_data['top_zip_codes'] = [{'zip': zip_code, 'activity': float(activity)} for zip_code, activity in top_zips]
                geo_data['geographic_reach'] = len([z for z in zip_sums.values() if z > 0])
        
        except Exception as e:
            logger.warning(f"Error processing geographic data: {e}")
        
        return geo_data
    
    def _extract_brand_name(self, domain: str) -> str:
        """Extract brand name from domain"""
        # Remove common TLD extensions and clean up
        brand = domain.lower()
        for tld in ['.com', '.net', '.org', '.co', '.io']:
            brand = brand.replace(tld, '')
        
        # Capitalize first letter of each word
        return ' '.join(word.capitalize() for word in brand.split('.'))
    
    def _categorize_advertiser(self, domain: str) -> str:
        """Categorize advertiser based on domain name"""
        domain_lower = domain.lower()
        
        # Define category keywords
        categories = {
            "Automotive": ["auto", "car", "ford", "toyota", "honda", "chevy", "bmw", "mercedes", "vehicle", "truck", "motor"],
            "Technology": ["tech", "software", "app", "digital", "cloud", "ai", "data", "cyber", "mobile"],
            "Healthcare": ["health", "medical", "pharma", "medicine", "care", "hospital", "clinic", "drug"],
            "Finance": ["bank", "financial", "invest", "credit", "loan", "insurance", "money", "pay"],
            "Retail": ["shop", "store", "retail", "buy", "sell", "market", "commerce"],
            "Entertainment": ["game", "music", "movie", "tv", "entertainment", "media", "streaming"],
            "Food & Beverage": ["food", "restaurant", "coffee", "drink", "beverage", "kitchen", "recipe"],
            "Travel": ["travel", "hotel", "flight", "vacation", "trip", "booking", "tourism"],
            "Education": ["edu", "school", "university", "learn", "course", "training", "academic"],
            "Real Estate": ["real", "estate", "property", "home", "house", "rent", "mortgage"]
        }
        
        for category, keywords in categories.items():
            if any(keyword in domain_lower for keyword in keywords):
                return category
        
        return "Other"
    
    def _create_searchable_text(self, advertiser: Dict[str, Any]) -> str:
        """Create searchable text for embedding generation"""
        text_parts = [
            advertiser['brand'],
            advertiser['domain'],
            advertiser['category'],
            f"CPM range {advertiser['min_cpm']:.2f} to {advertiser['max_cpm']:.2f}",
            f"Activity score {advertiser['activity_score']:.1f}",
            f"Geographic reach {advertiser['geographic_data']['geographic_reach']} areas"
        ]
        
        # Add top geographic areas
        top_zips = advertiser['geographic_data'].get('top_zip_codes', [])[:3]
        if top_zips:
            zip_text = "Active in ZIP codes " + ", ".join([z['zip'] for z in top_zips])
            text_parts.append(zip_text)
        
        return " | ".join(text_parts)
    
    def _store_advertisers_in_vector_db(self, advertisers: List[Dict[str, Any]]):
        """Store advertisers in ChromaDB with embeddings"""
        
        # Clear existing data if force reload
        if self.collection.count() > 0:
            logger.info("Clearing existing data...")
            # Delete all data by getting all IDs and deleting them
            try:
                all_data = self.collection.get()
                if all_data['ids']:
                    self.collection.delete(ids=all_data['ids'])
            except Exception as e:
                logger.warning(f"Could not clear existing data: {e}. Continuing with new data...")
        
        # Process in batches for memory efficiency
        batch_size = 100
        total_advertisers = len(advertisers)
        
        for i in range(0, total_advertisers, batch_size):
            batch = advertisers[i:i + batch_size]
            
            # Prepare batch data
            ids = [adv['advertiser_id'] for adv in batch]
            documents = [adv['searchable_text'] for adv in batch]
            metadatas = []
            
            for adv in batch:
                metadata = {
                    'domain': adv['domain'],
                    'brand': adv['brand'],
                    'category': adv['category'],
                    'avg_cpm': adv['avg_cpm'],
                    'total_packets': adv['total_packets'],
                    'activity_score': adv['activity_score'],
                    'geographic_reach': adv['geographic_data']['geographic_reach'],
                    'full_data': json.dumps(adv)  # Store full data as JSON
                }
                metadatas.append(metadata)
            
            # Generate embeddings
            logger.info(f"Generating embeddings for batch {i//batch_size + 1}/{(total_advertisers + batch_size - 1)//batch_size}")
            embeddings = self.model.encode(documents).tolist()
            
            # Add to collection
            self.collection.add(
                ids=ids,
                documents=documents,
                metadatas=metadatas,
                embeddings=embeddings
            )
            
            logger.info(f"Stored batch {i//batch_size + 1}: {len(batch)} advertisers")
        
        logger.info(f"Successfully stored {total_advertisers} advertisers in vector database")
    
    def search_advertisers(self, query: str, limit: int = 10, filters: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        Search advertisers using semantic similarity
        
        Args:
            query: Search query
            limit: Maximum number of results
            filters: Optional metadata filters
            
        Returns:
            List of matching advertisers with similarity scores
        """
        if not self.is_initialized:
            self.initialize()
        
        # Generate query embedding
        query_embedding = self.model.encode([query]).tolist()[0]
        
        # Prepare where clause for filters
        where_clause = {}
        if filters:
            for key, value in filters.items():
                if key in ['category', 'domain', 'brand']:
                    where_clause[key] = value
                elif key == 'min_cpm_range':
                    where_clause['avg_cpm'] = {"$gte": value}
                elif key == 'max_cpm_range':
                    where_clause['avg_cpm'] = {"$lte": value}
        
        # Search in ChromaDB
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=limit,
            where=where_clause if where_clause else None
        )
        
        # Process results
        advertisers = []
        for i in range(len(results['ids'][0])):
            advertiser_data = json.loads(results['metadatas'][0][i]['full_data'])
            advertiser_data['similarity_score'] = 1 - results['distances'][0][i]  # Convert distance to similarity
            advertisers.append(advertiser_data)
        
        return advertisers
    
    def get_advertiser_by_id(self, advertiser_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific advertiser by ID"""
        if not self.is_initialized:
            self.initialize()
        
        try:
            results = self.collection.get(ids=[advertiser_id])
            if results['ids']:
                return json.loads(results['metadatas'][0]['full_data'])
        except Exception as e:
            logger.error(f"Error retrieving advertiser {advertiser_id}: {e}")
        
        return None
    
    def get_all_advertisers(self, limit: int = 1000, offset: int = 0) -> List[Dict[str, Any]]:
        """Get all advertisers with pagination"""
        if not self.is_initialized:
            self.initialize()
        
        # ChromaDB doesn't support direct offset, so we'll use a workaround
        # Get all results and slice them (not ideal for very large datasets)
        results = self.collection.get(limit=limit + offset)
        
        advertisers = []
        start_idx = offset
        end_idx = min(offset + limit, len(results['ids']))
        
        for i in range(start_idx, end_idx):
            if i < len(results['metadatas']):
                advertiser_data = json.loads(results['metadatas'][i]['full_data'])
                advertisers.append(advertiser_data)
        
        return advertisers
    
    def find_similar_advertisers(self, advertiser_id: str, limit: int = 10, exclude_self: bool = True) -> List[Dict[str, Any]]:
        """
        Find advertisers similar to the given advertiser
        
        Args:
            advertiser_id: ID of the reference advertiser
            limit: Maximum number of similar advertisers to return
            exclude_self: Whether to exclude the reference advertiser from results
            
        Returns:
            List of similar advertisers with similarity scores
        """
        if not self.is_initialized:
            self.initialize()
        
        try:
            # Get the reference advertiser
            reference_advertiser = self.get_advertiser_by_id(advertiser_id)
            if not reference_advertiser:
                logger.error(f"Reference advertiser {advertiser_id} not found")
                return []
            
            # Get the embedding for the reference advertiser
            reference_results = self.collection.get(ids=[advertiser_id])
            if not reference_results['ids']:
                logger.error(f"No embedding found for advertiser {advertiser_id}")
                return []
            
            # Use the document text to find similar advertisers
            reference_text = reference_advertiser['searchable_text']
            reference_embedding = self.model.encode([reference_text]).tolist()[0]
            
            # Search for similar advertisers
            search_limit = limit + 1 if exclude_self else limit
            results = self.collection.query(
                query_embeddings=[reference_embedding],
                n_results=search_limit
            )
            
            # Process results
            similar_advertisers = []
            for i in range(len(results['ids'][0])):
                result_id = results['ids'][0][i]
                
                # Skip self if requested
                if exclude_self and result_id == advertiser_id:
                    continue
                
                advertiser_data = json.loads(results['metadatas'][0][i]['full_data'])
                similarity_score = 1 - results['distances'][0][i]  # Convert distance to similarity
                advertiser_data['similarity_score'] = similarity_score
                advertiser_data['similarity_reasons'] = self._generate_similarity_reasons(
                    reference_advertiser, advertiser_data
                )
                
                similar_advertisers.append(advertiser_data)
                
                if len(similar_advertisers) >= limit:
                    break
            
            return similar_advertisers
            
        except Exception as e:
            logger.error(f"Error finding similar advertisers for {advertiser_id}: {e}")
            return []
    
    def _generate_similarity_reasons(self, reference: Dict[str, Any], similar: Dict[str, Any]) -> List[str]:
        """Generate human-readable reasons why two advertisers are similar"""
        reasons = []
        
        # Category similarity
        if reference['category'] == similar['category']:
            reasons.append(f"Same category ({reference['category']})")
        
        # CPM similarity (within 20% range)
        ref_cpm = reference['avg_cpm']
        sim_cpm = similar['avg_cpm']
        cpm_diff_pct = abs(ref_cpm - sim_cpm) / ref_cpm * 100 if ref_cpm > 0 else 0
        if cpm_diff_pct < 20:
            reasons.append(f"Similar CPM range (${ref_cpm:.2f} vs ${sim_cpm:.2f})")
        
        # Activity level similarity
        ref_activity = reference['activity_score']
        sim_activity = similar['activity_score']
        activity_diff_pct = abs(ref_activity - sim_activity) / ref_activity * 100 if ref_activity > 0 else 0
        if activity_diff_pct < 30:
            if ref_activity > 50 and sim_activity > 50:
                reasons.append("Both high-activity advertisers")
            elif ref_activity < 20 and sim_activity < 20:
                reasons.append("Both low-activity advertisers")
            else:
                reasons.append("Similar activity levels")
        
        # Geographic similarity (if both have geographic data)
        ref_geo = reference.get('geographic_data', {})
        sim_geo = similar.get('geographic_data', {})
        if ref_geo.get('geographic_reach', 0) > 0 and sim_geo.get('geographic_reach', 0) > 0:
            ref_reach = ref_geo['geographic_reach']
            sim_reach = sim_geo['geographic_reach']
            if abs(ref_reach - sim_reach) / max(ref_reach, sim_reach) < 0.5:
                reasons.append("Similar geographic reach")
        
        # Brand name similarity (simple check for common words)
        ref_words = set(reference['brand'].lower().split())
        sim_words = set(similar['brand'].lower().split())
        common_words = ref_words.intersection(sim_words)
        if common_words:
            reasons.append(f"Brand similarity ({', '.join(common_words)})")
        
        return reasons[:3]  # Limit to top 3 reasons
    
    def get_category_recommendations(self, category: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get top advertisers in a specific category
        
        Args:
            category: Category to search for
            limit: Maximum number of advertisers to return
            
        Returns:
            List of top advertisers in the category
        """
        if not self.is_initialized:
            self.initialize()
        
        try:
            # Search for advertisers in the specific category
            results = self.collection.get(
                where={"category": category},
                limit=limit
            )
            
            advertisers = []
            for i, metadata in enumerate(results['metadatas']):
                advertiser_data = json.loads(metadata['full_data'])
                advertisers.append(advertiser_data)
            
            # Sort by activity score (highest first)
            advertisers.sort(key=lambda x: x.get('activity_score', 0), reverse=True)
            
            return advertisers[:limit]
            
        except Exception as e:
            logger.error(f"Error getting category recommendations for {category}: {e}")
            return []
    
    def get_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        if not self.is_initialized:
            self.initialize()
        
        total_count = self.collection.count()
        
        # Get category distribution
        results = self.collection.get()
        categories = {}
        total_packets = 0
        cpm_values = []
        
        for metadata in results['metadatas']:
            category = metadata.get('category', 'Unknown')
            categories[category] = categories.get(category, 0) + 1
            total_packets += metadata.get('total_packets', 0)
            cpm_values.append(metadata.get('avg_cpm', 0))
        
        return {
            'total_advertisers': total_count,
            'categories': categories,
            'total_activity': total_packets,
            'avg_cpm': np.mean(cpm_values) if cpm_values else 0,
            'median_cpm': np.median(cpm_values) if cpm_values else 0
        }

# Global instance
advertiser_vector_db = AdvertiserVectorDB()
