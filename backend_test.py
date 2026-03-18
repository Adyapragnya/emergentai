#!/usr/bin/env python3
"""
Comprehensive API Testing Suite for AS Moloobhoy Marine Services Dashboard
Tests all backend endpoints for both Sales and Operations dashboards.
"""

import requests
import sys
import json
from datetime import datetime

class MarineServicesTester:
    def __init__(self, base_url="https://ch16-marine-sales.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.results = []

    def log_test(self, name, passed, status_code=None, error=None):
        """Log test results"""
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            print(f"✅ {name} - Status: {status_code}")
        else:
            print(f"❌ {name} - Status: {status_code}, Error: {error}")
        
        self.results.append({
            "test": name,
            "passed": passed,
            "status_code": status_code,
            "error": error
        })

    def test_endpoint(self, name, method, endpoint, expected_status=200, data=None, params=None):
        """Test a single API endpoint"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            self.log_test(name, success, response.status_code, 
                         None if success else response.text[:100])
            
            return success, response.json() if success and response.text else None

        except Exception as e:
            self.log_test(name, False, None, str(e))
            return False, None

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting AS Moloobhoy Marine Services API Tests")
        print(f"📍 Testing endpoint: {self.base_url}")
        print("=" * 60)

        # Basic connectivity
        self.test_endpoint("API Root", "GET", "/")
        self.test_endpoint("Get Ports", "GET", "/ports")

        # Sales Dashboard APIs
        print("\n📊 Sales Dashboard Tests:")
        self.test_endpoint("Sales Vessels (All)", "GET", "/sales/vessels")
        self.test_endpoint("Sales Vessels (Mumbai)", "GET", "/sales/vessels", params={"port": "Mumbai"})
        self.test_endpoint("Sales Vessels (Overdue)", "GET", "/sales/vessels", params={"tab": "overdue"})
        self.test_endpoint("Sales Quotes", "GET", "/sales/quotes")
        self.test_endpoint("Sales Quotes (Mumbai)", "GET", "/sales/quotes", params={"port": "Mumbai"})
        self.test_endpoint("Sales Leads", "GET", "/sales/leads")
        self.test_endpoint("Sales Leads (Mumbai)", "GET", "/sales/leads", params={"port": "Mumbai"})
        self.test_endpoint("Sales Stats", "GET", "/sales/stats")
        self.test_endpoint("Sales Stats (Mumbai)", "GET", "/sales/stats", params={"port": "Mumbai"})

        # Operations Dashboard APIs
        print("\n⚙️ Operations Dashboard Tests:")
        self.test_endpoint("Ops Jobs (All)", "GET", "/ops/jobs")
        self.test_endpoint("Ops Jobs (Mumbai)", "GET", "/ops/jobs", params={"port": "Mumbai"})
        self.test_endpoint("Ops Vessel Feed", "GET", "/ops/feed")
        self.test_endpoint("Ops Vessel Feed (Mumbai)", "GET", "/ops/feed", params={"port": "Mumbai"})
        self.test_endpoint("Ops Certificates", "GET", "/ops/certificates")
        self.test_endpoint("Ops Certificates (Mumbai)", "GET", "/ops/certificates", params={"port": "Mumbai"})
        self.test_endpoint("Ops Stats", "GET", "/ops/stats")
        self.test_endpoint("Ops Stats (Mumbai)", "GET", "/ops/stats", params={"port": "Mumbai"})

        # Test vessel actions (need to get vessel IDs first)
        success, vessels_data = self.test_endpoint("Get Test Vessels", "GET", "/sales/vessels", params={"port": "Mumbai"})
        
        if success and vessels_data and len(vessels_data) > 0:
            test_vessel_id = vessels_data[0].get('id')
            if test_vessel_id:
                print(f"\n🚢 Testing Vessel Actions (ID: {test_vessel_id}):")
                self.test_endpoint("Mark Vessel Called", "POST", f"/sales/vessels/{test_vessel_id}/call")
                self.test_endpoint("Create Vessel Quote", "POST", f"/sales/vessels/{test_vessel_id}/quote")
                self.test_endpoint("Assign Engineer", "POST", f"/sales/vessels/{test_vessel_id}/assign", 
                                 data={"engineer": "Test Engineer"})
                self.test_endpoint("Add Vessel Note", "POST", f"/sales/vessels/{test_vessel_id}/note", 
                                 data={"text": "Test note from API testing"})

        # Test job actions (need to get job IDs first)
        success, jobs_data = self.test_endpoint("Get Test Jobs", "GET", "/ops/jobs", params={"port": "Mumbai"})
        
        if success and jobs_data and len(jobs_data) > 0:
            test_job_id = jobs_data[0].get('id')
            if test_job_id:
                print(f"\n⚙️ Testing Job Actions (ID: {test_job_id}):")
                self.test_endpoint("Acknowledge Job", "PUT", f"/ops/jobs/{test_job_id}/status", 
                                 data={"status": "acknowledged"})
                self.test_endpoint("Start Job", "PUT", f"/ops/jobs/{test_job_id}/status", 
                                 data={"status": "in_progress"})
                self.test_endpoint("Complete Job", "PUT", f"/ops/jobs/{test_job_id}/status", 
                                 data={"status": "completed"})

        # Notifications
        print("\n🔔 Notifications Tests:")
        self.test_endpoint("Get Notifications", "GET", "/notifications")

        # Data seeding
        print("\n🌱 Data Management Tests:")
        self.test_endpoint("Seed Data", "POST", "/seed")

        # Error cases
        print("\n❌ Error Handling Tests:")
        self.test_endpoint("Invalid Vessel ID", "POST", "/sales/vessels/invalid-id/call", expected_status=404)
        self.test_endpoint("Invalid Job ID", "PUT", "/ops/jobs/invalid-id/status", 
                         data={"status": "completed"}, expected_status=404)
        self.test_endpoint("Invalid Job Status", "PUT", f"/ops/jobs/{test_job_id if 'test_job_id' in locals() else 'test-id'}/status", 
                         data={"status": "invalid_status"}, expected_status=400)

        return self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Backend API is functioning correctly.")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed. Check issues above.")
            
            # Show failed tests
            failed_tests = [r for r in self.results if not r['passed']]
            if failed_tests:
                print("\n❌ Failed Tests:")
                for test in failed_tests:
                    print(f"   • {test['test']}: {test['error']}")
            
            return False

def main():
    """Main test execution"""
    tester = MarineServicesTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())