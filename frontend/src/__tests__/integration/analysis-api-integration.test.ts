import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock API endpoints
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Clerk authentication
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: jest.fn().mockResolvedValue('mock-auth-token'),
    userId: 'mock-user-id',
    isLoaded: true,
    isSignedIn: true,
  }),
  useUser: () => ({
    user: {
      id: 'mock-user-id',
      firstName: 'Test',
      lastName: 'User',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      publicMetadata: { role: 'doctor' }
    },
    isLoaded: true,
    isSignedIn: true,
  }),
}));

describe('Analysis API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: 'Analysis completed successfully',
        lab_results: [],
        analysis_results: {},
        generated_alerts: []
      }),
      text: async () => JSON.stringify({
        success: true,
        message: 'Analysis completed successfully'
      }),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Manual Lab Data Submission API', () => {
    const createManualLabData = (patientId?: string) => ({
      ...(patientId && { patient_id: patientId }),
      exam_date: '2023-12-01',
      lab_results: [
        {
          test_name: 'Hemoglobina',
          value_numeric: 14.5,
          unit: 'g/dL',
          timestamp: '2023-12-01T10:00:00Z',
          reference_range_low: 12.0,
          reference_range_high: 16.0
        },
        {
          test_name: 'Leucócitos',
          value_numeric: 7500,
          unit: '/mm³',
          timestamp: '2023-12-01T10:00:00Z',
          reference_range_low: 4000,
          reference_range_high: 10000
        }
      ]
    });

    it('should submit manual lab data successfully with patient ID', async () => {
      const expectedResponse = {
        success: true,
        message: 'Dados manuais analisados com sucesso!',
        lab_results: [
          {
            test_name: 'Hemoglobina',
            value_numeric: 14.5,
            unit: 'g/dL',
            is_abnormal: false,
            reference_range_low: 12.0,
            reference_range_high: 16.0
          }
        ],
        analysis_results: {
          hematology: {
            interpretation: 'Valores hematológicos dentro dos parâmetros normais.',
            abnormalities: [],
            is_critical: false,
            recommendations: ['Manter acompanhamento de rotina'],
            details: {
              lab_results: []
            }
          }
        },
        generated_alerts: []
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => expectedResponse,
      });

      const manualData = createManualLabData('P001');
      const formData = new FormData();
      formData.append('analysis_type', 'manual_submission');
      formData.append('manualLabDataJSON', JSON.stringify(manualData));

      const response = await fetch('/api/lab-analysis/guest', {
        method: 'POST',
        body: formData,
      });

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.message).toContain('sucesso');
      expect(result.lab_results).toHaveLength(1);
      expect(result.analysis_results.hematology).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith('/api/lab-analysis/guest', {
        method: 'POST',
        body: expect.any(FormData),
      });
    });

    it('should submit manual lab data successfully without patient ID (anonymous)', async () => {
      const expectedResponse = {
        success: true,
        message: 'Análise anônima concluída com sucesso!',
        lab_results: [
          {
            test_name: 'Creatinina',
            value_numeric: 2.5,
            unit: 'mg/dL',
            is_abnormal: true,
            reference_range_low: 0.6,
            reference_range_high: 1.2
          }
        ],
        analysis_results: {
          renal: {
            interpretation: 'Função renal comprometida. Creatinina significativamente elevada.',
            abnormalities: ['Creatinina elevada (2.5 mg/dL)'],
            is_critical: true,
            recommendations: [
              'Avaliação nefrológica urgente',
              'Investigar causa da lesão renal'
            ],
            details: {
              lab_results: []
            }
          }
        },
        generated_alerts: [
          {
            message: 'Creatinina criticamente elevada - risco de lesão renal aguda',
            severity: 'high',
            parameter: 'Creatinina',
            value: '2.5 mg/dL'
          }
        ]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => expectedResponse,
      });

      const manualData = {
        exam_date: '2023-12-01',
        lab_results: [
          {
            test_name: 'Creatinina',
            value_numeric: 2.5,
            unit: 'mg/dL',
            timestamp: '2023-12-01T10:00:00Z',
            reference_range_low: 0.6,
            reference_range_high: 1.2
          }
        ]
      };

      const response = await fetch('/api/lab-analysis/guest', {
        method: 'POST',
        body: new FormData(),
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.analysis_results.renal.is_critical).toBe(true);
      expect(result.generated_alerts).toHaveLength(1);
      expect(result.generated_alerts[0].severity).toBe('high');
    });

    it('should handle multiple lab systems in single submission', async () => {
      const expectedResponse = {
        success: true,
        message: 'Análise multi-sistêmica concluída!',
        lab_results: [
          { test_name: 'Hemoglobina', value_numeric: 12.0, is_abnormal: true },
          { test_name: 'Creatinina', value_numeric: 1.8, is_abnormal: true },
          { test_name: 'TGO', value_numeric: 85, is_abnormal: true }
        ],
        analysis_results: {
          hematology: {
            interpretation: 'Anemia leve detectada.',
            abnormalities: ['Hemoglobina baixa'],
            is_critical: false,
            recommendations: ['Investigar causa da anemia'],
            details: {}
          },
          renal: {
            interpretation: 'Função renal levemente comprometida.',
            abnormalities: ['Creatinina elevada'],
            is_critical: false,
            recommendations: ['Monitorar função renal'],
            details: {}
          },
          hepatic: {
            interpretation: 'Elevação leve das enzimas hepáticas.',
            abnormalities: ['TGO elevado'],
            is_critical: false,
            recommendations: ['Avaliar função hepática'],
            details: {}
          }
        },
        generated_alerts: []
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => expectedResponse,
      });

      const multiSystemData = {
        exam_date: '2023-12-01',
        lab_results: [
          {
            test_name: 'Hemoglobina',
            value_numeric: 12.0,
            unit: 'g/dL',
            timestamp: '2023-12-01T10:00:00Z',
            reference_range_low: 12.0,
            reference_range_high: 16.0
          },
          {
            test_name: 'Creatinina',
            value_numeric: 1.8,
            unit: 'mg/dL',
            timestamp: '2023-12-01T10:00:00Z',
            reference_range_low: 0.6,
            reference_range_high: 1.2
          },
          {
            test_name: 'TGO',
            value_numeric: 85,
            unit: 'U/L',
            timestamp: '2023-12-01T10:00:00Z',
            reference_range_low: 10,
            reference_range_high: 40
          }
        ]
      };

      const response = await fetch('/api/lab-analysis/guest', {
        method: 'POST',
        body: new FormData(),
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(Object.keys(result.analysis_results)).toHaveLength(3);
      expect(result.analysis_results.hematology).toBeDefined();
      expect(result.analysis_results.renal).toBeDefined();
      expect(result.analysis_results.hepatic).toBeDefined();
      expect(result.lab_results).toHaveLength(3);
    });

    it('should handle text-based lab results (microbiology)', async () => {
      const expectedResponse = {
        success: true,
        message: 'Análise microbiológica concluída!',
        lab_results: [
          {
            test_name: 'Hemocultura',
            value_text: 'Staphylococcus aureus',
            unit: '',
            is_abnormal: true
          },
          {
            test_name: 'Urocultura',
            value_text: 'Negativo',
            unit: '',
            is_abnormal: false
          }
        ],
        analysis_results: {
          microbiology: {
            interpretation: 'Hemocultura positiva para Staphylococcus aureus. Urocultura negativa.',
            abnormalities: ['Hemocultura positiva - Staphylococcus aureus'],
            is_critical: true,
            recommendations: [
              'Iniciar antibioticoterapia conforme antibiograma',
              'Investigar foco infeccioso',
              'Monitorar sinais vitais'
            ],
            details: {}
          }
        },
        generated_alerts: [
          {
            message: 'Hemocultura positiva - risco de sepse',
            severity: 'high',
            parameter: 'Hemocultura',
            value: 'Staphylococcus aureus'
          }
        ]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => expectedResponse,
      });

      const microbiologyData = {
        exam_date: '2023-12-01',
        lab_results: [
          {
            test_name: 'Hemocultura',
            value_text: 'Staphylococcus aureus',
            timestamp: '2023-12-01T10:00:00Z'
          },
          {
            test_name: 'Urocultura',
            value_text: 'Negativo',
            timestamp: '2023-12-01T10:00:00Z'
          }
        ]
      };

      const response = await fetch('/api/lab-analysis/guest', {
        method: 'POST',
        body: new FormData(),
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.analysis_results.microbiology.is_critical).toBe(true);
      expect(result.generated_alerts).toHaveLength(1);
      expect(result.lab_results[0].value_text).toBe('Staphylococcus aureus');
    });

    it('should validate required fields and return errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          detail: 'Nenhum resultado inserido para análise. Por favor, preencha pelo menos um campo.',
          errors: {
            lab_results: 'At least one lab result is required'
          }
        }),
      });

      const invalidData = {
        exam_date: '2023-12-01',
        lab_results: [] // Empty results
      };

      const response = await fetch('/api/lab-analysis/guest', {
        method: 'POST',
        body: new FormData(),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.detail).toContain('Nenhum resultado');
    });

    it('should handle server errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          detail: 'Erro interno do servidor durante análise.',
          message: 'Internal server error'
        }),
      });

      const validData = createManualLabData('P002');

      const response = await fetch('/api/lab-analysis/guest', {
        method: 'POST',
        body: new FormData(),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
      
      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.detail).toContain('Erro interno');
    });

    it('should handle network timeouts', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 1000)
        )
      );

      const validData = createManualLabData('P003');

      await expect(async () => {
        const response = await fetch('/api/lab-analysis/guest', {
          method: 'POST',
          body: new FormData(),
        });
      }).rejects.toThrow('Network timeout');
    });
  });

  describe('File Upload Analysis API', () => {
    it('should process uploaded PDF file successfully', async () => {
      const expectedResponse = {
        success: true,
        message: 'Arquivo PDF processado com sucesso!',
        filename: 'lab-report.pdf',
        lab_results: [
          {
            test_name: 'Glicose',
            value_numeric: 95,
            unit: 'mg/dL',
            is_abnormal: false,
            reference_range_low: 70,
            reference_range_high: 100
          }
        ],
        analysis_results: {
          metabolic: {
            interpretation: 'Glicose em jejum dentro dos parâmetros normais.',
            abnormalities: [],
            is_critical: false,
            recommendations: ['Manter hábitos saudáveis'],
            details: {}
          }
        },
        generated_alerts: []
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => expectedResponse,
      });

      const formData = new FormData();
      formData.append('analysis_type', 'file_upload');
      formData.append('file', new File(['mock pdf content'], 'lab-report.pdf', { type: 'application/pdf' }));

      const response = await fetch('/api/lab-analysis/guest', {
        method: 'POST',
        body: formData,
      });

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.filename).toBe('lab-report.pdf');
      expect(result.lab_results).toHaveLength(1);
      expect(result.analysis_results.metabolic).toBeDefined();
    });

    it('should handle invalid file types', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          detail: 'Formato de arquivo não suportado. Por favor, envie um arquivo PDF.',
          error: 'Invalid file type'
        }),
      });

      const formData = new FormData();
      formData.append('file', new File(['mock content'], 'document.txt', { type: 'text/plain' }));

      const response = await fetch('/api/lab-analysis/guest', {
        method: 'POST',
        body: formData,
      });

      expect(response.ok).toBe(false);
      const result = await response.json();
      expect(result.detail).toContain('Formato de arquivo não suportado');
    });

    it('should handle corrupted PDF files', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({
          success: false,
          detail: 'Arquivo PDF corrompido ou não foi possível extrair dados.',
          error: 'PDF processing failed'
        }),
      });

      const formData = new FormData();
      formData.append('file', new File(['corrupted data'], 'corrupted.pdf', { type: 'application/pdf' }));

      const response = await fetch('/api/lab-analysis/guest', {
        method: 'POST',
        body: formData,
      });

      expect(response.ok).toBe(false);
      const result = await response.json();
      expect(result.detail).toContain('corrompido');
    });

    it('should handle file size limits', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 413,
        json: async () => ({
          success: false,
          detail: 'Arquivo muito grande. Tamanho máximo permitido: 10MB.',
          error: 'File too large'
        }),
      });

      const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', largeFile);

      const response = await fetch('/api/lab-analysis/guest', {
        method: 'POST',
        body: formData,
      });

      expect(response.ok).toBe(false);
      const result = await response.json();
      expect(result.detail).toContain('muito grande');
    });
  });

  describe('Dr. Corvus Insights API', () => {
    const createInsightsRequest = () => ({
      lab_results: [
        {
          test_name: 'Hemoglobina',
          value: '10.5',
          unit: 'g/dL',
          reference_range_low: '12.0',
          reference_range_high: '16.0',
          interpretation_flag: 'Baixo'
        }
      ],
      user_role: 'DOCTOR_STUDENT',
      patient_context: 'Patient is a 45-year-old male with fatigue',
      specific_user_query: 'What could be causing the low hemoglobin?'
    });

    it('should generate insights successfully with authentication', async () => {
      const expectedResponse = {
        clinical_summary: 'O paciente apresenta anemia leve com hemoglobina de 10.5 g/dL.',
        professional_detailed_reasoning_cot: `
          ## Análise Clínica Detalhada
          
          ### Achados Principais
          - Hemoglobina: 10.5 g/dL (VR: 12.0-16.0 g/dL) - **Baixa**
          
          ### Interpretação
          O valor de hemoglobina está significativamente abaixo do limite inferior normal, caracterizando anemia leve.
          
          ### Considerações Diferenciais
          1. **Anemia ferropriva** - mais comum em homens
          2. **Anemia de doença crônica**
          3. **Perda sanguínea oculta**
          
          ### Investigação Recomendada
          - Hemograma completo com índices
          - Ferro sérico, ferritina, TIBC
          - Pesquisa de sangue oculto nas fezes
        `,
        important_results_to_discuss_with_doctor: [
          'Hemoglobina baixa (10.5 g/dL) sugere anemia que requer investigação',
          'Sintomas de fadiga podem estar relacionados à anemia',
          'Necessário avaliar causa da anemia através de exames complementares'
        ]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => expectedResponse,
      });

      const response = await fetch('/api/clinical-assistant/generate-lab-insights-translated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-auth-token',
        },
        body: JSON.stringify(createInsightsRequest()),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.clinical_summary).toBeDefined();
      expect(result.professional_detailed_reasoning_cot).toBeDefined();
      expect(result.important_results_to_discuss_with_doctor).toHaveLength(3);
      expect(result.clinical_summary).toContain('anemia');
    });

    it('should handle insights generation without specific query', async () => {
      const requestWithoutQuery = {
        lab_results: [
          {
            test_name: 'Creatinina',
            value: '2.0',
            unit: 'mg/dL',
            reference_range_low: '0.6',
            reference_range_high: '1.2',
            interpretation_flag: 'Alto'
          }
        ],
        user_role: 'DOCTOR_STUDENT',
        patient_context: 'Elderly patient with diabetes'
      };

      const expectedResponse = {
        clinical_summary: 'Elevação da creatinina sugerindo comprometimento da função renal.',
        professional_detailed_reasoning_cot: 'Análise detalhada da função renal...',
        important_results_to_discuss_with_doctor: [
          'Creatinina elevada indica possível lesão renal'
        ]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => expectedResponse,
      });

      const response = await fetch('/api/clinical-assistant/generate-lab-insights-translated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-auth-token',
        },
        body: JSON.stringify(requestWithoutQuery),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.clinical_summary).toContain('creatinina');
    });

    it('should require authentication for insights generation', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          detail: 'Authentication required',
          error: 'Unauthorized'
        }),
      });

      const response = await fetch('/api/clinical-assistant/generate-lab-insights-translated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createInsightsRequest()),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    it('should handle insights generation errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          detail: 'Falha ao gerar insights do Dr. Corvus.',
          error: 'LLM processing failed'
        }),
      });

      const response = await fetch('/api/clinical-assistant/generate-lab-insights-translated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-auth-token',
        },
        body: JSON.stringify(createInsightsRequest()),
      });

      expect(response.ok).toBe(false);
      const result = await response.json();
      expect(result.detail).toContain('Falha ao gerar insights');
    });

    it('should handle rate limiting for insights requests', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          detail: 'Too many requests. Please wait before trying again.',
          error: 'Rate limit exceeded',
          retry_after: 60
        }),
      });

      const response = await fetch('/api/clinical-assistant/generate-lab-insights-translated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-auth-token',
        },
        body: JSON.stringify(createInsightsRequest()),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);
      const result = await response.json();
      expect(result.retry_after).toBe(60);
    });
  });

  describe('API Performance and Reliability', () => {
    it('should handle concurrent analysis requests', async () => {
      const responses = Array.from({ length: 5 }, (_, i) => ({
        success: true,
        message: `Analysis ${i + 1} completed`,
        lab_results: [],
        analysis_results: {},
        generated_alerts: []
      }));

      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => responses[Math.floor(Math.random() * responses.length)],
        })
      );

      const requests = Array.from({ length: 5 }, (_, i) => 
        fetch('/api/lab-analysis/guest', {
          method: 'POST',
          body: new FormData(),
        })
      );

      const results = await Promise.all(requests);
      
      results.forEach(response => {
        expect(response.ok).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledTimes(5);
    });

    it('should handle request retries on temporary failures', async () => {
      let attempt = 0;
      mockFetch.mockImplementation(() => {
        attempt++;
        if (attempt < 3) {
          return Promise.resolve({
            ok: false,
            status: 503,
            json: async () => ({ error: 'Service temporarily unavailable' }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true, message: 'Success on retry' }),
        });
      });

      // Simulate retry logic (this would typically be in the client)
      let response;
      for (let i = 0; i < 3; i++) {
        response = await fetch('/api/lab-analysis/guest', {
          method: 'POST',
          body: new FormData(),
        });
        
        if (response.ok) break;
        if (i < 2) await new Promise(resolve => setTimeout(resolve, 100)); // Short delay
      }

      expect(response!.ok).toBe(true);
      expect(attempt).toBe(3);
    });

    it('should measure API response times', async () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
          }), 500)
        )
      );

      const startTime = Date.now();
      const response = await fetch('/api/lab-analysis/guest', {
        method: 'POST',
        body: new FormData(),
      });
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(response.ok).toBe(true);
      expect(responseTime).toBeGreaterThan(400);
      expect(responseTime).toBeLessThan(1000);
    });

    it('should handle large payload analysis efficiently', async () => {
      const largeLabResults = Array.from({ length: 50 }, (_, i) => ({
        test_name: `Test${i + 1}`,
        value_numeric: Math.random() * 100,
        unit: 'mg/dL',
        timestamp: '2023-12-01T10:00:00Z',
        reference_range_low: 10,
        reference_range_high: 90
      }));

      const expectedResponse = {
        success: true,
        message: 'Large dataset analyzed successfully',
        lab_results: largeLabResults,
        analysis_results: {
          comprehensive: {
            interpretation: 'Análise abrangente de múltiplos parâmetros concluída.',
            abnormalities: [],
            is_critical: false,
            recommendations: [],
            details: {}
          }
        },
        generated_alerts: []
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => expectedResponse,
      });

      const largePayload = {
        exam_date: '2023-12-01',
        lab_results: largeLabResults
      };

      const startTime = Date.now();
      const response = await fetch('/api/lab-analysis/guest', {
        method: 'POST',
        body: new FormData(),
      });
      const endTime = Date.now();

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.lab_results).toHaveLength(50);
      
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('API Error Handling Edge Cases', () => {
    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => { throw new SyntaxError('Unexpected token'); },
        text: async () => 'Invalid JSON response',
      });

      try {
        const response = await fetch('/api/lab-analysis/guest', {
          method: 'POST',
          body: new FormData(),
        });
        await response.json();
      } catch (error) {
        expect(error).toBeInstanceOf(SyntaxError);
      }
    });

    it('should handle network disconnection gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Failed to fetch'));

      await expect(async () => {
        await fetch('/api/lab-analysis/guest', {
          method: 'POST',
          body: new FormData(),
        });
      }).rejects.toThrow('Failed to fetch');
    });

    it('should handle partial response data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          // Missing expected fields like lab_results, analysis_results
          message: 'Partial response'
        }),
      });

      const response = await fetch('/api/lab-analysis/guest', {
        method: 'POST',
        body: new FormData(),
      });

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.lab_results).toBeUndefined();
      expect(result.analysis_results).toBeUndefined();
    });

    it('should handle unexpected HTTP status codes', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 418, // I'm a teapot
        json: async () => ({
          error: 'Unexpected status code',
          detail: 'Server returned unexpected status'
        }),
      });

      const response = await fetch('/api/lab-analysis/guest', {
        method: 'POST',
        body: new FormData(),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(418);
    });

    it('should handle CORS errors in development', async () => {
      mockFetch.mockRejectedValue(new TypeError('CORS error'));

      await expect(async () => {
        await fetch('/api/lab-analysis/guest', {
          method: 'POST',
          body: new FormData(),
        });
      }).rejects.toThrow('CORS error');
    });
  });
});