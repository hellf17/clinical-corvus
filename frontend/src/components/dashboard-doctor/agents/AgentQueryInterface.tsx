'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Loader2, Search, User, Bot, AlertTriangle, CheckCircle, Info, BookOpen, Stethoscope, Microscope } from 'lucide-react';
import { toast } from 'sonner';

import {
  processClinicalQuery,
  createClinicalQuery,
  handleApiError
} from '@/lib/api/mvp-agents';
import {
  AgentQueryInterfaceProps,
  ClinicalQueryResponse,
  ResearchResult,
  LabAnalysisResult,
  ClinicalReasoningResult,
  AgentError,
  QueryType
} from '@/types/mvp-agents';

export function AgentQueryInterface({
  patientId,
  onQueryComplete,
  onError,
  className = ''
}: AgentQueryInterfaceProps) {
  // State management
  const [query, setQuery] = useState('');
  const [queryType, setQueryType] = useState<QueryType | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<ClinicalQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for scrolling
  const responseRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content is added
  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [currentResponse]);

  // Handle clinical query processing
  const handleProcessQuery = async () => {
    if (!query.trim()) {
      toast.error('Please enter a clinical query');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const request = createClinicalQuery(
        query,
        patientId,
        true, // Include patient context
        queryType as QueryType || undefined
      );

      const response = await processClinicalQuery(request);

      if (response.success && response.response) {
        const queryResult = response.response as ClinicalQueryResponse;
        setCurrentResponse(queryResult);
        onQueryComplete?.(queryResult);
        toast.success('Clinical query processed successfully');
      } else {
        throw new Error(response.error || 'Failed to process query');
      }
    } catch (error) {
      const agentError = handleApiError(error);
      setError(agentError.error);
      onError?.(agentError);
      toast.error(agentError.error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get query type icon
  const getQueryTypeIcon = (type: string) => {
    switch (type) {
      case 'research':
        return <BookOpen className="h-4 w-4" />;
      case 'lab_analysis':
        return <Microscope className="h-4 w-4" />;
      case 'clinical_reasoning':
        return <Stethoscope className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  // Render research results
  const renderResearchResult = (result: ResearchResult) => (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-blue-600" />
          Executive Summary
        </h4>
        <p className="text-sm text-gray-700">{result.executive_summary}</p>
      </div>

      {result.key_findings_by_theme.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Key Findings by Theme</h4>
          <div className="space-y-2">
            {result.key_findings_by_theme.map((theme, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-sm">{theme.theme_name}</h5>
                  <Badge variant="outline">{theme.strength_of_evidence}</Badge>
                </div>
                <ul className="text-sm space-y-1">
                  {theme.key_findings.map((finding, findingIndex) => (
                    <li key={findingIndex} className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.clinical_implications.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Clinical Implications</h4>
          <ul className="text-sm space-y-1">
            {result.clinical_implications.map((implication, index) => (
              <li key={index} className="flex items-start gap-2">
                <Info className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                {implication}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.relevant_references.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Key References</h4>
          <div className="space-y-2">
            {result.relevant_references.slice(0, 3).map((ref, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                <p className="font-medium">{ref.title}</p>
                <p className="text-gray-600">{ref.authors.join(', ')} ({ref.year})</p>
                <p className="text-gray-500">{ref.journal}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.research_metrics && (
        <div className="p-3 bg-green-50 rounded">
          <h4 className="font-medium mb-2 text-green-800">Research Metrics</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-green-700">Articles Analyzed:</span>
              <p className="font-medium">{result.research_metrics.total_articles_analyzed}</p>
            </div>
            <div>
              <span className="text-green-700">Sources:</span>
              <p className="font-medium">{result.research_metrics.sources_consulted.join(', ')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render lab analysis results
  const renderLabAnalysisResult = (result: LabAnalysisResult) => (
    <div className="space-y-4">
      <div className="p-4 bg-green-50 rounded-lg">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Microscope className="h-4 w-4 text-green-600" />
          Lab Analysis Summary
        </h4>
        <p className="text-sm text-gray-700">{result.summary}</p>
      </div>

      {result.abnormal_findings.length > 0 && (
        <div>
          <h4 className="font-medium mb-2 text-red-700">Abnormal Findings</h4>
          <div className="space-y-2">
            {result.abnormal_findings.map((finding, index) => (
              <div key={index} className="p-2 bg-red-50 rounded border border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-500 inline mr-2" />
                <span className="text-sm">{finding}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.recommendations.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Recommendations</h4>
          <ul className="text-sm space-y-1">
            {result.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.follow_up_suggestions.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Follow-up Suggestions</h4>
          <ul className="text-sm space-y-1">
            {result.follow_up_suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2">
                <Info className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  // Render clinical reasoning results
  const renderClinicalReasoningResult = (result: ClinicalReasoningResult) => (
    <div className="space-y-4">
      <div className="p-4 bg-purple-50 rounded-lg">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-purple-600" />
          Clinical Assessment
        </h4>
        <p className="text-sm text-gray-700">{result.assessment}</p>
      </div>

      {result.differential_diagnosis.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Differential Diagnosis</h4>
          <div className="space-y-2">
            {result.differential_diagnosis.map((diagnosis, index) => (
              <div key={index} className="p-2 bg-blue-50 rounded">
                <span className="text-sm">{diagnosis}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.next_steps.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Next Steps</h4>
          <ul className="text-sm space-y-1">
            {result.next_steps.map((step, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.red_flags.length > 0 && (
        <div>
          <h4 className="font-medium mb-2 text-red-700">Red Flags</h4>
          <div className="space-y-2">
            {result.red_flags.map((flag, index) => (
              <div key={index} className="p-2 bg-red-50 rounded border border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-500 inline mr-2" />
                <span className="text-sm">{flag}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Render appropriate result based on type
  const renderResult = (response: ClinicalQueryResponse) => {
    if (!response.result) return null;

    switch (response.analysis_type) {
      case 'research':
        return renderResearchResult(response.result as ResearchResult);
      case 'lab_analysis':
        return renderLabAnalysisResult(response.result as LabAnalysisResult);
      case 'clinical_reasoning':
        return renderClinicalReasoningResult(response.result as ClinicalReasoningResult);
      default:
        return (
          <div className="p-4 bg-gray-50 rounded">
            <p className="text-sm text-gray-700">
              Query processed successfully. Result type: {response.analysis_type}
            </p>
          </div>
        );
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Clinical Query Assistant
        </CardTitle>
        <CardDescription>
          Ask clinical questions and get evidence-based answers. Choose a query type for more targeted results.
          {patientId && (
            <span className="block mt-1 text-blue-600">
              Patient context will be included in the analysis
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Query Input */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Clinical Query</label>
            <Textarea
              placeholder="Ask a clinical question, such as: 'What is the evidence for aspirin in preventing heart attacks?' or 'Analyze these lab results...' or 'How should I approach this patient's symptoms?'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Query Type (Optional)</label>
            <Select value={queryType} onValueChange={(value) => setQueryType(value as QueryType)}>
              <SelectTrigger>
                <SelectValue placeholder="Auto-detect or choose specific type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Auto-detect
                  </div>
                </SelectItem>
                <SelectItem value="research">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Research/Evidence
                  </div>
                </SelectItem>
                <SelectItem value="lab_analysis">
                  <div className="flex items-center gap-2">
                    <Microscope className="h-4 w-4" />
                    Lab Analysis
                  </div>
                </SelectItem>
                <SelectItem value="clinical_reasoning">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Clinical Reasoning
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleProcessQuery}
            disabled={isLoading || !query.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Query...
              </>
            ) : (
              <>
                {getQueryTypeIcon(queryType || 'search')}
                <span className="ml-2">Process Clinical Query</span>
              </>
            )}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Query Results */}
        {currentResponse && (
          <div className="space-y-4">
            <Separator />

            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {currentResponse.analysis_type}
              </Badge>
              {currentResponse.patient_context_used && (
                <Badge variant="secondary">Patient Context Included</Badge>
              )}
            </div>

            <ScrollArea className="h-96" ref={responseRef}>
              <div className="pr-4">
                {renderResult(currentResponse)}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}