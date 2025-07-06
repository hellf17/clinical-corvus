import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// For server-to-server communication within Docker, use the service name.
const BACKEND_API_URL = 'http://backend-api:8000'; 

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // The actual FastAPI endpoint is now prefixed with /api/deep-research
    const targetUrl = `${BACKEND_API_URL}/api/research`; 

    console.log(`Forwarding POST request from /api/research to ${targetUrl}`);

    const backendResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward any other necessary headers if your backend requires them
        // e.g., 'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    });

    const responseData = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error(`Error from backend service at ${targetUrl}: ${backendResponse.status}`, responseData);
      return NextResponse.json(responseData, { status: backendResponse.status });
    }

    return NextResponse.json(responseData, { status: backendResponse.status });
  } catch (error: any) {
    console.error('Error in Next.js API route /api/research-assistant:', error);
    return NextResponse.json(
      { message: 'Internal Server Error in Next.js API proxy', details: error.message },
      { status: 500 }
    );
  }
}

// You might want to add GET, PUT, DELETE handlers if your component/FastAPI uses them
// For now, assuming only POST for the deep research initiation. 