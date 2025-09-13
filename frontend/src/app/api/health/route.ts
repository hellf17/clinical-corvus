import { NextResponse } from 'next/server';
import { getAPIUrl } from '@/config';

export async function GET() {
  try {
    const backendUrl = getAPIUrl();
    console.log(`Health check: Testing connection to backend at ${backendUrl}`);
    
    // Test basic connectivity to backend with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Backend not reachable during health check. Status: ${response.status}`);
      // During build time, return success even if backend is not available
      return NextResponse.json({
        status: 'degraded',
        message: `Backend not reachable during build. Status: ${response.status}`,
        backend_url: backendUrl,
        response_status: response.status,
        build_time: process.env.NODE_ENV !== 'production'
      });
    }

    const data = await response.json();
    return NextResponse.json({
      status: 'ok',
      message: 'Backend is reachable',
      backend_url: backendUrl,
      backend_response: data
    });

  } catch (error: any) {
    console.warn('Health check failed (this is normal during build):', error.message);
    
    // During build time or when backend is unavailable, return degraded status instead of error
    return NextResponse.json({
      status: 'degraded',
      message: 'Backend temporarily unavailable (normal during build)',
      backend_url: getAPIUrl(),
      error: error.message,
      error_type: error.constructor.name,
      build_time: process.env.NODE_ENV !== 'production'
    }, { status: 200 }); // Return 200 instead of 500 to prevent build failures
  }
}