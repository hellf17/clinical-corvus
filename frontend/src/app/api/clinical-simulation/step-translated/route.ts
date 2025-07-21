import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend-api:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[API] Forwarding clinical-simulation/step-translated to:', `${BACKEND_URL}/api/simulation/snapps-step-translated`);
    
    // Forward to backend
    const response = await fetch(`${BACKEND_URL}/api/simulation/snapps-step-translated`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[API] Backend error response:', errorBody);
      return new NextResponse(errorBody, {
        status: response.status,
        statusText: response.statusText,
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Error in step-translated proxy route:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}