'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Loader2, Bot, User, AlertTriangle, CheckCircle, Info, Stethoscope, BookOpen } from 'lucide-react';
import { useChat } from '@ai-sdk/react';

interface MVPAgentChatProps {
  patientId?: string;
  conversationId?: string;
  onAgentSwitch?: (agentType: 'clinical_discussion' | 'clinical_research') => void;
  className?: string;
}

interface AgentMetadata {
  agent_type: 'clinical_discussion' | 'clinical_research';
  patient_context_used: boolean;
  conversation_id?: string;
}

export function MVPAgentChat({
  patientId,
  conversationId,
  onAgentSwitch,
  className = ''
}: MVPAgentChatProps) {
  const [currentAgent, setCurrentAgent] = useState<'clinical_discussion' | 'clinical_research'>('clinical_discussion');
  const [agentMetadata, setAgentMetadata] = useState<AgentMetadata | null>(null);
  const [isAgentSwitching, setIsAgentSwitching] = useState(false);
  const [input, setInput] = useState('');

  const {
    messages,
    sendMessage,
    status,
    error,
    stop
  } = useChat({
    // Handle client-side tools that are automatically executed
    async onToolCall({ toolCall }) {
      // Check if it's a dynamic tool first for proper type narrowing
      if (toolCall.dynamic) {
        return;
      }

      // Handle client-side tools that should be automatically executed
      // (None in our current implementation - all require user interaction)
      console.log('Tool call received:', toolCall.toolName);
    },

    onFinish: ({ message }) => {
      console.log('Agent response completed:', message);
    },

    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  // Handle agent switching
  const handleAgentSwitch = (newAgent: 'clinical_discussion' | 'clinical_research') => {
    if (newAgent === currentAgent) return;

    setIsAgentSwitching(true);
    setCurrentAgent(newAgent);
    onAgentSwitch?.(newAgent);

    // Reset metadata when switching agents
    setAgentMetadata(null);

    setTimeout(() => {
      setIsAgentSwitching(false);
    }, 500);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === 'ready') {
      sendMessage(
        { text: input },
        {
          body: { 
            patientId,
            agentType: currentAgent
          },
        }
      );
      setInput('');
    }
  };

  // Get agent display info
  const getAgentInfo = (agentType: string) => {
    switch (agentType) {
      case 'clinical_discussion':
        return {
          name: 'Clinical Case Discussion',
          icon: <Stethoscope className="h-4 w-4" />,
          description: 'Analyze clinical cases and discuss patient presentations',
          color: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'clinical_research':
        return {
          name: 'Clinical Research Assistant',
          icon: <BookOpen className="h-4 w-4" />,
          description: 'Search medical literature and provide evidence-based answers',
          color: 'bg-green-100 text-green-800 border-green-200'
        };
      default:
        return {
          name: 'AI Assistant',
          icon: <Bot className="h-4 w-4" />,
          description: 'General clinical assistance',
          color: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const currentAgentInfo = getAgentInfo(currentAgent);
  const detectedAgentInfo = agentMetadata ? getAgentInfo(agentMetadata.agent_type) : null;
  const isLoading = status === 'submitted' || status === 'streaming';

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {currentAgentInfo.icon}
              {currentAgentInfo.name}
            </CardTitle>
            <CardDescription>
              {currentAgentInfo.description}
              {patientId && (
                <span className="block mt-1 text-blue-600">
                  Patient context enabled
                </span>
              )}
            </CardDescription>
          </div>

          {/* Agent Switcher */}
          <div className="flex gap-2">
            <Button
              variant={currentAgent === 'clinical_discussion' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleAgentSwitch('clinical_discussion')}
              disabled={isAgentSwitching}
              className="flex items-center gap-2"
            >
              <Stethoscope className="h-3 w-3" />
              Case Discussion
            </Button>
            <Button
              variant={currentAgent === 'clinical_research' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleAgentSwitch('clinical_research')}
              disabled={isAgentSwitching}
              className="flex items-center gap-2"
            >
              <BookOpen className="h-3 w-3" />
              Research
            </Button>
          </div>
        </div>

        {/* Agent Status Indicators */}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className={currentAgentInfo.color}>
            {currentAgentInfo.icon}
            <span className="ml-1">{currentAgentInfo.name}</span>
          </Badge>

          {agentMetadata && (
            <>
              {agentMetadata.patient_context_used && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Patient Context Used
                </Badge>
              )}

              {detectedAgentInfo && detectedAgentInfo.name !== currentAgentInfo.name && (
                <Badge variant="outline" className="text-xs">
                  <Info className="h-3 w-3 mr-1" />
                  Auto-switched to {detectedAgentInfo.name}
                </Badge>
              )}
            </>
          )}

          {isAgentSwitching && (
            <Badge variant="outline" className="text-xs">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Switching agents...
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error.message || 'An error occurred while processing your request.'}
              <Button
                variant="outline"
                size="sm"
                onClick={() => sendMessage({ text: input })}
                className="ml-2"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Messages Display */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {messages.length === 0 && !isLoading && (
            <div className="text-center text-gray-500 py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Start a conversation</p>
              <p className="text-sm">
                {currentAgent === 'clinical_discussion'
                  ? 'Describe a clinical case or ask about patient symptoms'
                  : 'Ask clinical questions or request evidence-based research'
                }
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className={`flex gap-3 max-w-[80%] ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                <div className={`rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="whitespace-pre-wrap text-sm">
                    {message.parts && message.parts.length > 0 ? (
                      message.parts.map((part, index) => {
                        if (part.type === 'text') {
                          return <span key={index}>{part.text}</span>;
                        }
                        return null;
                      })
                    ) : (
                      'content' in message ? (message.content as string) : ''
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-600">
                    {currentAgent === 'clinical_discussion'
                      ? 'Analyzing clinical case...'
                      : 'Searching medical literature...'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              currentAgent === 'clinical_discussion'
                ? 'Describe a clinical case, symptoms, or ask about patient management...'
                : 'Ask about clinical evidence, research findings, or medical literature...'
            }
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading || isAgentSwitching}
          />
          <Button
            type="submit"
            disabled={isLoading || isAgentSwitching || !input.trim()}
            className="px-4 py-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Send'
            )}
          </Button>
        </form>

        {/* Agent Tips */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
          <div className="flex items-start gap-2">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">💡 Tips for better responses:</p>
              <ul className="space-y-1">
                {currentAgent === 'clinical_discussion' ? (
                  <>
                    <li>• Include patient demographics, symptoms, and relevant history</li>
                    <li>• Mention any existing diagnoses or medications</li>
                    <li>• Ask specific questions about differential diagnosis or management</li>
                  </>
                ) : (
                  <>
                    <li>• Be specific about your clinical question or scenario</li>
                    <li>• Mention if you need recent research or specific guidelines</li>
                    <li>• Ask about evidence strength or study quality</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}