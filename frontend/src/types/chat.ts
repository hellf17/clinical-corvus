/**
 * Types for chat interactions
 */

import { CoreMessage } from 'ai';
import { Medication } from './medication'; // Import Medication type

// Define a specific type for exam summaries
export interface ExamSummary {
  date: string;         // Date of the exam
  name: string;         // Name of the exam/test
  value: string | number; // Value of the result
  unit?: string;        // Unit of measurement
  referenceRange?: string; // Reference range
  // Add other common fields if needed
}

export interface ChatRequestOptions {
  data?: Record<string, string>;
}

export interface ChatCompletionRequestMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Represents context specific to a patient that can be included in chat requests
export interface PatientContext {
  patientId: string;
  patientName?: string;
  // Use the specific ExamSummary type
  lastExam?: ExamSummary; // Example: Latest relevant lab result summary 
  // Use existing Medication type
  medications?: Medication[]; // Example: List of active medications
  // Assuming symptoms are strings for now
  symptoms?: string[]; // Example: Recent symptoms from diary/notes
  // Add other relevant patient context fields here
}

export interface ChatContextValue {
  // Add fields relevant to the chat context itself if any
  // This might overlap with PatientContext if the chat is always patient-specific
  // Re-using PatientContext fields here for simplicity, adjust as needed
  patientId?: string;
  patientName?: string;
  // Use the specific ExamSummary type
  lastExam?: ExamSummary; 
  medications?: Medication[];
  symptoms?: string[]; 
}

export interface ChatState {
  messages: CoreMessage[];
  input: string;
  isLoading: boolean;
  error: Error | null;
  conversationId: string | null;
  context?: PatientContext; // Holds the patient context for the current chat
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export type { CoreMessage as Message }; 