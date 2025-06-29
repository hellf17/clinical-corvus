"""
Reference ranges for laboratory tests.
Each range is defined as a tuple (lower_limit, upper_limit) in the respective units.
"""

REFERENCE_RANGES = {
    # Blood gases
    'pH': (7.35, 7.45),
    'pCO2': (35, 45),  # mmHg
    'pO2': (80, 100),  # mmHg
    'HCO3-': (22, 26),  # mmol/L
    'SpO2': (95, 100),  # %
    'BE': (-3, 3),     # Base Excess mmol/L
    
    # Electrolytes
    'Na+': (135, 145),  # mmol/L
    'K+': (3.5, 5.0),   # mmol/L
    'Cl-': (98, 108),   # mmol/L (Cloreto)
    'Ca+': (8.5, 10.5), # mg/dL
    'iCa': (1.10, 1.35), # mmol/L
    'Mg+': (1.5, 2.5),  # mg/dL
    'P': (2.5, 4.5),    # mg/dL (Fósforo)
    
    # CBC
    'Hb': (12, 16),     # g/dL (adjustable by gender)
    'Ht': (36, 46),     # % (adjustable by gender)
    'Leuco': (4000, 10000), # /mm³
    'Plaq': (150000, 450000), # /mm³
    'Retic': (0.5, 1.5),  # % (Percentage range)
    'RBC_M': (4.5, 5.5), # million/µL (Male RBC count)
    'RBC_F': (4.0, 5.0), # million/µL (Female RBC count)
    'RBC': (4.0, 5.5), # million/µL (Default/Unisex RBC count, if gender not specified)
    'Retic_abs': (25000, 75000), # /µL or /mm³ (Absolute reticulocyte count)
    
    # Differential Leukocyte Counts
    # Percentages (%)
    'Neutrophils_perc': (40, 75),   # %
    'Lymphocytes_perc': (20, 45),   # %
    'Monocytes_perc': (2, 10),      # %
    'Eosinophils_perc': (1, 6),     # %
    'Basophils_perc': (0, 2),       # %
    'Bands_perc': (0, 5),           # % (Bastonetes/Stab neutrophils)
    # Absolute Counts (/mm³)
    'Neutrophils_abs': (1500, 7500), # /mm³
    'Lymphocytes_abs': (1000, 4000), # /mm³
    'Monocytes_abs': (100, 1000),    # /mm³
    'Eosinophils_abs': (20, 500),    # /mm³
    'Basophils_abs': (0, 200),       # /mm³
    'Bands_abs': (0, 500),           # /mm³ (Bastonetes/Stab neutrophils)
    
    # Immature Granulocytes (usually reported as 0, or very low %/abs)
    'Mielocytes_perc': (0, 0),      # Myelocytes percentage
    'Mielocytes_abs': (0, 0),        # Myelocytes absolute
    'Metamyelocytes_perc': (0, 0), # Metamyelocytes percentage
    'Metamyelocytes_abs': (0, 0),   # Metamyelocytes absolute
    # Add Promyelocytes if needed, typically also 0
    
    # Red Cell Indices
    'VCM': (80, 100),    # fL (Mean Corpuscular Volume)
    'HCM': (27, 33),     # pg (Mean Corpuscular Hemoglobin)
    'CHCM': (32, 36),   # g/dL (Mean Corpuscular Hemoglobin Concentration)
    'RDW': (11.5, 14.5), # % (Red Cell Distribution Width)
    
    # Others
    'Creat': (0.6, 1.2), # mg/dL
    'Ur': (10, 50),     # mg/dL
    'PCR': (0, 0.5),    # mg/dL
    'Lactato': (4.5, 19.8), # mg/dL
    'Glicose': (70, 100), # mg/dL
    'HbA1c': (4.0, 5.7), # %
    'HbA1c_target': (6.5, 7.0), # % (General target for many adults with diabetes, ADA suggests <7.0%)
    'Albumina': (3.5, 5.2), # g/dL
    'CPK': (26, 192),    # U/L
    'LDH': (140, 280),   # U/L
    'AcidoUrico': (3.5, 7.2), # mg/dL
    'AcidoUrico_F': (2.5, 6.0), # mg/dL (Female specific range)
    'ProteinuriaVol': (0, 150), # mg/24h
    'T4L': (0.7, 1.8),   # ng/dL
    'TSH': (0.4, 4.0),   # µUI/mL
    'FatorReumatoide': (0, 14), # UI/mL
    'Amilase': (28, 100), # U/L
    'Lipase': (13, 60), # U/L
    
    # Lipids (mg/dL)
    'CT': (0, 200),          # Colesterol Total Desejável < 200
    'LDL': (0, 100),         # LDL Ótimo < 100 (metas variam com risco CV)
    'HDL_M': (40, 1000),     # HDL Masculino > 40 (baixo risco se >60) - upper bound is just a placeholder
    'HDL_F': (50, 1000),     # HDL Feminino > 50 (baixo risco se >60) - upper bound is just a placeholder
    'TG': (0, 150),          # Triglicerídeos Desejável < 150 (jejum)
    'Nao_HDL': (0, 130),     # Colesterol Não-HDL Ótimo < 130 (LDL meta + 30; metas variam)
    
    # Hepatic Function
    'TGO': (10, 40),    # U/L (Aspartate Aminotransferase)
    'TGP': (7, 56),     # U/L (Alanine Aminotransferase)
    'GamaGT': (5, 60),   # U/L (Gamma-Glutamyl Transferase)
    'FosfAlc': (30, 120), # U/L (Alkaline Phosphatase)
    'BT': (0.2, 1.2),   # mg/dL (Bilirubin Total)
    'BD': (0.0, 0.3),   # mg/dL (Bilirubin Direct)
    'RNI': (0.8, 1.2),   # Ratio (International Normalized Ratio for patients not on anticoagulants)

    # Coagulation
    'TTPA': (25, 40), # Seconds (Activated Partial Thromboplastin Time)
    'Fibrinogeno': (200, 400), # mg/dL
    'D-dimer': (0, 500), # ng/mL FEU (Fibrinogen Equivalent Units) - HIGHLY ASSAY DEPENDENT, VERIFY LOCAL CUTOFF AND UNITS

    # Inflammation
    'VHS_Male': (0, 8), # mm/1h (Erythrocyte Sedimentation Rate - Male, based on example)
    'VHS_Female': (0, 15), # mm/1h (Erythrocyte Sedimentation Rate - Female, common general range)
    'Procalcitonina': (0, 0.05), # ng/mL or µg/L - Strict normal for low likelihood of bacterial infection
    'Ferritina_Male': (20, 300), # ng/mL or µg/L
    'Ferritina_Female': (10, 200), # ng/mL or µg/L

    # Urine
    'ProtCreatRatio': (0, 0.2), # mg/mg
    'UrineDensity': (1.005, 1.035),
    'UrineLeuco': (0, 10),  # p/campo
    'UrineHem': (0, 5),    # p/campo

    # Albumin-to-Creatinine Ratio (ACR / RAC)
    'RAC_mg_g': (0, 30), # mg/g (Normal < 30, Microalbuminuria 30-300, Macroalbuminuria > 300)
    'RAC_mg_mmol': (0, 3.4) # mg/mmol (Normal < 3.4, Microalbuminuria 3.4-34, Macroalbuminuria > 34) - approximate conversion from mg/g
}

def is_abnormal(param, value):
    """
    Check if a lab value is outside the reference range.
    
    Args:
        param: The parameter name (must be in REFERENCE_RANGES)
        value: The value to check
        
    Returns:
        bool: True if abnormal, False if normal or reference range not found
    """
    if param in REFERENCE_RANGES and value is not None:
        low, high = REFERENCE_RANGES[param]
        return value < low or value > high
    return False

def get_reference_range_text(param):
    """
    Get the reference range as a formatted string.
    
    Args:
        param: The parameter name
        
    Returns:
        str: Formatted reference range or empty string if not found
    """
    if param in REFERENCE_RANGES:
        low, high = REFERENCE_RANGES[param]
        return f"{low} - {high}"
    return "" 