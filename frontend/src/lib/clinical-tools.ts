import { z } from 'zod';
import { tool } from '@ai-sdk/provider-utils';
import { auth } from '@clerk/nextjs/server';

/**
 * A single, powerful tool that acts as an interface to the backend Langroid agent.
 * The agent will receive the user's query and decide which internal tools (BAML functions) to use.
 */
export const drCorvusClinicalAssistant = tool({
  description: 'Acts as a comprehensive clinical and research assistant. Use this tool for any clinical queries, including differential diagnosis, lab interpretation, research questions, PICO formulation, evidence analysis, and clinical reasoning tasks.',
  inputSchema: z.object({
    query: z.string().describe('The user\'s clinical or research query.'),
    patientId: z.string().optional().describe('The ID of the patient in context, if available.'),
    conversationId: z.string().optional().describe('The ID of the current conversation for maintaining context.'),
  }),
  execute: async ({ query, patientId, conversationId }) => {
    try {
      // Obtain the auth token server-side (tool executes in API route context)
      const { getToken } = await auth();
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token missing while invoking Clinical Assistant Agent.');
      }

      // This single tool now calls a new, unified agent endpoint on the backend.
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/agents/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query,
          patient_id: patientId,
          conversation_id: conversationId,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.detail || 'Failed to get response from Clinical Assistant Agent');
      }

      // The backend agent will stream its response, but for the tool's purpose,
      // we can return a summary or the initial part of the response.
      // The actual streaming will be handled by the main API route.
      const data = await response.json();
      
      return {
        status: "success",
        agentResponse: data,
      };

    } catch (error) {
      console.error('Error calling Clinical Assistant Agent:', error);
      return {
        status: "error",
        errorMessage: error instanceof Error ? error.message : 'An unknown error occurred.',
      };
    }
  },
});

// Helper function to get human-readable descriptions of tools
export function getToolDescription(toolName: string): string {
  const descriptions: Record<string, string> = {
    'generateDifferentialDiagnosis': 'Gerando diagnóstico diferencial',
    'interpretLabResults': 'Interpretando resultados laboratoriais',
    'generatePICOQuestion': 'Gerando pergunta PICO',
    'searchClinicalEvidence': 'Buscando evidências clínicas',
    'analyzeCognitiveBias': 'Analisando vieses cognitivos',
    'askForDiagnosticConfirmation': 'Solicitando confirmação diagnóstica',
    'snappsPresentation': 'Apresentando SNAPPS',
    'problemRepresentation': 'Representação do problema',
    'drCorvusClinicalAssistant': 'Assistente Clínico Dr. Corvus'
  };
  
  return descriptions[toolName] || toolName;
}

export const clinicalTools = {
  drCorvusClinicalAssistant,
};
