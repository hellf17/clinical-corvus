import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Minimal interface for type safety
interface DiagnosticTimeoutInput {
  case_description: string;
  current_working_diagnosis: string;
  time_constraints?: string;
  clinical_uncertainty_level?: 'low' | 'moderate' | 'high';
  available_resources?: string[];
}

interface TimeoutRecommendation {
  action_type: string;
  specific_recommendation: string;
  rationale: string;
  time_sensitivity: 'immediate' | 'urgent' | 'routine';
  confidence_level: number;
}

interface DiagnosticTimeoutOutput {
  timeout_assessment: string;
  recommended_actions: TimeoutRecommendation[];
  risk_stratification: string;
  decision_making_framework: string;
  safety_considerations: string[];
  follow_up_recommendations: string[];
  educational_insights: string;
  disclaimer: string;
}

/**
 * API traduzida para Timeout Diagnóstico
 * Sistema para tomada de decisão sob pressão temporal em medicina
 * Workflow: PT-BR → Translation → EN → Translation → PT-BR
 */
// Proxy POST request to backend API that already returns translated response
export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000/api/clinical/generate-diagnostic-timeout';
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
    endpoint: 'generate-diagnostic-timeout-translated',
    integration_note: 'This endpoint proxies to backend which handles all translation.',
    features: [
      'Portuguese to English diagnostic timeout translation (handled in backend)',
      'Timeout scenario translation (handled in backend)',
      'Educational context translation (handled in backend)'
    ]
  });
}