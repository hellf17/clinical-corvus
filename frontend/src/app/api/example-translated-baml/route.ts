import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Example types for documentation (not used in proxy logic)
interface ExpandDifferentialDiagnosisInput {
  presenting_complaint: string;
  location_if_pain?: string;
  student_initial_ddx_list: string[];
}

interface ExpandedDdxOutput {
  applied_approach_description: string;
  suggested_additional_diagnoses_with_rationale: string[];
  disclaimer: string;
}

/**
 * Example API proxy route for a translation endpoint.
 * This route demonstrates the recommended proxy pattern:
 * - No translation logic or imports from '@/lib/translation'.
 * - Forwards requests to the backend endpoint that handles all translation and business logic.
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Proxy request to backend translation endpoint (replace with actual backend endpoint)
    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/clinical-assistant/expand-differential-diagnosis-translated`;
    const body = await request.json();

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'X-User-Id': userId,
      },
      body: JSON.stringify(body),
    });

    const data = await backendResponse.json();
    return NextResponse.json(data, { status: backendResponse.status });
  } catch (error) {
    return NextResponse.json({ error: 'Proxy request failed', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

/**
 * GET endpoint for health check or documentation.
 */
export async function GET() {
  // Simple health check endpoint
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'example-translated-baml',
    integration_note: 'This is a proxy example. All translation logic is handled by the backend.'
  });
}