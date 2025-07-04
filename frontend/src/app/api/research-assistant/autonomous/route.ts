import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// For server-to-server communication within Docker, use the service name.
const BACKEND_API_URL = 'http://backend:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // The actual FastAPI endpoint is now /api/deep-research/autonomous
    const targetUrl = `${BACKEND_API_URL}/api/deep-research/autonomous`;

    console.log(`Forwarding POST request from /api/deep-research/autonomous to ${targetUrl}`);
    console.log(`Request body:`, JSON.stringify(body, null, 2));

    // Get authorization header from the request
    const authHeader = request.headers.get('Authorization');
    console.log(`Authorization header:`, authHeader ? 'Present' : 'Missing');

    const backendResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward the authorization header to the backend
        ...(authHeader && { 'Authorization': authHeader }),
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
    console.error('Error in Next.js API route /api/deep-research/autonomous:', error);
    return NextResponse.json(
      { message: 'Internal Server Error in Next.js API proxy', details: error.message },
      { status: 500 }
    );
  }
} 