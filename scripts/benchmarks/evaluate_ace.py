import json
import argparse


RUBRIC = {
    'structure': 'Well-structured with headings and clear sections',
    'coherence': 'Coherent and logically connected arguments',
    'completeness': 'Addresses main aspects with sufficient depth',
    'citations': 'Citations present and linked to claims',
    'clinical_appropriateness': 'Conservative, guideline-aligned, safe'
}


def simple_ace_stub(res: dict):
    # Minimal Arena-style checklist (heuristic) with 0/1 flags
    checks = {
        'structure': 0,
        'coherence': 0,
        'completeness': 0,
        'citations': 0,
        'clinical_appropriateness': 0,
    }
    # Structure: presence of executive summary and at least 2 themes
    if isinstance((res or {}).get('executive_summary'), str) and len(res['executive_summary']) > 50:
        if len((res or {}).get('key_findings_by_theme') or []) >= 2:
            checks['structure'] = 1
    # Coherence: presence of professional reasoning with some length
    if isinstance((res or {}).get('professional_detailed_reasoning_cot'), str) and len(res['professional_detailed_reasoning_cot']) > 80:
        checks['coherence'] = 1
    # Completeness: has clinical implications and research gaps
    if len((res or {}).get('clinical_implications') or []) >= 1 and len((res or {}).get('research_gaps_identified') or []) >= 1:
        checks['completeness'] = 1
    # Citations: at least 3 references
    refs = (res or {}).get('relevant_references') or []
    if len(refs) >= 3:
        checks['citations'] = 1
    # Clinical appropriateness: basic heuristic—no explicit "contraindicated" or "unsafe" token in summary
    summary = (res or {}).get('executive_summary') or ''
    if isinstance(summary, str) and ('unsafe' not in summary.lower() and 'contraindicated' not in summary.lower()):
        checks['clinical_appropriateness'] = 1
    total = sum(checks.values())
    return {'ACE_structure': checks['structure'], 'ACE_coherence': checks['coherence'], 'ACE_completeness': checks['completeness'], 'ACE_citations': checks['citations'], 'ACE_clinical': checks['clinical_appropriateness'], 'ACE_total_0_to_5': total}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', required=True)
    ap.add_argument('--output', required=True)
    args = ap.parse_args()

    with open(args.input, 'r', encoding='utf-8') as f:
        run = json.load(f)

    rows = []
    for item in run.get('results', []):
        rid = item.get('id')
        res = (item.get('response') or {})
        rows.append({ 'id': rid, **simple_ace_stub(res) })

    # Also include markdown table
    header = "| id | structure | coherence | completeness | citations | clinical | total |\n|---|---:|---:|---:|---:|---:|---:|"
    lines = [header]
    for r in rows:
        lines.append(f"| {r['id']} | {r['ACE_structure']} | {r['ACE_coherence']} | {r['ACE_completeness']} | {r['ACE_citations']} | {r['ACE_clinical']} | {r['ACE_total_0_to_5']} |")
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump({'items': rows, 'markdown_table': "\n".join(lines)}, f, ensure_ascii=False, indent=2)
    print(f"Wrote ACE-lite (stub) metrics to {args.output}")


if __name__ == '__main__':
    main()
