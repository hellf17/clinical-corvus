import { NextResponse } from 'next/server';
import { getAPIUrl } from '@/config';

export async function GET() {
  try {
    const backendUrl = getAPIUrl();
    console.log(`Health check: Testing connection to backend at ${backendUrl}`);
    
    // Test basic connectivity to backend
    const response = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        status: 'error',
        message: `Backend not reachable. Status: ${response.status}`,
        backend_url: backendUrl,
        response_status: response.status,
        response_text: await response.text()
      }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({
      status: 'ok',
      message: 'Backend is reachable',
      backend_url: backendUrl,
      backend_response: data
    });

  } catch (error: any) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to connect to backend',
      backend_url: getAPIUrl(),
      error: error.message,
      error_type: error.constructor.name
    }, { status: 500 });
  }
} 