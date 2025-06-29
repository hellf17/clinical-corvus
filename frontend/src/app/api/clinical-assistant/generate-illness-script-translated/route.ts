import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

function getAPIUrl(): string {
  // In Docker development, use the backend service name
  return 'http://backend-api:8000';
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return NextResponse.json(
        { detail: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get request data
    const body = await request.json();

    // Validate required data
    if (!body.disease_name) {
      return NextResponse.json(
        { detail: 'Missing required field: disease_name' },
        { status: 400 }
      );
    }

    // Call the backend
    const apiUrl = getAPIUrl();
    const response = await fetch(`${apiUrl}/api/clinical/generate-illness-script-translated`, {
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
    console.error('Error in translated illness script API route:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}
