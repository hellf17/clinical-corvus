import { Heart, Brain, Stethoscope, Syringe, Shield, Bone, Baby, Activity } from 'lucide-react';

export interface ClinicalCase {
  id: string;
  title: string;
  brief: string;
  details: string;
  difficulty: {
    level: 'Iniciante' | 'Intermediário' | 'Avançado';
    focus: string;
  };
  specialties: string[];
  learning_objectives: string[];
}

export const specialtyIcons: { [key: string]: React.ElementType } = {
  'Cardiologia': Heart,
  'Neurologia': Brain,
  'Pneumologia': Stethoscope,
  'Clínica Médica': Stethoscope,
  'Infectologia': Syringe,
  'Reumatologia': Shield,
  'Ortopedia': Bone,
  'Pediatria': Baby,
  'Endocrinologia': Activity,
};

export const clinicalCases: ClinicalCase[] = [
  {
    id: 'case-001',
    title: 'Dor Torácica Súbita',
    brief: 'Paciente de 58 anos, masculino, com dor torácica opressiva de início súbito.',
    details: 'Paciente hipertenso e diabético, fumante de longa data, apresenta-se no pronto-socorro com dor torácica intensa irradiando para o braço esquerdo, acompanhada de sudorese e náuseas. O episódio começou há 2 horas.',
    difficulty: { 
      level: 'Intermediário',
      focus: 'Foco em Raciocínio Diagnóstico Diferencial'
    },
    specialties: ['Cardiologia', 'Clínica Médica'],
    learning_objectives: [
      'Diferenciar síndrome coronariana aguda de outras causas de dor torácica.',
      'Interpretar ECG e marcadores cardíacos iniciais.',
      'Iniciar o manejo inicial de uma SCA.',
    ],
  },
  {
    id: 'case-002',
    title: 'Dor Articular e Febre',
    brief: 'Jovem de 28 anos com dor em múltiplas articulações, febre e rash cutâneo.',
    details: 'Paciente feminina, 28 anos, refere há 3 semanas quadro de poliartralgia migratória, febre baixa diária e aparecimento de um rash malar fotossensível. Relata também fadiga intensa e perda de peso não intencional.',
    difficulty: { 
      level: 'Avançado',
      focus: 'Foco em Doenças Sistêmicas e Autoimunidade'
    },
    specialties: ['Reumatologia', 'Clínica Médica'],
    learning_objectives: [
      'Construir o diagnóstico de Lúpus Eritematoso Sistêmico (LES).',
      'Solicitar e interpretar autoanticorpos relevantes (FAN, anti-dsDNA).',
      'Avaliar a atividade da doença e planejar o tratamento inicial.',
    ],
  }
];
