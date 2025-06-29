import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAPIUrl } from '@/config';

// Define types for API Route (Frontend facing)
interface LabTestResultForLLM {
  test_name: string;
  value: string;
  unit?: string;
  reference_range_low?: string;
  reference_range_high?: string;
  interpretation_flag?: string;
  notes?: string;
}

// This enum is used by the frontend payload
enum UserRoleForLLM {
  PATIENT = "PATIENT",
  DOCTOR_STUDENT = "DOCTOR_STUDENT"
}

interface LabAnalysisInputForLLM {
  lab_results: LabTestResultForLLM[];
  user_role: UserRoleForLLM; 
  patient_context?: string;
  specific_user_query?: string; // This was previously named generalNotes and specificUserQuery in the frontend component state
                               // The component now sends { lab_results, user_role, patient_context (from generalNotes), specific_user_query }
                               // This interface matches DrCorvusLabAnalysisInput in FastAPI and LabAnalysisInput in BAML
}

// This interface matches BAML's LabInsightsOutput and FastAPI's DrCorvusLabInsightsOutput
interface LabInsightsOutputFromLLM {
  patient_friendly_summary?: string;
  potential_health_implications_patient?: string[];
  lifestyle_tips_patient?: string[];
  questions_to_ask_doctor_patient?: string[];
  key_abnormalities_professional?: string[];
  potential_patterns_and_correlations?: string[];
  differential_considerations_professional?: string[];
  suggested_next_steps_professional?: string[];
  important_results_to_discuss_with_doctor?: string[];
  general_disclaimer: string;
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated. No userId found.' }, { status: 401 });
    }

    // Define a more specific type for publicMetadata if possible
    // For now, we use a type assertion to inform TypeScript about the 'role' property
    const publicMetadata = sessionClaims?.publicMetadata as { role?: string } | undefined;
    const userRoleFromToken = publicMetadata?.role;

    if (!userRoleFromToken) {
      console.error('API Route /api/clinical/generate-lab-insights: User ' + userId + ' has no role in token. publicMetadata:', JSON.stringify(sessionClaims?.publicMetadata));
      return NextResponse.json({ error: 'Access Denied: User role not found in token.' }, { status: 403 });
    }

    let apiPayload: LabAnalysisInputForLLM;
    try {
      apiPayload = await req.json();
    } catch (error) {
      console.error("API Route /api/clinical/generate-lab-insights: Invalid JSON payload.", error);
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    // Validate the payload structure if necessary, e.g., ensure lab_results and user_role are present.
    if (!apiPayload.lab_results || !apiPayload.user_role) {
        console.error("API Route /api/clinical/generate-lab-insights: Missing lab_results or user_role in payload.");
        return NextResponse.json({ error: 'Missing lab_results or user_role in payload.' }, { status: 400 });
    }
    
    // Ensure user_role is a valid enum value
    if (!Object.values(UserRoleForLLM).includes(apiPayload.user_role)) {
        console.error("API Route /api/clinical/generate-lab-insights: Invalid user_role in payload.");
        return NextResponse.json({ error: 'Invalid user_role in payload.' }, { status: 400 });
    }

    console.log('API Route /api/clinical/generate-lab-insights: Received payload for user ' + userId + ' (Role: ' + userRoleFromToken + '):', JSON.stringify(apiPayload, null, 2));

    // The payload (apiPayload) should match DrCorvusLabAnalysisInput expected by FastAPI
    const fastApiPayload = apiPayload;

    // Use the getAPIUrl function to determine the proper backend URL
    // This will return 'http://backend:8000' when running in serverless functions (Next.js API routes)
    const backendUrl = getAPIUrl();
    const fastApiUrl = `${backendUrl}/api/clinical/generate-lab-insights`;
    
    console.log(`API Route /api/clinical/generate-lab-insights: Forwarding request to FastAPI: ${fastApiUrl}`);

    const fastApiResponse = await fetch(fastApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Potentially forward auth or other relevant headers if needed by the backend
        // For now, assuming the FastAPI backend is internal and doesn't require separate auth from this Next.js route
      },
      body: JSON.stringify(fastApiPayload),
    });

    if (!fastApiResponse.ok) {
      const errorBody = await fastApiResponse.text(); // Read error body as text first
      console.error(`API Route /api/clinical/generate-lab-insights: FastAPI request failed with status ${fastApiResponse.status}:`, errorBody);
      // Try to parse as JSON if possible, otherwise return text
      let errorJson = { message: `FastAPI error: ${fastApiResponse.statusText}`, details: errorBody };
      try {
        errorJson = JSON.parse(errorBody);
      } catch (e) {
        // Not a JSON error response from FastAPI, use the text
      }
      return NextResponse.json({ error: 'Failed to fetch insights from backend.', backend_status: fastApiResponse.status, backend_response: errorJson }, { status: fastApiResponse.status });
    }

    const insightsToReturn: LabInsightsOutputFromLLM = await fastApiResponse.json();

    console.log('API Route /api/clinical/generate-lab-insights: FastAPI response received and parsed.');

    return NextResponse.json(insightsToReturn, { status: 200 });

  } catch (error: any) {
    console.error("Error in API Route /api/clinical/generate-lab-insights:", error.message, error.stack);
    if (error instanceof NextResponse) {
        return error;
    }
    let errorDetail = 'Failed to generate insights due to an unexpected error.';
    if (error.message) {
      errorDetail = error.message;
    }
    return NextResponse.json({ error: 'Internal server error in Next.js API route.', details: errorDetail }, { status: 500 });
  }
} 