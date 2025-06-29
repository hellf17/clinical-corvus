import { AuthUser, Patient, Exam, AIMessage, Conversation, Alert } from './types';

// Usuário autenticado padrão para testes
export const DEFAULT_USER: AuthUser = {
  id: 'user123',
  name: 'Dr. Teste',
  email: 'doutor@exemplo.com',
  role: 'doctor'
};

// Pacientes de teste
export const TEST_PATIENTS: Patient[] = [
  {
    id: 'patient123',
    name: 'João Silva',
    idade: 45,
    sexo: 'M',
    diagnostico: 'Hipertensão Arterial'
  },
  {
    id: 'patient456',
    name: 'Maria Oliveira',
    idade: 38,
    sexo: 'F',
    diagnostico: 'Diabetes Tipo 2'
  }
];

// Exames de teste
export const TEST_EXAMS: Exam[] = [
  {
    id: 'exam123',
    date: '2023-05-15',
    type: 'blood',
    results: [
      { id: 'res1', name: 'Hemoglobina', value: 14.5, unit: 'g/dL' },
      { id: 'res2', name: 'Glicose', value: 95, unit: 'mg/dL' }
    ]
  }
];

// Respostas padrão do assistente IA
export const AI_RESPONSES = {
  greeting: 'Olá! Sou o Dr. Corvus, seu assistente médico de IA. Como posso ajudar você hoje?',
  clinicalQuestion: 'Com base nos sintomas descritos, há algumas possibilidades a considerar. A febre alta, dor de cabeça e fadiga podem ser indicativos de uma infecção viral, como gripe. No entanto, a rigidez na nuca levanta preocupações sobre meningite, que é uma condição séria que requer avaliação médica imediata.'
};

// Mensagens de chat
export const TEST_MESSAGES: AIMessage[] = [
  {
    id: 'msg1',
    role: 'assistant',
    content: AI_RESPONSES.greeting,
    timestamp: Date.now() - 1000
  }
];

// Conversas
export const TEST_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv1',
    title: 'Análise de exames recentes',
    created_at: new Date().toISOString()
  }
];

// Alertas
export const TEST_ALERTS: Alert[] = [
  {
    id: 'alert123',
    patient_id: 'patient123',
    severity: 'moderate',
    message: 'Glicemia elevada',
    created_at: new Date().toISOString()
  }
]; 