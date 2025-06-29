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
    'Ca+': (8.5, 10.5), # mg/dL
    'iCa': (1.10, 1.35), # mmol/L
    'Mg+': (1.5, 2.5),  # mg/dL
    'P': (2.5, 4.5),    # mg/dL (Fósforo)
    
    # CBC
    'Hb': (12, 16),     # g/dL (adjustable by gender)
    'Ht': (36, 46),     # % (adjustable by gender)
    'Leuco': (4000, 10000), # /mm³
    'Plaq': (150000, 450000), # /mm³
    'Retic': (0.5, 1.5),  # %
    
    # Others
    'Creat': (0.6, 1.2), # mg/dL
    'Ur': (10, 50),     # mg/dL
    'PCR': (0, 0.5),    # mg/dL
    'Lactato': (4.5, 19.8), # mg/dL
    'Glicose': (70, 100), # mg/dL
    'HbA1c': (4.0, 5.7), # %
    'Albumina': (3.5, 5.2), # g/dL
    'CPK': (26, 192),    # U/L
    'LDH': (140, 280),   # U/L
    'AcidoUrico': (3.5, 7.2), # mg/dL
    'ProteinuriaVol': (0, 150), # mg/24h
    'T4L': (0.7, 1.8),   # ng/dL
    'TSH': (0.4, 4.0),   # µUI/mL
    'FatorReumatoide': (0, 14), # UI/mL
    
    # Urine
    'ProtCreatRatio': (0, 0.2), # mg/mg
    'UrineDensity': (1.005, 1.035),
    'UrineLeuco': (0, 10),  # p/campo
    'UrineHem': (0, 5),    # p/campo
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