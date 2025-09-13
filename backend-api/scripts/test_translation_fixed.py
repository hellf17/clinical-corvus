#!/usr/bin/env python3

"""
Windows-compatible translation test that properly loads environment variables.
This script loads .env files before importing other modules.
"""

import os
import sys
from pathlib import Path

# Add backend-api to path
sys.path.append(str(Path(__file__).parent.parent))

# Load environment variables BEFORE importing other modules
from dotenv import load_dotenv

# Load .env files in priority order
env_files = [
    Path(__file__).parent.parent / '.env',  # backend-api/.env
    Path(__file__).parent.parent.parent / '.env',  # root .env
]

for env_file in env_files:
    if env_file.exists():
        print(f"Loading environment from: {env_file}")
        load_dotenv(env_file, override=True)
    else:
        print(f"Environment file not found: {env_file}")

# Now check if environment variables are loaded
deepl_key = os.getenv("DEEPL_API_KEY")
print(f"DEEPL_API_KEY after loading: {'SET' if deepl_key else 'MISSING'}")

import asyncio

async def test_translation():
    """Test translation functionality with proper environment loading"""
    
    print("\nFixed Translation System Test")
    print("=" * 40)
    
    # Test 1: Check if we can import modules
    try:
        from services.translator_service import translate
        print("PASS: Translation service imported successfully")
    except Exception as e:
        print(f"FAIL: Failed to import translation service: {e}")
        return
    
    try:
        from clients.deepl_client import get_rate_limit_status
        print("PASS: DeepL client imported successfully")
    except Exception as e:
        print(f"FAIL: Failed to import DeepL client: {e}")
        return
    
    # Test 2: Check configuration
    deepl_key = os.getenv("DEEPL_API_KEY")
    print(f"DeepL API Key: {'SET' if deepl_key else 'MISSING'}")
    
    # Test 3: Check rate limit status
    try:
        status = get_rate_limit_status()
        quota_exceeded = status.get('quota_exceeded', False)
        print(f"DeepL Quota: {'EXCEEDED' if quota_exceeded else 'OK'}")
        
        daily_usage = status.get('daily_usage', {})
        if daily_usage:
            percentage = daily_usage.get('percentage', 0)
            print(f"Daily Usage: {percentage:.1f}%")
    except Exception as e:
        print(f"FAIL: Error checking DeepL status: {e}")
    
    # Test 4: Simple translation test
    print("\nTesting translation...")
    test_text = "Hello, this is a test"
    
    try:
        result = await translate(test_text, "PT")
        if result and result != test_text:
            print(f"PASS: Translation successful: '{test_text}' -> '{result}'")
        else:
            print(f"FAIL: Translation failed or returned original text")
    except Exception as e:
        print(f"FAIL: Translation error: {e}")
        # Print the full stack trace for debugging
        import traceback
        print(f"Full error: {traceback.format_exc()}")
    
    # Test 5: Batch translation test
    print("\nTesting batch translation...")
    test_texts = ["Hello world", "How are you?", "Good morning"]
    
    try:
        batch_result = await translate(test_texts, "PT")
        if isinstance(batch_result, list) and len(batch_result) == len(test_texts):
            successful_translations = sum(1 for orig, trans in zip(test_texts, batch_result) if orig != trans)
            print(f"PASS: Batch translation successful: {successful_translations}/{len(test_texts)} items translated")
            for orig, trans in zip(test_texts, batch_result):
                if orig != trans:
                    print(f"   '{orig}' -> '{trans}'")
        else:
            print(f"FAIL: Batch translation failed")
    except Exception as e:
        print(f"FAIL: Batch translation error: {e}")
    
    print("\nTranslation system test completed!")

if __name__ == "__main__":
    asyncio.run(test_translation())