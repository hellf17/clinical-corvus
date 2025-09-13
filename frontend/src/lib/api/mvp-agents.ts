/**
 * API Client for MVP Agents - Week 3 Implementation
 *
 * Provides functions to interact with ClinicalResearchAgent and ClinicalDiscussionAgent
 */

import {
  ClinicalQueryRequest,
  ClinicalCaseDiscussionRequest,
  FollowUpDiscussionRequest,
  AgentResponse,
  ConversationHistoryResponse,
  HealthCheckResponse,
  AgentError
} from '@/types/mvp-agents';

// Base API URL
const API_BASE = '/api/mvp-agents';

/**
 * Process a clinical query using the ClinicalResearchAgent
 */
export async function processClinicalQuery(
  request: ClinicalQueryRequest
): Promise<AgentResponse> {
  try {
    const response = await fetch(`${API_BASE}/clinical-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process clinical query');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in processClinicalQuery:', error);
    throw error;
  }
}

/**
 * Discuss a clinical case using the ClinicalDiscussionAgent
 */
export async function discussClinicalCase(
  request: ClinicalCaseDiscussionRequest
): Promise<AgentResponse> {
  try {
    const response = await fetch(`${API_BASE}/clinical-discussion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process clinical discussion');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in discussClinicalCase:', error);
    throw error;
  }
}

/**
 * Continue a clinical discussion with follow-up questions
 */
export async function continueDiscussion(
  request: FollowUpDiscussionRequest
): Promise<AgentResponse> {
  try {
    const response = await fetch(`${API_BASE}/follow-up-discussion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to continue discussion');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in continueDiscussion:', error);
    throw error;
  }
}

/**
 * Get conversation history
 */
export async function getConversationHistory(
  limit: number = 5
): Promise<ConversationHistoryResponse> {
  try {
    const response = await fetch(`${API_BASE}/conversation-history?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch conversation history');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in getConversationHistory:', error);
    throw error;
  }
}

/**
 * Clear conversation history
 */
export async function clearConversationHistory(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE}/conversation-history`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to clear conversation history');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in clearConversationHistory:', error);
    throw error;
  }
}

/**
 * Health check for MVP agents
 */
export async function checkAgentsHealth(): Promise<HealthCheckResponse> {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Return a basic health response if backend is unreachable
      return {
        timestamp: new Date().toISOString(),
        agents_available: false,
        security_available: false,
        overall_status: 'error',
        components: {},
        frontend_status: 'ok',
        backend_status: 'unreachable'
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in checkAgentsHealth:', error);
    return {
      timestamp: new Date().toISOString(),
      agents_available: false,
      security_available: false,
      overall_status: 'error',
      components: {
        frontend: {
          status: 'available',
          type: 'frontend'
        },
        backend: {
          status: 'error',
          type: 'backend',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      frontend_status: 'ok',
      backend_status: 'unreachable'
    };
  }
}

/**
 * Utility function to handle API errors consistently
 */
export function handleApiError(error: unknown): AgentError {
  if (error instanceof Error) {
    return {
      error: error.message,
      agent_type: 'clinical_research', // Default, can be overridden
      error_type: 'api_error',
      timestamp: new Date().toISOString()
    };
  }

  return {
    error: 'Unknown error occurred',
    agent_type: 'clinical_research',
    error_type: 'unknown_error',
    timestamp: new Date().toISOString()
  };
}

/**
 * Helper function to create clinical query requests
 */
export function createClinicalQuery(
  query: string,
  patientId?: string,
  includeContext: boolean = true,
  queryType?: 'research' | 'lab_analysis' | 'clinical_reasoning' | 'general'
): ClinicalQueryRequest {
  return {
    query,
    patient_id: patientId,
    include_patient_context: includeContext,
    query_type: queryType
  };
}

/**
 * Helper function to create clinical discussion requests
 */
export function createClinicalDiscussion(
  caseDescription: string,
  patientId?: string,
  includeContext: boolean = true
): ClinicalCaseDiscussionRequest {
  return {
    case_description: caseDescription,
    patient_id: patientId,
    include_patient_context: includeContext
  };
}

/**
 * Helper function to create follow-up discussion requests
 */
export function createFollowUpDiscussion(
  followUpQuestion: string,
  conversationId?: number
): FollowUpDiscussionRequest {
  return {
    follow_up_question: followUpQuestion,
    conversation_id: conversationId
  };
}