#!/usr/bin/env python3
"""
Simple Test Script for AdAgent
Basic functionality verification
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_imports():
    """Test that all main modules can be imported"""
    tests_passed = 0
    total_tests = 0
    
    print("🧪 Testing Basic Module Imports")
    print("=" * 40)
    
    # Test 1: Main app import
    total_tests += 1
    try:
        from main import app
        print("✅ PASS: FastAPI app imports successfully")
        tests_passed += 1
    except Exception as e:
        print(f"❌ FAIL: FastAPI app import failed: {e}")
    
    # Test 2: Agents import  
    total_tests += 1
    try:
        from agents.multi_agent_orchestrator import MultiAgentOrchestrator
        print("✅ PASS: Multi-agent orchestrator imports successfully")
        tests_passed += 1
    except Exception as e:
        print(f"❌ FAIL: Multi-agent orchestrator import failed: {e}")
    
    # Test 3: Campaign parser
    total_tests += 1
    try:
        from agents.campaign_parser import CampaignParserAgent
        print("✅ PASS: Campaign parser agent imports successfully")
        tests_passed += 1
    except Exception as e:
        print(f"❌ FAIL: Campaign parser import failed: {e}")
    
    # Test 4: Models
    total_tests += 1
    try:
        from models.campaign import CampaignSpec
        print("✅ PASS: Campaign models import successfully")
        tests_passed += 1
    except Exception as e:
        print(f"❌ FAIL: Campaign models import failed: {e}")
    
    return tests_passed, total_tests

def test_data_loading():
    """Test that data files can be loaded"""
    tests_passed = 0
    total_tests = 0
    
    print("\n📊 Testing Data Loading")
    print("=" * 40)
    
    # Test 1: Segments data
    total_tests += 1
    try:
        from audience.module import list_segments
        segments = list_segments()
        print(f"✅ PASS: Loaded {len(segments.get('segments', []))} audience segments")
        tests_passed += 1
    except Exception as e:
        print(f"❌ FAIL: Segments loading failed: {e}")
    
    # Test 2: Preferences data
    total_tests += 1
    try:
        from prefs.module import get_preferences
        prefs = get_preferences("sample_adv")
        if prefs:
            print("✅ PASS: Advertiser preferences loaded successfully")
            tests_passed += 1
        else:
            print("⚠️  WARN: No preferences found for sample advertiser")
    except Exception as e:
        print(f"❌ FAIL: Preferences loading failed: {e}")
    
    return tests_passed, total_tests

def run_simple_tests():
    """Run all simple tests"""
    print("🚀 AdAgent Simple Test Suite")
    print("=" * 50)
    
    total_passed = 0
    total_tests = 0
    
    # Import tests
    passed, tests = test_imports()
    total_passed += passed
    total_tests += tests
    
    # Data loading tests
    passed, tests = test_data_loading()
    total_passed += passed
    total_tests += tests
    
    # Summary
    print("\n📋 Test Summary")
    print("=" * 40)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {total_passed}")
    print(f"Failed: {total_tests - total_passed}")
    print(f"Success Rate: {(total_passed/total_tests)*100:.1f}%")
    
    if total_passed == total_tests:
        print("\n🎉 All basic tests PASSED!")
        print("✨ Your AdAgent components are working correctly")
    else:
        print(f"\n⚠️  {total_tests - total_passed} test(s) failed")
        print("Check the errors above for details")
    
    return total_passed == total_tests

if __name__ == "__main__":
    success = run_simple_tests()
    sys.exit(0 if success else 1) 