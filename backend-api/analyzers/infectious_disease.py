"""
Infectious Disease markers analysis module.
"""

from typing import Dict, List, Optional
import logging

from utils.reference_ranges import REFERENCE_RANGES

logger = logging.getLogger(__name__)

def _safe_convert_to_float(value_str: Optional[str]) -> Optional[float]:
    if value_str is None:
        return None
    
    cleaned_value_str = str(value_str).strip()

    if ',' in cleaned_value_str:
        cleaned_value_str = cleaned_value_str.replace('.', '').replace(',', '.')

    try:
        return float(cleaned_value_str)
    except ValueError:
        logger.warning(f"Could not convert '{value_str}' (cleaned: '{cleaned_value_str}') to float.")
        if cleaned_value_str.startswith('<'):
            try: return float(cleaned_value_str[1:])
            except ValueError: pass
        if cleaned_value_str.startswith('>'):
            try: return float(cleaned_value_str[1:])
            except ValueError: pass
        return None

def _get_criticality_level(param_name, value, thresholds):
    """
    Determine the criticality level of a parameter based on stratified thresholds.
    """
    if value is None:
        return ("UNKNOWN", f"{param_name} value is None")
    
    if 'critical' in thresholds:
        for threshold in thresholds['critical']:
            if isinstance(threshold, tuple):
                if threshold[0] <= value <= threshold[1]:
                    return ("CRITICAL", f"{param_name} CRITICAL: {value} - Life-threatening immediate")
            elif isinstance(threshold, (int, float)):
                if (threshold < 0 and value < abs(threshold)) or (threshold > 0 and value > threshold):
                    return ("CRITICAL", f"{param_name} CRITICAL: {value} - Life-threatening immediate")
    
    if 'significant' in thresholds:
        for threshold in thresholds['significant']:
            if isinstance(threshold, tuple):
                if threshold[0] <= value <= threshold[1]:
                    return ("SIGNIFICANT", f"{param_name} SIGNIFICANT: {value} - Potentially life-threatening urgent")
            elif isinstance(threshold, (int, float)):
                if (threshold < 0 and value < abs(threshold)) or (threshold > 0 and value > threshold):
                    return ("SIGNIFICANT", f"{param_name} SIGNIFICANT: {value} - Potentially life-threatening urgent")
    
    return ("MONITORING", f"{param_name} MONITORING: {value} - Significant morbidity risk prompt")

def analisar_marcadores_doencas_infecciosas(dados: Dict[str, any], idade: Optional[int] = None, sexo: Optional[str] = None) -> Dict[str, any]:
    """
    Analyze infectious disease markers and provide clinical interpretation.
    """
    interpretations_list: List[str] = []
    abnormalities_list: List[str] = []
    recommendations_list: List[str] = []
    is_critical_flag: bool = False
    details_dict: Dict[str, any] = {}

    processed_dados: Dict[str, any] = {}
    for key, value in dados.items():
        details_dict[key] = value
        # For serology, we often deal with strings like "Reagente" or "Não Reagente"
        # So we will keep them as strings and handle them in the logic
        processed_dados[key] = value

    valid_keys = ['HIV', 'HBsAg', 'AntiHBs', 'AntiHBc', 'HCV', 'Syphilis', 'EBV', 'CMV', 'Toxo']
    if not any(k in processed_dados and processed_dados[k] is not None for k in valid_keys):
        return {
            "interpretation": "Dados insuficientes para análise de marcadores de doenças infecciosas.",
            "abnormalities": [], "is_critical": False, "recommendations": [], "details": details_dict
        }

    # Interpretation logic here based on infectious_disease.md
    
    final_interpretation = "\n".join(interpretations_list) if interpretations_list else "Não foi possível gerar interpretação detalhada dos marcadores de doenças infecciosas."

    return {
        "interpretation": final_interpretation,
        "abnormalities": list(set(abnormalities_list)),
        "is_critical": is_critical_flag,
        "recommendations": list(set(recommendations_list)),
        "details": details_dict
    }