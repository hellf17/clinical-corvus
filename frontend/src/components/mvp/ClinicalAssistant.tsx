'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Loader2, Search, MessageCircle, Lightbulb, FileText, Activity } from 'lucide-react';

interface ClinicalAssistantProps {
  patientId?: string;
  mode: 'research' | 'discussion' | 'query';
  onResponse?: (response: any) => void;
}

interface ClinicalResponse {
  result: any;
  agent_type: string;
  timestamp: string;
  patient_context_included?: boolean;
  research_mode?: string;
  routing_decision?: {
    query_type: string;
    patient_context_available: boolean;
  };
}

export function ClinicalAssistant({ patientId, mode, onResponse }: ClinicalAssistantProps) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ClinicalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const endpoint = `/api/mvp-agents/${getEndpointForMode(mode)}`;
      const requestBody = createRequestBody(mode, query, patientId);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Request failed');
      }

      const data: ClinicalResponse = await response.json();
      setResult(data);
      onResponse?.(data);
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getEndpointForMode = (mode: string) => {
    switch (mode) {
      case 'research':
        return 'clinical-research';
      case 'discussion':
        return 'clinical-discussion';
      case 'query':
        return 'clinical-query';
      default:
        return 'clinical-query';
    }
  };

  const createRequestBody = (mode: string, query: string, patientId?: string) => {
    const baseBody = { patient_id: patientId, include_patient_context: true };
    
    switch (mode) {
      case 'research':
        return {
          query,
          research_mode: 'comprehensive',
          ...baseBody,
        };
      case 'discussion':
        return {
          case_description: query,
          ...baseBody,
        };
      case 'query':
        return {
          query,
          ...baseBody,
        };
      default:
        return { query, ...baseBody };
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'research':
        return <Search className="h-4 w-4" />;
      case 'discussion':
        return <MessageCircle className="h-4 w-4" />;
      case 'query':
        return <Lightbulb className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getModeTitle = (mode: string) => {
    switch (mode) {
      case 'research':
        return 'Clinical Research Assistant';
      case 'discussion':
        return 'Clinical Case Discussion';
      case 'query':
        return 'Clinical Query Assistant';
      default:
        return 'Clinical Assistant';
    }
  };

  const getPlaceholder = (mode: string) => {
    switch (mode) {
      case 'research':
        return 'Ask a clinical research question (e.g., "What is the evidence for ACE inhibitors in heart failure?")...';
      case 'discussion':
        return 'Describe a clinical case to discuss (e.g., "65-year-old male with chest pain and elevated troponins...")...';
      case 'query':
        return 'Ask any clinical question...';
      default:
        return 'Enter your clinical question...';
    }
  };

  return (
    <Card className="clinical-assistant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getModeIcon(mode)}
          {getModeTitle(mode)}
          {patientId && (
            <Badge variant="outline" className="ml-2">
              Patient Context: {patientId}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={getPlaceholder(mode)}
            className="min-h-[120px]"
            disabled={loading}
          />
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {query.length}/2000 characters
            </div>
            <Button
              onClick={handleSubmit}
              disabled={loading || !query.trim()}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {getModeIcon(mode)}
                  <span className="ml-2">
                    {mode === 'research' ? 'Research' : mode === 'discussion' ? 'Discuss' : 'Query'}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>

        {result && <ClinicalResponseRenderer response={result} />}
      </CardContent>
    </Card>
  );
}

interface ClinicalResponseRendererProps {
  response: ClinicalResponse;
}

function ClinicalResponseRenderer({ response }: ClinicalResponseRendererProps) {
  const { result, agent_type, patient_context_included, routing_decision } = response;

  if (result.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          <strong>Error:</strong> {result.error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Agent Information */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary">
          Agent: {agent_type.replace('_', ' ')}
        </Badge>
        {patient_context_included && (
          <Badge variant="outline">Patient Context Applied</Badge>
        )}
        {routing_decision && (
          <Badge variant="outline">
            Route: {routing_decision.query_type}
          </Badge>
        )}
      </div>

      {/* Response Content */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          {result.result?.detailed_results && (
            <TabsTrigger value="details">Details</TabsTrigger>
          )}
          {result.result?.key_findings && (
            <TabsTrigger value="findings">Key Findings</TabsTrigger>
          )}
          {result.result?.relevant_references && (
            <TabsTrigger value="references">References</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Clinical Response</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Handle different result formats */}
              {typeof result.result === 'string' ? (
                <div className="prose max-w-none">
                  <p>{result.result}</p>
                </div>
              ) : result.result?.executive_summary ? (
                <div className="prose max-w-none">
                  <p>{result.result.executive_summary}</p>
                </div>
              ) : result.result?.analysis ? (
                <div className="prose max-w-none">
                  <p>{result.result.analysis}</p>
                </div>
              ) : (
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap text-sm">
                    {JSON.stringify(result.result, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Patient-specific notes if available */}
          {result.result?.patient_specific_notes && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="text-base text-blue-800 flex items-center">
                  <Activity className="mr-2 h-4 w-4" />
                  Patient-Specific Considerations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1">
                  {result.result.patient_specific_notes.map((note: string, index: number) => (
                    <li key={index} className="text-sm">{note}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {result.result?.detailed_results && (
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detailed Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p>{result.result.detailed_results}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {result.result?.key_findings && (
          <TabsContent value="findings">
            <div className="space-y-4">
              {result.result.key_findings.map((finding: any, index: number) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-base">{finding.theme_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <ul className="list-disc list-inside space-y-1">
                      {finding.key_findings?.map((item: string, itemIndex: number) => (
                        <li key={itemIndex} className="text-sm">{item}</li>
                      ))}
                    </ul>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {finding.strength_of_evidence && (
                        <Badge variant="outline" className="text-xs">
                          Evidence: {finding.strength_of_evidence}
                        </Badge>
                      )}
                      {finding.supporting_studies_count && (
                        <Badge variant="outline" className="text-xs">
                          Studies: {finding.supporting_studies_count}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {result.result?.relevant_references && (
          <TabsContent value="references">
            <div className="space-y-3">
              {result.result.relevant_references.map((ref: any, index: number) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">{ref.title}</h4>
                      <div className="text-xs text-muted-foreground">
                        {ref.authors?.join(', ')} • {ref.journal} • {ref.year}
                      </div>
                      {ref.doi && (
                        <div className="text-xs">
                          <a 
                            href={`https://doi.org/${ref.doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            DOI: {ref.doi}
                          </a>
                        </div>
                      )}
                      {ref.synthesis_relevance_score && (
                        <Badge variant="outline" className="text-xs">
                          Relevance: {(ref.synthesis_relevance_score * 100).toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// Export sub-components for flexibility
export { ClinicalResponseRenderer };