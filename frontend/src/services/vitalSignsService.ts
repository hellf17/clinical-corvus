import { VitalSign } from '@/types/health';

// Exemplo: busca sinais vitais de um paciente por ID (simulação)
export async function getVitalSigns(patientId: number | string): Promise<VitalSign[]> {
  // Aqui você pode integrar com o backend real, ex:
  // const res = await fetch(`/api/patients/${patientId}/vitals`);
  // return await res.json();

  // Simulação de dados
  return [
    {
      vital_id: 1,
      patient_id: Number(patientId),
      timestamp: new Date().toISOString(),
      temperature_c: 37.2,
      heart_rate: 80,
      respiratory_rate: 18,
      systolic_bp: 120,
      diastolic_bp: 80,
      oxygen_saturation: 98,
      glasgow_coma_scale: 15,
      fio2_input: 21,
      created_at: new Date().toISOString(),
    },
    // ...adicione mais registros se desejar
  ];
} 