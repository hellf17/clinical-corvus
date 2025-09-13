"""
Bone Metabolism analysis module for interpreting bone-related lab tests.
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

def analisar_metabolismo_osseo(dados: Dict[str, any], idade: Optional[int] = None, sexo: Optional[str] = None) -> Dict[str, any]:
    """
    Analyze bone metabolism tests and provide clinical interpretation.
    
    Args:
        dados: Dictionary containing bone metabolism parameters
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
                details_dict[key] = float(value)
            else:
                value_str = str(value)
                converted_value = _safe_convert_to_float(value_str)
                if converted_value is not None:
                    processed_dados[key] = converted_value
                    details_dict[key] = converted_value
                else:
                    processed_dados[key] = None
                    logger.info(f"Could not convert bone metabolism param {key}: '{value}'. It will be ignored.")
        else:
            processed_dados[key] = None
            logger.info(f"Bone metabolism param {key} is None. It will be ignored.")

    valid_keys = ['Ca', 'P', 'PTH', 'VitD', 'FosfAlc', 'IonizedCalcium']
    if not any(k in processed_dados and processed_dados[k] is not None for k in valid_keys):
        return {
            "interpretation": "Dados insuficientes para análise do metabolismo ósseo.",
            "abnormalities": [], "is_critical": False, "recommendations": [], "details": details_dict
        }

    calcium = processed_dados.get('Ca')
    phosphorus = processed_dados.get('P')
    pth = processed_dados.get('PTH')
    vit_d = processed_dados.get('VitD')
    fosf_alc = processed_dados.get('FosfAlc')
    ionized_calcium = processed_dados.get('IonizedCalcium')
    albumin = processed_dados.get('Albumina')

    if calcium is not None and albumin is not None:
        corrected_calcium = calcium + 0.8 * (4 - albumin)
        details_dict['CorrectedCalcium'] = corrected_calcium
        interpretations_list.append(f"Cálcio corrigido pela albumina: {corrected_calcium:.2f} mg/dL")
        calcium_to_interpret = corrected_calcium
    else:
        calcium_to_interpret = calcium

    if calcium_to_interpret is not None:
        ca_ref_min, ca_ref_max = REFERENCE_RANGES.get('Ca++', (8.5, 10.5))
        if calcium_to_interpret > ca_ref_max:
            abnormalities_list.append("Hipercalcemia")
            interpretations_list.append("Hipercalcemia detectada.")
            if pth is not None and pth > REFERENCE_RANGES.get('PTH', (15,65))[1]:
                interpretations_list.append("Hipercalcemia com PTH elevado sugere hiperparatireoidismo primário.")
                abnormalities_list.append("Hiperparatireoidismo Primário")
        elif calcium_to_interpret < ca_ref_min:
            abnormalities_list.append("Hipocalcemia")
            interpretations_list.append("Hipocalcemia detectada.")
            if pth is not None and pth < REFERENCE_RANGES.get('PTH', (15,65))[0]:
                 interpretations_list.append("Hipocalcemia com PTH baixo sugere hipoparatireoidismo.")
                 abnormalities_list.append("Hipoparatireoidismo")

    if vit_d is not None:
        vitd_ref_min, vitd_ref_max = REFERENCE_RANGES.get('VitD', (30, 100))
        if vit_d < 20:
            abnormalities_list.append("Deficiência de Vitamina D")
            interpretations_list.append("Deficiência de Vitamina D (<20 ng/mL).")
            recommendations_list.append("Reposição de vitamina D é recomendada.")
        elif vit_d < vitd_ref_min:
            abnormalities_list.append("Insuficiência de Vitamina D")
            interpretations_list.append("Insuficiência de Vitamina D (20-30 ng/mL).")

    final_interpretation = "\n".join(interpretations_list) if interpretations_list else "Não foi possível gerar interpretação detalhada do metabolismo ósseo."

    return {
        "interpretation": final_interpretation,
        "abnormalities": list(set(abnormalities_list)),
        "is_critical": is_critical_flag,
        "recommendations": list(set(recommendations_list)),
        "details": details_dict
    }