'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Loader2, MessageSquare, User, Bot, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

import {
  discussClinicalCase,
  continueDiscussion,
  createClinicalDiscussion,
  createFollowUpDiscussion,
  handleApiError
} from '@/lib/api/mvp-agents';
import {
  ClinicalDiscussionProps,
  ClinicalDiscussionResponse,
  FollowUpDiscussionResponse,
  AgentError,
  CaseAnalysis,
  ClinicalDiscussion as ClinicalDiscussionType
} from '@/types/mvp-agents';

export function ClinicalDiscussion({
  patientId,
  onDiscussionComplete,
  onError,
  className = ''
}: ClinicalDiscussionProps) {
  // State management
  const [caseDescription, setCaseDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentDiscussion, setCurrentDiscussion] = useState<ClinicalDiscussionResponse | null>(null);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for scrolling
  const discussionRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content is added
  useEffect(() => {
    if (discussionRef.current) {
      discussionRef.current.scrollTop = discussionRef.current.scrollHeight;
    }
  }, [currentDiscussion]);

  // Handle clinical case discussion
  const handleDiscussCase = async () => {
    if (!caseDescription.trim()) {
      toast.error('Please enter a case description');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const request = createClinicalDiscussion(
        caseDescription,
        patientId,
        true // Include patient context
      );

      const response = await discussClinicalCase(request);

      if (response.success && response.response) {
        const discussionResult = response.response as ClinicalDiscussionResponse;
        setCurrentDiscussion(discussionResult);
        onDiscussionComplete?.(discussionResult);
        toast.success('Clinical case analyzed successfully');
      } else {
        throw new Error(response.error || 'Failed to analyze case');
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

  // Handle follow-up discussion
  const handleFollowUp = async () => {
    if (!followUpQuestion.trim()) {
      toast.error('Please enter a follow-up question');
      return;
    }

    if (!currentDiscussion) {
      toast.error('No active discussion to continue');
      return;
    }

    setIsFollowUpLoading(true);

    try {
      const request = createFollowUpDiscussion(
        followUpQuestion,
        currentDiscussion.conversation_id
      );

      const response = await continueDiscussion(request);

      if (response.success && response.response) {
        const followUpResult = response.response as unknown as FollowUpDiscussionResponse;

        // Add follow-up to current discussion
        setCurrentDiscussion(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            discussion: {
              ...prev.discussion,
              follow_up_questions: [
                ...prev.discussion.follow_up_questions,
                followUpResult.follow_up_question
              ]
            }
          };
        });

        setFollowUpQuestion('');
        toast.success('Follow-up question processed');
      } else {
        throw new Error(response.error || 'Failed to process follow-up');
      }
    } catch (error) {
      const agentError = handleApiError(error);
      setError(agentError.error);
      onError?.(agentError);
      toast.error(agentError.error);
    } finally {
      setIsFollowUpLoading(false);
    }
  };

  // Render case analysis
  const renderCaseAnalysis = (analysis: CaseAnalysis) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-blue-500" />
        <h4 className="font-medium">Case Analysis</h4>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-sm font-medium text-gray-600">Case Type:</span>
          <p className="text-sm">{analysis.case_type}</p>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-600">Urgency:</span>
          <Badge
            variant={analysis.urgency_level === 'high' ? 'destructive' :
                    analysis.urgency_level === 'medium' ? 'default' : 'secondary'}
          >
            {analysis.urgency_level}
          </Badge>
        </div>
      </div>

      {analysis.key_symptoms.length > 0 && (
        <div>
          <span className="text-sm font-medium text-gray-600">Key Symptoms:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {analysis.key_symptoms.map((symptom, index) => (
              <Badge key={index} variant="outline">{symptom}</Badge>
            ))}
          </div>
        </div>
      )}

      {analysis.possible_diagnoses.length > 0 && (
        <div>
          <span className="text-sm font-medium text-gray-600">Possible Diagnoses:</span>
          <ul className="text-sm mt-1 space-y-1">
            {analysis.possible_diagnoses.map((diagnosis, index) => (
              <li key={index} className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                {diagnosis}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.recommended_tests.length > 0 && (
        <div>
          <span className="text-sm font-medium text-gray-600">Recommended Tests:</span>
          <ul className="text-sm mt-1 space-y-1">
            {analysis.recommended_tests.map((test, index) => (
              <li key={index} className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-orange-500" />
                {test}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  // Render clinical discussion
  const renderClinicalDiscussion = (discussion: ClinicalDiscussionType) => (
    <div className="space-y-4">
      {/* Clinical Reasoning */}
      <div>
        <h4 className="font-medium mb-2">Clinical Reasoning</h4>
        <p className="text-sm text-gray-700 mb-2">{discussion.clinical_reasoning.assessment}</p>
        {discussion.clinical_reasoning.key_findings.length > 0 && (
          <div>
            <span className="text-sm font-medium text-gray-600">Key Findings:</span>
            <ul className="text-sm mt-1 space-y-1">
              {discussion.clinical_reasoning.key_findings.map((finding, index) => (
                <li key={index}>• {finding}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Separator />

      {/* Differential Diagnosis */}
      <div>
        <h4 className="font-medium mb-2">Differential Diagnosis</h4>
        <div className="space-y-2">
          {discussion.differential_diagnosis.primary_diagnoses.map((diagnosis, index) => (
            <div key={index} className="p-2 bg-blue-50 rounded">
              <p className="text-sm font-medium">{diagnosis}</p>
            </div>
          ))}
          {discussion.differential_diagnosis.red_flags.length > 0 && (
            <div className="p-2 bg-red-50 rounded border border-red-200">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-700">Red Flags:</span>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {discussion.differential_diagnosis.red_flags.map((flag, index) => (
                  <li key={index}>• {flag}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Management Plan */}
      <div>
        <h4 className="font-medium mb-2">Management Plan</h4>
        <div className="space-y-3">
          {discussion.management_plan.immediate_actions.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-600">Immediate Actions:</span>
              <ul className="text-sm mt-1 space-y-1">
                {discussion.management_plan.immediate_actions.map((action, index) => (
                  <li key={index}>• {action}</li>
                ))}
              </ul>
            </div>
          )}

          {discussion.management_plan.diagnostic_workup.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-600">Diagnostic Workup:</span>
              <ul className="text-sm mt-1 space-y-1">
                {discussion.management_plan.diagnostic_workup.map((test, index) => (
                  <li key={index}>• {test}</li>
                ))}
              </ul>
            </div>
          )}

          {discussion.management_plan.treatment_considerations.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-600">Treatment Considerations:</span>
              <ul className="text-sm mt-1 space-y-1">
                {discussion.management_plan.treatment_considerations.map((treatment, index) => (
                  <li key={index}>• {treatment}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Follow-up Questions */}
      {discussion.follow_up_questions.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Suggested Follow-up Questions</h4>
          <div className="space-y-2">
            {discussion.follow_up_questions.map((question, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                {question}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Clinical Case Discussion
        </CardTitle>
        <CardDescription>
          Discuss clinical cases with AI assistance. Get evidence-based analysis and clinical reasoning support.
          {patientId && (
            <span className="block mt-1 text-blue-600">
              Patient context will be included in the analysis
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Case Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Clinical Case Description</label>
          <Textarea
            placeholder="Describe the clinical case, including symptoms, history, physical findings, and any relevant test results..."
            value={caseDescription}
            onChange={(e) => setCaseDescription(e.target.value)}
            rows={4}
            disabled={isLoading}
          />
          <Button
            onClick={handleDiscussCase}
            disabled={isLoading || !caseDescription.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Case...
              </>
            ) : (
              'Analyze Clinical Case'
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

        {/* Discussion Results */}
        {currentDiscussion && (
          <div className="space-y-4">
            <Separator />

            <ScrollArea className="h-96" ref={discussionRef}>
              <div className="space-y-4 pr-4">
                {/* Case Analysis */}
                {renderCaseAnalysis(currentDiscussion.analysis)}

                <Separator />

                {/* Clinical Discussion */}
                {renderClinicalDiscussion(currentDiscussion.discussion)}
              </div>
            </ScrollArea>

            {/* Follow-up Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Follow-up Question</label>
              <Textarea
                placeholder="Ask a follow-up question about this case..."
                value={followUpQuestion}
                onChange={(e) => setFollowUpQuestion(e.target.value)}
                rows={2}
                disabled={isFollowUpLoading}
              />
              <Button
                onClick={handleFollowUp}
                disabled={isFollowUpLoading || !followUpQuestion.trim()}
                variant="outline"
                size="sm"
              >
                {isFollowUpLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Ask Follow-up'
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}