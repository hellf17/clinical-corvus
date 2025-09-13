export const clinicalScenarios = [
  {
    id: 1,
    title: 'Acute Coronary Syndrome',
    description: 'A patient presents with chest pain and ST elevation on ECG. The agent should provide a differential diagnosis, immediate management steps, and identify red flags.',
    endpoint: 'clinical-discussion',
    requestBody: {
      case_description: 'Patient with chest pain, ST elevation on ECG',
      include_patient_context: false
    }
  },
  {
    id: 2,
    title: 'Sepsis Presentation',
    description: 'An elderly patient presents with fever, tachycardia, and confusion. The agent should identify SIRS criteria, suggest a diagnostic workup, and outline treatment priorities.',
    endpoint: 'clinical-discussion',
    requestBody: {
      case_description: 'Elderly patient with fever, tachycardia, confusion',
      include_patient_context: false
    }
  },
  {
    id: 3,
    title: 'Pediatric Respiratory Distress',
    description: 'A 2-year-old presents with wheezing, retractions, and low oxygen saturation. The agent should provide an age-appropriate assessment and consider bronchodilator response.',
    endpoint: 'clinical-discussion',
    requestBody: {
      case_description: '2-year-old with wheezing, retractions, and oxygen saturation 92%',
      include_patient_context: false
    }
  },
  {
    id: 4,
    title: 'Complex Case with Comorbidities',
    description: 'A diabetic patient presents with a foot ulcer, fever, and elevated WBC. The agent should assess for infection vs. ischemia and suggest appropriate antibiotic selection.',
    endpoint: 'clinical-discussion',
    requestBody: {
      case_description: 'Diabetic patient with foot ulcer, fever, and elevated WBC',
      include_patient_context: true,
      patient_id: 'diabetic_patient_123'
    }
  },
  {
    id: 5,
    title: 'Atypical Presentation',
    description: 'A young patient presents with atypical chest pain and a normal ECG. The agent should provide a broad differential diagnosis and recommend an appropriate workup.',
    endpoint: 'clinical-discussion',
    requestBody: {
      case_description: 'Young patient with atypical chest pain, normal ECG',
      include_patient_context: false
    }
  },
  {
    id: 6,
    title: 'Treatment Guidelines Research',
    description: 'The agent should research the evidence for aspirin in primary prevention, providing recent meta-analyses, guideline recommendations, and a risk-benefit analysis.',
    endpoint: 'clinical-research',
    requestBody: {
      query: 'What is the evidence for aspirin in primary prevention?',
      include_patient_context: false
    }
  },
  {
    id: 7,
    title: 'Diagnostic Accuracy Research',
    description: 'The agent should research the sensitivity and specificity of troponin for myocardial infarction, providing systematic reviews and clinical implications.',
    endpoint: 'clinical-research',
    requestBody: {
      query: 'Sensitivity and specificity of troponin for myocardial infarction',
      include_patient_context: false
    }
  },
  {
    id: 8,
    title: 'Comparative Effectiveness Research',
    description: 'The agent should compare ACE inhibitors vs. ARBs in heart failure, citing head-to-head trials and guideline preferences.',
    endpoint: 'clinical-research',
    requestBody: {
      query: 'ACE inhibitors vs ARBs in heart failure',
      include_patient_context: false
    }
  },
  {
    id: 9,
    title: 'Recent Publications Research',
    description: 'The agent should find the latest research on COVID-19 vaccination in immunocompromised patients, focusing on recent RCTs and systematic reviews.',
    endpoint: 'clinical-research',
    requestBody: {
      query: 'Latest research on COVID-19 vaccination in immunocompromised patients',
      include_patient_context: true,
      patient_id: 'immunocompromised_patient_456'
    }
  },
  {
    id: 10,
    title: 'Controversial Topics Research',
    description: 'The agent should assess the evidence for ivermectin in COVID-19 treatment, identifying high-quality evidence and the lack of support.',
    endpoint: 'clinical-research',
    requestBody: {
      query: 'Evidence for ivermectin in COVID-19 treatment',
      include_patient_context: false
    }
  }
];