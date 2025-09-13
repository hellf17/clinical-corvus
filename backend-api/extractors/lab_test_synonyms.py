"""
Synonyms dictionary and fuzzy matching functions for lab test names.
"""

# Synonyms dictionary for common lab test names in Portuguese, English, and Spanish
LAB_TEST_SYNONYMS = {
    # Hemograma / Hemogram / Hemograma
    'hemoglobin': ['hemoglobina', 'hemoglobin', 'hemoglobina'],
    'hematocrit': ['hematócrito', 'hematocrit', 'hematócrito'],
    'leukocytes': ['leucócitos', 'leukocytes', 'leucocitos'],
    'platelets': ['plaquetas', 'platelets', 'plaquetas'],
    'reticulocytes': ['reticulócitos', 'reticulocytes', 'reticulocitos'],
    
    # Differential Leukocytes
    'band_cells': ['bastonetes', 'band cells', 'bastones'],
    'segmented_neutrophils': ['segmentados', 'segmented neutrophils', 'neutrófilos segmentados'],
    'lymphocytes': ['linfócitos', 'lymphocytes', 'linfocitos'],
    'monocytes': ['monócitos', 'monocytes', 'monocitos'],
    'eosinophils': ['eosinófilos', 'eosinophils', 'eosinofilos'],
    'basophils': ['basófilos', 'basophils', 'basofilos'],
    'myelocytes': ['mielócitos', 'myelocytes', 'mielocitos'],
    'metamyelocytes': ['metamielócitos', 'metamyelocytes', 'metamielocitos'],
    
    # Electrolytes
    'potassium': ['potássio', 'potassium', 'potasio'],
    'sodium': ['sódio', 'sodium', 'sodio'],
    'calcium': ['cálcio', 'calcium', 'calcio'],
    'ionized_calcium': ['cálcio iônico', 'ionized calcium', 'calcio ionizado'],
    'magnesium': ['magnésio', 'magnesium', 'magnesio'],
    'phosphorus': ['fósforo', 'phosphorus', 'fosforo'],
    
    # Renal/Hepatic
    'creatinine': ['creatinina', 'creatinine', 'creatinina'],
    'urea': ['ureia', 'urea', 'urea'],
    'crp': ['pcr', 'crp', 'pcr'],
    'esr': ['vhs', 'esr', 'vsg'],
    'inr': ['rni', 'inr', 'inr'],
    'ptt': ['ttpa', 'ptt', 'ptt'],
    'ast': ['tgo', 'ast', 'tgo'],
    'alt': ['tgp', 'alt', 'tgp'],
    'total_bilirubin': ['bilirrubina total', 'total bilirubin', 'bilirrubina total'],
    'direct_bilirubin': ['bilirrubina direta', 'direct bilirubin', 'bilirrubina directa'],
    'indirect_bilirubin': ['bilirrubina indireta', 'indirect bilirubin', 'bilirrubina indirecta'],
    'ggt': ['gama gt', 'ggt'],
    'alkaline_phosphatase': ['fosfatase alcalina', 'alkaline phosphatase', 'fosfatasa alcalina'],
    'amylase': ['amilase', 'amylase', 'amilasa'],
    'lipase': ['lipase', 'lipasa'],
    'albumin': ['albumina', 'albumin', 'albúmina'],
    'cpk': ['cpk', 'cpk', 'ck'],
    'ldh': ['ldh', 'ldh'],
    'uric_acid': ['ácido úrico', 'uric acid', 'ácido úrico'],
    
    # Blood Gases
    'ph': ['ph', 'ph', 'ph'],
    'pco2': ['pco2', 'pco2', 'pco2'],
    'po2': ['po2', 'po2', 'po2'],
    'hco3': ['hco3', 'hco3', 'hco3'],
    'oxygen_saturation': ['saturação de o2', 'oxygen saturation', 'saturación de o2'],
    'lactate': ['lactato', 'lactate', 'lactato'],
    
    # Cardiac Markers
    'bnp': ['bnp', 'bnp', 'bnp'],
    'ck_mb': ['ck-mb', 'ck-mb', 'ck-mb'],
    'troponin': ['troponina', 'troponin', 'troponina'],
    
    # Metabolic/Endocrine
    'glucose': ['glicose', 'glucose', 'glucosa'],
    'hba1c': ['hb a1c', 'hba1c', 'hb a1c'],
    'free_t4': ['t4 livre', 'free t4', 't4 libre'],
    'tsh': ['tsh', 'tsh'],
    
    # Urinalysis
    'protein_creatinine_ratio': ['relação proteína/creatinina', 'protein/creatinine ratio', 'relación proteína/creatinina'],
    'proteinuria_24h': ['proteinuria - 24h', 'proteinuria - 24h', 'proteinuria - 24h'],
    'urine_density': ['densidade', 'urine density', 'densidad'],
    'urine_leukocytes': ['leucocitos (p/campo)', 'urine leukocytes', 'leucocitos (p/campo)'],
    'urine_rbc': ['hemácias (p/campo)', 'urine rbc', 'hematíes (p/campo)'],
    
    # Immunology
    'rheumatoid_factor': ['fator reumatoide', 'rheumatoid factor', 'factor reumatoide'],
}

# Create a reverse mapping for quick lookup
SYNONYM_TO_STANDARD = {}
for standard_name, synonyms in LAB_TEST_SYNONYMS.items():
    for synonym in synonyms:
        SYNONYM_TO_STANDARD[synonym.lower()] = standard_name

# Common unit conversions (from -> to)
UNIT_CONVERSIONS = {
    # Volume units
    'mg/dl': {'g/l': lambda x: x / 100.0},
    'g/l': {'mg/dl': lambda x: x * 100.0},
    
    # Concentration units
    'mmol/l': {'mg/dl': lambda x, molar_mass: x * molar_mass / 10.0},
    'mg/dl': {'mmol/l': lambda x, molar_mass: x * 10.0 / molar_mass},
    
    # International units
    '/mm3': {'x10^9/l': lambda x: x / 1000.0},
    '/mm³': {'x10^9/l': lambda x: x / 1000.0},
    'x10^9/l': {'/mm3': lambda x: x * 1000.0},
    
    # Other common conversions
    'pg': {'fg': lambda x: x * 1000.0},
    'fg': {'pg': lambda x: x / 1000.0},
}

# Molar masses for common substances (for mmol/L <-> mg/dL conversions)
MOLAR_MASSES = {
    'glucose': 180.16,
    'creatinine': 113.12,
    'urea': 60.06,
    'uric_acid': 168.11,
    'cholesterol': 386.65,
    'triglycerides': 885.5,
    'calcium': 40.08,
    'phosphorus': 30.97,
    'sodium': 22.99,
    'potassium': 39.10,
    'chloride': 35.45,
    'bicarbonate': 61.02,
}