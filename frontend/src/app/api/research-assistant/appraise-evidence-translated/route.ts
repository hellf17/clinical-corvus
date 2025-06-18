import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

interface EvidenceAppraisalInput {
  study_description: string;
  study_type?: 'RCT' | 'cohort' | 'case-control' | 'cross-sectional' | 'systematic-review' | 'meta-analysis' | 'case-series';
  research_question?: string;
  population_description?: string;
  intervention_description?: string;
  outcome_measures?: string[];
  specific_concerns?: string[];
}

interface AppraisalCriterion {
  criterion_name: string;
  criterion_description: string;
  assessment_result: 'excellent' | 'good' | 'fair' | 'poor' | 'unclear';
  detailed_analysis: string;
  improvement_suggestions: string[];
  impact_on_validity: 'high' | 'medium' | 'low';
}

interface EvidenceAppraisalOutput {
  overall_quality_assessment: string;
  study_design_evaluation: string;
  appraisal_criteria: AppraisalCriterion[];
  risk_of_bias_assessment: string;
  applicability_analysis: string;
  strength_of_evidence: 'high' | 'moderate' | 'low' | 'very-low';
  clinical_recommendations: string[];
  limitations_and_caveats: string[];
  educational_insights: string;
  disclaimer: string;
}

/**
 * POST handler for appraising evidence. This endpoint is a proxy to the backend.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/research/appraise-evidence-translated`;

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
    endpoint: 'appraise-evidence-translated',
    integration_note: 'This endpoint proxies to a backend service that handles all translation and business logic.'
  });
}