'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { Loader2, History, MessageSquare, Trash2, AlertTriangle, Clock, User, Bot } from 'lucide-react';
import { toast } from 'sonner';

import {
  getConversationHistory,
  clearConversationHistory,
  handleApiError
} from '@/lib/api/mvp-agents';
import {
  ConversationHistoryProps,
  ConversationEntry,
  AgentError
} from '@/types/mvp-agents';

export function ConversationHistory({
  limit = 5,
  onHistoryLoad,
  onError,
  className = ''
}: ConversationHistoryProps) {
  // State management
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationEntry | null>(null);

  // Load conversation history
  const loadConversationHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getConversationHistory(limit);

      if (response.success) {
        setConversations(response.conversation_history);
        onHistoryLoad?.(response.conversation_history);
      } else {
        throw new Error('Failed to load conversation history');
      }
    } catch (error) {
      const agentError = handleApiError(error);
      setError(agentError.error);
      onError?.(agentError.error);
      toast.error(agentError.error);
    } finally {
      setIsLoading(false);
    }
  }, [limit, onHistoryLoad, onError]);

  // Load conversation history on mount
  useEffect(() => {
    loadConversationHistory();
  }, [loadConversationHistory]);

  // Clear conversation history
  const handleClearHistory = async () => {
    setIsClearing(true);

    try {
      const response = await clearConversationHistory();

      if (response.success) {
        setConversations([]);
        toast.success('Conversation history cleared successfully');
      } else {
        throw new Error('Failed to clear conversation history');
      }
    } catch (error) {
      const agentError = handleApiError(error);
      setError(agentError.error);
      onError?.(agentError.error);
      toast.error(agentError.error);
    } finally {
      setIsClearing(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  };

  // Get urgency badge variant
  const getUrgencyVariant = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Render conversation preview
  const renderConversationPreview = (conversation: ConversationEntry) => (
    <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className="text-sm font-medium line-clamp-2">
            {conversation.case_description}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={getUrgencyVariant(conversation.analysis.urgency_level)}>
              {conversation.analysis.urgency_level}
            </Badge>
            {conversation.patient_context_used && (
              <Badge variant="outline" className="text-xs">
                Patient Context
              </Badge>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-500 ml-2">
          <Clock className="h-3 w-3 inline mr-1" />
          {formatTimestamp(conversation.timestamp)}
        </div>
      </div>

      <div className="text-xs text-gray-600">
        <div className="flex items-center gap-4">
          <span>Symptoms: {conversation.analysis.key_symptoms.length}</span>
          <span>Diagnoses: {conversation.analysis.possible_diagnoses.length}</span>
          <span>Tests: {conversation.analysis.recommended_tests.length}</span>
        </div>
      </div>
    </div>
  );

  // Render detailed conversation view
  const renderDetailedConversation = (conversation: ConversationEntry) => (
    <div className="space-y-4">
      {/* Case Description */}
      <div>
        <h4 className="font-medium mb-2">Clinical Case</h4>
        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
          {conversation.case_description}
        </p>
      </div>

      {/* Case Analysis */}
      <div>
        <h4 className="font-medium mb-2">Case Analysis</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Case Type:</span>
            <p>{conversation.analysis.case_type}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Urgency:</span>
            <Badge variant={getUrgencyVariant(conversation.analysis.urgency_level)} className="ml-2">
              {conversation.analysis.urgency_level}
            </Badge>
          </div>
        </div>

        {conversation.analysis.key_symptoms.length > 0 && (
          <div className="mt-2">
            <span className="font-medium text-gray-600">Key Symptoms:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {conversation.analysis.key_symptoms.map((symptom, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {symptom}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {conversation.analysis.possible_diagnoses.length > 0 && (
          <div className="mt-2">
            <span className="font-medium text-gray-600">Possible Diagnoses:</span>
            <ul className="text-sm mt-1 space-y-1">
              {conversation.analysis.possible_diagnoses.map((diagnosis, index) => (
                <li key={index}>• {diagnosis}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Clinical Discussion Summary */}
      <div>
        <h4 className="font-medium mb-2">Clinical Discussion Summary</h4>
        <div className="space-y-3">
          <div>
            <span className="font-medium text-gray-600">Assessment:</span>
            <p className="text-sm mt-1">{conversation.discussion.clinical_reasoning.assessment}</p>
          </div>

          {conversation.discussion.differential_diagnosis.primary_diagnoses.length > 0 && (
            <div>
              <span className="font-medium text-gray-600">Primary Differential:</span>
              <ul className="text-sm mt-1 space-y-1">
                {conversation.discussion.differential_diagnosis.primary_diagnoses.slice(0, 3).map((diagnosis, index) => (
                  <li key={index}>• {diagnosis}</li>
                ))}
              </ul>
            </div>
          )}

          {conversation.discussion.management_plan.immediate_actions.length > 0 && (
            <div>
              <span className="font-medium text-gray-600">Immediate Actions:</span>
              <ul className="text-sm mt-1 space-y-1">
                {conversation.discussion.management_plan.immediate_actions.slice(0, 3).map((action, index) => (
                  <li key={index}>• {action}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="text-xs text-gray-500 border-t pt-2">
        <div className="flex items-center justify-between">
          <span>Conversation ID: {conversation.case_description.length}</span>
          <span>{formatTimestamp(conversation.timestamp)}</span>
        </div>
        {conversation.patient_context_used && (
          <div className="mt-1">
            <Badge variant="outline" className="text-xs">Patient Context Included</Badge>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Clinical Discussion History
            </CardTitle>
            <CardDescription>
              Review previous clinical case discussions and analyses
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={loadConversationHistory}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Refresh'
              )}
            </Button>
            <Button
              onClick={handleClearHistory}
              disabled={isClearing || conversations.length === 0}
              variant="destructive"
              size="sm"
            >
              {isClearing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading conversation history...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && conversations.length === 0 && !error && (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No clinical discussions found</p>
            <p className="text-sm">Start a clinical case discussion to see history here</p>
          </div>
        )}

        {/* Conversation List */}
        {!isLoading && conversations.length > 0 && (
          <ScrollArea className="h-96">
            <div className="space-y-3 pr-4">
              {conversations.map((conversation, index) => (
                <Dialog key={index}>
                  <DialogTrigger asChild>
                    <div onClick={() => setSelectedConversation(conversation)}>
                      {renderConversationPreview(conversation)}
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Clinical Case Discussion Details</DialogTitle>
                      <DialogDescription>
                        Detailed view of the clinical case analysis and discussion
                      </DialogDescription>
                    </DialogHeader>
                    {selectedConversation && renderDetailedConversation(selectedConversation)}
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Summary Stats */}
        {conversations.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-lg">{conversations.length}</div>
                <div className="text-gray-600">Total Discussions</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-lg">
                  {conversations.filter(c => c.analysis.urgency_level === 'high').length}
                </div>
                <div className="text-gray-600">High Urgency</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-lg">
                  {conversations.filter(c => c.patient_context_used).length}
                </div>
                <div className="text-gray-600">With Patient Context</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}