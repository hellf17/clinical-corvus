import axios from 'axios';
import { API_BASE_URL } from '../config';
import { ScoreResult } from '../types/analysis';

/**
 * Serviço para consumir APIs de escores de gravidade clínica
 */
const scoreService = {
  /**
   * Calcula o SOFA (Sequential Organ Failure Assessment)
   * @param data Dados para cálculo do SOFA
   * @returns Resultado do cálculo
   */
  calculateSofa: async (data: any): Promise<ScoreResult> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/score/sofa`, data);
      return response.data;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Erro ao calcular SOFA';
      throw new Error(message);
    }
  },

  /**
   * Calcula o qSOFA (Quick SOFA) para triagem rápida de sepse
   * @param data Dados para cálculo do qSOFA
   * @returns Resultado do cálculo
   */
  calculateQSofa: async (data: any): Promise<ScoreResult> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/score/qsofa`, data);
      return response.data;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Erro ao calcular qSOFA';
      throw new Error(message);
    }
  },

  /**
   * Calcula o APACHE II (Acute Physiology And Chronic Health Evaluation II)
   * @param data Dados para cálculo do APACHE II
   * @returns Resultado do cálculo
   */
  calculateApache2: async (data: any): Promise<ScoreResult> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/score/apache2`, data);
      return response.data;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Erro ao calcular APACHE II';
      throw new Error(message);
    }
  }
};

export default scoreService;