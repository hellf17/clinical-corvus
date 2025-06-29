import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

// Define the expected request body structure from the frontend (useChat hook)
interface ChatApiRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string; }>;
  conversationId?: string;
  data?: {
    patientId?: string;
    // Other potential data from useChat options
  };
}

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://backend-api:8000'; // fallback for Docker Compose

// Allow streaming responses up to 30 seconds (or more if needed)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication & Authorization
    const { userId, getToken } = await auth();
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const token = await getToken();
    if (!token) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized: Could not retrieve token.' }), { status: 401 });
    }

    // 2. Parse request body
    const { messages, conversationId, data }: ChatApiRequest = await req.json();
    const patientId = data?.patientId;

    // 3. Prepare request for the backend streaming endpoint
    // The backend now expects SendMessageRequest format
    const backendPayload = {
      conversation_id: conversationId,
      patient_id: patientId, // Pass optional patientId
      content: messages.find(m => m.role === 'user')?.content || '', // Extract last user message content
      // Add any other relevant fields expected by SendMessageRequest if necessary
    };

    // Validate payload before sending
    if (!backendPayload.conversation_id || !backendPayload.content) {
      return new NextResponse(JSON.stringify({ error: 'Missing required payload fields' }), { status: 400 });
    }

    // 4. Call the backend streaming endpoint
    const backendStreamEndpoint = `${BACKEND_API_URL}/api/ai-chat/stream`;
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        // Pass any other required headers
      },
      body: JSON.stringify(backendPayload),
      // IMPORTANT: If running Next.js on Node < 18, you might need `duplex: 'half'` 
      // See: https://nextjs.org/docs/app/api-reference/functions/fetch#optionsduplex
      // duplex: 'half' // Uncomment if needed
    };

    console.log(`Proxying chat request for conv ${conversationId} to backend: ${backendStreamEndpoint}`);
    const backendResponse = await fetch(backendStreamEndpoint, fetchOptions);

    // 5. Check if backend response is valid
    if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        console.error(`Backend stream error: ${backendResponse.status} ${backendResponse.statusText}`, errorText);
        // Return an appropriate error response to the client
        return new NextResponse(JSON.stringify({ error: `Backend Error: ${errorText || backendResponse.statusText}` }), { status: backendResponse.status });
    }

    if (!backendResponse.body) {
      return new NextResponse(JSON.stringify({ error: 'Backend response missing body' }), { status: 500 });
    }

    // Return the stream directly as a standard Response
    return new Response(backendResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8', // Match expected content type for streaming
        // You might need to copy other relevant headers from backendResponse if necessary
        // e.g., backendResponse.headers.get('X-Some-Header')
      },
    });

  } catch (error: any) {
    console.error('Error in frontend /api/chat proxy route:', error);
    let errorMessage = 'An unknown error occurred';
    let errorStatus = 500;

    if (error instanceof Error) {
        errorMessage = error.message;
    }
    // Add specific error handling if needed (e.g., JSON parsing errors)

    return new NextResponse(
      JSON.stringify({ error: errorMessage }), 
      { status: errorStatus, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Chat API placeholder' }, { status: 501 });
} 