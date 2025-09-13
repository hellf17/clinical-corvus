import os
from pathlib import Path

import pytest
import requests

# Ensure backend-api on path
import sys
repo_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(repo_root / 'backend-api'))

from services.grobid_service import GROBIDService


def grobid_available() -> bool:
    base = os.getenv('GROBID_URL', 'http://localhost:8070').rstrip('/')
    try:
        r = requests.get(f"{base}/api/isalive", timeout=5)
        return r.status_code == 200
    except Exception:
        return False


@pytest.mark.skipif(not grobid_available(), reason="GROBID not reachable on GROBID_URL")
def test_grobid_parse_surviving_sepsis():
    pdf_path = repo_root / 'exemplos' / 'Surviving_sepsis.pdf'
    assert pdf_path.exists(), "Expected exemplos/Surviving_sepsis.pdf to exist"
    content = pdf_path.read_bytes()
    svc = GROBIDService(os.getenv('GROBID_URL', 'http://localhost:8070'))
    secs, chs = svc.parse(content, target_tokens=256, overlap_tokens=32)
    assert secs or chs, "GROBID should return sections or chunks"
    # Expect at least some narrative text
    assert any(c.get('role') == 'narrative' and isinstance(c.get('text'), str) and c.get('text') for c in chs)

