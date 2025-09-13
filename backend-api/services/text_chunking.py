import logging
import re
from typing import Dict, List, Tuple


logger = logging.getLogger(__name__)


def split_into_sections(text: str) -> List[Tuple[str, str]]:
    """
    Heuristic splitter by headings/sections first.
    Returns list of (section_title, section_text).
    """
    if not text:
        return []
    # Split on Markdown-style headings or all-caps lines ending with colon.
    pattern = re.compile(r"(?m)^(#{1,5}\s+.+|[A-Z][A-Z\s]{3,}\:?)\s*$")
    parts = []
    last = 0
    current_title = ""
    for m in pattern.finditer(text):
        if m.start() != 0:
            section = text[last:m.start()].strip()
            if section:
                parts.append((current_title.strip(), section))
        current_title = m.group(0)
        last = m.end()
    tail = text[last:].strip()
    if tail:
        parts.append((current_title.strip(), tail))
    if not parts:
        parts = [("", text)]
    return parts


def chunk_by_tokens(
    text: str,
    target_tokens: int = 512,
    overlap_tokens: int = 64,
    encoding_name: str = "cl100k_base",
) -> List[str]:
    """
    Token-aware chunking with overlap, sentence-friendly.
    """
    if not text:
        return []
    # Lazy import tiktoken; fallback if unavailable
    enc = None
    try:
        import tiktoken  # type: ignore
        try:
            enc = tiktoken.get_encoding(encoding_name)
        except Exception:
            enc = tiktoken.get_encoding("cl100k_base")
    except Exception:
        enc = None

    sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\[(])", text.strip())
    chunks: List[str] = []
    buf: List[str] = []
    buf_tokens = 0

    def tok_count(s: str) -> int:
        if enc is not None:
            return len(enc.encode(s))
        # Fallback: approximate tokens by whitespace-split words
        return max(1, len(re.findall(r"\w+", s)))

    for sent in sentences:
        st = sent.strip()
        if not st:
            continue
        t = tok_count(st)
        if buf_tokens + t <= target_tokens or not buf:
            buf.append(st)
            buf_tokens += t
        else:
            # flush buffer as a chunk
            chunk_text = " ".join(buf).strip()
            if chunk_text:
                chunks.append(chunk_text)
            # start new buffer with overlap from end
            if overlap_tokens > 0 and chunk_text:
                if enc is not None:
                    tokens = enc.encode(chunk_text)
                    overlap_slice = tokens[-overlap_tokens:]
                    overlap_text = enc.decode(overlap_slice)
                else:
                    # Fallback: take last N words as overlap
                    words = re.findall(r"\w+", chunk_text)
                    overlap_text = " ".join(words[-overlap_tokens:])
                buf = [overlap_text, st]
                buf_tokens = tok_count(overlap_text) + t
            else:
                buf = [st]
                buf_tokens = t

    if buf:
        chunk_text = " ".join(buf).strip()
        if chunk_text:
            chunks.append(chunk_text)

    return chunks


def structured_chunk(
    text: str,
    target_tokens: int = 512,
    overlap_tokens: int = 64,
    encoding_name: str = "cl100k_base",
) -> List[Dict[str, str]]:
    """
    Structure-aware chunking: split by sections, then token-chunk.
    Returns list of dicts with 'title' and 'text'.
    """
    sections = split_into_sections(text)
    out: List[Dict[str, str]] = []
    for title, body in sections:
        for ch in chunk_by_tokens(body, target_tokens, overlap_tokens, encoding_name):
            out.append({"title": title, "text": ch})
    return out
