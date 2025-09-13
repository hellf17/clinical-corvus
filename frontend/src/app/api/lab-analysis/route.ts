import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { getToken } = await auth();
    const token = await getToken();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the form data from the request
    const formData = await request.formData();
    
    // Forward to backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/lab-analysis/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to process request' }));
      return NextResponse.json(
        { error: errorData.error || 'Failed to analyze file' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in lab analysis API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}