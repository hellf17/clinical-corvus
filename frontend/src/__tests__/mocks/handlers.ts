import { http, HttpResponse } from 'msw';
import { mockPatient, mockExam, mockMessages, mockAlerts, mockUser } from './fixtures';

// Base API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://backend-api:8000';

export const handlers = [
  // Auth endpoints
  http.post(`${API_URL}/api/auth/login`, () => {
    return HttpResponse.json({
      user: mockUser,
      token: 'mock-jwt-token',
    });
  }),

  http.post(`${API_URL}/api/auth/logout`, () => {
    return HttpResponse.json({ message: 'Logout successful' });
  }),

  http.get(`${API_URL}/api/auth/me`, () => {
    return HttpResponse.json({ user: mockUser });
  }),

  // Patient endpoints
  http.get(`${API_URL}/api/patients`, () => {
    return HttpResponse.json([mockPatient]);
  }),

  http.get(`${API_URL}/api/patients/:patientId`, ({ params }) => {
    const { patientId } = params;
    if (Number(patientId) === mockPatient.patient_id) {
      return HttpResponse.json(mockPatient);
    }
    return HttpResponse.json({ message: 'Patient not found' }, { status: 404 });
  }),

  http.post(`${API_URL}/api/patients`, () => {
    return HttpResponse.json(mockPatient, { status: 201 });
  }),

  http.put(`${API_URL}/api/patients/:patientId`, ({ params }) => {
    const { patientId } = params;
    if (Number(patientId) === mockPatient.patient_id) {
      return HttpResponse.json(mockPatient);
    }
    return HttpResponse.json({ message: 'Patient not found' }, { status: 404 });
  }),

  // Exam endpoints
  http.get(`${API_URL}/api/patients/:patientId/exams`, ({ params }) => {
    const { patientId } = params;
    if (Number(patientId) === mockPatient.patient_id) {
      return HttpResponse.json(mockPatient.exams);
    }
    return HttpResponse.json({ message: 'Patient not found' }, { status: 404 });
  }),

  http.post(`${API_URL}/api/patients/:patientId/exams`, ({ params }) => {
    const { patientId } = params;
    if (Number(patientId) === mockPatient.patient_id) {
      return HttpResponse.json(mockExam, { status: 201 });
    }
    return HttpResponse.json({ message: 'Patient not found' }, { status: 404 });
  }),

  // Chat endpoints
  http.get(`${API_URL}/api/chat/:patientId/messages`, () => {
    return HttpResponse.json(mockMessages);
  }),

  http.post(`${API_URL}/api/chat/:patientId/messages`, () => {
    return HttpResponse.json(
      {
        id: 'new-msg',
        role: 'assistant',
        content: 'Resposta gerada pela IA',
        timestamp: Date.now(),
      },
      { status: 201 }
    );
  }),

  // File upload and analysis
  http.post(`${API_URL}/api/analyze/upload/:patientId`, () => {
    return HttpResponse.json({
      exam_date: '2023-03-01',
      results: [
        {
          id: 'new-result1',
          test_name: 'Hemoglobina',
          value_numeric: 11.2,
          unit: 'g/dL',
          reference_range_low: 12,
          reference_range_high: 16,
        },
        {
          id: 'new-result2',
          test_name: 'Leucócitos',
          value_numeric: 6500,
          unit: '/mm³',
          reference_range_low: 4000,
          reference_range_high: 10000,
        },
      ],
      analysis_results: {
        summary: 'O paciente apresenta anemia leve, com hemoglobina um pouco abaixo do valor de referência.',
        findings: [
          {
            test: 'Hemoglobina',
            value: 11.2,
            interpretation: 'Valor diminuído, indicando anemia leve',
            severity: 'mild',
          },
        ],
      },
    });
  }),

  // Alerts endpoints
  http.get(`${API_URL}/api/alerts/patient/:patientId`, ({ params }) => {
    const { patientId } = params;
    if (Number(patientId) === mockPatient.patient_id) {
      const response = { items: mockAlerts, total: mockAlerts.length };
      return HttpResponse.json(response);
    }
    return HttpResponse.json({ message: 'Patient not found' }, { status: 404 });
  }),

  http.patch(`${API_URL}/api/alerts/:alertId`, async ({ request, params }) => {
    const { alertId } = params;
    const updateData = await request.json() as { status?: 'read' | 'unread' };
    const originalAlert = mockAlerts.find(a => a.alert_id === Number(alertId));

    if (!originalAlert) {
      return HttpResponse.json({ message: 'Alert not found' }, { status: 404 });
    }

    const updatedAlert = { ...originalAlert, ...updateData };
    return HttpResponse.json(updatedAlert);
  }),
]; 