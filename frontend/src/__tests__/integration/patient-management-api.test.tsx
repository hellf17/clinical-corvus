import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock API service for patient management
const mockPatientApiService = {
  getPatient: jest.fn(),
  getPatients: jest.fn(),
  createPatient: jest.fn(),
  updatePatient: jest.fn(),
  deletePatient: jest.fn(),
  getPatientNotes: jest.fn(),
  createPatientNote: jest.fn(),
  updatePatientNote: jest.fn(),
  deletePatientNote: jest.fn(),
  getPatientMedications: jest.fn(),
  createPatientMedication: jest.fn(),
  updatePatientMedication: jest.fn(),
  deletePatientMedication: jest.fn(),
  getPatientLabs: jest.fn(),
  createPatientLab: jest.fn(),
  getPatientVitals: jest.fn(),
  createPatientVital: jest.fn(),
  getPatientAlerts: jest.fn(),
  createPatientAlert: jest.fn(),
  resolvePatientAlert: jest.fn(),
  getPatientCharts: jest.fn(),
  getPatientScores: jest.fn(),
  calculatePatientRisk: jest.fn(),
  getPatientExams: jest.fn(),
  schedulePatientExam: jest.fn(),
};

jest.mock('@/services/patientApiService', () => mockPatientApiService);

// Mock fetch for direct API testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Patient Management API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful responses
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {} }),
      text: async () => JSON.stringify({ success: true, data: {} }),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Patient CRUD Operations', () => {
    const mockPatient = {
      id: '1',
      name: 'Test Patient',
      age: 45,
      gender: 'M',
      dateOfBirth: '1978-01-01',
      email: 'patient@test.com',
      phone: '+1234567890',
      address: '123 Test St',
      emergencyContact: {
        name: 'Emergency Contact',
        phone: '+0987654321',
        relationship: 'Spouse'
      },
      medicalHistory: [],
      allergies: [],
      medications: [],
    };

    it('should fetch patient list successfully', async () => {
      const mockPatients = [mockPatient, { ...mockPatient, id: '2', name: 'Test Patient 2' }];
      
      mockPatientApiService.getPatients.mockResolvedValue({
        data: mockPatients,
        total: 2,
        page: 1,
        pageSize: 10,
      });

      const response = await mockPatientApiService.getPatients({
        page: 1,
        pageSize: 10,
      });

      expect(mockPatientApiService.getPatients).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
      });

      expect(response.data).toHaveLength(2);
      expect(response.total).toBe(2);
      expect(response.data[0].name).toBe('Test Patient');
    });

    it('should fetch individual patient successfully', async () => {
      mockPatientApiService.getPatient.mockResolvedValue({
        data: mockPatient,
      });

      const response = await mockPatientApiService.getPatient('1');

      expect(mockPatientApiService.getPatient).toHaveBeenCalledWith('1');
      expect(response.data.id).toBe('1');
      expect(response.data.name).toBe('Test Patient');
    });

    it('should create new patient successfully', async () => {
      const newPatient = { ...mockPatient, id: undefined };
      const createdPatient = { ...mockPatient, id: '3' };

      mockPatientApiService.createPatient.mockResolvedValue({
        data: createdPatient,
        message: 'Patient created successfully',
      });

      const response = await mockPatientApiService.createPatient(newPatient);

      expect(mockPatientApiService.createPatient).toHaveBeenCalledWith(newPatient);
      expect(response.data.id).toBe('3');
      expect(response.message).toBe('Patient created successfully');
    });

    it('should update patient successfully', async () => {
      const updatedData = { ...mockPatient, name: 'Updated Patient Name' };

      mockPatientApiService.updatePatient.mockResolvedValue({
        data: updatedData,
        message: 'Patient updated successfully',
      });

      const response = await mockPatientApiService.updatePatient('1', updatedData);

      expect(mockPatientApiService.updatePatient).toHaveBeenCalledWith('1', updatedData);
      expect(response.data.name).toBe('Updated Patient Name');
    });

    it('should delete patient successfully', async () => {
      mockPatientApiService.deletePatient.mockResolvedValue({
        message: 'Patient deleted successfully',
      });

      const response = await mockPatientApiService.deletePatient('1');

      expect(mockPatientApiService.deletePatient).toHaveBeenCalledWith('1');
      expect(response.message).toBe('Patient deleted successfully');
    });

    it('should handle patient creation validation errors', async () => {
      const invalidPatient = { name: '' }; // Missing required fields

      mockPatientApiService.createPatient.mockRejectedValue({
        status: 400,
        message: 'Validation failed',
        errors: {
          name: 'Name is required',
          dateOfBirth: 'Date of birth is required',
        },
      });

      await expect(mockPatientApiService.createPatient(invalidPatient)).rejects.toMatchObject({
        status: 400,
        message: 'Validation failed',
      });
    });

    it('should handle patient not found errors', async () => {
      mockPatientApiService.getPatient.mockRejectedValue({
        status: 404,
        message: 'Patient not found',
      });

      await expect(mockPatientApiService.getPatient('nonexistent')).rejects.toMatchObject({
        status: 404,
        message: 'Patient not found',
      });
    });
  });

  describe('Patient Notes Management', () => {
    const mockNote = {
      id: '1',
      patientId: '1',
      title: 'Test Note',
      content: 'This is a test note content',
      type: 'general',
      createdAt: '2023-01-01T00:00:00Z',
      createdBy: 'doctor-1',
      updatedAt: '2023-01-01T00:00:00Z',
    };

    it('should fetch patient notes successfully', async () => {
      const mockNotes = [mockNote, { ...mockNote, id: '2', title: 'Test Note 2' }];

      mockPatientApiService.getPatientNotes.mockResolvedValue({
        data: mockNotes,
        total: 2,
      });

      const response = await mockPatientApiService.getPatientNotes('1');

      expect(mockPatientApiService.getPatientNotes).toHaveBeenCalledWith('1');
      expect(response.data).toHaveLength(2);
      expect(response.data[0].title).toBe('Test Note');
    });

    it('should create patient note successfully', async () => {
      const newNote = { ...mockNote, id: undefined };
      const createdNote = { ...mockNote, id: '3' };

      mockPatientApiService.createPatientNote.mockResolvedValue({
        data: createdNote,
        message: 'Note created successfully',
      });

      const response = await mockPatientApiService.createPatientNote('1', newNote);

      expect(mockPatientApiService.createPatientNote).toHaveBeenCalledWith('1', newNote);
      expect(response.data.id).toBe('3');
    });

    it('should update patient note successfully', async () => {
      const updatedNote = { ...mockNote, content: 'Updated note content' };

      mockPatientApiService.updatePatientNote.mockResolvedValue({
        data: updatedNote,
        message: 'Note updated successfully',
      });

      const response = await mockPatientApiService.updatePatientNote('1', '1', updatedNote);

      expect(mockPatientApiService.updatePatientNote).toHaveBeenCalledWith('1', '1', updatedNote);
      expect(response.data.content).toBe('Updated note content');
    });

    it('should delete patient note successfully', async () => {
      mockPatientApiService.deletePatientNote.mockResolvedValue({
        message: 'Note deleted successfully',
      });

      const response = await mockPatientApiService.deletePatientNote('1', '1');

      expect(mockPatientApiService.deletePatientNote).toHaveBeenCalledWith('1', '1');
      expect(response.message).toBe('Note deleted successfully');
    });
  });

  describe('Patient Medications Management', () => {
    const mockMedication = {
      id: '1',
      patientId: '1',
      name: 'Test Medication',
      dosage: '10mg',
      frequency: 'twice daily',
      route: 'oral',
      startDate: '2023-01-01',
      endDate: null,
      status: 'active',
      prescribedBy: 'doctor-1',
      notes: 'Take with food',
    };

    it('should fetch patient medications successfully', async () => {
      const mockMedications = [mockMedication, { ...mockMedication, id: '2', name: 'Test Med 2' }];

      mockPatientApiService.getPatientMedications.mockResolvedValue({
        data: mockMedications,
        total: 2,
      });

      const response = await mockPatientApiService.getPatientMedications('1');

      expect(mockPatientApiService.getPatientMedications).toHaveBeenCalledWith('1');
      expect(response.data).toHaveLength(2);
      expect(response.data[0].name).toBe('Test Medication');
    });

    it('should create patient medication successfully', async () => {
      const newMedication = { ...mockMedication, id: undefined };
      const createdMedication = { ...mockMedication, id: '3' };

      mockPatientApiService.createPatientMedication.mockResolvedValue({
        data: createdMedication,
        message: 'Medication added successfully',
      });

      const response = await mockPatientApiService.createPatientMedication('1', newMedication);

      expect(mockPatientApiService.createPatientMedication).toHaveBeenCalledWith('1', newMedication);
      expect(response.data.id).toBe('3');
    });

    it('should update medication status successfully', async () => {
      const updatedMedication = { ...mockMedication, status: 'discontinued', endDate: '2023-12-31' };

      mockPatientApiService.updatePatientMedication.mockResolvedValue({
        data: updatedMedication,
        message: 'Medication updated successfully',
      });

      const response = await mockPatientApiService.updatePatientMedication('1', '1', updatedMedication);

      expect(response.data.status).toBe('discontinued');
      expect(response.data.endDate).toBe('2023-12-31');
    });

    it('should handle medication interaction checks', async () => {
      const newMedication = { ...mockMedication, id: undefined, name: 'Conflicting Medication' };

      mockPatientApiService.createPatientMedication.mockRejectedValue({
        status: 409,
        message: 'Medication interaction detected',
        details: {
          interactions: [
            {
              medication1: 'Test Medication',
              medication2: 'Conflicting Medication',
              severity: 'high',
              description: 'May cause dangerous interaction',
            },
          ],
        },
      });

      await expect(mockPatientApiService.createPatientMedication('1', newMedication)).rejects.toMatchObject({
        status: 409,
        message: 'Medication interaction detected',
      });
    });
  });

  describe('Patient Lab Results Management', () => {
    const mockLabResult = {
      id: '1',
      patientId: '1',
      testName: 'Complete Blood Count',
      testDate: '2023-01-01',
      results: {
        'WBC': { value: 7.5, unit: 'K/uL', referenceRange: '4.0-11.0', status: 'normal' },
        'RBC': { value: 4.2, unit: 'M/uL', referenceRange: '4.0-5.5', status: 'normal' },
        'Hemoglobin': { value: 12.5, unit: 'g/dL', referenceRange: '12.0-16.0', status: 'normal' },
      },
      orderedBy: 'doctor-1',
      labName: 'Test Lab',
      status: 'completed',
    };

    it('should fetch patient lab results successfully', async () => {
      const mockLabs = [mockLabResult, { ...mockLabResult, id: '2', testName: 'Basic Metabolic Panel' }];

      mockPatientApiService.getPatientLabs.mockResolvedValue({
        data: mockLabs,
        total: 2,
      });

      const response = await mockPatientApiService.getPatientLabs('1');

      expect(mockPatientApiService.getPatientLabs).toHaveBeenCalledWith('1');
      expect(response.data).toHaveLength(2);
      expect(response.data[0].testName).toBe('Complete Blood Count');
    });

    it('should create lab result successfully', async () => {
      const newLab = { ...mockLabResult, id: undefined };
      const createdLab = { ...mockLabResult, id: '3' };

      mockPatientApiService.createPatientLab.mockResolvedValue({
        data: createdLab,
        message: 'Lab result added successfully',
      });

      const response = await mockPatientApiService.createPatientLab('1', newLab);

      expect(mockPatientApiService.createPatientLab).toHaveBeenCalledWith('1', newLab);
      expect(response.data.id).toBe('3');
    });

    it('should handle abnormal lab values with alerts', async () => {
      const abnormalLab = {
        ...mockLabResult,
        id: undefined,
        results: {
          'WBC': { value: 15.0, unit: 'K/uL', referenceRange: '4.0-11.0', status: 'high' },
        },
      };

      mockPatientApiService.createPatientLab.mockResolvedValue({
        data: { ...abnormalLab, id: '4' },
        message: 'Lab result added successfully',
        alerts: [
          {
            type: 'abnormal_value',
            parameter: 'WBC',
            value: 15.0,
            severity: 'medium',
            message: 'WBC count is elevated',
          },
        ],
      });

      const response = await mockPatientApiService.createPatientLab('1', abnormalLab);

      expect(response.alerts).toBeDefined();
      expect(response.alerts).toHaveLength(1);
      expect(response.alerts[0].type).toBe('abnormal_value');
    });
  });

  describe('Patient Vitals Management', () => {
    const mockVital = {
      id: '1',
      patientId: '1',
      measurementDate: '2023-01-01T10:00:00Z',
      bloodPressure: {
        systolic: 120,
        diastolic: 80,
        unit: 'mmHg',
      },
      heartRate: {
        value: 72,
        unit: 'bpm',
      },
      temperature: {
        value: 98.6,
        unit: 'F',
      },
      weight: {
        value: 70,
        unit: 'kg',
      },
      height: {
        value: 175,
        unit: 'cm',
      },
      recordedBy: 'nurse-1',
    };

    it('should fetch patient vitals successfully', async () => {
      const mockVitals = [mockVital, { ...mockVital, id: '2', heartRate: { value: 75, unit: 'bpm' } }];

      mockPatientApiService.getPatientVitals.mockResolvedValue({
        data: mockVitals,
        total: 2,
      });

      const response = await mockPatientApiService.getPatientVitals('1');

      expect(mockPatientApiService.getPatientVitals).toHaveBeenCalledWith('1');
      expect(response.data).toHaveLength(2);
      expect(response.data[0].heartRate.value).toBe(72);
    });

    it('should create vital signs successfully', async () => {
      const newVital = { ...mockVital, id: undefined };
      const createdVital = { ...mockVital, id: '3' };

      mockPatientApiService.createPatientVital.mockResolvedValue({
        data: createdVital,
        message: 'Vital signs recorded successfully',
      });

      const response = await mockPatientApiService.createPatientVital('1', newVital);

      expect(mockPatientApiService.createPatientVital).toHaveBeenCalledWith('1', newVital);
      expect(response.data.id).toBe('3');
    });

    it('should detect critical vitals and create alerts', async () => {
      const criticalVital = {
        ...mockVital,
        id: undefined,
        bloodPressure: {
          systolic: 200,
          diastolic: 110,
          unit: 'mmHg',
        },
        heartRate: {
          value: 120,
          unit: 'bpm',
        },
      };

      mockPatientApiService.createPatientVital.mockResolvedValue({
        data: { ...criticalVital, id: '4' },
        message: 'Vital signs recorded successfully',
        alerts: [
          {
            type: 'critical_vital',
            parameter: 'blood_pressure',
            value: '200/110',
            severity: 'high',
            message: 'Blood pressure is critically high',
          },
          {
            type: 'abnormal_vital',
            parameter: 'heart_rate',
            value: 120,
            severity: 'medium',
            message: 'Heart rate is elevated',
          },
        ],
      });

      const response = await mockPatientApiService.createPatientVital('1', criticalVital);

      expect(response.alerts).toBeDefined();
      expect(response.alerts).toHaveLength(2);
      expect(response.alerts[0].severity).toBe('high');
    });
  });

  describe('Patient Alerts Management', () => {
    const mockAlert = {
      id: '1',
      patientId: '1',
      type: 'medication_due',
      severity: 'medium',
      title: 'Medication Due',
      message: 'Test Medication is due for administration',
      createdAt: '2023-01-01T10:00:00Z',
      status: 'active',
      metadata: {
        medicationId: '1',
        dueTime: '2023-01-01T12:00:00Z',
      },
    };

    it('should fetch patient alerts successfully', async () => {
      const mockAlerts = [mockAlert, { ...mockAlert, id: '2', type: 'lab_critical' }];

      mockPatientApiService.getPatientAlerts.mockResolvedValue({
        data: mockAlerts,
        total: 2,
      });

      const response = await mockPatientApiService.getPatientAlerts('1');

      expect(mockPatientApiService.getPatientAlerts).toHaveBeenCalledWith('1');
      expect(response.data).toHaveLength(2);
      expect(response.data[0].type).toBe('medication_due');
    });

    it('should create patient alert successfully', async () => {
      const newAlert = { ...mockAlert, id: undefined };
      const createdAlert = { ...mockAlert, id: '3' };

      mockPatientApiService.createPatientAlert.mockResolvedValue({
        data: createdAlert,
        message: 'Alert created successfully',
      });

      const response = await mockPatientApiService.createPatientAlert('1', newAlert);

      expect(mockPatientApiService.createPatientAlert).toHaveBeenCalledWith('1', newAlert);
      expect(response.data.id).toBe('3');
    });

    it('should resolve patient alert successfully', async () => {
      const resolvedAlert = { ...mockAlert, status: 'resolved', resolvedAt: '2023-01-01T14:00:00Z' };

      mockPatientApiService.resolvePatientAlert.mockResolvedValue({
        data: resolvedAlert,
        message: 'Alert resolved successfully',
      });

      const response = await mockPatientApiService.resolvePatientAlert('1', '1');

      expect(mockPatientApiService.resolvePatientAlert).toHaveBeenCalledWith('1', '1');
      expect(response.data.status).toBe('resolved');
    });
  });

  describe('Patient Clinical Data Integration', () => {
    it('should calculate patient risk scores successfully', async () => {
      const mockRiskScores = {
        cardiovascular: {
          score: 15.5,
          risk: 'moderate',
          factors: ['hypertension', 'age'],
        },
        diabetes: {
          score: 8.2,
          risk: 'low',
          factors: ['family_history'],
        },
        overall: {
          score: 12.3,
          risk: 'moderate',
        },
      };

      mockPatientApiService.calculatePatientRisk.mockResolvedValue({
        data: mockRiskScores,
        calculatedAt: '2023-01-01T10:00:00Z',
      });

      const response = await mockPatientApiService.calculatePatientRisk('1');

      expect(mockPatientApiService.calculatePatientRisk).toHaveBeenCalledWith('1');
      expect(response.data.cardiovascular.risk).toBe('moderate');
      expect(response.data.overall.score).toBe(12.3);
    });

    it('should fetch patient charts data successfully', async () => {
      const mockChartsData = {
        vitals: {
          bloodPressure: [
            { date: '2023-01-01', systolic: 120, diastolic: 80 },
            { date: '2023-01-02', systolic: 125, diastolic: 82 },
          ],
          heartRate: [
            { date: '2023-01-01', value: 72 },
            { date: '2023-01-02', value: 75 },
          ],
        },
        labs: {
          glucose: [
            { date: '2023-01-01', value: 95 },
            { date: '2023-01-15', value: 98 },
          ],
        },
      };

      mockPatientApiService.getPatientCharts.mockResolvedValue({
        data: mockChartsData,
        dateRange: {
          start: '2023-01-01',
          end: '2023-01-31',
        },
      });

      const response = await mockPatientApiService.getPatientCharts('1', {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        dataTypes: ['vitals', 'labs'],
      });

      expect(mockPatientApiService.getPatientCharts).toHaveBeenCalledWith('1', expect.any(Object));
      expect(response.data.vitals.bloodPressure).toHaveLength(2);
      expect(response.data.labs.glucose).toHaveLength(2);
    });

    it('should schedule patient exam successfully', async () => {
      const examData = {
        type: 'annual_checkup',
        scheduledDate: '2023-06-01T09:00:00Z',
        duration: 60,
        providerId: 'doctor-1',
        notes: 'Annual physical examination',
      };

      const scheduledExam = {
        ...examData,
        id: '1',
        patientId: '1',
        status: 'scheduled',
        createdAt: '2023-01-01T10:00:00Z',
      };

      mockPatientApiService.schedulePatientExam.mockResolvedValue({
        data: scheduledExam,
        message: 'Exam scheduled successfully',
      });

      const response = await mockPatientApiService.schedulePatientExam('1', examData);

      expect(mockPatientApiService.schedulePatientExam).toHaveBeenCalledWith('1', examData);
      expect(response.data.id).toBe('1');
      expect(response.data.status).toBe('scheduled');
    });
  });

  describe('API Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockPatientApiService.getPatients.mockRejectedValue(new Error('Network error'));

      await expect(mockPatientApiService.getPatients()).rejects.toThrow('Network error');
    });

    it('should handle authentication errors', async () => {
      mockPatientApiService.getPatient.mockRejectedValue({
        status: 401,
        message: 'Unauthorized',
      });

      await expect(mockPatientApiService.getPatient('1')).rejects.toMatchObject({
        status: 401,
        message: 'Unauthorized',
      });
    });

    it('should handle rate limiting errors', async () => {
      mockPatientApiService.createPatient.mockRejectedValue({
        status: 429,
        message: 'Too many requests',
        retryAfter: 60,
      });

      await expect(mockPatientApiService.createPatient({})).rejects.toMatchObject({
        status: 429,
        message: 'Too many requests',
      });
    });

    it('should handle server errors', async () => {
      mockPatientApiService.getPatients.mockRejectedValue({
        status: 500,
        message: 'Internal server error',
      });

      await expect(mockPatientApiService.getPatients()).rejects.toMatchObject({
        status: 500,
        message: 'Internal server error',
      });
    });
  });

  describe('API Performance Tests', () => {
    it('should handle concurrent patient requests efficiently', async () => {
      const patientIds = ['1', '2', '3', '4', '5'];
      
      // Mock responses for all patient requests
      patientIds.forEach(id => {
        mockPatientApiService.getPatient.mockResolvedValueOnce({
          data: { ...mockPatient, id, name: `Patient ${id}` },
        });
      });

      const startTime = Date.now();
      
      // Make concurrent requests
      const promises = patientIds.map(id => mockPatientApiService.getPatient(id));
      const responses = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(responses).toHaveLength(5);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(mockPatientApiService.getPatient).toHaveBeenCalledTimes(5);
    });

    it('should handle large patient datasets efficiently', async () => {
      const largePatientList = Array.from({ length: 100 }, (_, i) => ({
        ...mockPatient,
        id: `patient-${i}`,
        name: `Patient ${i}`,
      }));

      mockPatientApiService.getPatients.mockResolvedValue({
        data: largePatientList,
        total: 100,
        page: 1,
        pageSize: 100,
      });

      const startTime = Date.now();
      const response = await mockPatientApiService.getPatients({ pageSize: 100 });
      const endTime = Date.now();

      expect(response.data).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});