import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAPIUrl } from '@/config';

export async function POST(req: NextRequest) {
  try {
    console.log('API Route /api/lab-analysis/guest: Received PDF upload request');
    
    // Get the form data from the request
    const formData = await req.formData();
    
    // Use the getAPIUrl function to determine the proper backend URL
    const backendUrl = getAPIUrl();
    const fastApiUrl = `${backendUrl}/lab-analysis/guest`;
    
    console.log(`API Route /api/lab-analysis/guest: Forwarding request to FastAPI: ${fastApiUrl}`);

    // Forward the request to the backend API
    const fastApiResponse = await fetch(fastApiUrl, {
      method: 'POST',
      // Forward the form data as is
      body: formData,
    });

    if (!fastApiResponse.ok) {
      const errorBody = await fastApiResponse.text(); // Read error body as text first
      console.error(`API Route /api/lab-analysis/guest: FastAPI request failed with status ${fastApiResponse.status}:`, errorBody);
      
      // Try to parse as JSON if possible, otherwise return text
      let errorJson = { message: `FastAPI error: ${fastApiResponse.statusText}`, details: errorBody };
      try {
        errorJson = JSON.parse(errorBody);
      } catch (e) {
        // Not a JSON error response from FastAPI, use the text
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to process PDF upload.', 
          backend_status: fastApiResponse.status, 
          backend_response: errorJson 
        }, 
        { status: fastApiResponse.status }
      );
    }

    // Parse the response from the backend API
    const responseData = await fastApiResponse.json();
    console.log('API Route /api/lab-analysis/guest: FastAPI response received and parsed.');

    // Return the response to the client
    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error("Error in API Route /api/lab-analysis/guest:", error.message, error.stack);
    
    if (error instanceof NextResponse) {
      return error;
    }
    
    let errorDetail = 'Failed to process PDF upload due to an unexpected error.';
    if (error.message) {
      errorDetail = error.message;
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error in Next.js API route.', 
        details: errorDetail 
      }, 
      { status: 500 }
    );
  }
}
