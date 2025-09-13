#!/usr/bin/env python
"""
Agent Evaluation Harness (retrieval + optional generation + scoring)

Datasets:
  - HealthSearchQA:   katielink/healthsearchqa
  - PubMedQA:         qiaojin/PubMedQA (default subset: pqa_labeled)
  - MedQA (USMLE):    bigbio/med_qa (default config: med_qa_en)

Usage examples:

  # Retrieval-only metrics on a small sample
  BACKEND_URL=http://localhost:8000 \
    python scripts/agent_eval.py \
      --datasets healthsearchqa pubmedqa medqa \
      --top-k 10 --alpha 0.5 --limit 200 \
      --output eval_retrieval.json

  # End-to-end with agent generation (you must provide --agent-url)
  BACKEND_URL=http://localhost:8000 \
    python scripts/agent_eval.py \
      --datasets healthsearchqa pubmedqa medqa \
      --top-k 10 --alpha 0.5 --limit 200 \
      --agent-url http://localhost:8000/api/chat \
      --output eval_full.json

Env vars:
  BACKEND_URL (default http://localhost:8000)

Notes:
  - KSR (Knowledge Supported Rate): fraction of answer sentences supported by retrieved context.
  - KOR (Knowledge Omission Rate): fraction of reference sentences NOT present in retrieved context (when references exist).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from typing import Any, Dict, List, Optional

import requests


def backend_url() -> str:
    return os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")


def sent_split(text: str) -> List[str]:
    # simple sentence splitter
    s = re.split(r"(?<=[.!?])\s+", (text or "").strip())
    return [x.strip() for x in s if x and len(x.strip()) > 1]


def overlap(a: str, b: str) -> bool:
    a = (a or "").lower()
    b = (b or "").lower()
    if not a or not b:
        return False
    # require a small n-gram match to reduce false positives
    return (a in b) or (b in a)


def ksr(answer: str, retrieved_concat: str) -> float:
    sents = sent_split(answer)
    if not sents:
        return 0.0
    hits = sum(1 for s in sents if overlap(s, retrieved_concat))
    return hits / max(1, len(sents))


def kor(reference: Optional[str], retrieved_concat: str) -> Optional[float]:
    if not reference:
        return None
    sents = sent_split(reference)
    if not sents:
        return None
    missing = sum(1 for s in sents if not overlap(s, retrieved_concat))
    return missing / max(1, len(sents))


def load_hf_dataset(name: str):
    try:
        from datasets import load_dataset  # type: ignore
    except Exception:
        print("Please `pip install datasets` to run agent_eval.")
        sys.exit(2)

    if name == "healthsearchqa":
        ds = load_dataset("katielink/healthsearchqa")
        # Use 'test' split if present, else train
        split = ds["test"] if "test" in ds else ds[list(ds.keys())[0]]
        # Expect fields: 'question', 'answer'
        return name, split
    elif name == "pubmedqa":
        # Use pqa_labeled subset
        ds = load_dataset("qiaojin/PubMedQA", "pqa_labeled")
        split = ds["train"] if "train" in ds else ds[list(ds.keys())[0]]
        return name, split
    elif name == "medqa":
        ds = load_dataset("bigbio/med_qa", "med_qa_en")
        split = ds["train"] if "train" in ds else ds[list(ds.keys())[0]]
        return name, split
    else:
        raise ValueError(f"Unknown dataset: {name}")


def map_item(name: str, item: Dict[str, Any]) -> Dict[str, Any]:
    # Normalize item to {question, choices?, answer}
    if name == "healthsearchqa":
        q = item.get("question") or item.get("query")
        a = item.get("answer") or item.get("answer_text")
        return {"question": q, "answer": a, "choices": None}
    elif name == "pubmedqa":
        q = item.get("question") or item.get("QUESTION") or item.get("q")
        a = item.get("final_decision") or item.get("ANSWER")  # yes/no/maybe
        return {"question": q, "answer": a, "choices": None}
    elif name == "medqa":
        q = item.get("question") or item.get("QUESTION")
        choices = item.get("options") or item.get("choices")
        a = item.get("answer") or item.get("final_answer")  # often 'A'/'B'/'C'/'D'
        return {"question": q, "answer": a, "choices": choices}
    else:
        return {"question": None, "answer": None, "choices": None}


# -------- Text Metrics for HealthSearchQA --------

def _normalize_text(s: str) -> str:
    s = s or ""
    s = s.lower().strip()
    # remove punctuation and extra spaces
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _tokenize(s: str) -> List[str]:
    return _normalize_text(s).split()


def exact_match(pred: str, ref: str) -> float:
    return 1.0 if _normalize_text(pred) == _normalize_text(ref) else 0.0


def f1_score(pred: str, ref: str) -> float:
    pt = _tokenize(pred)
    rt = _tokenize(ref)
    if not pt or not rt:
        return 0.0
    from collections import Counter
    pc = Counter(pt)
    rc = Counter(rt)
    overlap = sum((pc & rc).values())
    if overlap == 0:
        return 0.0
    precision = overlap / len(pt)
    recall = overlap / len(rt)
    if precision + recall == 0:
        return 0.0
    return 2 * precision * recall / (precision + recall)


def _lcs_len(a: List[str], b: List[str]) -> int:
    # classic DP LCS
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        ai = a[i - 1]
        row = dp[i]
        prev_row = dp[i - 1]
        for j in range(1, m + 1):
            if ai == b[j - 1]:
                row[j] = prev_row[j - 1] + 1
            else:
                row[j] = row[j - 1] if row[j - 1] >= prev_row[j] else prev_row[j]
    return dp[n][m]


def rouge_l(pred: str, ref: str, beta: float = 1.2) -> float:
    pt = _tokenize(pred)
    rt = _tokenize(ref)
    if not pt or not rt:
        return 0.0
    lcs = _lcs_len(pt, rt)
    if lcs == 0:
        return 0.0
    prec = lcs / len(pt)
    rec = lcs / len(rt)
    if prec == 0 or rec == 0:
        return 0.0
    beta2 = beta * beta
    return (1 + beta2) * prec * rec / (rec + beta2 * prec)


def retrieve(query: str, top_k: int, alpha: Optional[float]) -> List[Dict[str, Any]]:
    url = f"{backend_url()}/api/rag/search"
    payload: Dict[str, Any] = {"query": query, "top_k": top_k}
    if alpha is not None:
        payload["alpha"] = alpha
    r = requests.post(url, json=payload, timeout=60)
    r.raise_for_status()
    data = r.json()
    return data.get("results") or []


def generate_structured(agent_url: str, prompt: str) -> Dict[str, Any]:
    """
    Calls the agent and returns a structured response including trace, latency, etc.
    """
    payload = {"message": prompt}
    start_time = time.time()
    
    response = requests.post(
        agent_url,
        json=payload,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        timeout=300,  # 5-minute timeout for long-running agent tasks
    )
    
    latency = time.time() - start_time
    response.raise_for_status()
    raw_response = response.json()

    # Adapt the response to the expected schema. This may need adjustment
    # based on the actual structure of your agent's response.
    final_answer = raw_response.get("answer") or raw_response.get("final_answer") or raw_response.get("content") or ""
    citations = raw_response.get("citations", [])
    trace = raw_response.get("trace", {})
    tokens = raw_response.get("tokens", {})

    return {
        "final_answer": final_answer,
        "citations": citations,
        "trace": trace,
        "latency": latency,
        "tokens": tokens,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--datasets", nargs="+", required=True, choices=["healthsearchqa", "pubmedqa", "medqa"], help="Datasets to run")
    ap.add_argument("--limit", type=int, default=200, help="Max items per dataset (for iteration speed)")
    ap.add_argument("--top-k", type=int, default=10)
    ap.add_argument("--alpha", type=float, default=0.5)
    ap.add_argument("--agent-url", type=str, default=None, help="Agent generation endpoint. If omitted, runs retrieval-only.")
    ap.add_argument("--output", type=str, default=None)
    args = ap.parse_args()

    results: Dict[str, Any] = {"datasets": {}, "summary": {}}
    global_k_list: List[float] = []
    global_ndcg_list: List[float] = []
    global_mrr_list: List[float] = []
    global_acc_list: List[float] = []
    global_ksr_list: List[float] = []
    global_kor_list: List[float] = []

    for ds_name in args.datasets:
        name, split = load_hf_dataset(ds_name)
        count = 0
        ok = 0
        acc_hits = 0
        ksr_list: List[float] = []
        kor_list: List[float] = []
        em_list: List[float] = []
        f1_list: List[float] = []
        rouge_list: List[float] = []

        # retrieval ranking metrics (binary at K): track simple recall@K
        # For this harness, we focus on QA accuracy + KSR/KOR; retrieval metrics are covered by bench_rag.py

        per_items: List[Dict[str, Any]] = []

        for item in split:
            if count >= args.limit:
                break
            norm = map_item(name, item)
            q = norm.get("question")
            if not q:
                continue
            try:
                retrieved = retrieve(q, args.top_k, args.alpha)
            except Exception as e:
                print(f"[WARN] Retrieval failed: {e}")
                continue

            retrieved_text = "\n\n".join([(r.get("text") or "") for r in retrieved])

            pred = None
            structured_response = None
            if args.agent_url:
                # Compose a simple prompt with citations request
                ctx = []
                for r in retrieved[:5]:
                    cit = r.get("citation")
                    page = r.get("page")
                    if cit:
                        ctx.append(f"[{cit}] {r.get('text','')}")
                    elif page is not None:
                        ctx.append(f"[p. {page}] {r.get('text','')}")
                    else:
                        ctx.append(r.get('text',''))
                prompt = (
                    f"Question: {q}\n\nContext:\n" + "\n\n".join(ctx) +
                    "\n\nAnswer succinctly with 1–2 citations (page numbers if present)."
                )
                try:
                    structured_response = generate_structured(args.agent_url, prompt)
                    pred = structured_response.get("final_answer")
                except Exception as e:
                    print(f"[WARN] Generation failed: {e}")
                    pred = None

            # Compute KSR/KOR if we have answers or references
            ref = norm.get("answer")
            if pred:
                ksr_val = ksr(pred, retrieved_text)
                ksr_list.append(ksr_val)
            if ref:
                kor_val = kor(ref, retrieved_text)
                if kor_val is not None:
                    kor_list.append(kor_val)

            # Accuracy for multiple-choice/label datasets
            acc = None
            if name == "medqa" and pred:
                # extract choice letter
                m = re.search(r"\b([A-D])\b", pred.strip(), flags=re.IGNORECASE)
                if m and isinstance(ref, str):
                    acc = 1.0 if m.group(1).upper() == ref.strip().upper() else 0.0
            elif name == "pubmedqa" and pred and isinstance(ref, str):
                # yes/no/maybe
                m = re.search(r"\b(yes|no|maybe)\b", pred.strip(), flags=re.IGNORECASE)
                if m:
                    acc = 1.0 if m.group(1).lower() == ref.strip().lower() else 0.0

            if acc is not None:
                acc_hits += acc

            # Text metrics for HealthSearchQA if pred & ref
            if name == "healthsearchqa" and pred and ref and isinstance(ref, str):
                em_val = exact_match(pred, ref)
                f1_val = f1_score(pred, ref)
                r_val = rouge_l(pred, ref)
                em_list.append(em_val)
                f1_list.append(f1_val)
                rouge_list.append(r_val)

            per_items.append({
                "question": q,
                "reference": ref,
                "prediction": pred,
                "ksr": (ksr_list[-1] if pred else None),
                "kor": (kor_list[-1] if ref and kor_list else None),
                "em": (em_list[-1] if name == "healthsearchqa" and pred and ref and em_list else None),
                "f1": (f1_list[-1] if name == "healthsearchqa" and pred and ref and f1_list else None),
                "rouge_l": (rouge_list[-1] if name == "healthsearchqa" and pred and ref and rouge_list else None),
                "retrieved_ids": [r.get("doc_id") for r in retrieved[:args.top_k]],
                "structured_response": structured_response,
            })
            count += 1
            ok += 1

        ds_summary: Dict[str, Any] = {
            "count": count,
            "ksr_mean": sum(ksr_list) / len(ksr_list) if ksr_list else None,
            "kor_mean": sum(kor_list) / len(kor_list) if kor_list else None,
            "accuracy": (acc_hits / count) if (name in ("medqa", "pubmedqa") and count > 0) else None,
            "em": (sum(em_list) / len(em_list)) if em_list else None,
            "f1": (sum(f1_list) / len(f1_list)) if f1_list else None,
            "rouge_l": (sum(rouge_list) / len(rouge_list)) if rouge_list else None,
        }
        results["datasets"][name] = {"summary": ds_summary, "items": per_items}

    # Save/output
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"Saved to {args.output}")
    else:
        print(json.dumps(results["datasets"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
