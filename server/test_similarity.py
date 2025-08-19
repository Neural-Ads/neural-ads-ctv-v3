#!/usr/bin/env python3
"""
Test script to demonstrate similarity search functionality
"""

import requests
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8000"

def test_similarity_search():
    """Test the similarity search functionality"""
    print("🔍 Testing Advertiser Similarity Search")
    print("=" * 60)
    
    # First, get a sample advertiser
    print("📊 Getting sample advertisers...")
    try:
        response = requests.get(f"{BASE_URL}/vector/advertisers?limit=5")
        advertisers = response.json()['advertisers']
        
        if not advertisers:
            print("❌ No advertisers found!")
            return
        
        # Pick the first advertiser as reference
        reference_adv = advertisers[0]
        print(f"🎯 Reference Advertiser: {reference_adv['brand']} ({reference_adv['category']})")
        print(f"   Domain: {reference_adv['domain']}")
        print(f"   CPM: ${reference_adv['avg_cpm']:.2f}")
        print(f"   Activity Score: {reference_adv['activity_score']:.1f}")
        print()
        
        # Find similar advertisers
        print("🔎 Finding similar advertisers...")
        similarity_response = requests.get(
            f"{BASE_URL}/vector/advertisers/{reference_adv['advertiser_id']}/similar?limit=5"
        )
        
        if similarity_response.status_code != 200:
            print(f"❌ Error finding similar advertisers: {similarity_response.text}")
            return
        
        similarity_data = similarity_response.json()
        similar_advertisers = similarity_data['similar_advertisers']
        
        print(f"✅ Found {len(similar_advertisers)} similar advertisers:")
        print(f"   Query time: {similarity_data['query_time_ms']:.1f}ms")
        print()
        
        for i, adv in enumerate(similar_advertisers):
            print(f"{i+1}. {adv['brand']} ({adv['category']})")
            print(f"   Similarity Score: {adv['similarity_score']:.3f}")
            print(f"   CPM: ${adv['avg_cpm']:.2f} | Activity: {adv['activity_score']:.1f}")
            
            if adv.get('similarity_reasons'):
                print(f"   Reasons: {', '.join(adv['similarity_reasons'])}")
            
            print()
        
    except Exception as e:
        print(f"❌ Error during similarity search: {e}")

def test_category_search():
    """Test category-based search"""
    print("\n📂 Testing Category-Based Search")
    print("=" * 60)
    
    try:
        # Get available categories
        categories_response = requests.get(f"{BASE_URL}/vector/categories")
        categories_data = categories_response.json()
        
        print("📋 Available categories:")
        for category, count in sorted(categories_data['category_counts'].items(), key=lambda x: x[1], reverse=True)[:5]:
            print(f"   • {category}: {count:,} advertisers")
        
        # Test with Automotive category
        print(f"\n🚗 Top Automotive advertisers:")
        auto_response = requests.get(f"{BASE_URL}/vector/categories/Automotive/top?limit=3")
        
        if auto_response.status_code == 200:
            auto_data = auto_response.json()
            for i, adv in enumerate(auto_data['advertisers']):
                print(f"{i+1}. {adv['brand']} - ${adv['avg_cpm']:.2f} CPM")
                print(f"   Domain: {adv['domain']}")
                print(f"   Geographic Reach: {adv['geographic_data']['geographic_reach']} areas")
                print()
        
    except Exception as e:
        print(f"❌ Error during category search: {e}")

def test_semantic_search():
    """Test semantic search functionality"""
    print("\n🧠 Testing Semantic Search")
    print("=" * 60)
    
    search_queries = [
        "automotive companies with high CPM",
        "technology advertisers with good performance",
        "healthcare brands with wide geographic reach"
    ]
    
    for query in search_queries:
        print(f"🔍 Query: '{query}'")
        try:
            search_response = requests.post(
                f"{BASE_URL}/vector/search",
                json={
                    "query": query,
                    "limit": 3
                }
            )
            
            if search_response.status_code == 200:
                search_data = search_response.json()
                print(f"   Found {search_data['total_found']} results in {search_data['query_time_ms']:.1f}ms:")
                
                for i, adv in enumerate(search_data['advertisers']):
                    print(f"   {i+1}. {adv['brand']} ({adv['category']}) - Relevance: {adv['similarity_score']:.3f}")
                    print(f"      CPM: ${adv['avg_cpm']:.2f} | Activity: {adv['activity_score']:.1f}")
            else:
                print(f"   ❌ Error: {search_response.text}")
        
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        print()

def main():
    """Main test function"""
    print("🚀 Vector Database Similarity Search Demo")
    print("=" * 80)
    
    # Check if vector database is available
    try:
        stats_response = requests.get(f"{BASE_URL}/vector/stats")
        if stats_response.status_code != 200:
            print("❌ Vector database not available. Make sure the server is running.")
            return
        
        stats = stats_response.json()
        print(f"📊 Vector Database Stats:")
        print(f"   Total Advertisers: {stats['total_advertisers']:,}")
        print(f"   Average CPM: ${stats['avg_cpm']:.2f}")
        print(f"   Categories: {len(stats['categories'])}")
        print()
        
    except Exception as e:
        print(f"❌ Cannot connect to vector database: {e}")
        return
    
    # Run tests
    test_similarity_search()
    test_category_search()
    test_semantic_search()
    
    print("🎉 Similarity search demo complete!")
    print("\nAvailable API endpoints:")
    print("• GET /vector/advertisers/{id}/similar - Find similar advertisers")
    print("• GET /vector/categories/{category}/top - Get top advertisers by category")
    print("• POST /vector/search - Semantic search")
    print("• POST /vector/recommendations - Get recommendations")

if __name__ == "__main__":
    main()
