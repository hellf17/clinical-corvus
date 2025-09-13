#!/usr/bin/env python
"""
Small RAG benchmark runner.

Dataset format (JSON or JSONL): list of items with either relevant_ids or relevant_substrings.
[
  {
    "query": "early goal-directed therapy in sepsis",
    "relevant_ids": ["harrison-2025#p=12", "sepsis-2021#p=3"]
  },
  {
    "query": "antibiotics within one hour",
    "relevant_substrings": ["broad-spectrum antibiotics", "within one hour"]
  }
]

Usage:
  BACKEND_URL=http://localhost:8000 \
  python scripts/bench_rag.py run exemplos/bench/sample_bench.json --top-k 10 --alpha 0.5
"""

from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
import typer


app = typer.Typer(help="RAG benchmark CLI")


def backend_url() -> str:
    return os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")


def load_dataset(path: Path) -> List[Dict[str, Any]]:
    data: List[Dict[str, Any]] = []
    txt = path.read_text(encoding="utf-8")
    try:
        obj = json.loads(txt)
        if isinstance(obj, list):
            return obj
    except Exception:
        pass
    # try jsonl
    for line in txt.splitlines():
        line = line.strip()
        if not line:
            continue
        data.append(json.loads(line))
    return data


def dcg_at_k(binary_rels: List[int], k: int) -> float:
    s = 0.0
    for i, rel in enumerate(binary_rels[:k], start=1):
        if rel:
            s += 1.0 / math.log2(i + 1)
    return s


def ndcg_at_k(binary_rels: List[int], k: int, ideal_rel_count: Optional[int] = None) -> float:
    dcg = dcg_at_k(binary_rels, k)
    m = ideal_rel_count if ideal_rel_count is not None else sum(binary_rels)
    m = max(0, min(k, int(m)))
    if m == 0:
        return 0.0
    ideal = dcg_at_k([1] * m, k)
    return dcg / ideal if ideal > 0 else 0.0


def mrr_at_k(binary_rels: List[int], k: int) -> float:
    for i, rel in enumerate(binary_rels[:k], start=1):
        if rel:
            return 1.0 / i
    return 0.0


@app.command()
def run(
    dataset: Path = typer.Argument(..., exists=True, readable=True),
    top_k: int = typer.Option(10, help="K cutoff"),
    alpha: Optional[float] = typer.Option(None, help="Override alpha (vector weight)"),
    match_by: str = typer.Option("auto", help="auto|id|substring"),
    output: Optional[Path] = typer.Option(None, help="Write per-query details to JSON"),
):
    """Run a small benchmark against /api/rag/search and print metrics."""
    rows = load_dataset(dataset)
    if not rows:
        typer.echo("Empty dataset.")
        raise typer.Exit(code=1)

    url = f"{backend_url()}/api/rag/search"
    per_query: List[Dict[str, Any]] = []
    mrrs: List[float] = []
    ndcgs: List[float] = []
    recalls: List[float] = []

    for idx, item in enumerate(rows, start=1):
        q = item.get("query")
        rel_ids: List[str] = [str(x) for x in (item.get("relevant_ids") or [])]
        rel_subs: List[str] = [str(x) for x in (item.get("relevant_substrings") or [])]
        this_match_by = match_by
        if this_match_by == "auto":
            if rel_ids:
                this_match_by = "id"
            elif rel_subs:
                this_match_by = "substring"
            else:
                this_match_by = "id"

        payload = {"query": q, "top_k": top_k}
        if alpha is not None:
            payload["alpha"] = alpha
        try:
            r = requests.post(url, json=payload, timeout=60)
            r.raise_for_status()
            resp = r.json()
            results = resp.get("results") or []
        except Exception as e:
            typer.echo(f"[ERROR] Query {idx}: {e}")
            continue

        # Build binary relevance list for top_k results
        binary: List[int] = []
        hits = 0
        for res in results[:top_k]:
            did = str(res.get("doc_id"))
            txt = (res.get("text") or "")
            if this_match_by == "id":
                rel = 1 if did in rel_ids else 0
            else:
                rel = 1 if any(s.lower() in txt.lower() for s in rel_subs) else 0
            binary.append(rel)
            hits += rel

        ideal_rel_count = len(rel_ids) if this_match_by == "id" else len(rel_subs)
        rec = float(hits) / float(ideal_rel_count) if ideal_rel_count > 0 else (1.0 if hits > 0 else 0.0)
        nd = ndcg_at_k(binary, top_k, ideal_rel_count=ideal_rel_count)
        mr = mrr_at_k(binary, top_k)

        recalls.append(rec)
        ndcgs.append(nd)
        mrrs.append(mr)

        per_query.append({
            "query": q,
            "match_by": this_match_by,
            "hits@K": hits,
            "recall@K": rec,
            "ndcg@K": nd,
            "mrr@K": mr,
            "top": [{"doc_id": (res.get("doc_id")), "score": (res.get("scores", {}).get("hybrid"))} for res in results[:top_k]],
        })

    def avg(xs: List[float]) -> float:
        return sum(xs) / len(xs) if xs else 0.0

    typer.echo("=== RAG Benchmark Summary ===")
    typer.echo(f"Queries: {len(per_query)} | K={top_k} | alpha={alpha if alpha is not None else 'default'}")
    typer.echo(f"Recall@{top_k}: {avg(recalls):.4f}")
    typer.echo(f"nDCG@{top_k}:  {avg(ndcgs):.4f}")
    typer.echo(f"MRR@{top_k}:   {avg(mrrs):.4f}")

    if output:
        output.write_text(json.dumps({
            "summary": {
                "queries": len(per_query),
                "k": top_k,
                "alpha": alpha,
                "recall": avg(recalls),
                "ndcg": avg(ndcgs),
                "mrr": avg(mrrs),
            },
            "results": per_query,
        }, ensure_ascii=False, indent=2), encoding="utf-8")
        typer.echo(f"Details written to {output}")


if __name__ == "__main__":
    app()

