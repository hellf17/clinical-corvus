#!/usr/bin/env python3

"""
Debug script to diagnose translation system issues.
Run this script to identify the root cause of translation failures.
"""

import asyncio
import os
import sys
import logging
from pathlib import Path

# Add backend-api to path
sys.path.append(str(Path(__file__).parent.parent))

from clients.deepl_client import get_rate_limit_status, DEEPL_API_KEY, DEEPL_API_URL
from services.translator_service import translate, get_translation_metrics
from services.translation_monitor import get_translation_health

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def diagnose_translation_system():
    """Run comprehensive diagnosis of the translation system"""
    
    print("🔍 CLINICAL CORVUS TRANSLATION SYSTEM DIAGNOSIS")
    print("=" * 60)
    
    # 1. Check Environment Variables
    print("\n1. 🔧 ENVIRONMENT CONFIGURATION")
    print("-" * 40)
    
    deepl_key = os.getenv("DEEPL_API_KEY")
    print(f"DEEPL_API_KEY: {'✅ SET' if deepl_key else '❌ MISSING'}")
    if deepl_key:
        print(f"  Key type: {'Free tier' if ':fx' in deepl_key else 'Pro/API'}")
        print(f"  Key length: {len(deepl_key)} chars")
    
    print(f"DEEPL_API_URL: {DEEPL_API_URL}")
    
    # BAML environment
    baml_vars = [
        "OPENROUTER_API_KEY",
        "GEMINI_API_KEY", 
        "ANTHROPIC_API_KEY"
    ]
    
    for var in baml_vars:
        value = os.getenv(var)
        print(f"{var}: {'✅ SET' if value else '❌ MISSING'}")
    
    # Translation configuration
    config_vars = [
        "TRANSLATION_CACHE_SIZE",
        "MAX_BATCH_SIZE",
        "DEEPL_DAILY_CHAR_LIMIT",
        "DEEPL_BURST_CHAR_LIMIT",
        "DEEPL_BURST_REFILL_RATE"
    ]
    
    for var in config_vars:
        value = os.getenv(var)
        print(f"{var}: {value or 'DEFAULT'}")
    
    # 2. Check DeepL Rate Limit Status
    print("\n2. 📊 DEEPL RATE LIMIT STATUS")
    print("-" * 40)
    
    try:
        rate_status = get_rate_limit_status()
        daily = rate_status['daily_usage']
        burst = rate_status['burst_capacity']
        circuit = rate_status['circuit_breaker']
        
        print(f"Daily Usage: {daily['used']:,}/{daily['limit']:,} chars ({daily['percentage']:.1f}%)")
        print(f"Daily Remaining: {daily['remaining']:,} chars")
        print(f"Burst Capacity: {burst['available']:,}/{burst['capacity']:,} chars")
        print(f"Burst Refill Rate: {burst['refill_rate']:.1f} chars/sec")
        print(f"Circuit Breaker: {circuit['state']} (failures: {circuit['failures']})")
        print(f"Quota Exceeded: {'⚠️ YES' if rate_status['quota_exceeded'] else '✅ NO'}")
        
        if rate_status['quota_exceeded']:
            exceeded_time = rate_status['quota_exceeded_time']
            import time
            if exceeded_time:
                elapsed = time.time() - exceeded_time
                print(f"  Exceeded {elapsed/3600:.1f} hours ago")
        
    except Exception as e:
        print(f"❌ Error checking DeepL status: {e}")
    
    # 3. Check Translation Service Health
    print("\n3. 🏥 TRANSLATION SERVICE HEALTH")
    print("-" * 40)
    
    try:
        health = await get_translation_health()
        print(f"Overall Health: {'✅ HEALTHY' if health['overall_healthy'] else '❌ UNHEALTHY'}")
        print(f"Primary Service: {health['primary_service']}")
        print(f"Fallback Service: {health['fallback_service']}")
        
        # DeepL status
        deepl_status = health['services']['deepl']
        print(f"\nDeepL Service:")
        print(f"  Usage: {deepl_status.get('usage_percentage', 0):.1f}%")
        print(f"  Quota Exceeded: {'⚠️ YES' if deepl_status.get('quota_exceeded') else '✅ NO'}")
        print(f"  Circuit Breaker: {deepl_status.get('circuit_breaker_state', 'unknown')}")
        
        # BAML status  
        baml_status = health['services']['baml']
        print(f"\nBAML Service:")
        print(f"  Healthy: {'✅ YES' if baml_status.get('healthy') else '❌ NO'}")
        if 'error' in baml_status:
            print(f"  Error: {baml_status['error']}")
        
        # Recommendations
        if health['recommendations']:
            print(f"\nRecommendations:")
            for rec in health['recommendations']:
                icon = "🚨" if rec['type'] == 'critical' else "⚠️" if rec['type'] == 'warning' else "ℹ️"
                print(f"  {icon} [{rec['service'].upper()}] {rec['message']}")
                print(f"      Action: {rec['action']}")
        
    except Exception as e:
        print(f"❌ Error checking service health: {e}")
    
    # 4. Test Translation Functionality
    print("\n4. 🧪 TRANSLATION FUNCTIONALITY TESTS")
    print("-" * 40)
    
    test_cases = [
        ("Hello world", "PT", "Simple English to Portuguese"),
        ("Olá mundo", "EN", "Simple Portuguese to English"),
        ("O paciente apresenta dor no peito e dispneia", "EN", "Medical Portuguese to English"),
        ("Patient presents with chest pain and dyspnea", "PT", "Medical English to Portuguese")
    ]
    
    for text, target_lang, description in test_cases:
        print(f"\nTest: {description}")
        print(f"Input: '{text}' -> {target_lang}")
        
        try:
            start_time = asyncio.get_event_loop().time()
            result = await translate(text, target_lang, field_name="debug_test")
            end_time = asyncio.get_event_loop().time()
            
            duration = (end_time - start_time) * 1000  # Convert to ms
            
            if result and result != text:
                print(f"✅ SUCCESS ({duration:.0f}ms): '{result}'")
            else:
                print(f"❌ FAILED: No translation or same as input")
                
        except Exception as e:
            print(f"❌ ERROR: {e}")
    
    # 5. Check Translation Metrics
    print("\n5. 📈 TRANSLATION METRICS")
    print("-" * 40)
    
    try:
        metrics = get_translation_metrics()
        cache_metrics = metrics['cache_metrics']
        
        print("Cache Performance:")
        total_requests = cache_metrics['hits'] + cache_metrics['misses']
        if total_requests > 0:
            hit_rate = (cache_metrics['hits'] / total_requests) * 100
            print(f"  Hit Rate: {hit_rate:.1f}% ({cache_metrics['hits']}/{total_requests})")
        else:
            print(f"  No cache activity recorded")
        
        print(f"  Batch Hits: {cache_metrics['batch_hits']}")
        print(f"  Batch Misses: {cache_metrics['batch_misses']}")
        print(f"  Deduplication Hits: {cache_metrics['deduplication_hits']}")
        
        print("\nService Performance:")
        print(f"  DeepL Success: {cache_metrics['deepl_success']}")
        print(f"  DeepL Failures: {cache_metrics['deepl_failure']}")
        print(f"  BAML Success: {cache_metrics['baml_success']}")
        print(f"  BAML Failures: {cache_metrics['baml_failure']}")
        print(f"  Rate Limit Retries: {cache_metrics['rate_limit_retries']}")
        
        # Calculate success rates
        deepl_total = cache_metrics['deepl_success'] + cache_metrics['deepl_failure']
        baml_total = cache_metrics['baml_success'] + cache_metrics['baml_failure']
        
        if deepl_total > 0:
            deepl_success_rate = (cache_metrics['deepl_success'] / deepl_total) * 100
            print(f"  DeepL Success Rate: {deepl_success_rate:.1f}%")
        
        if baml_total > 0:
            baml_success_rate = (cache_metrics['baml_success'] / baml_total) * 100
            print(f"  BAML Success Rate: {baml_success_rate:.1f}%")
        
        # Cache sizes
        cache_sizes = metrics['cache_sizes']
        print(f"\nCache Sizes:")
        for cache_name, size in cache_sizes.items():
            print(f"  {cache_name}: {size} entries")
        
    except Exception as e:
        print(f"❌ Error retrieving metrics: {e}")
    
    # 6. Batch Size Analysis
    print("\n6. 📦 BATCH SIZE CONFIGURATION ANALYSIS")
    print("-" * 40)
    
    from services.translator_service import MAX_BATCH_SIZE, MAX_TEXT_LENGTH_PER_BATCH
    
    print(f"MAX_BATCH_SIZE: {MAX_BATCH_SIZE} items")
    print(f"MAX_TEXT_LENGTH_PER_BATCH: {MAX_TEXT_LENGTH_PER_BATCH:,} chars")
    
    # Test batch processing with different sizes
    test_texts = ["Test text " + str(i) for i in range(10)]
    print(f"\nTesting batch translation with {len(test_texts)} items:")
    
    try:
        start_time = asyncio.get_event_loop().time()
        batch_result = await translate(test_texts, "PT", field_name="batch_debug_test")
        end_time = asyncio.get_event_loop().time()
        
        duration = (end_time - start_time) * 1000
        
        if isinstance(batch_result, list) and len(batch_result) == len(test_texts):
            successful_translations = sum(1 for orig, trans in zip(test_texts, batch_result) if orig != trans)
            print(f"✅ BATCH SUCCESS ({duration:.0f}ms): {successful_translations}/{len(test_texts)} items translated")
        else:
            print(f"❌ BATCH FAILED: Expected {len(test_texts)} results, got {len(batch_result) if isinstance(batch_result, list) else 'non-list'}")
            
    except Exception as e:
        print(f"❌ BATCH ERROR: {e}")
    
    # 7. Summary and Recommendations
    print("\n7. 📋 DIAGNOSIS SUMMARY")
    print("-" * 40)
    
    issues_found = []
    
    # Check for common issues
    if not deepl_key:
        issues_found.append("❌ CRITICAL: DeepL API key not configured")
    
    try:
        rate_status = get_rate_limit_status()
        if rate_status['quota_exceeded']:
            issues_found.append("⚠️ WARNING: DeepL quota exceeded - using BAML fallback")
        
        if rate_status['circuit_breaker']['state'] == 'OPEN':
            issues_found.append("⚠️ WARNING: DeepL circuit breaker is OPEN")
            
        daily_usage = rate_status['daily_usage']['percentage']
        if daily_usage > 90:
            issues_found.append(f"⚠️ WARNING: DeepL usage very high ({daily_usage:.1f}%)")
            
    except:
        issues_found.append("❌ ERROR: Could not check DeepL status")
    
    if not issues_found:
        print("✅ No obvious issues detected in configuration")
    else:
        print("Issues detected:")
        for issue in issues_found:
            print(f"  {issue}")
    
    print(f"\n🏁 Diagnosis complete. Review the results above to identify the root cause.")

if __name__ == "__main__":
    asyncio.run(diagnose_translation_system())