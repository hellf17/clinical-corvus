import { API_URL } from '@/lib/config'; // Import centralized API_URL
import axios from 'axios';
import {
  AIChatConversation,
  AIChatConversationCreate,
  AIChatConversationList,
  AIChatConversationUpdate,
  AIChatMessage,
  SendMessageRequest,
  SendMessageResponse
} from '../types/ai_chat';

// Function to handle API calls with auth (token must be passed in from client if needed)
async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  return fetch(`${API_URL}${endpoint}`, { ...options, headers });
}

export const aiChatService = {
  // Conversation endpoints
  async getConversationsForPatient(patientId: string, skip: number = 0, limit: number = 20): Promise<AIChatConversationList> {
    const response = await axios.get<AIChatConversationList>(
      `${API_URL}/api/ai-chat/conversations/patient/${patientId}?skip=${skip}&limit=${limit}`
    );
    return response.data;
  },

  async createConversation(conversation: AIChatConversationCreate): Promise<AIChatConversation> {
    const response = await axios.post<AIChatConversation>(
      `${API_URL}/api/ai-chat/conversations`,
      conversation
    );
    return response.data;
  },

  async createConversationForPatient(patientId: string, title?: string, initialMessage?: string): Promise<AIChatConversation> {
    const response = await axios.post<AIChatConversation>(
      `${API_URL}/api/ai-chat/conversations/patient/${patientId}`,
      { title, initial_message: initialMessage, patient_id: patientId }
    );
    return response.data;
  },

  async getConversation(conversationId: string): Promise<AIChatConversation> {
    const response = await axios.get<AIChatConversation>(
      `${API_URL}/api/ai-chat/conversations/${conversationId}`
    );
    return response.data;
  },

  async updateConversation(conversationId: string, update: AIChatConversationUpdate): Promise<AIChatConversation> {
    const response = await axios.put<AIChatConversation>(
      `${API_URL}/api/ai-chat/conversations/${conversationId}`,
      update
    );
    return response.data;
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await axios.delete(`${API_URL}/api/ai-chat/conversations/${conversationId}`);
  },

  // Message endpoints
  async getMessages(conversationId: string): Promise<AIChatMessage[]> {
    const response = await axios.get<AIChatMessage[]>(
      `${API_URL}/api/ai-chat/conversations/${conversationId}/messages`
    );
    return response.data;
  },

  async sendMessage(conversationId: string, message: SendMessageRequest): Promise<SendMessageResponse> {
    const response = await axios.post<SendMessageResponse>(
      `${API_URL}/api/ai-chat/conversations/${conversationId}/messages`,
      message
    );
    return response.data;
  }
}; 