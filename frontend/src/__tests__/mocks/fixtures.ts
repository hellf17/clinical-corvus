import { Patient, Exam } from '@/store/patientStore';
import { Message } from '@/store/chatStore';
import { Alert } from '@/types/alerts';
import { LabResult, VitalSign } from '@/types/health';

const MOCK_PATIENT_ID = 1;
const MOCK_USER_ID = 1;

/**
 * Mock VitalSign data
 */
export const mockVitalSigns: VitalSign[] = [
  {
    vital_id: 1,
    patient_id: MOCK_PATIENT_ID,
    timestamp: new Date().toISOString(),
    created_at: new Date().toISOString(),
    temperature_c: 37.0,
    heart_rate: 75,
    respiratory_rate: 18,
    systolic_bp: 120,
    diastolic_bp: 80,
    oxygen_saturation: 98,
  },
];

/**
 * Mock LabResult data
 */
export const mockLabResults: LabResult[] = [
  {
    result_id: 1,
    patient_id: MOCK_PATIENT_ID,
    exam_id: 1,
    user_id: MOCK_USER_ID,
    test_name: 'Hemoglobina',
    value_numeric: 10,
    unit: 'g/dL',
    reference_range_low: 12,
    reference_range_high: 16,
    is_abnormal: true,
    timestamp: '2023-01-01T00:00:00Z',
    created_at: '2023-01-01T00:00:00Z',
  },
  {
    result_id: 2,
    patient_id: MOCK_PATIENT_ID,
    exam_id: 1,
    user_id: MOCK_USER_ID,
    test_name: 'Creatinina',
    value_numeric: 0.9,
    unit: 'mg/dL',
    reference_range_low: 0.7,
    reference_range_high: 1.2,
    is_abnormal: false,
    timestamp: '2023-01-01T00:00:00Z',
    created_at: '2023-01-01T00:00:00Z',
  },
];

/**
 * Mock Exam data
 */
export const mockExam: Exam = {
  exam_id: 1,
  patient_id: MOCK_PATIENT_ID,
  exam_timestamp: '2023-01-01T00:00:00Z',
  exam_type: 'blood',
  file: 'test.pdf',
  lab_results: mockLabResults,
};

/**
 * Mock Patient data
 */
export const mockPatient: Patient = {
  patient_id: MOCK_PATIENT_ID,
  name: 'Test Patient',
  birthDate: '1980-01-01',
  gender: 'male',
  vitalSigns: mockVitalSigns,
  exams: [mockExam],
};

/**
 * Mock Alert data
 */
export const mockAlerts: Alert[] = [
  {
    alert_id: 1,
    patient_id: MOCK_PATIENT_ID,
    category: 'hematologia',
    parameter: 'Hemoglobina',
    message: 'Hemoglobina abaixo do valor de referência',
    severity: 'moderate',
    created_at: '2023-01-01T00:00:00Z',
    status: 'unread',
  },
  {
    alert_id: 2,
    patient_id: MOCK_PATIENT_ID,
    category: 'bioquimica',
    parameter: 'Glicose',
    message: 'Glicose acima do valor de referência',
    severity: 'warning',
    created_at: '2023-01-01T00:00:00Z',
    status: 'read',
  },
];

/**
 * Mock chat messages for testing
 */
export const mockMessages: Message[] = [
  {
    id: 'msg1',
    role: 'user',
    content: 'Olá, poderia me ajudar a interpretar os exames do paciente?',
    timestamp: new Date('2023-01-15T10:00:00Z').getTime(),
  },
  {
    id: 'msg2',
    role: 'assistant',
    content: 'Com certeza! Vejo que o paciente apresenta anemia com hemoglobina de 10 g/dL, o que está abaixo do valor de referência. A função renal parece normal, com creatinina de 0.9 mg/dL. Há também uma leve hiperglicemia (110 mg/dL). Gostaria de mais detalhes sobre algum desses resultados?',
    timestamp: new Date('2023-01-15T10:02:00Z').getTime(),
  },
];

/**
 * Creates a mock file for testing uploads
 */
/**
 * Mock user data for testing
 */
export const mockUser = {
  id: 1,
  name: 'Dr. Test',
  email: 'test@example.com',
  role: 'doctor',
  avatar: '',
};

/**
 * Creates a mock file for testing uploads
 */
export const createMockFile = (name = 'test.pdf', type = 'application/pdf', size = 1024) => {
  const file = new File(['mock file content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}; 