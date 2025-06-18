import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

interface QuickDiagnosisInput {
  symptoms: string;
  patient_age?: number;
  patient_gender?: string;
}

interface QuickDiagnosisOutput {
  possible_conditions: string[];
  red_flags: string[];
  recommended_actions: string[];
  when_to_seek_help: string;
  disclaimer: string;
}

/**
 * POST handler for getting a quick diagnosis. This endpoint is a proxy to the backend.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/clinical/quick-diagnosis-translated`;

  try {
    const body = await request.json();
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'X-User-Id': userId,
      },
      body: JSON.stringify(body),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(data, { status: backendResponse.status });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error proxying to backend:', error);
    return NextResponse.json(
      { error: 'An internal error occurred.' },
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
    endpoint: 'quick-diagnosis-translated',
    integration_note: 'This endpoint proxies to a backend service that handles all translation and business logic.'
  });
}