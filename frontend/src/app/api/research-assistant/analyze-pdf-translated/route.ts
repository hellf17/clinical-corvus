import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Interfaces defining the data structure for PDF analysis requests and responses.
// These ensure type safety and clarity for the API contract.

interface PDFAnalysisInput {
  pdf_file: File;
  analysis_focus?: 'methodology' | 'results' | 'comprehensive' | 'quality-assessment';
  specific_questions?: string[];
  research_context?: string;
}

interface DocumentSection {
  section_name: string;
  section_content_summary: string;
  key_points: string[];
  methodological_notes?: string;
  quality_indicators?: string[];
}

interface StudyCharacteristics {
  study_design: string;
  population_description: string;
  sample_size: number;
  intervention_description?: string;
  outcome_measures: string[];
  follow_up_duration?: string;
}

interface QualityAssessment {
  overall_quality: 'high' | 'moderate' | 'low' | 'unclear';
  strengths: string[];
  limitations: string[];
  risk_of_bias_assessment: string;
  applicability_notes: string;
}

interface PDFAnalysisOutput {
  document_overview: string;
  study_characteristics: StudyCharacteristics;
  document_sections: DocumentSection[];
  key_findings_summary: string[];
  quality_assessment: QualityAssessment;
  clinical_relevance: string;
  research_implications: string[];
  answered_questions: { question: string; answer: string }[];
  educational_insights: string;
  disclaimer: string;
}

/**
 * POST handler for analyzing a PDF document. This endpoint is a proxy to the backend.
 * It handles file uploads via FormData and streams the request to the backend service.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/research/analyze-pdf-translated`;

  try {
    const formData = await request.formData();

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        // No 'Content-Type' header; fetch sets it automatically for FormData
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'X-User-Id': userId,
      },
      body: formData,
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(data, { status: backendResponse.status });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error proxying PDF analysis request to backend:', error);
    return NextResponse.json(
      { error: 'An internal error occurred while analyzing the PDF.' },
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
    endpoint: 'analyze-pdf-translated',
    integration_note: 'This endpoint proxies to a backend service that handles all PDF analysis, translation, and business logic.'
  });
}