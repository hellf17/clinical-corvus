#!/usr/bin/env python
"""
Simple ingestion CLI to index files, directories, and URLs into the Hybrid RAG backend.

Usage examples:

  # Index a single file
  python scripts/ingest_corpus.py index-file ./docs/sepsis_campaign.pdf --doc-id sepsis-2021

  # Index an entire directory of PDFs
  python scripts/ingest_corpus.py index-dir ./docs/books --glob "*.pdf" --prefix harrison

  # Index a URL
  python scripts/ingest_corpus.py index-url https://example.org/guideline

Environment:
  BACKEND_URL (default: http://localhost:8000)

Endpoints used:
  - POST /api/rag/index-file
  - POST /api/rag/index-url
"""

import os
import sys
from pathlib import Path
from typing import List, Optional

import requests
import typer


app = typer.Typer(help="Hybrid RAG ingestion CLI")


def backend_url() -> str:
    return os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")


def post_file(path: Path, doc_id: Optional[str], source_url: Optional[str], language: Optional[str], target_tokens: int, overlap_tokens: int) -> bool:
    url = f"{backend_url()}/api/rag/index-file"
    files = {"file": (path.name, path.read_bytes())}
    data = {
        "doc_id": doc_id or path.stem,
        "source_url": source_url or "",
        "language": language or "",
        "target_tokens": str(target_tokens),
        "overlap_tokens": str(overlap_tokens),
    }
    try:
        r = requests.post(url, files=files, data=data, timeout=120)
        r.raise_for_status()
        resp = r.json()
        typer.echo(f"[OK] {path} -> sections={resp.get('sections_indexed')} chunks={resp.get('chunks_indexed')}")
        return True
    except Exception as e:
        typer.echo(f"[ERROR] {path} -> {e}")
        return False


def post_url(url_to_index: str, doc_id: Optional[str], language: Optional[str], target_tokens: int, overlap_tokens: int) -> bool:
    url = f"{backend_url()}/api/rag/index-url"
    data = {
        "url": url_to_index,
        "doc_id": doc_id or url_to_index,
        "language": language or "",
        "target_tokens": str(target_tokens),
        "overlap_tokens": str(overlap_tokens),
    }
    try:
        r = requests.post(url, data=data, timeout=120)
        r.raise_for_status()
        resp = r.json()
        typer.echo(f"[OK] {url_to_index} -> sections={resp.get('sections_indexed')} chunks={resp.get('chunks_indexed')}")
        return True
    except Exception as e:
        typer.echo(f"[ERROR] {url_to_index} -> {e}")
        return False


@app.command()
def index_file(
    path: Path = typer.Argument(..., exists=True, file_okay=True, dir_okay=False, readable=True),
    doc_id: Optional[str] = typer.Option(None, help="Base document ID"),
    source_url: Optional[str] = typer.Option(None, help="Original source URL for metadata"),
    language: Optional[str] = typer.Option(None, help="Language hint (e.g., en, pt)"),
    target_tokens: int = typer.Option(512, help="Chunk target size (tokens)"),
    overlap_tokens: int = typer.Option(64, help="Chunk overlap (tokens)"),
):
    """Index a single file."""
    ok = post_file(path, doc_id, source_url, language, target_tokens, overlap_tokens)
    raise typer.Exit(code=0 if ok else 1)


@app.command()
def index_dir(
    directory: Path = typer.Argument(..., exists=True, file_okay=False, dir_okay=True, readable=True),
    glob: str = typer.Option("*.pdf,*.txt,*.html,*.htm", help="Comma-separated glob patterns"),
    prefix: Optional[str] = typer.Option(None, help="Prefix for doc_id (e.g., 'harrison')"),
    language: Optional[str] = typer.Option(None, help="Language hint (e.g., en, pt)"),
    target_tokens: int = typer.Option(512, help="Chunk target size (tokens)"),
    overlap_tokens: int = typer.Option(64, help="Chunk overlap (tokens)"),
    max_files: Optional[int] = typer.Option(None, help="Max number of files to index"),
):
    """Index all files in a directory matching patterns."""
    patterns = [p.strip() for p in glob.split(",") if p.strip()]
    files: List[Path] = []
    for pat in patterns:
        files.extend(sorted(directory.rglob(pat)))
    if max_files is not None:
        files = files[:max_files]
    if not files:
        typer.echo("No files matched.")
        raise typer.Exit(code=1)

    success = 0
    for p in files:
        base_id = f"{prefix}-{p.stem}" if prefix else p.stem
        if post_file(p, base_id, None, language, target_tokens, overlap_tokens):
            success += 1

    typer.echo(f"Indexed {success}/{len(files)} files")
    raise typer.Exit(code=0 if success == len(files) else 2)


@app.command()
def index_url(
    url: str = typer.Argument(..., help="URL to fetch and index"),
    doc_id: Optional[str] = typer.Option(None, help="Base document ID"),
    language: Optional[str] = typer.Option(None, help="Language hint (e.g., en, pt)"),
    target_tokens: int = typer.Option(512, help="Chunk target size (tokens)"),
    overlap_tokens: int = typer.Option(64, help="Chunk overlap (tokens)"),
):
    """Index a single URL."""
    ok = post_url(url, doc_id, language, target_tokens, overlap_tokens)
    raise typer.Exit(code=0 if ok else 1)


if __name__ == "__main__":
    app()

