import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/mvp-agents/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Backend health check failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error checking MVP agents health:', error);
    return NextResponse.json(
      {
        overall_status: 'error',
        frontend_status: 'ok',
        backend_status: 'unreachable',
        error: 'Cannot connect to backend'
      },
      { status: 503 }
    );
  }
}