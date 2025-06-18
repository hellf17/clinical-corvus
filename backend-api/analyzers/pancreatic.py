"""
Pancreatic function analysis module for interpreting pancreatic enzyme tests.
"""

from typing import Dict, List, Optional
import logging

from utils.reference_ranges import REFERENCE_RANGES

logger = logging.getLogger(__name__)

def _safe_convert_to_float(value_str: Optional[str]) -> Optional[float]:
    if value_str is None:
        return None
    
    cleaned_value_str = str(value_str).strip() # Ensure input is string

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

def analisar_funcao_pancreatica(dados: Dict[str, any]) -> Dict[str, any]:
    """
    Analyze pancreatic enzyme tests (Amilase, Lipase) and provide clinical interpretation.
    
    Args:
        dados: Dictionary containing pancreatic enzyme parameters (Amilase, Lipase).
        
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
            value_str = str(value) if not isinstance(value, str) else value
            converted_value = _safe_convert_to_float(value_str)
            if converted_value is not None:
                processed_dados[key] = converted_value
                details_dict[key] = converted_value
            else:
                processed_dados[key] = None
                logger.info(f"Could not convert pancreatic param {key}: '{value}' using _safe_convert_to_float. It will be ignored.")
        else:
            processed_dados[key] = None

    valid_keys = ['Amilase', 'Lipase']
    if not any(k in processed_dados and processed_dados[k] is not None for k in valid_keys):
        return {
            "interpretation": "Dados insuficientes para análise da função pancreática.",
            "abnormalities": [], "is_critical": False, "recommendations": [], "details": details_dict
        }

    amilase = processed_dados.get('Amilase')
    lipase = processed_dados.get('Lipase')

    amilase_ref_min, amilase_ref_max = (None, None)
    if 'Amilase' in REFERENCE_RANGES:
        amilase_ref_min, amilase_ref_max = REFERENCE_RANGES['Amilase']
    else:
        interpretations_list.append("Faixa de referência para Amilase não encontrada.")

    lipase_ref_min, lipase_ref_max = (None, None)
    if 'Lipase' in REFERENCE_RANGES:
        lipase_ref_min, lipase_ref_max = REFERENCE_RANGES['Lipase']
    else:
        interpretations_list.append("Faixa de referência para Lipase não encontrada.")

    if amilase is not None and amilase_ref_max is not None and amilase_ref_min is not None:
        interpretation = f"Amilase: {amilase} U/L (Ref: {amilase_ref_min}-{amilase_ref_max})."
        if amilase > amilase_ref_max:
            abnormalities_list.append("Amilase Elevada")
            if amilase > 3 * amilase_ref_max:
                interpretation += " Elevada (>3x LSN). Sugestivo de pancreatite aguda."
                recommendations_list.append("Amilase >3x LSN: Considerar pancreatite aguda. Avaliar com imagem abdominal se dor presente. Lipase é mais específica.")
                is_critical_flag = True # Significant elevation
            else: # Elevated but not >3x ULN
                interpretation += " Elevada (<3x LSN)."
                recommendations_list.append("Amilase elevada (<3x LSN): Avaliar em conjunto com Lipase e quadro clínico. Ver outras causas de hiperamilasemia.")
                interpretations_list.append("Causas de Amilase elevada (<3x LSN) incluem: pancreatite inicial/resolução, caxumba, doença salivar, insuficiência renal, cetoacidose, apendicite, colecistite, obstrução intestinal, gravidez ectópica, macroamilasemia. Lipase é mais específica para pancreatite.")
        elif amilase < amilase_ref_min:
            interpretation += " Baixa." # Low amylase is usually not clinically significant on its own
            abnormalities_list.append("Amilase Baixa")
        else:
            interpretation += " Normal."
        interpretations_list.append(interpretation)
    elif amilase is not None:
        interpretations_list.append(f"Amilase: {amilase} U/L (Faixa de referência não totalmente definida).")


    if lipase is not None and lipase_ref_max is not None and lipase_ref_min is not None:
        interpretation = f"Lipase: {lipase} U/L (Ref: {lipase_ref_min}-{lipase_ref_max})."
        if lipase > lipase_ref_max:
            abnormalities_list.append("Lipase Elevada")
            if lipase > 3 * lipase_ref_max:
                interpretation += " Elevada (>3x LSN). Altamente sugestivo de pancreatite aguda."
                recommendations_list.append("Lipase >3x LSN: Pancreatite aguda provável. Manejo clínico e investigação etiológica.")
                is_critical_flag = True # Lipase is more specific and significant
            else: # Elevated but not >3x ULN
                interpretation += " Elevada (<3x LSN)."
                recommendations_list.append("Lipase elevada (<3x LSN): Considerar pancreatite se clínica compatível, mas avaliar outras causas se sintomas atípicos.")
                interpretations_list.append("Causas de Lipase elevada (<3x LSN) incluem: pancreatite inicial/leve, insuficiência renal, cetoacidose, colecistite, obstrução intestinal, apendicite, doença celíaca, medicamentos (ex: opiáceos).")
        elif lipase < lipase_ref_min:
            interpretation += " Baixa." # Low lipase is usually not clinically significant
            abnormalities_list.append("Lipase Baixa")
        else:
            interpretation += " Normal."
        interpretations_list.append(interpretation)
    elif lipase is not None:
        interpretations_list.append(f"Lipase: {lipase} U/L (Faixa de referência não totalmente definida).")
        
    if not interpretations_list and not abnormalities_list:
        interpretations_list.append("Nenhuma interpretação pancreática específica gerada com os dados fornecidos.")
    
    final_details_dict = {k: v for k, v in details_dict.items() if v is not None}

    return {
        "interpretation": "\n".join(interpretations_list),
        "abnormalities": list(dict.fromkeys(abnormalities_list)),
        "is_critical": is_critical_flag,
        "recommendations": list(dict.fromkeys(recommendations_list)),
        "details": final_details_dict
    } 