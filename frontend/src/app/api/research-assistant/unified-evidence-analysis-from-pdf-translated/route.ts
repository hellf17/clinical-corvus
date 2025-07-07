import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://backend-api:8000';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the FormData from the incoming request
    const formData = await request.formData();
    
    // Construct the target URL for the FastAPI backend
    const targetUrl = `${FASTAPI_URL}/api/research/unified-evidence-analysis-from-pdf-translated`;

    console.log(`Forwarding FormData POST request from /api/research-assistant/unified-evidence-analysis-from-pdf-translated to ${targetUrl}`);

    // Forward the FormData to the backend
    const backendResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        // Do NOT set Content-Type for FormData; fetch does it automatically with the correct boundary
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: formData,
    });

    const responseData = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error(`Error from backend service at ${targetUrl}: ${backendResponse.status}`, responseData);
      return NextResponse.json(responseData, { status: backendResponse.status });
    }

    return NextResponse.json(responseData, { status: backendResponse.status });
  } catch (error: any) {
    console.error('Error in Next.js API route /api/research-assistant/unified-evidence-analysis-from-pdf-translated:', error);
    return NextResponse.json(
      { message: 'Internal Server Error in Next.js API proxy', details: error.message },
      { status: 500 }
    );
  }
} 