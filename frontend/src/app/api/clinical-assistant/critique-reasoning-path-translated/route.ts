import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

interface ReasoningCritiqueInput {
  user_reasoning_process_description: string;
  case_context?: string;
  specific_concerns?: string[];
}

interface ReasoningCritiqueOutput {
  critique_feedback: string;
  cognitive_strengths?: string[];
  areas_for_improvement?: string[];
  recommended_next_steps?: string[];
  disclaimer: string;
}

/**
 * API traduzida para Crítica do Processo de Raciocínio Clínico
 * Análise metacognitiva do processo de pensamento diagnóstico
 * Workflow: PT-BR → EN → BAML → PT-BR
 */
// Proxy POST request to backend API that already returns translated response
export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000/api/clinical/critique-reasoning-path';
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
    endpoint: 'critique-reasoning-path-translated',
    integration_note: 'This endpoint proxies to backend which handles all translation.',
    features: [
      'Portuguese to English reasoning critique translation (handled in backend)',
      'Metacognitive critique translation (handled in backend)',
      'Educational context translation (handled in backend)'
    ]
  });
}