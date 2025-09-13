import sys
from pathlib import Path

# Ensure backend-api is on path without importing project-wide conftest
repo_root = Path(__file__).resolve().parents[1]
backend_path = repo_root / 'backend-api'
sys.path.insert(0, str(backend_path))

from utils.sanitization import sanitize_html, sanitize_text


def test_sanitize_html_strips_script():
    html = "<p>Hello</p><script>alert('x')</script>"
    cleaned = sanitize_html(html)
    assert "script" not in cleaned.lower()
    assert "alert" not in cleaned
    assert "<p>Hello</p>" in cleaned


def test_sanitize_html_allows_basic_tags():
    html = "<h2>Title</h2><strong>bold</strong><em>em</em><ul><li>one</li></ul>"
    cleaned = sanitize_html(html)
    assert "Title" in cleaned and "bold" in cleaned and "em" in cleaned
    assert "<ul>" in cleaned and "<li>" in cleaned


def test_sanitize_html_strips_on_handlers():
    html = "<a href='https://example.com' onclick=alert(1)>link</a>"
    cleaned = sanitize_html(html)
    assert "onclick" not in cleaned.lower()
    assert "https://example.com" in cleaned


def test_sanitize_text_removes_tags():
    text = "Hello <b>world</b> <script>bad()</script>"
    cleaned = sanitize_text(text)
    assert cleaned == "Hello world bad()" or cleaned.startswith("Hello world")
