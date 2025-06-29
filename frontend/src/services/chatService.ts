import { API_BASE_URL } from '@/lib/config';
import { ChatMessage } from '@/types/chat'; // Assuming ChatMessage type exists
import { fetchWithAuth } from '@/lib/fetchWithAuth'; // Assuming fetchWithAuth exists

// Type for the payload expected by the new backend save endpoint
interface SaveMessagePayload {
  role: 'assistant'; // Specifically for saving assistant messages
  content: string;
  conversation_id?: string; // Backend expects this in the model, but extracts from URL
  metadata?: Record<string, any>;
}

/**
 * Saves a completed assistant message to the backend.
 * 
 * @param conversationId The ID of the conversation.
 * @param message The assistant message content and metadata.
 * @param token The user's authentication token.
 * @returns The saved message object from the backend.
 * @throws Error if the API call fails.
 */
export const saveAssistantMessage = async (
  conversationId: string,
  message: Omit<SaveMessagePayload, 'conversation_id'>, 
  token: string
): Promise<ChatMessage> => {

  const payload: SaveMessagePayload = {
      ...message,
      role: 'assistant', // Ensure role is set
  };

  const response = await fetchWithAuth(
    `${API_BASE_URL}/ai-chat/conversations/${conversationId}/messages/save`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Failed to save assistant message:', errorBody);
    throw new Error(`Failed to save assistant message: ${response.statusText} - ${errorBody}`);
  }

  return response.json();
};

// Function to create a new conversation (example, might already exist)
export const createConversation = async (patientId: string | null, token: string) => {
  // ... implementation ...
};

// Function to fetch conversation history (example, might already exist)
export const getConversationHistory = async (conversationId: string, token: string) => {
  // ... implementation ...
}; 