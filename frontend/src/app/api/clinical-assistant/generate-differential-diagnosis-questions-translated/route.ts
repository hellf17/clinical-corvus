import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

interface GenerateQuestionsClinicalInput {
  chief_complaint: string;
  patient_context?: string;
  initial_assessment?: string;
  focus_areas?: string[];
  difficulty_level?: 'basic' | 'intermediate' | 'advanced';
}

interface DiagnosticQuestion {
  question_text: string;
  clinical_reasoning: string;
  question_category: string;
  expected_information_type: string;
  diagnostic_value: number;
}

/**
 * API endpoint for generating differential diagnosis questions
 * This endpoint proxies to the backend which handles all translation.
 */
export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000/api/clinical/generate-differential-diagnosis-questions';
  const body = await request.json();
  const backendRes = await fetch(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}

/**
 * Health check endpoint for documentation
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'generate-differential-diagnosis-questions-translated',
    integration_note: 'This endpoint proxies to backend which handles all translation.',
    features: [
      'Portuguese to English DDX question translation (handled in backend)',
      'Differential diagnosis question generation (handled in backend)',
      'Educational context translation (handled in backend)'
    ]
  });
}