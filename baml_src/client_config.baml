// baml_src/client_config.baml
// Define the DrCorvusLLM client configuration with improved rate limiting

// Define retry policies for better error handling
retry_policy OpenRouterRetryPolicy {
  max_retries 3
  strategy {
    type exponential_backoff
    delay_ms 1000      // Start with 1 second
    max_delay_ms 30000 // Max 30 seconds
    multiplier 2.0     // Double delay each retry
    jitter true        // Add randomization to prevent thundering herd
  }
}

retry_policy TranslatorRetryPolicy {
  max_retries 2
  strategy {
    type exponential_backoff
    delay_ms 500       // Start with 500ms for faster translation retries
    max_delay_ms 10000 // Max 10 seconds
    multiplier 2.0
    jitter true
  }
}

retry_policy FallbackRetryPolicy {
  max_retries 1
  strategy {
    type constant_delay
    delay_ms 100  // Quick fallback between clients
  }
}

// Define the primary client that uses a fallback strategy
client DrCorvusLLM {
  provider fallback
  retry_policy OpenRouterRetryPolicy
  options {
    // The strategy now directly lists the clients in order of fallback
    strategy [
      OpenRouterPrimary,
      OpenRouterSecondary,
      OpenRouterTertiary,
      OpenRouterQuaternary
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
      OpenRouterPrimary,
      OpenRouterSecondary
    ]
  }
}

// Define specialized translation models with rate limiting
client TranslatorPrimary {
  provider openai-generic
  retry_policy TranslatorRetryPolicy
  options {
    model "google/gemini-2.0-flash-exp:free"
    temperature 0.2  // Lower temperature for more accurate translations
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
    model "qwen/qwen3-14b:free"  // Good for multilingual translation
    temperature 0.2  // Lower temperature for more accurate translations
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
    model "google/gemini-2.0-flash-exp:free"
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
    model "deepseek/deepseek-r1-0528-qwen3-8b:free"
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
    model "deepseek/deepseek-r1-0528:free"
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

client OpenRouterQuaternary {
  provider openai-generic
  retry_policy OpenRouterRetryPolicy
  options {
    model "qwen/qwen3-14b:free"
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
    model "qwen/qwen3-14b:free"  // Good balance of speed and quality
    temperature 0.2
    max_tokens 2000  // Smaller tokens for faster processing
    base_url "https://openrouter.ai/api/v1"
    api_key env.OPENROUTER_API_KEY
    headers {
      "HTTP-Referer" "https://clinical-corvus.com"
      "X-Title" "Clinical Corvus Batch Processing"
    }
    timeout_ms 20000  // Shorter timeout for batch items
  }
}