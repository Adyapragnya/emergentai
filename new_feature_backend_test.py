#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class NewFeatureTester:
    def __init__(self, base_url="https://ch16-marine-sales.preview.emergentagent.com"):
        self.base_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.results = []

    def run_test(self, name, method, endpoint, expected_status=200, validate_func=None):
        """Run a single API test with validation"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            success = response.status_code == expected_status
            
            response_data = {}
            if success and response.content:
                try:
                    response_data = response.json()
                    if validate_func:
                        validation_result = validate_func(response_data)
                        if not validation_result["success"]:
                            success = False
                            print(f"❌ Failed - Validation: {validation_result['message']}")
                        else:
                            print(f"✅ Passed - {validation_result['message']}")
                except json.JSONDecodeError:
                    success = False
                    print(f"❌ Failed - Invalid JSON response")

            if success and not validate_func:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
            elif success and validate_func:
                self.tests_passed += 1
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")

            return success, response_data

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def validate_port_counts(self, data):
        """Validate GET /api/sales/port-counts returns counts for all 7 ports"""
        expected_ports = ["Mumbai", "Kandla", "Kochi", "Tuticorin", "Chennai", "Vizag", "Mundra"]
        
        if not isinstance(data, dict):
            return {"success": False, "message": "Response should be a dictionary"}
            
        missing_ports = [port for port in expected_ports if port not in data]
        if missing_ports:
            return {"success": False, "message": f"Missing ports: {missing_ports}"}
            
        total_vessels = sum(data.values())
        return {"success": True, "message": f"All 7 ports present. Total vessels: {total_vessels}"}

    def validate_real_company_names(self, data):
        """Validate GET /api/filters returns real Indian company names"""
        expected_companies = [
            "Anglo-Eastern", "Synergy Marine", "BSM Mumbai", "GE Shipping", 
            "SCI India", "Tolani Shipping", "Essar Shipping", 
            "HPCL Shipping", "Indian Oil Tanking"
        ]
        
        if not isinstance(data, dict) or "managers" not in data:
            return {"success": False, "message": "Missing managers in response"}
            
        managers = data.get("managers", [])
        real_companies_found = [c for c in expected_companies if c in managers]
        
        if len(real_companies_found) < 5:
            return {"success": False, "message": f"Expected more real companies. Found: {real_companies_found}"}
            
        return {"success": True, "message": f"Found {len(real_companies_found)} real Indian companies: {real_companies_found}"}

    def validate_vessel_data_fields(self, data):
        """Validate vessel data includes new fields: vessel_type, gross_tonnage, dwt, year_built, next_port"""
        if not isinstance(data, list) or len(data) == 0:
            return {"success": False, "message": "Expected non-empty list of vessels"}
            
        vessel = data[0]
        required_fields = ["vessel_type", "gross_tonnage", "dwt", "year_built", "next_port"]
        
        missing_fields = [f for f in required_fields if f not in vessel or vessel[f] is None]
        if missing_fields:
            return {"success": False, "message": f"Missing fields: {missing_fields}"}
            
        # Validate next_port structure
        next_port = vessel.get("next_port", {})
        if not isinstance(next_port, dict):
            return {"success": False, "message": "next_port should be an object"}
            
        port_fields = ["name", "code", "covered"]
        missing_port_fields = [f for f in port_fields if f not in next_port]
        if missing_port_fields:
            return {"success": False, "message": f"Missing next_port fields: {missing_port_fields}"}
            
        # Check data types and values
        if not isinstance(vessel["gross_tonnage"], int) or vessel["gross_tonnage"] <= 0:
            return {"success": False, "message": f"Invalid gross_tonnage: {vessel['gross_tonnage']}"}
            
        if not isinstance(vessel["dwt"], int) or vessel["dwt"] <= 0:
            return {"success": False, "message": f"Invalid dwt: {vessel['dwt']}"}
            
        if not isinstance(vessel["year_built"], int) or vessel["year_built"] < 1990:
            return {"success": False, "message": f"Invalid year_built: {vessel['year_built']}"}
            
        return {"success": True, "message": f"Vessel has all required fields. GT:{vessel['gross_tonnage']}, DWT:{vessel['dwt']}, Built:{vessel['year_built']}, Next:{next_port['name']}"}

    def validate_job_data_fields(self, data):
        """Validate job data includes vessel_type and next_port fields"""
        if not isinstance(data, list) or len(data) == 0:
            return {"success": False, "message": "Expected non-empty list of jobs"}
            
        job = data[0]
        required_fields = ["vessel_type", "next_port"]
        
        missing_fields = [f for f in required_fields if f not in job or job[f] is None]
        if missing_fields:
            return {"success": False, "message": f"Missing fields: {missing_fields}"}
            
        # Validate next_port structure in job
        next_port = job.get("next_port", {})
        if not isinstance(next_port, dict) or "name" not in next_port or "covered" not in next_port:
            return {"success": False, "message": "Invalid next_port structure in job"}
            
        return {"success": True, "message": f"Job has vessel_type: {job['vessel_type']}, next_port: {next_port['name']} (covered: {next_port['covered']})"}

    def run_new_feature_tests(self):
        """Run tests for new features from the review request"""
        print("🚢 Testing New Marine Services Features")
        print("=" * 50)

        # Test 1: Port counts endpoint
        self.run_test(
            "Port Counts for All 7 Ports", 
            "GET", 
            "sales/port-counts", 
            validate_func=self.validate_port_counts
        )

        # Test 2: Real company names in filters
        self.run_test(
            "Real Indian Company Names", 
            "GET", 
            "filters", 
            validate_func=self.validate_real_company_names
        )

        # Test 3: Vessel data with new fields
        self.run_test(
            "Vessel Data New Fields", 
            "GET", 
            "sales/vessels?port=Mumbai", 
            validate_func=self.validate_vessel_data_fields
        )

        # Test 4: Job data with new fields  
        self.run_test(
            "Job Data New Fields", 
            "GET", 
            "ops/jobs?port=Mumbai", 
            validate_func=self.validate_job_data_fields
        )

        # Test 5: Manager/Owner filtering
        success, vessels_data = self.run_test(
            "Manager Filter (Anglo-Eastern)", 
            "GET", 
            "sales/vessels?manager=Anglo-Eastern"
        )
        
        if success and vessels_data:
            anglo_vessels = [v for v in vessels_data if v.get('ship_manager') == 'Anglo-Eastern']
            if len(anglo_vessels) > 0:
                print(f"   ✅ Manager filter working: found {len(anglo_vessels)} Anglo-Eastern vessels")
                self.tests_passed += 1
            else:
                print(f"   ❌ Manager filter not working: no Anglo-Eastern vessels in filtered results")
        
        # Test 6: Owner filtering
        success, vessels_data = self.run_test(
            "Owner Filter (SCI India)", 
            "GET", 
            "sales/vessels?owner=SCI India"
        )
        
        if success and vessels_data:
            sci_vessels = [v for v in vessels_data if v.get('ship_owner') == 'SCI India']
            if len(sci_vessels) > 0:
                print(f"   ✅ Owner filter working: found {len(sci_vessels)} SCI India vessels")
                self.tests_passed += 1
            else:
                print(f"   ❌ Owner filter not working: no SCI India vessels in filtered results")

        return self.tests_passed == self.tests_run

def main():
    tester = NewFeatureTester()
    
    success = tester.run_new_feature_tests()
    
    # Print results summary
    print(f"\n📊 New Feature Test Results")
    print("=" * 30)
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())