"""
Centralized reference ranges for laboratory tests.

This module provides a single source of truth for laboratory test reference ranges,
including gender-specific and age-specific values where applicable.
"""

from typing import Dict, Tuple, Optional, Union

# Typing for a reference range tuple (low, high)
Range = Tuple[Optional[float], Optional[float]]

# Main dictionary for reference ranges
REFERENCE_RANGES: Dict[str, Range] = {
    # Hematology
    'Hb': (12.0, 16.0),
    'Hb_M': (13.5, 17.5),
    'Hb_F': (12.0, 16.0),
    'Ht': (36.0, 46.0),
    'Ht_M': (41.0, 53.0),
    'Ht_F': (36.0, 46.0),
    'Leuco': (4000, 10000),
    'Plaq': (150000, 450000),
    'RBC': (4.0, 5.5),
    'RBC_M': (4.5, 5.5),
    'RBC_F': (4.0, 5.0),
    'VCM': (80.0, 100.0),
    'HCM': (27.0, 33.0),
    'CHCM': (32.0, 36.0),
    'RDW': (11.5, 14.5),
    'Retic': (0.5, 2.5),
    'Retic_abs': (25000, 75000),
    'Neutrophils_perc': (40, 75),
    'Lymphocytes_perc': (20, 45),
    'Monocytes_perc': (2, 10),
    'Eosinophils_perc': (1, 6),
    'Basophils_perc': (0, 2),
    'Bands_perc': (0, 5),
    'Neutrophils_abs': (1500, 7500),
    'Lymphocytes_abs': (1000, 4000),
    'Monocytes_abs': (100, 1000),
    'Eosinophils_abs': (20, 500),
    'Basophils_abs': (0, 200),
    'Bands_abs': (0, 700),
    'Mielocytes_perc': (0, 1),
    'Metamyelocytes_perc': (0, 1),
    'Mielocytes_abs': (0, 100),
    'Metamyelocytes_abs': (0, 100),
    'VHS_Male': (0, 15),
    'VHS_Female': (0, 20),
    'VHS': (0, 20),

    # Electrolytes (CRITICAL - Missing keys causing KeyErrors)
    'Na+': (135, 145),  # mEq/L - Critical missing key causing crashes
    'K+': (3.5, 5.0),   # mEq/L - Critical missing key causing crashes
    'Cl-': (98, 107),   # mEq/L
    'Ca+': (8.5, 10.5), # mg/dL
    'Ca++': (8.5, 10.5), # mg/dL - Alternative key
    'iCa': (1.15, 1.32), # mmol/L - Ionized calcium
    'Mg+': (1.7, 2.2),  # mg/dL
    'Mg++': (1.7, 2.2), # mg/dL - Alternative key
    'P': (2.5, 4.5),    # mg/dL

    # Blood Gas (CRITICAL - Missing keys causing KeyErrors)
    'pH': (7.35, 7.45),      # Critical missing key causing crashes
    'pCO2': (35, 45),        # mmHg - Critical missing key causing crashes
    'pO2': (80, 100),        # mmHg
    'HCO3-': (22, 26),       # mEq/L
    'BE': (-2, 2),           # mEq/L
    'SpO2': (95, 100),       # %
    'Lactato': (0.5, 2.0),   # mmol/L - Critical missing key
    'AnionGap': (8, 12),     # mEq/L

    # Renal (CRITICAL - Missing keys causing KeyErrors)
    'Ur': (15, 50),          # mg/dL - Urea
    'Creat': (0.6, 1.2),     # mg/dL - Critical missing key causing crashes
    'TFG': (90, None),       # mL/min/1.73m²
    'RAC_mg_g': (0, 30),     # mg/g
    'RAC_mg_mmol': (0, 3.4), # mg/mmol
    'UrineHem': (0, 5),      # células/campo
    'UrineLeuco': (0, 5),    # células/campo

    # Hepatic
    'TGO': (10, 40),         # U/L
    'TGP': (7, 35),          # U/L
    'GamaGT': (8, 61),       # U/L
    'FosfAlc': (44, 147),    # U/L
    'BT': (0.3, 1.2),        # mg/dL - Bilirrubina total
    'BD': (0.0, 0.3),        # mg/dL - Bilirrubina direta
    'Albumina': (3.5, 5.0),  # g/dL
    'ProteinasTotais': (6.0, 8.3), # g/dL
    'RNI': (0.8, 1.2),       # INR

    # Inflammation (CRITICAL - Missing keys causing KeyErrors)
    'PCR': (0, 0.5),         # mg/dL - Critical missing key causing crashes
    'Procalcitonina': (0, 0.05), # ng/mL
    'Ferritina_M': (15, 300), # ng/mL
    'Ferritina_F': (12, 150), # ng/mL
    'Ferritina': (12, 300),   # ng/mL

    # Coagulation
    'TTPA': (25, 40),        # seconds
    'TP': (11, 15),          # seconds
    'Fibrinogeno': (200, 400), # mg/dL
    'D-dimer': (0, 500),     # ng/mL FEU

    # Pancreatic
    'Amilase': (30, 110),    # U/L
    'Lipase': (10, 140),     # U/L

    # Cardiac
    'Troponina': (0, 0.04),  # ng/mL
    'CKMB': (0, 6.3),        # ng/mL
    'CPK': (30, 200),        # U/L
    'BNP': (0, 100),         # pg/mL
    'NT-proBNP': (0, 125),   # pg/mL
    'LDH': (140, 280),       # U/L

    # Metabolic
    'Glicose': (70, 100),
    'HbA1c': (4.0, 5.7),
    'HbA1c_target': (6.5, 7.0),
    'AcidoUrico': (3.5, 7.2),
    'AcidoUrico_F': (2.5, 6.0),
    'CT': (None, 200),
    'LDL': (None, 100),
    'HDL_M': (40, None),
    'HDL_F': (50, None),
    'TG': (None, 150),
    'Nao_HDL': (None, 130),
    'TSH': (0.4, 4.0),
    'T4L': (0.7, 1.8),
    'T3L': (2.3, 4.2),

    # Thyroid
    'AntiTPO': (0, 34),      # IU/mL
    'AntiTG': (0, 115),      # IU/mL
    'TRAb': (0, 1.75),       # IU/L

    # Bone Metabolism
    'PTH': (15, 65),         # pg/mL
    'VitD': (30, 100),       # ng/mL
    'IonizedCalcium': (1.15, 1.32), # mmol/L

    # Tumor Markers
    'PSA': (0, 4),           # ng/mL
    'CA125': (0, 35),        # U/mL
    'CEA': (0, 3),           # ng/mL
    'AFP': (0, 10),          # ng/mL
    'CA19-9': (0, 37),       # U/mL
    'BetaHCG': (0, 5),       # mIU/mL

    # Autoimmune
    'AntiDsDNA': (0, 7),     # IU/mL
    'AntiSm': (0, 0.9),      # Index
    'AntiRNP': (0, 0.9),     # Index
    'AntiSSA': (0, 0.9),     # Index
    'AntiSSB': (0, 0.9),     # Index
    'ANCA': (0, 20),         # AU/mL
    'C3': (90, 180),         # mg/dL
    'C4': (10, 40),          # mg/dL

    # Infectious Disease
    'HIV': (0, 0.9),         # Index
    'HBsAg': (0, 0.9),       # Index
    'AntiHBs': (0, 10),      # mIU/mL
    'AntiHBc': (0, 0.9),     # Index
    'HCV': (0, 0.9),         # Index
    'Syphilis': (0, 0.9),    # Index
    'EBV': (0, 0.9),         # Index
    'CMV': (0, 0.9),         # Index
    'Toxo': (0, 0.9),        # Index

    # Hormones
    'Cortisol_AM': (5, 25),  # µg/dL
    'Cortisol_PM': (2, 12),  # µg/dL
    'Prolactin': (2, 25),    # ng/mL
    'Testosterone': (280, 1100), # ng/dL
    'Estradiol': (15, 350),  # pg/mL
    'Progesterone': (0.2, 25), # ng/mL
    'LH': (1.7, 8.6),        # mIU/mL
    'FSH': (1.5, 12.4),      # mIU/mL
    'DHEAS': (35, 430),      # µg/dL

    # Drug Monitoring
    'Digoxin': (0.8, 2.0),   # ng/mL
    'Phenytoin': (10, 20),   # µg/mL
    'Carbamazepine': (4, 12), # µg/mL
    'ValproicAcid': (50, 100), # µg/mL
    'Lithium': (0.6, 1.2),   # mEq/L
    'Gentamicin': (5, 10),   # µg/mL
    'Vancomycin': (10, 20),  # µg/mL
    'Theophylline': (10, 20), # µg/mL
}

def get_reference_range(test_name: str, sex: Optional[str] = None) -> Optional[Range]:
    """
    Retrieves the reference range for a given test, considering gender if applicable.
    """
    if sex:
        sex_specific_key = f"{test_name}_{sex.upper()}"
        if sex_specific_key in REFERENCE_RANGES:
            return REFERENCE_RANGES[sex_specific_key]
    
    return REFERENCE_RANGES.get(test_name)
def is_abnormal(test_name: str, value: float, sex: Optional[str] = None) -> bool:
    """
    Checks if a given lab result is abnormal.
    """
    reference_range = get_reference_range(test_name, sex)
    if reference_range is None:
        return False  # Cannot determine abnormality without a reference range
    
    low, high = reference_range
    if low is not None and value < low:
        return True
    if high is not None and value > high:
        return True
    return False

def get_reference_range_text(test_name: str, sex: Optional[str] = None) -> str:
    """
    Returns a human-readable string for the reference range.
    """
    reference_range = get_reference_range(test_name, sex)
    if reference_range is None:
        return "N/A"
    
    low, high = reference_range
    if low is None and high is not None:
        return f"< {high}"
    if low is not None and high is None:
        return f"> {low}"
    if low is not None and high is not None:
        return f"{low} - {high}"
    return "N/A"