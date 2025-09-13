// baml_src/client_config.baml
// Define the DrCorvusLLM client configuration with improved rate limiting

// Define retry policies for better error handling
retry_policy OpenRouterRetryPolicy {
  max_retries 1        // Reduced from 3 to 1
  strategy {
    type exponential_backoff
    delay_ms 500       // Reduced from 1000ms
    max_delay_ms 2000  // Reduced from 30000ms
    multiplier 1.5     // Reduced multiplier
    jitter true
  }
}

retry_policy TranslatorRetryPolicy {
  max_retries 1        // Reduced from 2 to 1
  strategy {
    type exponential_backoff
    delay_ms 300       // Reduced from 500ms
    max_delay_ms 1000  // Reduced from 10000ms
    multiplier 1.5     // Reduced multiplier
    jitter true
  }
}

retry_policy FallbackRetryPolicy {
  max_retries 0        // Disable retries for fallback
  strategy {
    type constant_delay
    delay_ms 5         // Delay between fallbacks
  }
}

// Define the primary client that uses a fallback strategy
client DrCorvusLLM {
  provider fallback
  retry_policy FallbackRetryPolicy  // Use the faster fallback policy
  options {
    strategy [
      OpenRouterPrimary,
      OpenRouterSecondary,
      OpenRouterTertiary
    ]
  }
}

// Define the translator client with improved fallback
client Translator {
  provider fallback
  retry_policy TranslatorRetryPolicy
  options {
    strategy [
      TranslatorPrimary,
      TranslatorSecondary,
      OpenRouterSecondary
    ]
  }
}

// Define specialized translation models with rate limiting
client TranslatorPrimary {
  provider openai-generic
  retry_policy TranslatorRetryPolicy
  options {
    model "gpt-oss-120b:free"
    temperature 0.3  // Lower temperature for more accurate translations
    max_tokens 4000
    base_url "https://openrouter.ai/api/v1"
    api_key env.OPENROUTER_API_KEY
    // Rate limiting headers for OpenRouter
    headers {
      "HTTP-Referer" "https://clinical-corvus.com"
      "X-Title" "Clinical Corvus Translation Service"
    }
  }
}

client TranslatorSecondary {
  provider openai-generic
  retry_policy TranslatorRetryPolicy
  options {
    model "google/gemini-2.0-flash-exp:free" 
    temperature 0.3  // Lower temperature for more accurate translations
    max_tokens 4000
    base_url "https://openrouter.ai/api/v1"
    api_key env.OPENROUTER_API_KEY
    headers {
      "HTTP-Referer" "https://clinical-corvus.com"
      "X-Title" "Clinical Corvus Translation Service"
    }
  }
}

// Define the OpenRouter clients with improved rate limiting
client OpenRouterPrimary {
  provider openai-generic
  retry_policy OpenRouterRetryPolicy
  options {
    model "openai/gpt-oss-120b:free"
    temperature 0.4
    max_tokens 4000
    base_url "https://openrouter.ai/api/v1"
    api_key env.OPENROUTER_API_KEY
    headers {
      "HTTP-Referer" "https://clinical-corvus.com"
      "X-Title" "Clinical Corvus AI Assistant"
    }
    // Request timeout and rate limiting
    timeout_ms 30000  // 30 second timeout
  }
}

client OpenRouterSecondary {
  provider openai-generic
  retry_policy OpenRouterRetryPolicy
  options {
    model "google/gemini-2.0-flash-exp:free"
    temperature 0.4
    max_tokens 4000
    base_url "https://openrouter.ai/api/v1"
    api_key env.OPENROUTER_API_KEY
    headers {
      "HTTP-Referer" "https://clinical-corvus.com"
      "X-Title" "Clinical Corvus AI Assistant"
    }
    timeout_ms 30000
  }
}
client OpenRouterTertiary {
  provider openai-generic
  retry_policy OpenRouterRetryPolicy
  options {
    model "qwen/qwen3-235b-a22b:free"
    temperature 0.4
    max_tokens 4000
    base_url "https://openrouter.ai/api/v1"
    api_key env.OPENROUTER_API_KEY
    headers {
      "HTTP-Referer" "https://clinical-corvus.com"
      "X-Title" "Clinical Corvus AI Assistant"
    }
    timeout_ms 30000
  }
}

// Define a high-performance client for critical operations
client HighPriorityClient {
  provider openai-generic
  retry_policy OpenRouterRetryPolicy
  options {
    model "google/gemini-2.0-flash-exp:free"
    temperature 0.3
    max_tokens 8000  // Higher token limit for complex operations
    base_url "https://openrouter.ai/api/v1"
    api_key env.OPENROUTER_API_KEY
    headers {
      "HTTP-Referer" "https://clinical-corvus.com"
      "X-Title" "Clinical Corvus High Priority"
      "X-Priority" "high"
    }
    timeout_ms 45000  // Longer timeout for complex operations
  }
}

// Define a batch processing client optimized for bulk operations
client BatchProcessingClient {
  provider openai-generic
  retry_policy TranslatorRetryPolicy  // Faster retries for batch operations
  options {
    model "google/gemini-2.0-flash-exp:free"  // Good balance of speed and quality
    temperature 0.3
    max_tokens 3000  // Smaller tokens for faster processing
    base_url "https://openrouter.ai/api/v1"
    api_key env.OPENROUTER_API_KEY
    headers {
      "HTTP-Referer" "https://clinical-corvus.com"
      "X-Title" "Clinical Corvus Batch Processing"
    }
    timeout_ms 20000  // Shorter timeout for batch items
  }
}