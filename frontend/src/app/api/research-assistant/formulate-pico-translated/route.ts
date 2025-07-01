import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Interfaces defining the data structure for PICO formulation requests and responses.
// These ensure type safety and clarity for the API contract.

interface PICOFormulationInput {
  clinical_question_description: string;
  patient_population?: string;
  clinical_context?: string;
  research_question_type?: 'therapy' | 'diagnosis' | 'prognosis' | 'etiology' | 'prevention';
  specific_concerns?: string[];
}

interface PICOComponent {
  component_type: 'P' | 'I' | 'C' | 'O';
  component_name: string;
  component_description: string;
  specific_terms: string[];
  search_keywords: string[];
}

interface PICOFormulationOutput {
  structured_pico_question: string;
  pico_components: PICOComponent[];
  search_strategy_recommendations: string;
  potential_databases: string[];
  keywords_and_mesh_terms: string[];
  study_design_recommendations: string[];
  educational_notes: string;
  disclaimer: string;
}

/**
 * POST handler for formulating a PICO question. This endpoint is a proxy to the backend.
 */
function getAPIUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

export async function POST(request: NextRequest) {
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const backendUrl = `${getAPIUrl()}/api/research/formulate-pico`;

  try {
    const body = await request.json();

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(data, { status: backendResponse.status });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error proxying PICO formulation request to backend:', error);
    return NextResponse.json(
      { error: 'An internal error occurred while formulating the PICO question.' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for health check and feature documentation.
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'formulate-pico-translated',
    integration_note: 'This endpoint proxies to a backend service that handles all PICO formulation, translation, and business logic.'
  });
}