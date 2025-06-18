import axios from 'axios';
import { API_BASE_URL } from '../config';
import { 
  BloodGasInput, BloodGasResult,
  ElectrolyteInput, ElectrolyteResult,
  HematologyInput, HematologyResult,
  RenalResult, HepaticResult,
  CardiacResult, MicrobiologyResult,
  MetabolicResult, ScoreResult,
  SofaInput
} from '../types/analysis';

/**
 * Serviço para comunicação com as APIs de análise clínica
 */
const analysisService = {
  /**
   * Analisa gasometria arterial
   * @param data Dados da gasometria
   * @returns Resultado da análise
   */
  analyzeBloodGas: async (data: BloodGasInput): Promise<BloodGasResult> => {
    const response = await axios.post(`${API_BASE_URL}/blood_gas`, data);
    return response.data;
  },

  /**
   * Analisa eletrólitos
   * @param data Dados dos eletrólitos
   * @returns Resultado da análise
   */
  analyzeElectrolytes: async (data: ElectrolyteInput): Promise<ElectrolyteResult> => {
    const response = await axios.post(`${API_BASE_URL}/electrolytes`, data);
    return response.data;
  },

  /**
   * Analisa hemograma
   * @param data Dados do hemograma
   * @returns Resultado da análise
   */
  analyzeHematology: async (data: HematologyInput): Promise<HematologyResult> => {
    const response = await axios.post(`${API_BASE_URL}/hematology`, data);
    return response.data;
  },

  /**
   * Analisa função renal
   * @param data Dados da função renal
   * @returns Resultado da análise
   */
  analyzeRenal: async (data: Record<string, any>): Promise<RenalResult> => {
    const response = await axios.post(`${API_BASE_URL}/renal`, data);
    return response.data;
  },

  /**
   * Analisa função hepática
   * @param data Dados da função hepática
   * @returns Resultado da análise
   */
  analyzeHepatic: async (data: Record<string, any>): Promise<HepaticResult> => {
    const response = await axios.post(`${API_BASE_URL}/hepatic`, data);
    return response.data;
  },

  /**
   * Analisa marcadores cardíacos
   * @param data Dados de marcadores cardíacos
   * @returns Resultado da análise
   */
  analyzeCardiac: async (data: Record<string, any>): Promise<CardiacResult> => {
    const response = await axios.post(`${API_BASE_URL}/cardiac`, data);
    return response.data;
  },

  /**
   * Analisa resultados microbiológicos
   * @param data Dados microbiológicos
   * @returns Resultado da análise
   */
  analyzeMicrobiology: async (data: Record<string, any>): Promise<MicrobiologyResult> => {
    const response = await axios.post(`${API_BASE_URL}/microbiology`, data);
    return response.data;
  },

  /**
   * Analisa parâmetros metabólicos
   * @param data Dados metabólicos
   * @returns Resultado da análise
   */
  analyzeMetabolic: async (data: Record<string, any>): Promise<MetabolicResult> => {
    const response = await axios.post(`${API_BASE_URL}/metabolic`, data);
    return response.data;
  },

  /**
   * Calcula o escore SOFA
   * @param data Dados para cálculo do SOFA
   * @returns Resultado do cálculo
   */
  calculateSofa: async (data: SofaInput): Promise<ScoreResult> => {
    const response = await axios.post(`${API_BASE_URL}/score/sofa`, data);
    return response.data;
  }
};

export default analysisService; 