import json
import os
import sys
import argparse
import time
from datetime import datetime
import urllib.request


def post_json(url: str, payload: dict, headers: dict = None):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers or {}, method='POST')
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode('utf-8'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', required=True, help='JSONL file with prompts')
    ap.add_argument('--output', required=True, help='Output JSON file for raw run results')
    ap.add_argument('--base-url', default=os.environ.get('BENCH_BASE_URL', 'http://localhost:8000'), help='Backend base URL')
    ap.add_argument('--endpoint', default='/api/research/quick-search', help='Backend endpoint path')
    ap.add_argument('--mode', default='comprehensive', help='quick | comprehensive')
    args = ap.parse_args()

    os.makedirs(os.path.dirname(args.output), exist_ok=True)

    outputs = []
    with open(args.input, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            item = json.loads(line)
            prompt = item.get('prompt')
            rid = item.get('id') or f"item_{len(outputs)+1}"
            payload = {
                'user_original_query': prompt,
                'research_mode': args.mode,
            }
            url = args.base_url.rstrip('/') + args.endpoint
            headers = {'Content-Type': 'application/json'}
            print(f"[RUN] {rid} -> {url}")
            t0 = time.time()
            try:
                res = post_json(url, payload, headers=headers)
                dt = time.time() - t0
                outputs.append({
                    'id': rid,
                    'prompt': prompt,
                    'latency_s': dt,
                    'response': res,
                })
            except Exception as e:
                dt = time.time() - t0
                print(f"[ERR] {rid}: {e}")
                outputs.append({
                    'id': rid,
                    'prompt': prompt,
                    'latency_s': dt,
                    'error': str(e),
                })

    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump({
            'run_started_at': datetime.utcnow().isoformat() + 'Z',
            'endpoint': args.endpoint,
            'mode': args.mode,
            'results': outputs,
        }, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(outputs)} results to {args.output}")


if __name__ == '__main__':
    main()

