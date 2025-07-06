import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// --- Types matching backend models (derived from DeepResearchComponent.tsx) ---

export interface PICOStructure {
  population?: string;
  intervention?: string;
  comparison?: string;
  outcome?: string;
}

export interface DeepResearchRequest {
  user_original_query: string;
  pico_question?: PICOStructure;
  research_focus?: string;
  target_audience?: string;
  research_mode?: 'quick' | 'expanded' | 'comprehensive'; // Consistent with backend
}

export interface KeyFinding {
  theme_name: string;
  supporting_references: number[];
  summary: string;
  strength_of_evidence: string;
  study_count?: number;
  key_findings?: string[]; // This seems to be a list of strings for key points
  evidence_appraisal_notes?: string;
  supporting_studies_count?: number;
}

export interface RelevantReference {
  reference_id: number;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  doi?: string;
  pmid?: string;
  url?: string;
  study_type: string;
  synthesis_relevance_score?: number;
  snippet_or_abstract?: string;
}

export interface ResearchMetrics {
  total_articles_analyzed: number;
  sources_consulted: string[];
  search_queries_executed: number; // Assuming this field exists or is desired
  articles_by_source: { [key: string]: number };
  quality_score_avg?: number;
  diversity_score_avg?: number;
  recency_score_avg?: number;
  rct_count: number;
  systematic_reviews_count: number;
  meta_analysis_count: number;
  guideline_count: number;
  date_range_searched?: string;
  unique_journals_found?: number;
  high_impact_studies_count?: number;
  recent_studies_count?: number;
  cite_source_metrics?: any; // Define more strictly if needed
  quality_filters_applied?: string[];
}

export interface SynthesizedResearchOutput {
  original_query: string;
  executive_summary: string;
  key_findings_by_theme: KeyFinding[];
  evidence_quality_assessment: string;
  clinical_implications: string[];
  research_gaps_identified: string[];
  relevant_references: RelevantReference[];
  research_metrics?: ResearchMetrics;
  search_duration_seconds?: number;
  llm_token_usage?: any; // Define more strictly if needed
  llm_model_name?: string;
  professional_detailed_reasoning_cot: string;
}

// For server-to-server communication within Docker, use the service name.
const BACKEND_API_URL = 'http://backend-api:8000';


/**
 * API proxy route for quick search with translation.
 * Forwards requests to the backend endpoint that handles quick search
 * and translates the results to Portuguese before returning.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backendUrl = `${BACKEND_API_URL}/api/research/quick-search-translated`;
    const body = await request.json();

    console.log(`Forwarding POST request to quick-search-translated backend: ${backendUrl}`);

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await request.headers.get('Authorization')?.split(' ')[1]}`,
        'X-User-Id': userId,
      },
      body: JSON.stringify(body),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error(`Error from backend service at ${backendUrl}: ${backendResponse.status}`, data);
      return NextResponse.json(data, { status: backendResponse.status });
    }

    return NextResponse.json(data, { status: backendResponse.status });
  } catch (error) {
    console.error('Error in Next.js API route /api/research-assistant/quick-search-translated:', error);
    return NextResponse.json({ 
      error: 'Proxy request failed',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

/**
 * GET endpoint for health check and feature documentation.
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/research-assistant/quick-search-translated',
    description: 'Provides quick search results from the backend, with user-facing text fields translated to Portuguese. Acts as an authenticated proxy to the backend research service.',
    methods: ['POST', 'GET'],
    POST_request_body_schema: {
      user_original_query: 'string (required)',
      pico_question: 'PICOStructure (optional)',
      research_focus: 'string (optional)',
      target_audience: 'string (optional)',
      research_mode: "'quick' | 'expanded' | 'comprehensive' (optional, defaults to 'quick' or backend default)",
    },
    POST_response_body_schema: 'SynthesizedResearchOutput (with fields translated)',
    note: 'This is a proxy route. All research and translation logic is handled by the backend service. Ensure Clerk authentication headers are passed correctly.'
  });
}
