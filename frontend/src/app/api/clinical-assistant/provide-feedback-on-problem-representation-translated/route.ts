import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

interface ProblemRepresentationInput {
  clinical_vignette_summary: string;
  user_problem_representation: string;
  user_semantic_qualifiers: string[];
  expected_learning_outcomes?: string[];
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
}

interface SemanticQualifierFeedback {
  qualifier_category: string;
  user_input: string;
  expert_feedback: string;
  improvement_suggestions: string[];
  clinical_relevance_score: number;
}

interface ProblemRepresentationOutput {
  overall_feedback: string;
  problem_representation_analysis: string;
  semantic_qualifiers_feedback: SemanticQualifierFeedback[];
  expert_problem_representation_example: string;
  key_learning_points: string[];
  improvement_recommendations: string[];
  clinical_reasoning_insights: string;
  disclaimer: string;
}

/**
 * POST handler for providing feedback on problem representation. This endpoint is a proxy to the backend.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/clinical/provide-feedback-on-problem-representation-translated`;

  try {
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

    if (!backendResponse.ok) {
      return NextResponse.json(data, { status: backendResponse.status });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error proxying to backend:', error);
    return NextResponse.json(
      { error: 'An internal error occurred.' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for health check and feature documentation.
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'provide-feedback-on-problem-representation-translated',
    integration_note: 'This endpoint proxies to a backend service that handles all translation and business logic.'
  });
}