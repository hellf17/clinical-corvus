import { openai } from '@ai-sdk/openai';
import { auth } from '@clerk/nextjs/server';
import { convertToModelMessages, streamText, createIdGenerator } from 'ai';
import { NextRequest } from 'next/server';
import type { ClinicalUIMessage } from '@/types/clinical-chat';
import { clinicalTools } from '@/lib/clinical-tools';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return new Response('Authentication required', { status: 401 });
    }

    const token = await getToken();

    const body = await req.json();
    const { messages, data, conversationId: existingConversationId }: { messages: ClinicalUIMessage[]; data?: any, conversationId?: string } = body;
    const patientId = data?.patientId;

    if (!messages || messages.length === 0) {
      return new Response('Messages are required', { status: 400 });
    }

    // Get the last user message content
    let lastUserMessage = '';
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      // Extract text content from parts
      const textParts = lastMessage.parts.filter(part => part.type === 'text');
      lastUserMessage = textParts.map(part => (part as any).text).join(' ');
    }

    // Simplified system prompt. The intelligence is now in the backend agent.
    const systemPrompt = `Você é um assistente de IA. Sua principal função é rotear todas as perguntas clínicas ou de pesquisa para a ferramenta 'drCorvusClinicalAssistant'. Use esta ferramenta para responder a qualquer consulta do usuário. Não tente responder diretamente.`;

    // Use streamText with our clinical tools
    const result = streamText({
      model: openai('gpt-4o'),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      tools: {
          ...clinicalTools,
          drCorvusClinicalAssistant: clinicalTools.drCorvusClinicalAssistant,
      },
      toolChoice: 'auto', // Let the AI decide when to use tools
      temperature: 0.1, // Lower temperature for more consistent medical advice
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      
      // Generate consistent server-side IDs for message persistence
      generateMessageId: createIdGenerator({
        prefix: 'clinical-msg',
        size: 16,
      }),
      
      // Add clinical metadata to messages
      messageMetadata: ({ part }) => {
        const baseMetadata = {
          timestamp: Date.now(),
          model: 'gpt-4o',
          consultationType: 'quick-chat' as const,
        };

        if (patientId) {
          (baseMetadata as any).patientId = patientId;
        }

        // Add token usage on completion
        if (part.type === 'finish') {
          return {
            ...baseMetadata,
            totalTokens: part.totalUsage.totalTokens,
            confidenceScore: 0.8, // Default confidence for AI responses
          };
        }

        // Add model info on start
        if (part.type === 'start') {
          return baseMetadata;
        }

        return baseMetadata;
      },

      // Handle clinical consultation persistence
      onFinish: async ({ messages, responseMessage }) => {
        try {
            // Extract the first message content for conversation title
            let firstMessageContent = '';
            if (messages.length > 0) {
              const firstMessage = messages[0];
              if (firstMessage.role === 'user') {
                // Extract text content from parts
                const textParts = firstMessage.parts.filter(part => part.type === 'text');
                firstMessageContent = textParts.map(part => (part as any).text).join(' ').substring(0, 100) || 'New Conversation';
              }
            }

            let conversationId = existingConversationId;

            // If no conversationId, create a new one
            if (!conversationId) {
                const createConvoResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/conversations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        title: firstMessageContent,
                        patient_id: patientId,
                    }),
                });
                if (!createConvoResponse.ok) {
                    throw new Error('Failed to create conversation');
                }
                const newConversation = await createConvoResponse.json();
                conversationId = newConversation.id;
            }

            // Save user message
            const userMessage = messages[messages.length - 2];
            if (userMessage) {
                await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/conversations/${conversationId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        role: userMessage.role,
                        content: userMessage.parts.filter(part => part.type === 'text').map(part => (part as any).text).join(' '),
                    }),
                });
            }

            // Save AI response
            await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/conversations/${conversationId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    role: responseMessage.role,
                    content: responseMessage.parts.filter(part => part.type === 'text').map(part => (part as any).text).join(' '),
                    message_metadata: responseMessage.metadata,
                }),
            });

        } catch (error) {
          console.error('Failed to save clinical consultation:', error);
          // Don't fail the response if saving fails
        }
      },

      // Handle tool execution errors gracefully
      onError: (error) => {
        console.error('Clinical chat error:', error);
        
        if (error instanceof Error) {
          if (error.message.includes('tool')) {
            return `Erro ao executar ferramenta clínica: ${error.message}`;
          }
          return `Erro no processamento clínico: ${error.message}`;
        }
        
        return 'Ocorreu um erro inesperado no processamento clínico. Tente novamente.';
      },
    });

  } catch (error) {
    console.error('Error in clinical chat API:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Erro desconhecido no sistema de chat clínico';
      
    return new Response(
      JSON.stringify({ 
        error: `Erro no chat clínico: ${errorMessage}`,
        details: 'Verifique sua conexão e tente novamente. Se o problema persistir, contate o suporte técnico.' 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}