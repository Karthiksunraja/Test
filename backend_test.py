#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class PropertyTrackerAPITester:
    def __init__(self, base_url="https://asset-watch.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.property_id = None
        
    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        if success:
            self.tests_passed += 1

    def run_test(self, name, method, endpoint, expected_status=200, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            print(f"\n🔍 Testing {name}...")
            print(f"   {method} {url}")
            
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            
            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True, f"Status: {response.status_code}")
                return True, response.json() if response.text else {}
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}")
                return False, {}
            
        except requests.exceptions.Timeout:
            self.log_test(name, False, "Request timeout")
            return False, {}
        except requests.exceptions.ConnectionError:
            self.log_test(name, False, "Connection error")
            return False, {}
        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test("Root API", "GET", "/")
        return success

    def test_seed_demo_data(self):
        """Test demo data seeding"""
        success, response = self.run_test("Seed Demo Data", "POST", "/demo/seed")
        if success:
            print(f"    Demo data response: {response}")
        return success

    def test_get_stats(self):
        """Test dashboard stats endpoint"""
        success, response = self.run_test("Get Dashboard Stats", "GET", "/stats")
        if success:
            required_fields = ["total_properties", "active", "total_value", "average_daily_change"]
            for field in required_fields:
                if field not in response:
                    self.log_test("Stats Fields Validation", False, f"Missing field: {field}")
                    return False
            self.log_test("Stats Fields Validation", True, f"All required fields present")
            print(f"    Stats: Properties={response.get('total_properties')}, Value={response.get('total_value')}")
        return success

    def test_get_properties(self):
        """Test getting all properties"""
        success, response = self.run_test("Get All Properties", "GET", "/properties")
        if success and len(response) > 0:
            self.property_id = response[0].get('id')
            print(f"    Found {len(response)} properties")
            print(f"    First property ID: {self.property_id}")
        return success

    def test_search_properties(self):
        """Test property search functionality"""
        success, response = self.run_test("Search Properties", "GET", "/properties", 
                                        params={"search": "sydney"})
        if success:
            print(f"    Search results: {len(response)} properties")
        return success

    def test_filter_by_suburb(self):
        """Test suburb filtering"""
        success, response = self.run_test("Filter by Suburb", "GET", "/properties", 
                                        params={"suburb": "sydney"})
        if success:
            print(f"    Suburb filter results: {len(response)} properties")
        return success

    def test_add_property(self):
        """Test adding a new property"""
        test_property = {
            "url": "https://www.property.com.au/property/test-address-sydney-nsw-2000/",
            "nickname": "Test Property"
        }
        success, response = self.run_test("Add New Property", "POST", "/properties", 201, test_property)
        if success:
            self.property_id = response.get('id')
            print(f"    Created property with ID: {self.property_id}")
        return success

    def test_get_single_property(self):
        """Test getting a single property"""
        if not self.property_id:
            self.log_test("Get Single Property", False, "No property ID available")
            return False
        
        success, response = self.run_test("Get Single Property", "GET", f"/properties/{self.property_id}")
        if success:
            print(f"    Property: {response.get('address', 'N/A')}")
        return success

    def test_get_property_history(self):
        """Test getting property history"""
        if not self.property_id:
            self.log_test("Get Property History", False, "No property ID available")
            return False
        
        success, response = self.run_test("Get Property History", "GET", f"/properties/{self.property_id}/history")
        if success:
            print(f"    History records: {len(response)}")
        return success

    def test_refresh_property(self):
        """Test refreshing property data"""
        if not self.property_id:
            self.log_test("Refresh Property", False, "No property ID available")
            return False
        
        success, response = self.run_test("Refresh Property", "POST", f"/properties/{self.property_id}/refresh")
        return success

    def test_delete_property(self):
        """Test deleting a property"""
        if not self.property_id:
            self.log_test("Delete Property", False, "No property ID available")
            return False
        
        success, response = self.run_test("Delete Property", "DELETE", f"/properties/{self.property_id}", 200)
        return success

    def run_all_tests(self):
        """Run complete test suite"""
        print("=" * 60)
        print("🚀 Property Tracker API Test Suite")
        print("=" * 60)
        
        # Test basic connectivity
        if not self.test_root_endpoint():
            print("❌ Root endpoint failed - stopping tests")
            return False
        
        # Seed demo data first
        self.test_seed_demo_data()
        
        # Test dashboard stats
        self.test_get_stats()
        
        # Test property operations
        self.test_get_properties()
        self.test_search_properties()
        self.test_filter_by_suburb()
        
        # Test CRUD operations
        self.test_add_property()
        time.sleep(2)  # Give time for property processing
        self.test_get_single_property()
        self.test_get_property_history()
        self.test_refresh_property()
        
        # Clean up (delete test property)
        self.test_delete_property()
        
        # Print final results
        print("\n" + "=" * 60)
        print("📊 Test Results Summary")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = PropertyTrackerAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())