import { LabResult } from '@/types/health';
import { API_BASE_URL } from '@/lib/config';

// Exemplo: busca resultados laboratoriais de um paciente por ID (simulação)
export async function getLabResults(patientId: number | string): Promise<LabResult[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/patients/${patientId}/labs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Adicione autenticação se necessário
    });
    if (!res.ok) throw new Error('Erro ao buscar resultados laboratoriais');
    const data = await res.json();
    // Supondo que o backend retorna { items: LabResult[] }
    return data.items || [];
  } catch (error) {
    console.error('Erro ao buscar resultados laboratoriais:', error);
    return [];
  }
} 