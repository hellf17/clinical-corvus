import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

interface CognitiveBiasInput {
  scenario_description: string;
  student_decision_making_process?: string;
  suspected_biases?: string[];
  case_complexity_level?: 'simple' | 'moderate' | 'complex';
}

interface IdentifiedBias {
  bias_name: string;
  bias_description: string;
  evidence_in_scenario: string[];
  impact_on_diagnosis: string;
  prevention_strategies: string[];
}

interface CognitiveBiasOutput {
  scenario_analysis: string;
  identified_biases: IdentifiedBias[];
  educational_insights: string;
  bias_prevention_tips: string[];
  metacognitive_questions: string[];
  disclaimer: string;
}

/**
 * API traduzida para Identificação de Vieses Cognitivos em Cenários Clínicos
 * Sistema educacional para reconhecimento e prevenção de erros cognitivos
 * Workflow: PT-BR → EN → BAML → PT-BR
 */
// Proxy POST request to backend API that already returns translated response
export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000/api/clinical/assist-identifying-cognitive-biases-scenario';
  const body = await request.json();
  const backendRes = await fetch(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'assist-identifying-cognitive-biases-scenario-translated',
    integration_note: 'This endpoint proxies to backend which handles all translation.',
    features: [
      'Portuguese to English scenario translation (handled in backend)',
      'Cognitive bias identification translation (handled in backend)',
      'Educational context translation (handled in backend)'
    ]
  });
}
