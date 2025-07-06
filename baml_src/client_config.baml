// baml_src/client_config.baml
// Define the DrCorvusLLM client configuration

// Define the primary client that uses a fallback strategy
client DrCorvusLLM {
  provider fallback // Use the fallback provider
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

// Define the translator client
client Translator {
  provider fallback
  options {
    strategy [
      TranslatorPrimary,
      TranslatorSecondary,
      OpenRouterPrimary,
      OpenRouterSecondary
    ]
  }
}

// Define specialized translation models
client TranslatorPrimary {
  provider openai-generic
  options {
    model "google/gemini-2.0-flash-exp:free"
    temperature 0.2  // Lower temperature for more accurate translations
    max_tokens 4000
    base_url "https://openrouter.ai/api/v1"
    api_key env.OPENROUTER_API_KEY
  }
}

client TranslatorSecondary {
  provider openai-generic
  options {
    model "qwen/qwen3-14b:free"  // Good for multilingual translation
    temperature 0.2  // Lower temperature for more accurate translations
    max_tokens 4000
    base_url "https://openrouter.ai/api/v1"
    api_key env.OPENROUTER_API_KEY
  }
}

// Define the OpenRouter client
client OpenRouterPrimary {
  provider openai-generic
  options {
    model "google/gemini-2.0-flash-exp:free"
    temperature 0.4
    max_tokens 4000
    base_url "https://openrouter.ai/api/v1"
    api_key env.OPENROUTER_API_KEY
  }
}

client OpenRouterSecondary {
  provider openai-generic
  options {
    model "deepseek/deepseek-r1-0528-qwen3-8b:free"
    temperature 0.4
    max_tokens 4000
    base_url "https://openrouter.ai/api/v1"
    api_key env.OPENROUTER_API_KEY
  }
}

client OpenRouterTertiary {
  provider openai-generic
  options {
    model "deepseek/deepseek-r1-0528:free"
    temperature 0.4
    max_tokens 4000
    base_url "https://openrouter.ai/api/v1"
    api_key env.OPENROUTER_API_KEY
  }
}

client OpenRouterQuaternary	 {
  provider openai-generic
  options {
    model "qwen/qwen3-14b:free"
    temperature 0.4
    max_tokens 4000
    base_url "https://openrouter.ai/api/v1"
    api_key env.OPENROUTER_API_KEY
  }
}

// Example of an optional retry policy for individual client calls
// retry_policy IndividualClientRetry {
//   max_retries 2
//   strategy {
//     type exponential_backoff
//     delay_ms 500
//     max_delay_ms 10000
//   }
// }

// Example of an optional retry policy for the fallback provider itself
// retry_policy FallbackRetryPolicy {
//   max_retries 1 // e.g. try the whole sequence once (no retries on the sequence itself)
//   strategy {
// type constant_delay // or exponential_backoff
// delay_ms 0 // no delay if just trying sequence once
//   }
// } 