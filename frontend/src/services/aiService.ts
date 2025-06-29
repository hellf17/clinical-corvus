import { Message } from '@/types/chat';

/**
 * Service for interacting with the AI chat API
 */
export const sendMessage = async (
  conversationId: string, 
  message: Message
): Promise<Message> => {
  try {
    const response = await fetch(`/api/ai-chat/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to send message');
    }

    return response.json();
  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
};

// For simplicity in tests
const aiService = {
  sendMessage
};
export default aiService;