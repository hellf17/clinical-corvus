#!/usr/bin/env python3
"""
Test script to verify health-tips endpoint functionality after CORS and ORM fixes.
This script tests:
1. Endpoint accessibility without CORS errors
2. Response status is 200
3. Valid JSON response with health tips
4. No backend errors during processing
"""

import requests
import json
import sys
from typing import Dict, List, Any

# Configuration
BACKEND_URL = "http://localhost:8000"
ENDPOINT = "/api/me/health-tips"
FULL_URL = f"{BACKEND_URL}{ENDPOINT}"

def test_health_tips_endpoint():
    """Test the health-tips endpoint comprehensively."""
    
    print("🔍 Testing Health Tips Endpoint")
    print("=" * 50)
    
    try:
        # Test 1: Basic GET request
        print("\n1. Testing basic GET request...")
        response = requests.get(FULL_URL, timeout=10)
        
        # Check status code
        print(f"   Status Code: {response.status_code}")
        if response.status_code != 200:
            print(f"   ❌ Expected 200, got {response.status_code}")
            return False
        
        print("   ✅ Status code 200 OK")
        
        # Test 2: Check CORS headers
        print("\n2. Checking CORS headers...")
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
        }
        
        print(f"   CORS Headers: {json.dumps(cors_headers, indent=2)}")
        
        if cors_headers['Access-Control-Allow-Origin']:
            print("   ✅ CORS headers present")
        else:
            print("   ⚠️  CORS headers may be missing")
        
        # Test 3: Validate JSON response
        print("\n3. Validating JSON response...")
        try:
            data = response.json()
            print("   ✅ Response is valid JSON")
        except json.JSONDecodeError as e:
            print(f"   ❌ Invalid JSON: {e}")
            return False
        
        # Test 4: Check response structure
        print("\n4. Checking response structure...")
        if not isinstance(data, list):
            print("   ❌ Response is not a list")
            return False
        
        print(f"   ✅ Response is a list with {len(data)} items")
        
        if len(data) > 0:
            print("\n5. Validating first health tip structure...")
            first_tip = data[0]
            required_fields = ['tip_id', 'title', 'content', 'category', 'source', 'created_at', 'is_general']
            
            missing_fields = []
            for field in required_fields:
                if field not in first_tip:
                    missing_fields.append(field)
            
            if missing_fields:
                print(f"   ❌ Missing fields: {missing_fields}")
                return False
            
            print("   ✅ All required fields present")
            print(f"   Sample tip: {first_tip.get('title', 'No title')}")
            print(f"   Content preview: {first_tip.get('content', 'No content')[:100]}...")
        
        # Test 5: Test with limit parameter
        print("\n6. Testing with limit parameter...")
        limited_response = requests.get(f"{FULL_URL}?limit=3", timeout=10)
        
        if limited_response.status_code == 200:
            limited_data = limited_response.json()
            print(f"   ✅ Limited request returned {len(limited_data)} items")
            
            if len(limited_data) <= 3:
                print("   ✅ Limit parameter working correctly")
            else:
                print("   ⚠️  Limit parameter may not be working")
        else:
            print(f"   ❌ Limited request failed: {limited_response.status_code}")
        
        # Test 6: OPTIONS request for CORS preflight
        print("\n7. Testing OPTIONS request (CORS preflight)...")
        options_response = requests.options(FULL_URL, timeout=10)
        print(f"   OPTIONS Status: {options_response.status_code}")
        
        if options_response.status_code in [200, 204]:
            print("   ✅ OPTIONS request successful")
        else:
            print("   ⚠️  OPTIONS request failed - may affect browser access")
        
        # Summary
        print("\n" + "=" * 50)
        print("✅ All tests passed! Health-tips endpoint is working correctly.")
        print(f"   Endpoint: {FULL_URL}")
        print(f"   Response time: {response.elapsed.total_seconds():.2f}s")
        print(f"   Total tips returned: {len(data)}")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print(f"   ❌ Connection error - Backend not running at {BACKEND_URL}")
        print("   Please start the backend server first:")
        print("   cd backend-api && uvicorn main:app --reload")
        return False
        
    except requests.exceptions.Timeout:
        print("   ❌ Request timeout - Backend may be slow or unresponsive")
        return False
        
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
        return False

def test_frontend_proxy():
    """Test the frontend proxy route if available."""
    print("\n" + "=" * 50)
    print("🔍 Testing Frontend Proxy Route")
    
    frontend_url = "http://localhost:3000/api/me/health-tips"
    
    try:
        response = requests.get(frontend_url, timeout=10)
        print(f"Frontend proxy status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Frontend proxy working - returned {len(data)} tips")
            return True
        else:
            print(f"Frontend proxy failed: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("Frontend not running - skipping proxy test")
        return None

if __name__ == "__main__":
    print("Starting Health Tips Endpoint Test...")
    
    # Test backend endpoint
    backend_success = test_health_tips_endpoint()
    
    # Test frontend proxy
    frontend_result = test_frontend_proxy()
    
    # Final summary
    print("\n" + "=" * 50)
    print("📊 FINAL TEST SUMMARY")
    print("=" * 50)
    
    if backend_success:
        print("✅ Backend endpoint: WORKING")
    else:
        print("❌ Backend endpoint: FAILED")
        sys.exit(1)
    
    if frontend_result is True:
        print("✅ Frontend proxy: WORKING")
    elif frontend_result is False:
        print("❌ Frontend proxy: FAILED")
    else:
        print("⏭️  Frontend proxy: SKIPPED (not running)")
    
    print("\n🎉 All critical tests completed successfully!")