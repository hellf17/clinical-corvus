import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Example types for documentation (not used in proxy logic)
interface AutonomousResearchInput {
  research_topic: string;
  research_objective?: string;
  target_population?: string;
  intervention_focus?: string;
  outcome_interests?: string[];
  evidence_level_preference?: 'systematic-reviews' | 'rcts' | 'observational' | 'all';
  time_period_years?: number;
  language_preference?: string[];
}

interface ResearchFinding {
  study_title: string;
  authors: string;
  publication_year: number;
  study_type: string;
  journal: string;
  key_findings: string[];
  relevance_score: number;
  quality_assessment: 'high' | 'moderate' | 'low';
  study_summary: string;
}

interface AutonomousResearchOutput {
  research_strategy_overview: string;
  search_methodology: string;
  evidence_synthesis: string;
  key_findings: ResearchFinding[];
  evidence_gaps_identified: string[];
  recommendations_for_practice: string[];
  recommendations_for_research: string[];
  limitations_of_search: string[];
  educational_insights: string;
  disclaimer: string;
}

/**
 * API proxy route for autonomous research translation endpoint.
 * Forwards requests to the backend endpoint that handles all translation and business logic.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Proxy request to backend autonomous research endpoint
    const backendUrl = `${process.env.BACKEND_URL || 'http://backend-api:8000'}/api/research/autonomous-translated`;
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
 * GET endpoint for health check and feature documentation
 */
export async function GET() {
  // Simple health check endpoint for this proxy route
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'autonomous-translated',
    integration_note: 'This is a proxy route. All translation and research logic is handled by the backend.'
  });
}