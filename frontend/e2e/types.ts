import { Route, Request, Response } from '@playwright/test';

export type RouteHandler = (route: Route) => Promise<void>;
export type APIResponse = Record<string, any>;

// Tipos para mocks de API
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'doctor' | 'patient' | 'guest' | 'admin';
}

export interface Patient {
  id: string;
  name: string;
  idade?: number;
  sexo?: 'M' | 'F';
  diagnostico?: string;
  [key: string]: any;
}

export interface Exam {
  id: string;
  date: string;
  type: string;
  results: Array<ExamResult>;
}

export interface ExamResult {
  id: string;
  name: string;
  value: number;
  unit: string;
  isAbnormal?: boolean;
  referenceRange?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title?: string;
  created_at: string;
  updated_at?: string;
}

export interface Alert {
  id: string;
  patient_id: string;
  severity: 'critical' | 'severe' | 'moderate' | 'mild';
  message: string;
  created_at: string;
  acknowledged?: boolean;
} 