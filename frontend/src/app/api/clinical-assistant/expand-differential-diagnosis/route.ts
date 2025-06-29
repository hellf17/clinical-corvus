import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

function getAPIUrl(): string {
  return 'http://backend-api:8000';
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

    const apiUrl = getAPIUrl();
    const response = await fetch(`${apiUrl}/clinical/expand-differential-diagnosis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { detail: errorData.detail || `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in expand-differential API route:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}
