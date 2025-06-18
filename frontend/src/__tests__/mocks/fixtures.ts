import { Patient, Exam } from '@/store/patientStore';
import { Message } from '@/store/chatStore';

/**
 * Mock patient data for testing
 */
export const mockPatient: Patient = {
  id: '1',
  name: 'Test Patient',
  dateOfBirth: '1980-01-01',
  gender: 'male',
  vitalSigns: [
    {
      temperature: 37.0,
      heartRate: 75,
      respiratoryRate: 18,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      oxygenSaturation: 98,
      date: new Date().toISOString()
    }
  ],
  exams: [
    {
      id: 'exam1',
      date: '2023-01-01',
      type: 'blood',
      file: 'test.pdf',
      results: [
        {
          id: 'result1',
          name: 'Hemoglobina',
          value: 10,
          unit: 'g/dL',
          referenceRange: '12-16',
          isAbnormal: true,
          date: '2023-01-01'
        },
        {
          id: 'result2',
          name: 'Creatinina',
          value: 0.9,
          unit: 'mg/dL',
          referenceRange: '0.7-1.2',
          isAbnormal: false,
          date: '2023-01-01'
        },
        {
          id: 'result3',
          name: 'Glicose',
          value: 110,
          unit: 'mg/dL',
          referenceRange: '70-99',
          isAbnormal: true,
          date: '2023-01-01'
        }
      ]
    }
  ]
};

/**
 * Creates a patient with empty exams
 */
export const emptyExamsPatient: Patient = {
  ...mockPatient,
  exams: []
};

/**
 * Mock exam data for testing
 */
export const mockExam: Exam = {
  id: 'exam2',
  date: '2023-02-01',
  type: 'blood',
  file: 'test2.pdf',
  results: [
    {
      id: 'result4',
      name: 'Hemoglobina',
      value: 11,
      unit: 'g/dL',
      referenceRange: '12-16',
      isAbnormal: true,
      date: '2023-02-01'
    },
    {
      id: 'result5',
      name: 'PCR',
      value: 5.2,
      unit: 'mg/L',
      referenceRange: '0-5',
      isAbnormal: true,
      date: '2023-02-01'
    }
  ]
};

/**
 * Mock chat messages for testing
 */
export const mockMessages: Message[] = [
  {
    id: 'msg1',
    role: 'user',
    content: 'Olá, poderia me ajudar a interpretar os exames do paciente?',
    timestamp: new Date('2023-01-15T10:00:00Z').getTime()
  },
  {
    id: 'msg2',
    role: 'assistant',
    content: 'Com certeza! Vejo que o paciente apresenta anemia com hemoglobina de 10 g/dL, o que está abaixo do valor de referência. A função renal parece normal, com creatinina de 0.9 mg/dL. Há também uma leve hiperglicemia (110 mg/dL). Gostaria de mais detalhes sobre algum desses resultados?',
    timestamp: new Date('2023-01-15T10:02:00Z').getTime()
  },
  {
    id: 'msg3',
    role: 'user',
    content: 'O que pode causar essa anemia?',
    timestamp: new Date('2023-01-15T10:05:00Z').getTime()
  }
];

/**
 * Mock alert data for testing
 */
export const mockAlerts = [
  {
    id: 'alert1',
    patientId: '1',
    examId: 'exam1',
    resultId: 'result1',
    type: 'abnormal',
    severity: 'moderate',
    message: 'Hemoglobina abaixo do valor de referência',
    date: '2023-01-01',
    isAcknowledged: false
  },
  {
    id: 'alert2',
    patientId: '1',
    examId: 'exam1',
    resultId: 'result3',
    type: 'abnormal',
    severity: 'mild',
    message: 'Glicose acima do valor de referência',
    date: '2023-01-01',
    isAcknowledged: true
  }
];

/**
 * Mock alert summary data for testing
 */
export const mockAlertSummary = {
  total: 3,
  by_severity: {
    critical: 0,
    severe: 1,
    moderate: 1,
    mild: 1
  },
  by_type: {
    abnormal: 3,
    trend: 0,
    medication: 0
  },
  by_category: {
    hematology: 1,
    biochemistry: 2
  },
  unacknowledged: 2
};

/**
 * Mock user data for testing
 */
export const mockUser = {
  id: 'user1',
  name: 'Dr. Test',
  email: 'test@example.com',
  role: 'doctor',
  avatar: ''
};

/**
 * Creates a mock file for testing uploads
 */
export const createMockFile = (name = 'test.pdf', type = 'application/pdf', size = 1024) => {
  const file = new File(['mock file content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}; 