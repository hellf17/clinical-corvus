import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

interface SNAPPSInput {
  case_summary: string;
  student_differential_diagnoses: string[];
  case_context?: {
    expected_differentials?: string[];
    learning_objectives?: string[];
  };
}

/**
 * API traduzida para SNAPPS Framework - Análise de Diagnóstico Diferencial
 * Esta é a API mais crítica da academia - framework educacional SNAPPS
 * Workflow: PT-BR → EN → BAML → PT-BR
 */
// Proxy POST request to backend API that already returns translated response
export async function POST(request: NextRequest) {
  // Forward the request body to backend
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000/api/clinical/analyze-differential-diagnoses-snapps';
  const body = await request.json();
  const backendRes = await fetch(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}

// Health check endpoint for documentation
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'analyze-differential-diagnoses-snapps-translated',
    integration_note: 'This endpoint proxies to backend which handles all translation.',
    features: [
      'Portuguese to English case summary translation (handled in backend)',
      'Multiple differential diagnoses translation (handled in backend)',
      'Educational context translation (handled in backend)',
      'Socratic feedback translation to Portuguese (handled in backend)',
      'SNAPPS framework educational flow support'
    ]
  });
}