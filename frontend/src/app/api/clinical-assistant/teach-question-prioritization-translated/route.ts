import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

function getAPIUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://backend-api:8000';
}

export async function POST(request: NextRequest) {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return NextResponse.json(
        { detail: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (!body.chief_complaint) {
      return NextResponse.json(
        { detail: 'Missing required field: chief_complaint' },
        { status: 400 }
      );
    }

    const apiUrl = getAPIUrl().replace(/\/?api\/?$/, ''); // Remove trailing /api if present
    const response = await fetch(`${apiUrl}/api/clinical/teach-question-prioritization-translated`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`🚨 Backend error (${response.status}):`, errorData);
      return NextResponse.json(
        { detail: errorData.detail || `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in teach-question-prioritization API route:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}
