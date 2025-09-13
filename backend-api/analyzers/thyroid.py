"""
Thyroid function analysis module for interpreting thyroid function tests.
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
    
    Args:
        param_name: Name of the parameter
        value: The value to evaluate
        thresholds: Dictionary with 'critical', 'significant', and 'monitoring' thresholds
        
    Returns:
        tuple: (criticality_level, description)
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

def analisar_funcao_tireoidiana(dados: Dict[str, any], idade: Optional[int] = None, sexo: Optional[str] = None) -> Dict[str, any]:
    """
    Analyze thyroid function tests and provide clinical interpretation.
    
    Args:
        dados: Dictionary containing thyroid function parameters
        idade: Patient's age in years (for interpretation)
        sexo: Patient's sex ('M' or 'F') for gender-specific considerations
        
    Returns:
        dict: Dictionary containing detailed interpretation, abnormalities, critical status,
              recommendations, and specific parameters.
    """
    interpretations_list: List[str] = []
    abnormalities_list: List[str] = []
    recommendations_list: List[str] = []
    is_critical_flag: bool = False
    details_dict: Dict[str, any] = {}

    processed_dados: Dict[str, Optional[float]] = {}
    for key, value in dados.items():
        details_dict[key] = value 
        if value is not None:
            if isinstance(value, (int, float)):
                processed_dados[key] = float(value)
                details_dict[key] = float(value) # Keep details_dict updated
            else:
                value_str = str(value)
                converted_value = _safe_convert_to_float(value_str)
                if converted_value is not None:
                    processed_dados[key] = converted_value
                    details_dict[key] = converted_value # Keep details_dict updated
                else:
                    processed_dados[key] = None
                    logger.info(f"Could not convert thyroid param {key}: '{value}'. It will be ignored.")
        else:
            processed_dados[key] = None
            logger.info(f"Thyroid param {key} is None. It will be ignored.")

    valid_keys = ['TSH', 'T4L', 'T3L', 'AntiTPO', 'AntiTG', 'TRAb']
    if not any(k in processed_dados and processed_dados[k] is not None for k in valid_keys):
        return {
            "interpretation": "Dados insuficientes para análise da função tireoidiana.",
            "abnormalities": [], "is_critical": False, "recommendations": [], "details": details_dict
        }

    tsh = processed_dados.get('TSH')
    t4l = processed_dados.get('T4L')
    t3l = processed_dados.get('T3L')
    anti_tpo = processed_dados.get('AntiTPO')
    anti_tg = processed_dados.get('AntiTG')
    trab = processed_dados.get('TRAb')

    tsh_ref_min, tsh_ref_max = REFERENCE_RANGES.get('TSH', (0.4, 4.0))
    t4l_ref_min, t4l_ref_max = REFERENCE_RANGES.get('T4L', (0.7, 1.8))
    
    if tsh is not None:
        if tsh < tsh_ref_min:
            abnormalities_list.append("TSH Baixo")
            if t4l is not None and t4l > t4l_ref_max:
                interpretations_list.append("TSH baixo com T4L alto: Sugestivo de hipertireoidismo primário.")
                abnormalities_list.append("Hipertireoidismo Primário")
                recommendations_list.append("Investigar causa do hipertireoidismo (Doença de Graves, bócio multinodular tóxico).")
            elif t4l is not None and t4l < t4l_ref_min:
                interpretations_list.append("TSH baixo com T4L baixo: Sugestivo de hipotireoidismo central/secundário.")
                abnormalities_list.append("Hipotireoidismo Central/Secundário")
                recommendations_list.append("Avaliação da função hipofisária é recomendada.")
            else: # T4L normal or not available
                interpretations_list.append("TSH baixo com T4L normal: Sugestivo de hipertireoidismo subclínico.")
                abnormalities_list.append("Hipertireoidismo Subclínico")
        elif tsh > tsh_ref_max:
            abnormalities_list.append("TSH Alto")
            if t4l is not None and t4l < t4l_ref_min:
                interpretations_list.append("TSH alto com T4L baixo: Sugestivo de hipotireoidismo primário.")
                abnormalities_list.append("Hipotireoidismo Primário")
                recommendations_list.append("Considerar iniciar reposição com levotiroxina.")
            elif t4l is not None and t4l > t4l_ref_max:
                interpretations_list.append("TSH alto com T4L alto: Raro. Considerar resistência ao hormônio tireoidiano ou TSHoma.")
                abnormalities_list.append("Resistência ao Hormônio Tireoidiano/TSHoma")
            else: # T4L normal or not available
                interpretations_list.append("TSH alto com T4L normal: Sugestivo de hipotireoidismo subclínico.")
                abnormalities_list.append("Hipotireoidismo Subclínico")
        else:
            interpretations_list.append("TSH dentro da faixa de referência.")

    if anti_tpo is not None:
        anti_tpo_ref_max = REFERENCE_RANGES.get('AntiTPO', (34,))[1]
        if anti_tpo > anti_tpo_ref_max:
            interpretations_list.append("Anti-TPO elevado: Sugere doença tireoidiana autoimune (Hashimoto ou Graves).")
            abnormalities_list.append("Anti-TPO Elevado")

    if anti_tg is not None:
        anti_tg_ref_max = REFERENCE_RANGES.get('AntiTG', (115,))[1]
        if anti_tg > anti_tg_ref_max:
            interpretations_list.append("Anti-TG elevado: Sugere doença tireoidiana autoimune.")
            abnormalities_list.append("Anti-TG Elevado")

    if trab is not None:
        trab_ref_max = REFERENCE_RANGES.get('TRAb', (1.75,))[1]
        if trab > trab_ref_max:
            interpretations_list.append("TRAb elevado: Altamente sugestivo de Doença de Graves.")
            abnormalities_list.append("TRAb Elevado (Doença de Graves)")

    final_interpretation = "\n".join(interpretations_list) if interpretations_list else "Não foi possível gerar interpretação detalhada da função tireoidiana."
    
    return {
        "interpretation": final_interpretation,
        "abnormalities": list(set(abnormalities_list)),
        "is_critical": is_critical_flag,
        "recommendations": list(set(recommendations_list)),
        "details": details_dict
    }