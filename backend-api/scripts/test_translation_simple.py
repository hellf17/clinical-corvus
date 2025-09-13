#!/usr/bin/env python3

"""
Simple translation test to quickly identify if the system is working.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add backend-api to path
sys.path.append(str(Path(__file__).parent.parent))

async def test_translation():
    """Quick test of translation functionality"""
    
    print("🧪 Quick Translation System Test")
    print("=" * 40)
    
    # Test 1: Check if we can import modules
    try:
        from services.translator_service import translate
        print("✅ Translation service imported successfully")
    except Exception as e:
        print(f"❌ Failed to import translation service: {e}")
        return
    
    try:
        from clients.deepl_client import get_rate_limit_status
        print("✅ DeepL client imported successfully")
    except Exception as e:
        print(f"❌ Failed to import DeepL client: {e}")
        return
    
    # Test 2: Check basic configuration
    deepl_key = os.getenv("DEEPL_API_KEY")
    print(f"DeepL API Key: {'✅ SET' if deepl_key else '❌ MISSING'}")
    
    # Test 3: Check rate limit status
    try:
        status = get_rate_limit_status()
        quota_exceeded = status.get('quota_exceeded', False)
        print(f"DeepL Quota: {'❌ EXCEEDED' if quota_exceeded else '✅ OK'}")
        
        daily_usage = status.get('daily_usage', {})
        if daily_usage:
            percentage = daily_usage.get('percentage', 0)
            print(f"Daily Usage: {percentage:.1f}%")
    except Exception as e:
        print(f"❌ Error checking DeepL status: {e}")
    
    # Test 4: Simple translation test
    print("\nTesting translation...")
    test_text = "Hello, this is a test"
    
    try:
        result = await translate(test_text, "PT")
        if result and result != test_text:
            print(f"✅ Translation successful: '{test_text}' -> '{result}'")
        else:
            print(f"❌ Translation failed or returned original text")
    except Exception as e:
        print(f"❌ Translation error: {e}")
        # Print the full stack trace for debugging
        import traceback
        print(f"Full error: {traceback.format_exc()}")

if __name__ == "__main__":
    asyncio.run(test_translation())