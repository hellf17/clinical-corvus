import json
import argparse
import re


def extract_claims_from_result(res: dict):
    claims = []
    themes = (res or {}).get('key_findings_by_theme') or []
    for theme in themes:
        if isinstance(theme, dict):
            kf = theme.get('key_findings') or []
            if not kf and theme.get('summary'):
                kf = [theme.get('summary')]
            for c in kf:
                if isinstance(c, str) and c.strip():
                    claims.append(c.strip())
    return claims


def build_corpus_from_references(res: dict):
    corpus = []
    refs = (res or {}).get('relevant_references') or []
    for ref in refs:
        snip = (ref or {}).get('snippet_or_abstract')
        if isinstance(snip, str) and snip.strip():
            corpus.append(snip.lower())
    return "\n".join(corpus)


def score_support(claim: str, corpus_text: str):
    tokens = [t for t in re.findall(r"[a-zA-Z]{4,}", claim.lower())]
    if not tokens:
        return False
    return sum(1 for t in tokens if t in corpus_text) >= 2


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', required=True, help='run_benchmarks.py output JSON')
    ap.add_argument('--output', required=True, help='output JSON with KAE-lite metrics')
    args = ap.parse_args()

    with open(args.input, 'r', encoding='utf-8') as f:
        run = json.load(f)

    rows = []
    for item in run.get('results', []):
        rid = item.get('id')
        res = (item.get('response') or {})
        claims = extract_claims_from_result(res)
        corpus = build_corpus_from_references(res)
        total = len(claims)
        supported = sum(1 for c in claims if score_support(c, corpus))
        contradictions = 0
        omissions = max(0, total - (supported + contradictions))
        # KSR/KCR/KOR
        ksr = (supported / total) if total else 0.0  # Knowledge Support Rate
        kcr = (contradictions / total) if total else 0.0  # Knowledge Contradiction Rate
        kor = (omissions / total) if total else 0.0  # Knowledge Omission Rate
        rows.append({
            'id': rid,
            'total_claims': total,
            'supported': supported,
            'contradictions': contradictions,
            'omissions': omissions,
            'KSR': round(ksr, 4),
            'KCR': round(kcr, 4),
            'KOR': round(kor, 4),
        })

    # Also emit a small Markdown table for quick viewing
    header = "| id | total | supported | contrad. | omissions | KSR | KCR | KOR |\n|---|---:|---:|---:|---:|---:|---:|---:|"
    lines = [header]
    for r in rows:
        lines.append(f"| {r['id']} | {r['total_claims']} | {r['supported']} | {r['contradictions']} | {r['omissions']} | {r['KSR']:.3f} | {r['KCR']:.3f} | {r['KOR']:.3f} |")
    out = {'items': rows, 'markdown_table': "\n".join(lines)}
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"Wrote KAE-lite metrics to {args.output}")


if __name__ == '__main__':
    main()
