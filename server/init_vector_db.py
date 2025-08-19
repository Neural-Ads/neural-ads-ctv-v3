#!/usr/bin/env python3
"""
Script to initialize the vector database from parquet file
"""

import os
import sys
import logging
from vector_db import advertiser_vector_db

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def main():
    """Initialize the vector database"""
    print("🚀 Initializing Vector Database for Advertiser Data")
    print("=" * 60)
    
    # Check if parquet file exists
    parquet_path = "data/real_data/resp.parquet"
    if not os.path.exists(parquet_path):
        print(f"❌ Error: Parquet file not found at {parquet_path}")
        sys.exit(1)
    
    try:
        # Initialize vector database
        print("📊 Initializing ChromaDB client...")
        advertiser_vector_db.initialize()
        
        # Load parquet data
        print("📁 Loading parquet data into vector database...")
        advertiser_vector_db.load_parquet_to_vector_db(parquet_path, force_reload=True)
        
        # Get statistics
        print("📈 Getting database statistics...")
        stats = advertiser_vector_db.get_stats()
        
        print("\n✅ Vector Database Initialization Complete!")
        print("=" * 60)
        print(f"📊 Total Advertisers: {stats['total_advertisers']:,}")
        print(f"💰 Average CPM: ${stats['avg_cpm']:.2f}")
        print(f"📈 Total Activity: {stats['total_activity']:,} packets")
        print(f"🏷️  Categories: {len(stats['categories'])}")
        
        print("\n🏷️  Category Distribution:")
        for category, count in sorted(stats['categories'].items(), key=lambda x: x[1], reverse=True):
            print(f"   • {category}: {count:,} advertisers")
        
        print("\n🎉 Vector database is ready for use!")
        print("   You can now use the /vector/* API endpoints")
        
    except Exception as e:
        print(f"❌ Error initializing vector database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
