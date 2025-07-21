#!/usr/bin/env python3
"""
Simple script to test CORS configuration
"""
import requests
import sys

def test_cors():
    """Test CORS headers from the backend"""
    try:
        # Test preflight request
        headers = {
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
        
        response = requests.options('http://localhost:8000/api/health', headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"CORS Headers:")
        print(f"  Access-Control-Allow-Origin: {response.headers.get('Access-Control-Allow-Origin')}")
        print(f"  Access-Control-Allow-Methods: {response.headers.get('Access-Control-Allow-Methods')}")
        print(f"  Access-Control-Allow-Headers: {response.headers.get('Access-Control-Allow-Headers')}")
        print(f"  Access-Control-Allow-Credentials: {response.headers.get('Access-Control-Allow-Credentials')}")
        
        # Test actual request
        headers = {
            'Origin': 'http://localhost:3000'
        }
        
        response = requests.get('http://localhost:8000/api/health', headers=headers)
        print(f"\nActual request test:")
        print(f"Status Code: {response.status_code}")
        print(f"Access-Control-Allow-Origin: {response.headers.get('Access-Control-Allow-Origin')}")
        
        return response.status_code == 200
        
    except Exception as e:
        print(f"Error testing CORS: {e}")
        return False

if __name__ == "__main__":
    success = test_cors()
    sys.exit(0 if success else 1)