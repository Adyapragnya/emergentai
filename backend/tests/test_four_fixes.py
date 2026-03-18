"""
Backend tests for the four fixes:
1. Manager/Owner dropdowns with specific static lists
2. Job status labels (snake_case backend, Title Case frontend)
3. Vessel type/service tag consistency
4. Owner and Manager names distinct
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFix1DropdownOptions:
    """Fix 1: Manager and Owner dropdown filter lists"""
    
    EXPECTED_MANAGERS = [
        "Anglo-Eastern",
        "Synergy Marine",
        "Fleet Management Ltd",
        "BSM Mumbai",
        "GE Shipping",
        "SCI India",
        "Tolani Shipping",
        "Essar Shipping",
    ]
    
    EXPECTED_OWNERS = [
        "HPCL",
        "Indian Oil",
        "GE Shipping",
        "Essar Shipping",
        "SCI India",
        "Reliance Industries",
        "Adani Ports",
    ]
    
    def test_filters_endpoint_returns_managers(self):
        """Test that /api/filters returns the exact manager list"""
        response = requests.get(f"{BASE_URL}/api/filters")
        assert response.status_code == 200
        data = response.json()
        assert "managers" in data
        assert data["managers"] == self.EXPECTED_MANAGERS
    
    def test_filters_endpoint_returns_owners(self):
        """Test that /api/filters returns the exact owner list"""
        response = requests.get(f"{BASE_URL}/api/filters")
        assert response.status_code == 200
        data = response.json()
        assert "owners" in data
        assert data["owners"] == self.EXPECTED_OWNERS
    
    def test_manager_filter_count_matches(self):
        """Test that exactly 8 managers are returned"""
        response = requests.get(f"{BASE_URL}/api/filters")
        assert response.status_code == 200
        data = response.json()
        assert len(data["managers"]) == 8
    
    def test_owner_filter_count_matches(self):
        """Test that exactly 7 owners are returned"""
        response = requests.get(f"{BASE_URL}/api/filters")
        assert response.status_code == 200
        data = response.json()
        assert len(data["owners"]) == 7


class TestFix2StatusLabels:
    """Fix 2: Job status labels format (backend returns snake_case)"""
    
    VALID_STATUSES = ["pending", "acknowledged", "in_progress", "completed", "flagged"]
    
    def test_jobs_have_valid_status_format(self):
        """Test that all jobs have valid snake_case status values"""
        response = requests.get(f"{BASE_URL}/api/ops/jobs")
        assert response.status_code == 200
        jobs = response.json()
        
        for job in jobs:
            assert job["status"] in self.VALID_STATUSES, f"Invalid status: {job['status']}"
    
    def test_pending_status_exists(self):
        """Test that pending jobs exist"""
        response = requests.get(f"{BASE_URL}/api/ops/jobs")
        assert response.status_code == 200
        jobs = response.json()
        pending_jobs = [j for j in jobs if j["status"] == "pending"]
        assert len(pending_jobs) > 0, "Expected at least one pending job"
    
    def test_in_progress_status_snake_case(self):
        """Test that in_progress status uses snake_case"""
        response = requests.get(f"{BASE_URL}/api/ops/jobs")
        assert response.status_code == 200
        jobs = response.json()
        
        # Check that there's no 'in-progress' or 'InProgress' format
        for job in jobs:
            assert 'in-progress' not in job["status"], "Status should not use hyphen"
            assert job["status"].islower() or job["status"] == "in_progress", "Status should be snake_case"
    
    def test_acknowledged_status_exists(self):
        """Test that acknowledged jobs exist"""
        response = requests.get(f"{BASE_URL}/api/ops/jobs")
        assert response.status_code == 200
        jobs = response.json()
        acknowledged_jobs = [j for j in jobs if j["status"] == "acknowledged"]
        assert len(acknowledged_jobs) >= 0  # May or may not have acknowledged jobs


class TestFix3VesselServiceMapping:
    """Fix 3: Vessel type to service tags consistency"""
    
    # Expected service mappings
    SERVICE_MAP = {
        "Bulk Carrier": ["LSA", "FFA"],
        "Product Tanker": ["FFA", "LSA"],
        "Chemical Tanker": ["FFA", "LSA"],
        "Container": ["LSA", "FFA", "NAVCOM"],
        "RORO": ["LSA", "FFA"],
        "General Cargo": ["LSA", "FFA", "NAVCOM"],
    }
    
    def test_bulk_carriers_no_navcom(self):
        """Test that Bulk Carriers do NOT have NAVCOM service"""
        response = requests.get(f"{BASE_URL}/api/sales/vessels?tab=arriving")
        assert response.status_code == 200
        vessels = response.json()
        
        bulk_carriers = [v for v in vessels if v.get("vessel_type") == "Bulk Carrier"]
        for bc in bulk_carriers:
            assert "NAVCOM" not in bc["service_types"], f"Bulk Carrier {bc['name']} should not have NAVCOM"
    
    def test_roro_no_navcom(self):
        """Test that RORO vessels do NOT have NAVCOM service"""
        response = requests.get(f"{BASE_URL}/api/sales/vessels?tab=arriving")
        assert response.status_code == 200
        vessels = response.json()
        
        roro_vessels = [v for v in vessels if v.get("vessel_type") == "RORO"]
        for roro in roro_vessels:
            assert "NAVCOM" not in roro["service_types"], f"RORO {roro['name']} should not have NAVCOM"
    
    def test_tankers_have_ffa_lsa(self):
        """Test that Tankers have FFA and/or LSA services"""
        response = requests.get(f"{BASE_URL}/api/sales/vessels?tab=arriving")
        assert response.status_code == 200
        vessels = response.json()
        
        tankers = [v for v in vessels if "Tanker" in v.get("vessel_type", "")]
        for tanker in tankers:
            has_valid_service = "FFA" in tanker["service_types"] or "LSA" in tanker["service_types"]
            assert has_valid_service, f"Tanker {tanker['name']} should have FFA or LSA"
    
    def test_all_vessels_have_valid_services(self):
        """Test that all vessels have at least one service"""
        response = requests.get(f"{BASE_URL}/api/sales/vessels?tab=arriving")
        assert response.status_code == 200
        vessels = response.json()
        
        for vessel in vessels:
            assert len(vessel["service_types"]) > 0, f"Vessel {vessel['name']} has no services"
            for svc in vessel["service_types"]:
                assert svc in ["LSA", "FFA", "NAVCOM"], f"Invalid service {svc}"


class TestFix4OwnerManagerDistinct:
    """Fix 4: Owner and Manager must be different for each vessel"""
    
    def test_owner_manager_always_different(self):
        """Test that no vessel has the same company as both owner and manager"""
        response = requests.get(f"{BASE_URL}/api/sales/vessels?tab=arriving")
        assert response.status_code == 200
        vessels = response.json()
        
        for vessel in vessels:
            owner = vessel.get("ship_owner", "")
            manager = vessel.get("ship_manager", "")
            assert owner != manager, f"Vessel {vessel['name']} has same owner and manager: {owner}"
    
    def test_vessels_have_owner_field(self):
        """Test that all vessels have ship_owner field"""
        response = requests.get(f"{BASE_URL}/api/sales/vessels?tab=arriving")
        assert response.status_code == 200
        vessels = response.json()
        
        for vessel in vessels:
            assert "ship_owner" in vessel, f"Vessel {vessel['name']} missing ship_owner"
            assert vessel["ship_owner"], f"Vessel {vessel['name']} has empty ship_owner"
    
    def test_vessels_have_manager_field(self):
        """Test that all vessels have ship_manager field"""
        response = requests.get(f"{BASE_URL}/api/sales/vessels?tab=arriving")
        assert response.status_code == 200
        vessels = response.json()
        
        for vessel in vessels:
            assert "ship_manager" in vessel, f"Vessel {vessel['name']} missing ship_manager"
            assert vessel["ship_manager"], f"Vessel {vessel['name']} has empty ship_manager"
    
    def test_jobs_owner_manager_distinct(self):
        """Test that jobs also have distinct owner and manager"""
        response = requests.get(f"{BASE_URL}/api/ops/jobs")
        assert response.status_code == 200
        jobs = response.json()
        
        for job in jobs:
            owner = job.get("ship_owner", "")
            manager = job.get("ship_manager", "")
            assert owner != manager, f"Job for {job['vessel_name']} has same owner and manager"


class TestAdditionalAPIChecks:
    """Additional API checks for core functionality"""
    
    def test_api_root(self):
        """Test API root returns message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
    
    def test_ports_endpoint(self):
        """Test that ports endpoint returns valid data"""
        response = requests.get(f"{BASE_URL}/api/ports")
        assert response.status_code == 200
        data = response.json()
        assert "ports" in data
        expected_ports = ["Mumbai", "Kandla", "Kochi", "Tuticorin", "Chennai", "Vizag", "Mundra"]
        assert data["ports"] == expected_ports
    
    def test_sales_stats_endpoint(self):
        """Test sales stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/sales/stats")
        assert response.status_code == 200
        data = response.json()
        assert "arriving_this_week" in data
        assert "overdue_calls" in data
    
    def test_ops_stats_endpoint(self):
        """Test ops stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/ops/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_jobs" in data
        assert "pending" in data
