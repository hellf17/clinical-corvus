#!/usr/bin/env python
"""
Deep Research Benchmark Runner

This script runs a benchmark against the research agent, captures detailed
traces, and formats the output into a standardized schema for evaluation.

Input: JSONL file with prompts, where each line is a JSON object with a "prompt" key.
Output: JSON file containing a list of structured results, where each result includes:
        - final_answer: The final synthesized answer from the agent.
        - citations: A list of cited sources.
        - trace: A step-by-step log of the agent's actions.
        - latency: The total time taken for the request.
        - tokens: Token usage information (if available).
"""

import json
import os
import time
import argparse
from datetime import datetime
import requests

def post_json(url: str, payload: dict, headers: dict = None):
    """Sends a POST request with a JSON payload and returns the JSON response."""
    response = requests.post(url, json=payload, headers=headers, timeout=300) # 5-minute timeout for long-running agent tasks
    response.raise_for_status()
    return response.json()

def adapt_response_to_schema(response: dict, latency: float) -> dict:
    """
    Adapts the agent's raw response to the standardized benchmark schema.
    
    This is a placeholder and will need to be implemented based on the actual
    structure of the agent's response.
    """
    # Placeholder implementation
    final_answer = response.get("final_answer", "")
    citations = response.get("citations", [])
    trace = response.get("trace", {})
    tokens = response.get("tokens", {})

    return {
        "final_answer": final_answer,
        "citations": citations,
        "trace": trace,
        "latency": latency,
        "tokens": tokens,
    }

def main():
    """Main function to run the benchmark."""
    parser = argparse.ArgumentParser(description="Deep Research Benchmark Runner")
    parser.add_argument("--input", required=True, help="JSONL file with prompts")
    parser.add_argument("--output", required=True, help="Output JSON file for structured results")
    parser.add_argument("--endpoint", default="/api/agents/chat", help="Agent endpoint to call")
    parser.add_argument("--base-url", default=os.environ.get("BACKEND_URL", "http://localhost:8000"), help="Backend base URL")
    args = parser.parse_args()

    # Ensure output directory exists
    output_dir = os.path.dirname(args.output)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    results = []
    with open(args.input, "r", encoding="utf-8") as f:
        for line in f:
            item = json.loads(line)
            prompt = item.get("prompt")
            if not prompt:
                continue

            print(f"Running prompt: {prompt[:100]}...")
            
            payload = {"message": prompt} # Assuming the agent takes a "message" key
            url = f"{args.base_url.rstrip('/')}{args.endpoint}"
            headers = {"Content-Type": "application/json", "Accept": "application/json"}

            start_time = time.time()
            try:
                raw_response = post_json(url, payload, headers)
                latency = time.time() - start_time
                
                structured_result = adapt_response_to_schema(raw_response, latency)
                structured_result["prompt"] = prompt
                results.append(structured_result)
                
            except Exception as e:
                latency = time.time() - start_time
                print(f"  Error running prompt: {e}")
                results.append({
                    "prompt": prompt,
                    "error": str(e),
                    "latency": latency,
                })

    # Write results to output file
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump({
            "run_info": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "endpoint": args.endpoint,
                "input_file": args.input,
            },
            "results": results,
        }, f, indent=2)

    print(f"\nBenchmark run complete. Results saved to {args.output}")

if __name__ == "__main__":
    main()