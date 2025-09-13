# Agent Evaluation

This guide describes how to evaluate the Clinical Corvus agent end‑to‑end using open medical QA datasets and the built‑in retrieval stack.

## Datasets

- HealthSearchQA: katielink/healthsearchqa (open medical QA)
- PubMedQA: qiaojin/PubMedQA (yes/no/maybe)
- MedQA (USMLE): bigbio/med_qa (multiple choice)

Install datasets (once):

```bash
pip install datasets
```

## Retrieval‑Only Metrics

Use `scripts/bench_rag.py` to compute Recall@K, nDCG@K, MRR@K on a JSON/JSONL of queries:

```bash
BACKEND_URL=http://localhost:8000 \
  python scripts/bench_rag.py run exemplos/bench/sample_bench.json \
  --top-k 10 --alpha 0.5 --output retrieval_results.json
```

## Agent QA Benchmarks (Retrieval + Generation + Scoring)

Use `scripts/agent_eval.py` for HealthSearchQA, PubMedQA, and MedQA:

- Retrieval‑only (no generation):

```bash
BACKEND_URL=http://localhost:8000 \
  python scripts/agent_eval.py \
  --datasets healthsearchqa pubmedqa medqa \
  --top-k 10 --alpha 0.5 --limit 200 \
  --output eval.json
```

- End‑to‑end (requires agent URL for generation):

```bash
BACKEND_URL=http://localhost:8000 \
  python scripts/agent_eval.py \
  --datasets healthsearchqa pubmedqa medqa \
  --top-k 10 --alpha 0.5 --limit 200 \
  --agent-url http://localhost:8000/api/chat \
  --output eval_full.json
```

### What It Measures

- HealthSearchQA: EM, F1, ROUGE‑L (tokenized + LCS‑based) when agent predictions are present
- PubMedQA, MedQA: accuracy (yes/no/maybe; A/B/C/D) with simple extraction from the agent output
- KSR (Knowledge Supported Rate): fraction of answer sentences supported by retrieved context
- KOR (Knowledge Omission Rate): fraction of reference sentences not present in retrieved context (when references exist)

KSR/KOR use a lightweight sentence overlap check against the concatenated retrieved snippets and leverage returned `citation` / `page` fields for prompt‑side formatting. They are deterministic, fast, and provide a proxy for grounding quality.

## Suggested Defaults

- Retrieval: `top_k=10`, `alpha=0.5`; enable reranker for QA runs (`RAG_ENABLE_RERANKER=true`)
- Chunking: 512 tokens, 64 overlap; tables remain atomic chunks

## Acceptance Criteria (Initial)

- Retrieval: nDCG@10 ≥ 0.45, Recall@50 ≥ 0.75 on your guideline corpus
- PubMedQA/MedQA: accuracy competitive with baselines; KSR ≥ 0.8; citation fidelity ≥ 0.9
- HealthSearchQA: ROUGE‑L ≥ baseline; KSR ≥ 0.8
- Safety: ≥ 0.95 refusal on unsafe prompts; zero PHI leakage

## Notes

- For cookie‑gated publisher PDFs, download locally and use `index-file` ingestion rather than URL.
- For scanned/table‑heavy documents, turn on `UNSTRUCTURED_ENABLE=true` or add a thepi.pe key for AI table extraction.
- For more robust grounding scoring, you can layer a judge‑model with rubric prompts on top of KSR/KOR; start with KSR/KOR for speed.
