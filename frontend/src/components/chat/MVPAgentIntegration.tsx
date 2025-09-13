'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Label } from '@/components/ui/Label';
import { Separator } from '@/components/ui/Separator';
import { Loader2, Bot, Zap, AlertTriangle, Info, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface MVPAgentIntegrationProps {
  patientId?: string;
  conversationId?: string;
  onAgentEnabled?: (enabled: boolean) => void;
  className?: string;
}

export function MVPAgentIntegration({
  patientId,
  conversationId,
  onAgentEnabled,
  className = ''
}: MVPAgentIntegrationProps) {
  // Always-on agent: remove manual toggle. Enabled reflects health only.
  const [isEnabled, setIsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{
    agents_available: boolean;
    overall_status: string;
    last_checked: Date | null;
  }>({
    agents_available: false,
    overall_status: 'unknown',
    last_checked: null
  });

  // Check MVP agents health on mount
  useEffect(() => {
    checkAgentsHealth();
  }, []);

  // Check MVP agents health
  const checkAgentsHealth = async () => {
    try {
      const response = await fetch('/api/mvp-agents/health');
      const data = await response.json();

      setHealthStatus({
        agents_available: data.agents_available || false,
        overall_status: data.overall_status || 'error',
        last_checked: new Date()
      });

      if (!data.agents_available) {
        console.warn('MVP Agents not available:', data);
      }
    } catch (error) {
      console.error('Failed to check MVP agents health:', error);
      setHealthStatus({
        agents_available: false,
        overall_status: 'error',
        last_checked: new Date()
      });
    }
  };

  // No toggle behavior; notify parent once on health status
  useEffect(() => {
    onAgentEnabled?.(healthStatus.agents_available);
  }, [healthStatus.agents_available, onAgentEnabled]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'degraded':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      case 'error':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          MVP Agents Integration
        </CardTitle>
        <CardDescription>
          Enable advanced AI agents for clinical discussions and research assistance
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon(healthStatus.overall_status)}
            <div>
              <p className="text-sm font-medium">
                MVP Agents Status
              </p>
              <p className="text-xs text-gray-600">
                {healthStatus.agents_available ? 'Available' : 'Unavailable'}
                {healthStatus.last_checked && (
                  <span className="ml-2">
                    • Last checked: {healthStatus.last_checked.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={checkAgentsHealth}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              'Refresh'
            )}
          </Button>
        </div>

        {/* Agent Status (always-on) */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="space-y-1">
            <Label className="text-sm font-medium">MVP Agents</Label>
            <p className="text-xs text-gray-600">
              Always enabled. Routing handled automatically.
            </p>
          </div>
          <Badge variant={healthStatus.agents_available ? 'default' : 'outline'}>
            {healthStatus.agents_available ? 'Enabled' : 'Unavailable'}
          </Badge>
        </div>

        {/* Agent Information */}
        {healthStatus.agents_available && (
          <>
            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Available Agents:</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">ClinicalDiscussionAgent</p>
                      <Badge variant="outline" className="text-xs">
                        Case Analysis
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    Analyzes clinical cases, provides differential diagnoses, and suggests management plans
                  </p>
                </div>

                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">ClinicalResearchAgent</p>
                      <Badge variant="outline" className="text-xs">
                        Evidence-Based
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    Searches medical literature, provides evidence-based answers, and cites sources
                  </p>
                </div>
              </div>
            </div>

            {/* Usage Tips */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">How it works:</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Messages are automatically routed to the appropriate agent</li>
                    <li>• Clinical case discussions → ClinicalDiscussionAgent</li>
                    <li>• Research questions → ClinicalResearchAgent</li>
                    <li>• Patient context is automatically included when available</li>
                    <li>• Responses include evidence-based reasoning and citations</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Health Warning */}
        {!healthStatus.agents_available && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              MVP Agents are currently unavailable. Your chat will use the standard AI assistant.
              <Button
                variant="outline"
                size="sm"
                onClick={checkAgentsHealth}
                className="ml-2"
              >
                Check Again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Patient Context Info */}
        {patientId && (
          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
            <Info className="h-3 w-3 inline mr-1" />
            Patient context will be automatically included in agent responses
          </div>
        )}
      </CardContent>
    </Card>
  );
}
