"""
Tumor Markers analysis module for interpreting cancer-related lab tests.
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

def analisar_marcadores_tumorais(dados: Dict[str, any], idade: Optional[int] = None, sexo: Optional[str] = None) -> Dict[str, any]:
    """
    Analyze tumor markers and provide clinical interpretation.
    
    Args:
        dados: Dictionary containing tumor marker parameters
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
                    logger.info(f"Could not convert tumor marker param {key}: '{value}'. It will be ignored.")
        else:
            processed_dados[key] = None
            logger.info(f"Tumor marker param {key} is None. It will be ignored.")

    valid_keys = ['PSA', 'CA125', 'CEA', 'AFP', 'CA19-9', 'BetaHCG', 'LDH']
    if not any(k in processed_dados and processed_dados[k] is not None for k in valid_keys):
        return {
            "interpretation": "Dados insuficientes para análise de marcadores tumorais.",
            "abnormalities": [], "is_critical": False, "recommendations": [], "details": details_dict
        }

    psa = processed_dados.get('PSA')
    if psa is not None:
        psa_ref_max = REFERENCE_RANGES.get('PSA', (0, 4))[1]
        if idade is not None:
            if idade > 70:
                psa_ref_max = 6.5
            elif idade > 60:
                psa_ref_max = 4.5
            elif idade > 50:
                psa_ref_max = 3.5
        
        if psa > psa_ref_max:
            abnormalities_list.append("PSA Elevado")
            interpretations_list.append(f"PSA elevado ({psa} ng/mL) para a idade. Recomenda-se avaliação urológica.")
            if psa > 10:
                recommendations_list.append("PSA > 10 ng/mL aumenta significativamente o risco de câncer de próstata.")
            if psa > 100:
                is_critical_flag = True
        else:
            interpretations_list.append("PSA dentro da faixa de referência para a idade.")

    ca125 = processed_dados.get('CA125')
    if ca125 is not None:
        ca125_ref_max = REFERENCE_RANGES.get('CA125', (0, 35))[1]
        if ca125 > ca125_ref_max:
            abnormalities_list.append("CA 125 Elevado")
            interpretations_list.append(f"CA 125 elevado ({ca125} U/mL). Pode estar associado a câncer de ovário, mas também a condições benignas.")
            recommendations_list.append("Avaliação ginecológica e exames de imagem são recomendados.")
            if ca125 > 1000:
                is_critical_flag = True

    cea = processed_dados.get('CEA')
    if cea is not None:
        cea_ref_max = REFERENCE_RANGES.get('CEA', (0, 3))[1]
        if cea > cea_ref_max:
            abnormalities_list.append("CEA Elevado")
            interpretations_list.append(f"CEA elevado ({cea} ng/mL). Marcador para adenocarcinomas, principalmente colorretal.")
            recommendations_list.append("Investigação para neoplasia colorretal ou outras adenocarcinomas (pulmão, mama, pâncreas).")
            if cea > 20:
                is_critical_flag = True
    
    afp = processed_dados.get('AFP')
    if afp is not None:
        afp_ref_max = REFERENCE_RANGES.get('AFP', (0,10))[1]
        if afp > afp_ref_max:
            abnormalities_list.append("AFP Elevado")
            interpretations_list.append(f"AFP elevado ({afp} ng/mL). Sugere carcinoma hepatocelular ou tumores de células germinativas.")
            if afp > 1000:
                is_critical_flag = True

    ca19_9 = processed_dados.get('CA19-9')
    if ca19_9 is not None:
        ca19_9_ref_max = REFERENCE_RANGES.get('CA19-9', (0,37))[1]
        if ca19_9 > ca19_9_ref_max:
            abnormalities_list.append("CA 19-9 Elevado")
            interpretations_list.append(f"CA 19-9 elevado ({ca19_9} U/mL). Associado a câncer de pâncreas e do trato biliar.")
            if ca19_9 > 1000:
                is_critical_flag = True

    beta_hcg = processed_dados.get('BetaHCG')
    if beta_hcg is not None:
        beta_hcg_ref_max = REFERENCE_RANGES.get('BetaHCG', (0,5))[1]
        if beta_hcg > beta_hcg_ref_max:
            abnormalities_list.append("Beta-HCG Elevado")
            interpretations_list.append(f"Beta-HCG elevado ({beta_hcg} mIU/mL). Considerar gravidez, tumores de células germinativas ou doença trofoblástica gestacional.")
            if beta_hcg > 100000:
                is_critical_flag = True

    final_interpretation = "\n".join(interpretations_list) if interpretations_list else "Não foi possível gerar interpretação detalhada dos marcadores tumorais."

    return {
        "interpretation": final_interpretation,
        "abnormalities": list(set(abnormalities_list)),
        "is_critical": is_critical_flag,
        "recommendations": list(set(recommendations_list)),
        "details": details_dict
    }