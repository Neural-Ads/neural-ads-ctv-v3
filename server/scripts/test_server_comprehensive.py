#!/usr/bin/env python3
"""
Comprehensive Server Test Script for AdAgent
Tests all endpoints and validates server functionality
"""

import requests
import json
import time
import os
from typing import Dict, Any, List
import sys

class ServerTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.test_results = []
        self.session = requests.Session()
        
    def log_test(self, test_name: str, success: bool, details: str = "", response: Any = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   {details}")
        if response and not success:
            print(f"   Response: {response}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response": response
        })
    
    def test_health_check(self) -> bool:
        """Test health check endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Health Check", True, f"Status: {data.get('status', 'unknown')}")
                return True
            else:
                self.log_test("Health Check", False, f"Status code: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
            return False
    
    def test_root_endpoint(self) -> bool:
        """Test root endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Root Endpoint", True, f"Message: {data.get('message', 'unknown')}")
                return True
            else:
                self.log_test("Root Endpoint", False, f"Status code: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_segments_endpoint(self) -> bool:
        """Test segments endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/segments")
            if response.status_code == 200:
                data = response.json()
                segments = data.get('segments', [])
                self.log_test("Segments Endpoint", True, f"Found {len(segments)} segments")
                return True
            else:
                self.log_test("Segments Endpoint", False, f"Status code: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Segments Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_preferences_endpoint(self) -> bool:
        """Test preferences endpoint"""
        try:
            # Test with a sample advertiser ID
            response = self.session.get(f"{self.base_url}/preferences/sample_adv")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Preferences Endpoint", True, f"Retrieved preferences for sample_adv")
                return True
            else:
                self.log_test("Preferences Endpoint", False, f"Status code: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Preferences Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_parse_endpoint(self) -> bool:
        """Test parse endpoint with sample campaign data"""
        try:
            # Create a sample campaign text file
            sample_campaign = """
            Campaign: Summer Sports Blitz
            Advertiser: Nike
            Budget: $500,000
            Duration: 8 weeks
            Target Audience: Sports enthusiasts, 18-45
            Networks: Hulu, Roku, Tubi
            Genres: Sports, Action, Drama
            """
            
            files = {'file': ('campaign.txt', sample_campaign, 'text/plain')}
            response = self.session.post(f"{self.base_url}/parse", files=files)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Parse Endpoint", True, f"Parsed campaign: {data.get('name', 'unknown')}")
                return True
            else:
                self.log_test("Parse Endpoint", False, f"Status code: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Parse Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_agent_status(self) -> bool:
        """Test agent status endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/agent/status")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Agent Status", True, f"Current step: {data.get('current_step', 'unknown')}")
                return True
            else:
                self.log_test("Agent Status", False, f"Status code: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Agent Status", False, f"Exception: {str(e)}")
            return False
    
    def test_agent_reset(self) -> bool:
        """Test agent reset endpoint"""
        try:
            response = self.session.post(f"{self.base_url}/agent/reset")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Agent Reset", True, f"Reset message: {data.get('message', 'unknown')}")
                return True
            else:
                self.log_test("Agent Reset", False, f"Status code: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Agent Reset", False, f"Exception: {str(e)}")
            return False
    
    def test_chat_endpoint(self) -> bool:
        """Test chat endpoint"""
        try:
            chat_data = {"message": "Hello, I want to create a CTV campaign"}
            response = self.session.post(f"{self.base_url}/chat", json=chat_data)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Chat Endpoint", True, f"Response type: {data.get('type', 'unknown')}")
                return True
            else:
                self.log_test("Chat Endpoint", False, f"Status code: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Chat Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_chat_reset(self) -> bool:
        """Test chat reset endpoint"""
        try:
            response = self.session.post(f"{self.base_url}/chat/reset")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Chat Reset", True, f"Reset message: {data.get('message', 'unknown')}")
                return True
            else:
                self.log_test("Chat Reset", False, f"Status code: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Chat Reset", False, f"Exception: {str(e)}")
            return False
    
    def test_agent_process(self) -> bool:
        """Test agent process endpoint"""
        try:
            process_data = {"input": "Create a sports campaign for Nike with $500k budget"}
            response = self.session.post(f"{self.base_url}/agent/process", json=process_data)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Agent Process", True, f"Step: {data.get('step', 'unknown')}")
                return True
            else:
                self.log_test("Agent Process", False, f"Status code: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Agent Process", False, f"Exception: {str(e)}")
            return False
    
    def test_agent_advance(self) -> bool:
        """Test agent advance endpoint"""
        try:
            response = self.session.post(f"{self.base_url}/agent/advance")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Agent Advance", True, f"Advanced to: {data.get('current_step', 'unknown')}")
                return True
            else:
                self.log_test("Agent Advance", False, f"Status code: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Agent Advance", False, f"Exception: {str(e)}")
            return False
    
    def test_plan_endpoint(self) -> bool:
        """Test plan endpoint with sample campaign spec"""
        try:
            from datetime import datetime, timedelta
            
            # Create dates for the campaign
            start_date = datetime.now().date()
            end_date = start_date + timedelta(weeks=4)
            
            sample_spec = {
                "name": "Test Campaign",
                "advertiser": "Test Advertiser",
                "total_budget": 100000,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "objective": "Brand Awareness",
                "target_audience": "Test Audience",
                "networks": ["Hulu", "Roku"],
                "genres": ["Sports", "Drama"],
                "devices": ["SmartTV"],
                "locations": ["New York", "Los Angeles"]
            }
            
            response = self.session.post(f"{self.base_url}/plan", json=sample_spec)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Plan Endpoint", True, f"Generated plan with {len(data.get('plan', {}))} items")
                return True
            else:
                self.log_test("Plan Endpoint", False, f"Status code: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Plan Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all tests and return summary"""
        print("🚀 Starting Comprehensive Server Tests")
        print("=" * 50)
        
        # Basic connectivity tests
        self.test_health_check()
        self.test_root_endpoint()
        
        # Data endpoint tests
        self.test_segments_endpoint()
        self.test_preferences_endpoint()
        
        # Core functionality tests
        self.test_parse_endpoint()
        self.test_plan_endpoint()
        
        # Agent system tests
        self.test_agent_status()
        self.test_agent_reset()
        self.test_agent_process()
        self.test_agent_advance()
        
        # Chat system tests
        self.test_chat_endpoint()
        self.test_chat_reset()
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if passed == total:
            print("\n🎉 ALL TESTS PASSED! Server is working correctly.")
        else:
            print(f"\n⚠️ {total - passed} tests failed. Check the details above.")
        
        return {
            "total": total,
            "passed": passed,
            "failed": total - passed,
            "success_rate": (passed/total)*100,
            "results": self.test_results
        }

def main():
    """Main function to run tests"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Comprehensive Server Test for AdAgent")
    parser.add_argument("--url", default="http://localhost:8000", help="Server URL to test")
    parser.add_argument("--output", help="Output results to JSON file")
    
    args = parser.parse_args()
    
    tester = ServerTester(args.url)
    results = tester.run_all_tests()
    
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to {args.output}")
    
    # Exit with appropriate code
    sys.exit(0 if results["passed"] == results["total"] else 1)

if __name__ == "__main__":
    main() 