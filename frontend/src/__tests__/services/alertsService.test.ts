import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { alertsService } from '@/services/alertsService';

// Mock API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Mock data
const mockPatientAlerts = {
  alerts: [
    {
      category: 'renal',
      parameter: 'creatinina',
      message: 'Creatinina elevada',
      value: '2.5',
      reference: '0.7-1.2',
      severity: 'severe',
      interpretation: 'Possível lesão renal aguda',
      recommendation: 'Monitorar função renal e ajustar medicações',
      date: '2023-04-15T10:30:00Z'
    },
    {
      category: 'hematologia',
      parameter: 'hemoglobina',
      message: 'Hemoglobina baixa',
      value: '8.5',
      reference: '12-16',
      severity: 'moderate',
      interpretation: 'Anemia moderada',
      recommendation: 'Avaliar necessidade de transfusão',
      date: '2023-04-15T10:30:00Z'
    }
  ],
  count: 2,
  patient_id: 'patient123'
};

const mockAlertSummary = {
  by_severity: {
    critical: 3,
    severe: 5,
    moderate: 8,
    warning: 10,
    info: 6,
    normal: 45
  },
  by_category: {
    renal: 12,
    hematologia: 15,
    hepatico: 8,
    respiratorio: 14,
    cardiaco: 10,
    metabolico: 18
  },
  total: 77,
  patient_id: 'patient123'
};

const mockAlertHistory = {
  history: [
    {
      date: '2023-04-15',
      alerts_count: 12,
      by_severity: {
        critical: 1,
        severe: 2,
        moderate: 3,
        warning: 4,
        info: 1,
        normal: 1
      },
      critical_alerts: [
        {
          category: 'cardiaco',
          parameter: 'troponina',
          message: 'Troponina elevada',
          severity: 'critical'
        }
      ]
    },
    {
      date: '2023-04-14',
      alerts_count: 10,
      by_severity: {
        critical: 0,
        severe: 1,
        moderate: 2,
        warning: 5,
        info: 1,
        normal: 1
      },
      critical_alerts: []
    }
  ],
  days_analyzed: 30,
  patient_id: 'patient123'
};

// Setup mock server
const server = setupServer(
  // Mock getPatientAlerts endpoint
  rest.get(`${API_URL}/api/alerts/patient/patient123`, (req, res, ctx) => {
    const severity = req.url.searchParams.get('severity');
    
    if (severity === 'severe') {
      const filteredAlerts = mockPatientAlerts.alerts.filter(a => a.severity === 'severe');
      return res(ctx.json({
        alerts: filteredAlerts,
        count: filteredAlerts.length,
        patient_id: 'patient123'
      }));
    }
    
    return res(ctx.json(mockPatientAlerts));
  }),
  
  // Mock getAlertSummary endpoint
  rest.get(`${API_URL}/api/alerts/summary/patient123`, (req, res, ctx) => {
    return res(ctx.json(mockAlertSummary));
  }),
  
  // Mock getAlertHistory endpoint
  rest.get(`${API_URL}/api/alerts/history/patient123`, (req, res, ctx) => {
    const days = req.url.searchParams.get('days');
    const category = req.url.searchParams.get('category');
    
    if (days === '7') {
      return res(ctx.json({
        ...mockAlertHistory,
        days_analyzed: 7
      }));
    }
    
    if (category === 'renal') {
      return res(ctx.json({
        ...mockAlertHistory,
        history: mockAlertHistory.history.map(day => ({
          ...day,
          alerts_count: Math.round(day.alerts_count / 2),
          critical_alerts: day.critical_alerts.filter(a => a.category === 'renal')
        }))
      }));
    }
    
    return res(ctx.json(mockAlertHistory));
  })
);

// Start server before tests
beforeAll(() => server.listen());

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Close server after all tests
afterAll(() => server.close());

describe('alertsService', () => {
  describe('getPatientAlerts', () => {
    it('fetches all alerts for a patient', async () => {
      const result = await alertsService.getPatientAlerts('patient123');
      
      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('patient_id');
      expect(result.alerts.length).toBe(2);
      expect(result.patient_id).toBe('patient123');
    });
    
    it('fetches filtered alerts by severity', async () => {
      const result = await alertsService.getPatientAlerts('patient123', { severity: 'severe' });
      
      expect(result.alerts.length).toBe(1);
      expect(result.alerts[0].severity).toBe('severe');
      expect(result.alerts[0].category).toBe('renal');
    });
    
    it('handles API errors', async () => {
      // Setup server to return an error for this specific test
      server.use(
        rest.get(`${API_URL}/api/alerts/patient/patient123`, (req, res, ctx) => {
          return res(ctx.status(500));
        })
      );
      
      await expect(alertsService.getPatientAlerts('patient123')).rejects.toThrow();
    });
  });
  
  describe('getAlertSummary', () => {
    it('fetches alert summary for a patient', async () => {
      const result = await alertsService.getAlertSummary('patient123');
      
      expect(result).toHaveProperty('by_severity');
      expect(result).toHaveProperty('by_category');
      expect(result).toHaveProperty('total');
      expect(result.total).toBe(77);
      expect(result.by_severity.critical).toBe(3);
      expect(result.by_category.renal).toBe(12);
    });
  });
  
  describe('getAlertHistory', () => {
    it('fetches alert history for a patient', async () => {
      const result = await alertsService.getAlertHistory('patient123');
      
      expect(result).toHaveProperty('history');
      expect(result).toHaveProperty('days_analyzed');
      expect(result.history.length).toBe(2);
      expect(result.history[0].date).toBe('2023-04-15');
      expect(result.history[0].alerts_count).toBe(12);
    });
    
    it('fetches alert history with custom days range', async () => {
      // Setup specific handler for this test
      server.use(
        rest.get(`${API_URL}/api/alerts/history/patient123`, (req, res, ctx) => {
          const days = req.url.searchParams.get('days');
          if (days === '7') {
            return res(ctx.json({
              ...mockAlertHistory,
              days_analyzed: 7
            }));
          }
          return res(ctx.json(mockAlertHistory));
        })
      );
      
      const result = await alertsService.getAlertHistory('patient123', 7);
      
      expect(result.days_analyzed).toBe(7);
    });
    
    it('fetches alert history filtered by category', async () => {
      const result = await alertsService.getAlertHistory('patient123', 30, 'renal');
      
      // The mock implementation halves the alert count
      expect(result.history[0].alerts_count).toBe(6);
      // All critical alerts should be from renal category
      result.history[0].critical_alerts.forEach(alert => {
        expect(alert.category).toBe('renal');
      });
    });
    
    it('allows filtering alert history by days', async () => {
      // Setup specific handler for this test
      server.use(
        rest.get(`${API_URL}/api/alerts/history/patient123`, (req, res, ctx) => {
          const days = req.url.searchParams.get('days');
          if (days === '7') {
            return res(ctx.json({
              ...mockAlertHistory,
              days_analyzed: 7
            }));
          }
          return res(ctx.json(mockAlertHistory));
        })
      );
      
      // Expliclty use a history with fewer days
      await expect(alertsService.getAlertHistory('patient123', 7)).resolves.toHaveProperty('days_analyzed', 7);
    });
    
    it('allows specifying number of days for history', async () => {
      const result = await alertsService.getAlertHistory('patient123', 7);
      
      expect(result).toHaveProperty('days_analyzed', 7);
      expect(result).toHaveProperty('history');
      expect(result.history.length).toBe(2);
    });
  });
}); 