#!/usr/bin/env python
"""
Connectivity test for LlamaParse and (optionally) Docling/thepi.pe.

Usage:
  python scripts/parse_connectivity_test.py exemplos/Surviving_sepsis.pdf

Environment:
  LLAMA_CLOUD_API_KEY (optional)
  LLAMAPARSE_RESULT_TYPE (json|markdown)
  LLAMAPARSE_LANGUAGE (en|pt|AUTO)
"""
import os
import sys
from pathlib import Path


def test_llamaparse(path: Path) -> None:
    try:
        from llama_parse import LlamaParse
        from llama_parse.base import ResultType
    except Exception as e:
        print("[LlamaParse] Not installed:", e)
        return
    key = os.getenv("LLAMA_CLOUD_API_KEY")
    if not key:
        print("[LlamaParse] Missing LLAMA_CLOUD_API_KEY; skipping")
        return
    mode = os.getenv("LLAMAPARSE_RESULT_TYPE", "json").lower()
    lang = os.getenv("LLAMAPARSE_LANGUAGE", "AUTO")
    try:
        parser = LlamaParse(api_key=key, result_type=ResultType.JSON if mode == 'json' else ResultType.MD)
        docs = parser.load_data([str(path)])
        print(f"[LlamaParse] Submitted job; docs={len(docs) if docs else 0}")
        for d in docs or []:
            t = getattr(d, 'text', '') or ''
            print('[LlamaParse] First 200 chars:', t[:200].replace('\n',' ') if isinstance(t,str) else '<non-text>')
        return
    except Exception as e:
        print('[LlamaParse] Error:', e)


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/parse_connectivity_test.py <pdf_path>")
        sys.exit(1)
    path = Path(sys.argv[1])
    if not path.exists():
        print("File does not exist:", path)
        sys.exit(2)
    test_llamaparse(path)


if __name__ == '__main__':
    main()

