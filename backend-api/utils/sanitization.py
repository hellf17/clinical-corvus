"""
HTML and text sanitization utilities for user-provided content.

We sanitize on the backend to prevent stored XSS and ensure consistent safety
regardless of the rendering client.
"""

from typing import Optional
import re
import bleach

# Allowlist compatible with common TipTap content
ALLOWED_TAGS = [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u',
    'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'a', 'span'
]

ALLOWED_ATTRS = {
    'a': ['href', 'title', 'rel', 'target'],
    'span': ['style'],
}

ALLOWED_PROTOCOLS = ['http', 'https', 'mailto']


def sanitize_html(html: Optional[str]) -> str:
    if not html:
        return ''
    # Remove script/style blocks entirely before sanitization
    html = re.sub(r'<\s*(script|style)[^>]*?>[\s\S]*?<\s*/\s*\1\s*>', '', html, flags=re.IGNORECASE)
    # Clean dangerous markup; strip disallowed tags entirely
    return bleach.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    )


def sanitize_text(text: Optional[str]) -> str:
    if not text:
        return ''
    # Remove all tags, keep plain text only
    return bleach.clean(text, tags=[], attributes={}, strip=True)
