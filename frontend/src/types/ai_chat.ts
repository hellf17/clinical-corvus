export type ChatRole = 'user' | 'assistant' | 'system';

export interface AIChatMessage {
  id: string;
  conversation_id: string;
  role: ChatRole;
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AIChatConversation {
  id: string;
  title: string;
  patient_id: string;
  user_id: string;
  last_message_content?: string;
  created_at: string;
  updated_at: string;
  messages: AIChatMessage[];
}

export interface AIChatConversationSummary {
  id: string;
  title: string;
  last_message_content?: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface AIChatConversationList {
  conversations: AIChatConversationSummary[];
  total: number;
}

export interface AIChatConversationCreate {
  title?: string;
  patient_id: string;
  initial_message?: string;
}

export interface AIChatConversationUpdate {
  title?: string;
}

export interface SendMessageRequest {
  content: string;
  role?: ChatRole;
  metadata?: Record<string, any>;
}

export interface SendMessageResponse {
  message: AIChatMessage;
  assistant_response?: AIChatMessage;
} 