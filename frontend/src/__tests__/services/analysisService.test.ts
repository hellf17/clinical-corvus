import { rest } from 'msw';
import { setupServer } from 'msw/node';
import analysisService from '@/services/analysisService';
import { API_BASE_URL } from '@/config';

// Mock server setup
const server = setupServer(
  // Mock BloodGas endpoint
  rest.post(`${API_BASE_URL}/blood_gas`, (req, res, ctx) => {
    return res(ctx.json({
      interpretation: 'Acidose respiratória parcialmente compensada',
      abnormalities: ['Hipercapnia', 'Acidemia'],
      is_critical: false,
      recommendations: ['Avalie a função respiratória', 'Considere suporte ventilatório'],
      details: {
        ph_analysis: 'Baixo',
        co2_analysis: 'Elevado'
      },
      acid_base_status: 'Acidótico',
      compensation_status: 'Parcialmente compensado',
      oxygenation_status: 'Adequado'
    }));
  }),
  
  // Mock Electrolytes endpoint
  rest.post(`${API_BASE_URL}/electrolytes`, (req, res, ctx) => {
    return res(ctx.json({
      interpretation: 'Hipocalemia leve',
      abnormalities: ['Potássio baixo'],
      is_critical: false,
      recommendations: ['Reposição de potássio IV lenta'],
      details: {
        sodium: 'Normal',
        potassium: 'Baixo',
        chloride: 'Normal'
      }
    }));
  }),
  
  // Mock Hematology endpoint
  rest.post(`${API_BASE_URL}/hematology`, (req, res, ctx) => {
    return res(ctx.json({
      interpretation: 'Anemia moderada',
      abnormalities: ['Hemoglobina baixa', 'Plaquetas levemente reduzidas'],
      is_critical: false,
      recommendations: ['Investigar causa da anemia'],
      details: {
        hemoglobin_status: 'Baixo',
        wbc_status: 'Normal',
        platelet_status: 'Levemente reduzido'
      }
    }));
  }),
  
  // Mock Renal endpoint
  rest.post(`${API_BASE_URL}/renal`, (req, res, ctx) => {
    return res(ctx.json({
      interpretation: 'Lesão renal aguda estágio 2',
      abnormalities: ['Creatinina elevada', 'Ureia elevada'],
      is_critical: false,
      recommendations: ['Monitorar balanço hídrico', 'Ajustar doses de medicamentos'],
      details: {
        creatinine_status: 'Elevado',
        urea_status: 'Elevado',
        gfr_status: 'Reduzido'
      }
    }));
  }),
  
  // Mock Hepatic endpoint
  rest.post(`${API_BASE_URL}/hepatic`, (req, res, ctx) => {
    return res(ctx.json({
      interpretation: 'Colestase sem sinais de insuficiência hepática',
      abnormalities: ['Fosfatase alcalina elevada', 'Bilirrubina total elevada'],
      is_critical: false,
      recommendations: ['Investigar causas de colestase'],
      details: {
        alt_status: 'Normal',
        ast_status: 'Levemente elevado',
        bilirubin_status: 'Elevado',
        albumin_status: 'Normal'
      }
    }));
  }),
  
  // Mock Cardiac endpoint
  rest.post(`${API_BASE_URL}/cardiac`, (req, res, ctx) => {
    return res(ctx.json({
      interpretation: 'Elevação de troponina sugestiva de lesão miocárdica',
      abnormalities: ['Troponina I elevada'],
      is_critical: true,
      recommendations: ['Realizar ECG', 'Considerar avaliação cardiológica urgente'],
      details: {
        troponin_status: 'Significativamente elevado',
        bnp_status: 'Levemente elevado'
      }
    }));
  }),
  
  // Mock Microbiology endpoint
  rest.post(`${API_BASE_URL}/microbiology`, (req, res, ctx) => {
    return res(ctx.json({
      interpretation: 'Provável infecção por Gram-negativos',
      abnormalities: ['Cultura positiva em amostra respiratória'],
      is_critical: true,
      recommendations: ['Iniciar antibioticoterapia empírica', 'Aguardar antibiograma'],
      details: {
        culture_result: 'Positivo',
        organism: 'Klebsiella pneumoniae',
        sensitivity_pending: true
      }
    }));
  }),
  
  // Mock Metabolic endpoint
  rest.post(`${API_BASE_URL}/metabolic`, (req, res, ctx) => {
    return res(ctx.json({
      interpretation: 'Hiperglicemia',
      abnormalities: ['Glicose elevada'],
      is_critical: false,
      recommendations: ['Avaliar necessidade de insulina'],
      details: {
        glucose_status: 'Elevado',
        hba1c_status: 'Não disponível'
      }
    }));
  }),
  
  // Mock SOFA score endpoint
  rest.post(`${API_BASE_URL}/score/sofa`, (req, res, ctx) => {
    return res(ctx.json({
      score: 8,
      category: 'SOFA',
      mortality_risk: 40,
      interpretation: 'Disfunção orgânica múltipla significativa',
      component_scores: {
        respiratory: 2,
        coagulation: 1,
        liver: 1,
        cardiovascular: 2,
        cns: 1,
        renal: 1
      },
      recommendations: ['Monitoramento intensivo', 'Avaliação frequente dos parâmetros'],
      abnormalities: ['Insuficiência respiratória moderada', 'Hipotensão'],
      is_critical: true,
      details: {
        respiratory_details: 'PaO2/FiO2 = 250',
        cardiovascular_details: 'Requer vasopressores'
      }
    }));
  })
);

// Start mock server before tests
beforeAll(() => server.listen());

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Close server after all tests
afterAll(() => server.close());

describe('analysisService', () => {
  describe('analyzeBloodGas', () => {
    it('returns correct analysis for blood gas data', async () => {
      const mockData = {
        ph: 7.32,
        pco2: 55,
        hco3: 28,
        po2: 78
      };
      
      const result = await analysisService.analyzeBloodGas(mockData);
      
      expect(result).toHaveProperty('interpretation');
      expect(result).toHaveProperty('acid_base_status');
      expect(result).toHaveProperty('compensation_status');
      expect(result.is_critical).toBe(false);
      expect(result.abnormalities).toContain('Hipercapnia');
    });
  });
  
  describe('analyzeElectrolytes', () => {
    it('returns correct analysis for electrolyte data', async () => {
      const mockData = {
        sodium: 138,
        potassium: 3.1,
        chloride: 102,
        bicarbonate: 24
      };
      
      const result = await analysisService.analyzeElectrolytes(mockData);
      
      expect(result).toHaveProperty('interpretation');
      expect(result.is_critical).toBe(false);
      expect(result.abnormalities).toContain('Potássio baixo');
    });
  });
  
  describe('analyzeHematology', () => {
    it('returns correct analysis for hematology data', async () => {
      const mockData = {
        hemoglobin: 8.5,
        hematocrit: 28,
        wbc: 9500,
        platelet: 145000
      };
      
      const result = await analysisService.analyzeHematology(mockData);
      
      expect(result).toHaveProperty('interpretation');
      expect(result.is_critical).toBe(false);
      expect(result.abnormalities).toContain('Hemoglobina baixa');
    });
  });
  
  describe('analyzeRenal', () => {
    it('returns correct analysis for renal function data', async () => {
      const mockData = {
        creatinine: 2.4,
        urea: 85,
        gfr: 35
      };
      
      const result = await analysisService.analyzeRenal(mockData);
      
      expect(result).toHaveProperty('interpretation');
      expect(result.is_critical).toBe(false);
      expect(result.abnormalities).toContain('Creatinina elevada');
    });
  });
  
  describe('analyzeHepatic', () => {
    it('returns correct analysis for hepatic function data', async () => {
      const mockData = {
        alt: 35,
        ast: 42,
        bilirubinTotal: 2.2,
        albumin: 3.8
      };
      
      const result = await analysisService.analyzeHepatic(mockData);
      
      expect(result).toHaveProperty('interpretation');
      expect(result.is_critical).toBe(false);
      expect(result.abnormalities).toContain('Bilirrubina total elevada');
    });
  });
  
  describe('analyzeCardiac', () => {
    it('returns correct analysis for cardiac marker data', async () => {
      const mockData = {
        troponinI: 0.5,
        bnp: 210
      };
      
      const result = await analysisService.analyzeCardiac(mockData);
      
      expect(result).toHaveProperty('interpretation');
      expect(result.is_critical).toBe(true);
      expect(result.abnormalities).toContain('Troponina I elevada');
    });
  });
  
  describe('analyzeMicrobiology', () => {
    it('returns correct analysis for microbiology data', async () => {
      const mockData = {
        culture: 'positive',
        organism: 'Klebsiella pneumoniae',
        source: 'respiratório'
      };
      
      const result = await analysisService.analyzeMicrobiology(mockData);
      
      expect(result).toHaveProperty('interpretation');
      expect(result.is_critical).toBe(true);
      expect(result.abnormalities).toContain('Cultura positiva em amostra respiratória');
    });
  });
  
  describe('analyzeMetabolic', () => {
    it('returns correct analysis for metabolic data', async () => {
      const mockData = {
        glucose: 185
      };
      
      const result = await analysisService.analyzeMetabolic(mockData);
      
      expect(result).toHaveProperty('interpretation');
      expect(result.is_critical).toBe(false);
      expect(result.abnormalities).toContain('Glicose elevada');
    });
  });
  
  describe('calculateSofa', () => {
    it('returns correct SOFA score calculation', async () => {
      const mockData = {
        respiratory_pao2_fio2: 250,
        coagulation_platelets: 90000,
        liver_bilirubin: 1.5,
        cardiovascular_map: 65,
        cns_glasgow: 14,
        renal_creatinine: 1.8
      };
      
      const result = await analysisService.calculateSofa(mockData);
      
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('mortality_risk');
      expect(result).toHaveProperty('component_scores');
      expect(result.score).toBe(8);
      expect(result.is_critical).toBe(true);
      expect(result.category).toBe('SOFA');
    });
  });
  
  describe('API error handling', () => {
    it('handles network errors gracefully', async () => {
      // Setup server to return an error for this test
      server.use(
        rest.post(`${API_BASE_URL}/blood_gas`, (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
        })
      );
      
      await expect(analysisService.analyzeBloodGas({
        ph: 7.32,
        pco2: 55,
        hco3: 28
      })).rejects.toThrow();
    });
  });
}); 