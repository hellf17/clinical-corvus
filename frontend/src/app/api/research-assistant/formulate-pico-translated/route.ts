import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// For server-to-server communication within Docker, use the service name.
const BACKEND_API_URL = 'http://backend-api:8000';


export async function POST(request: NextRequest) {
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const backendUrl = `${BACKEND_API_URL}/api/research/formulate-pico-translated`;

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