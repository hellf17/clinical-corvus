export interface ClinicalCase {
  id: string;
  title: string;
  brief: string;
  fullDescription: string;
  demographics: string;
  chiefComplaint: string;
  presentingHistory: string;
  physicalExam: string;
  vitalSigns: string;
  difficulty: 'Básico' | 'Intermediário' | 'Avançado';
  tags: string[];
  expectedDifferentials?: string[];
  learningObjectives?: string[];
  expertAnalysis?: {
    keyFindings: string[];
    redFlags: string[];
    workupPriority: string[];
  };
}

export const sampleCases: ClinicalCase[] = [
  {
    id: 'case-1',
    title: 'Dor Torácica Aguda',
    brief: 'Homem, 52 anos, dor torácica opressiva há 2h',
    fullDescription: 'Paciente masculino, 52 anos, tabagista, hipertenso, procura o pronto-socorro com quadro de dor torácica opressiva, de início súbito há 2 horas, irradiando para braço esquerdo e mandíbula.',
    demographics: 'Homem, 52 anos, tabagista (20 maços/ano), hipertensão arterial em uso de losartana',
    chiefComplaint: 'Dor no peito há 2 horas',
    presentingHistory: 'Dor torácica opressiva, 8/10, início súbito durante atividade física leve, irradia para braço esquerdo e mandíbula, associada a sudorese fria e náusea. Nega dispneia ou síncope.',
    physicalExam: 'Paciente ansioso, sudoreico. Ausculta cardíaca: ritmo regular, bulhas normofonéticas, sem sopros. Ausculta pulmonar: murmúrio vesicular presente bilateralmente.',
    vitalSigns: 'PA: 160/100 mmHg, FC: 95 bpm, FR: 20 irpm, Sat O2: 98% (ar ambiente), Temp: 36.5°C',
    difficulty: 'Intermediário',
    tags: ['Cardiologia', 'Emergência'],
    expectedDifferentials: [
      'Infarto Agudo do Miocárdio',
      'Angina Instável',
      'Embolia Pulmonar',
      'Dissecção Aórtica',
      'Pericardite'
    ],
    learningObjectives: [
      'Reconhecer apresentação típica de síndrome coronariana aguda',
      'Avaliar fatores de risco cardiovascular',
      'Priorizar investigações urgentes',
      'Aplicar protocolos de dor torácica'
    ],
    expertAnalysis: {
      keyFindings: [
        'Dor típica de isquemia miocárdica',
        'Fatores de risco: tabagismo, HAS, sexo masculino, idade',
        'Sinais autonômicos: sudorese, náusea',
        'Hipertensão reativa ao stress/dor'
      ],
      redFlags: [
        'Dor irradiando para braço e mandíbula',
        'Início súbito durante esforço',
        'Sinais autonômicos presentes',
        'Múltiplos fatores de risco cardiovascular'
      ],
      workupPriority: [
        'ECG de 12 derivações urgente',
        'Troponina seriada',
        'Radiografia de tórax',
        'Acesso venoso e monitorização cardíaca'
      ]
    }
  },
  {
    id: 'case-2',
    title: 'Dispneia Progressiva',
    brief: 'Mulher, 68 anos, falta de ar aos esforços há 3 semanas',
    fullDescription: 'Paciente feminina, 68 anos, ex-tabagista, com história de DPOC, apresenta dispneia progressiva aos esforços nas últimas 3 semanas, evoluindo para dispneia de repouso.',
    demographics: 'Mulher, 68 anos, ex-tabagista (40 maços/ano, parou há 5 anos), DPOC diagnosticada, aposentada',
    chiefComplaint: 'Falta de ar que tem piorado',
    presentingHistory: 'Dispneia progressiva iniciada há 3 semanas, inicialmente aos grandes esforços, agora presente ao repouso. Tosse seca ocasional, nega febre ou produção de escarro. Relata edema em membros inferiores há 1 semana.',
    physicalExam: 'Paciente em regular estado geral, taquipneica. Ausculta pulmonar: diminuição do murmúrio vesicular em bases, sem ruídos adventícios. Ausculta cardíaca: taquicardia, B3 presente. Edema 2+/4+ em MMII.',
    vitalSigns: 'PA: 110/70 mmHg, FC: 110 bpm, FR: 28 irpm, Sat O2: 92% (ar ambiente), Temp: 36.2°C',
    difficulty: 'Avançado',
    tags: ['Pneumologia', 'Cardiologia'],
    expectedDifferentials: [
      'Insuficiência Cardíaca Descompensada',
      'Exacerbação de DPOC',
      'Embolia Pulmonar',
      'Pneumonia',
      'Cor Pulmonale'
    ],
    learningObjectives: [
      'Diferenciar causas cardíacas vs pulmonares de dispneia',
      'Reconhecer sinais de insuficiência cardíaca',
      'Avaliar progressão de doença crônica',
      'Integrar achados clínicos complexos'
    ],
    expertAnalysis: {
      keyFindings: [
        'Dispneia progressiva com padrão de evolução',
        'B3 presente sugerindo IC',
        'Edema periférico bilateral',
        'Hipoxemia leve',
        'História de DPOC prévia'
      ],
      redFlags: [
        'Dispneia de repouso',
        'Evolução progressiva rápida',
        'Sinais de congestão sistêmica',
        'Dessaturação ao ar ambiente'
      ],
      workupPriority: [
        'BNP ou NT-proBNP',
        'Ecocardiograma',
        'Radiografia de tórax',
        'Gasometria arterial',
        'Hemograma e bioquímica'
      ]
    }
  },
  {
    id: 'case-3',
    title: 'Cefaleia Intensa',
    brief: 'Mulher, 35 anos, dor de cabeça súbita e intensa',
    fullDescription: 'Paciente feminina, 35 anos, hígida, apresenta cefaleia de início súbito, de forte intensidade, descrita como "a pior dor de cabeça da vida".',
    demographics: 'Mulher, 35 anos, saudável, professora, sem medicações habituais',
    chiefComplaint: 'Dor de cabeça muito forte que começou de repente',
    presentingHistory: 'Cefaleia súbita há 4 horas, 10/10, holocraniana, sem fatores desencadeantes identificados. Associada a náusea, vômito e fotofobia. Nega trauma, febre ou sinais neurológicos focais.',
    physicalExam: 'Paciente em sofrimento devido à dor, fotofóbica. Sinais vitais estáveis. Exame neurológico: consciente, orientada, pupilas isocóricas e fotorreagentes, sem déficits motores ou sensitivos. Sinais meníngeos negativos.',
    vitalSigns: 'PA: 140/85 mmHg, FC: 88 bpm, FR: 18 irpm, Sat O2: 99% (ar ambiente), Temp: 36.8°C',
    difficulty: 'Básico',
    tags: ['Neurologia', 'Emergência'],
    expectedDifferentials: [
      'Hemorragia Subaracnóidea',
      'Enxaqueca Severa',
      'Meningite',
      'Cefaleia Tensional Severa',
      'Hipertensão Intracraniana'
    ],
    learningObjectives: [
      'Reconhecer red flags em cefaleia aguda',
      'Diferenciar cefaleia primária vs secundária',
      'Aplicar investigação apropriada para cefaleia em trovoada',
      'Avaliar necessidade de neuroimagem urgente'
    ],
    expertAnalysis: {
      keyFindings: [
        'Cefaleia "em trovoada" - início súbito',
        'Intensidade máxima descrita pelo paciente',
        'Sintomas associados: náusea, vômito, fotofobia',
        'Ausência de sinais meníngeos (ainda)',
        'Paciente jovem previamente hígida'
      ],
      redFlags: [
        'Início súbito (\"pior cefaleia da vida\")',
        'Intensidade 10/10',
        'Primeiro episódio em paciente jovem',
        'Náusea e vômito associados'
      ],
      workupPriority: [
        'TC de crânio urgente sem contraste',
        'Se TC normal: punção lombar',
        'Analgesia adequada',
        'Avaliação neurológica seriada'
      ]
    }
  }
];
