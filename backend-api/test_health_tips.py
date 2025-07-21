#!/usr/bin/env python3
"""
Test script to verify the health-tips endpoint is working correctly.
"""

import requests
import json

def test_health_tips_endpoint():
    """Test the health-tips endpoint directly."""
    
    base_url = "http://localhost:8000"
    endpoint = "/api/me/health-tips"
    
    print("Testing health-tips endpoint...")
    print(f"URL: {base_url}{endpoint}")
    
    try:
        # Test without authentication (should fail)
        print("\n1. Testing without authentication...")
        response = requests.get(f"{base_url}{endpoint}")
        print(f"Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Response: {response.text}")
        
        # Test CORS headers
        print("\n2. Testing CORS headers...")
        headers = {
            'Origin': 'http://localhost:3000',
            'Content-Type': 'application/json'
        }
        response = requests.get(f"{base_url}{endpoint}", headers=headers)
        cors_origin = response.headers.get('Access-Control-Allow-Origin')
        print(f"CORS Origin: {cors_origin}")
        
        # Test OPTIONS request for CORS preflight
        print("\n3. Testing OPTIONS request...")
        response = requests.options(f"{base_url}{endpoint}", headers=headers)
        print(f"OPTIONS Status: {response.status_code}")
        print(f"OPTIONS Headers: {dict(response.headers)}")
        
        # Test basic health check
        print("\n4. Testing basic health check...")
        response = requests.get(f"{base_url}/health")
        print(f"Health Status: {response.status_code}")
        print(f"Health Response: {response.json()}")
        
    except Exception as e:
        print(f"Error testing endpoint: {e}")

if __name__ == "__main__":
    test_health_tips_endpoint()