import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const BACKEND_API_URL = 'http://backend-api:8000';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backendUrl = `${BACKEND_API_URL}/api/research/quick-search-stream`;
    const body = await request.json();

    // Forward POST to backend and stream response body back to client
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
        'X-User-Id': userId,
      },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok && backendResponse.body == null) {
      const data = await backendResponse.json().catch(() => ({}));
      return NextResponse.json(data, { status: backendResponse.status });
    }

    // Pipe SSE stream
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      // Disable buffering for proxies
      'X-Accel-Buffering': 'no'
    });
    return new NextResponse(backendResponse.body as any, { status: 200, headers });
  } catch (error) {
    console.error('Error in Next.js API route /api/research-assistant/quick-search-stream:', error);
    return NextResponse.json({ error: 'Proxy request failed', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/research-assistant/quick-search-stream',
    description: 'Streams research progress events (SSE) and final result. Accepts POST with the same body as quick-search.',
    methods: ['POST', 'GET'],
  });
}

