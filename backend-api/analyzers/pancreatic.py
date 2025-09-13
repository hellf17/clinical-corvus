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
    
    # Check critical thresholds
    if 'critical' in thresholds:
        for threshold in thresholds['critical']:
            if isinstance(threshold, tuple):  # Range (low, high)
                if threshold[0] <= value <= threshold[1]:
                    return ("CRITICAL", f"{param_name} CRITICAL: {value} - Life-threatening immediate")
            elif isinstance(threshold, (int, float)):  # Single value comparison
                if (threshold < 0 and value < abs(threshold)) or (threshold > 0 and value > threshold):
                    return ("CRITICAL", f"{param_name} CRITICAL: {value} - Life-threatening immediate")
    
    # Check significant thresholds
    if 'significant' in thresholds:
        for threshold in thresholds['significant']:
            if isinstance(threshold, tuple):  # Range (low, high)
                if threshold[0] <= value <= threshold[1]:
                    return ("SIGNIFICANT", f"{param_name} SIGNIFICANT: {value} - Potentially life-threatening urgent")
            elif isinstance(threshold, (int, float)):  # Single value comparison
                if (threshold < 0 and value < abs(threshold)) or (threshold > 0 and value > threshold):
                    return ("SIGNIFICANT", f"{param_name} SIGNIFICANT: {value} - Potentially life-threatening urgent")
    
    # Default to monitoring
    return ("MONITORING", f"{param_name} MONITORING: {value} - Significant morbidity risk prompt")

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
                    logger.info(f"Could not convert pancreatic param {key}: '{value}'. It will be ignored.")
        else:
            processed_dados[key] = None
            logger.info(f"Pancreatic param {key} is None. It will be ignored.")

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
        amilase_criticality, amilase_description = _get_criticality_level("Amilase", amilase, {
            'critical': [3 * amilase_ref_max, float('inf')],
            'significant': [(amilase_ref_max, 3 * amilase_ref_max)],
            'monitoring': [(-float('inf'), amilase_ref_max)]
        })
        interpretations_list.append(amilase_description)
        if amilase_criticality in ["CRITICAL", "SIGNIFICANT"]:
            is_critical_flag = True

        interpretation = f"Amilase: {amilase} U/L (Ref: {amilase_ref_min}-{amilase_ref_max})."
        if amilase > amilase_ref_max:
            abnormalities_list.append("Amilase Elevada")
            if amilase > 3 * amilase_ref_max:
                interpretation += " Elevada (>3x LSN). Sugestivo de pancreatite aguda."
                recommendations_list.append("Amilase >3x LSN: Considerar pancreatite aguda. Avaliar com imagem abdominal se dor presente. Lipase é mais específica. Segundo as diretrizes ACG 2019, amilase >3x LSN sugere pancreatite aguda com sensibilidade de 70-80%.")
                # Add specific treatment recommendations
                recommendations_list.append("TREATMENT RECOMMENDATIONS: Segundo as diretrizes ACG 2019, iniciar jejum GI, hidratação venosa agressiva (250-500 mL/hora nas primeiras 24h), analgesia com paracetamol ou opioides se necessário. Evitar antibióticos profiláticos em pancreatite biliar leve.")
                recommendations_list.append("SPECIALIST CONSULTATION RECOMMENDED: Gastroenterologista para manejo de pancreatite aguda. Considerar CPRE se suspeita de coledocolitíase e colangite.")
            else: # Elevated but not >3x ULN
                interpretation += " Elevada (<3x LSN)."
                recommendations_list.append("Amilase elevada (<3x LSN): Avaliar em conjunto com Lipase e quadro clínico. Ver outras causas de hiperamilasemia. Segundo as diretrizes ACG 2019, amilase elevada <3x LSN tem baixa especificidade para pancreatite.")
                interpretations_list.append("Causas de Amilase elevada (<3x LSN) incluem: pancreatite inicial/resolução, caxumba, doença salivar, insuficiência renal, cetoacidose, apendicite, colecistite, obstrução intestinal, gravidez ectópica, macroamilasemia. Lipase é mais específica para pancreatite.")
                recommendations_list.append("DIAGNOSTIC WORKUP RECOMMENDED: Para suspeita de pancreatite, solicitar lipase, cálcio, triglicerídeos e imagem abdominal (USG/TC). Para suspeita de caxumba, verificar histórico de vacinação e contato com doentes.")
        elif amilase < amilase_ref_min:
            interpretation += " Baixa." # Low amylase is usually not clinically significant on its own
            abnormalities_list.append("Amilase Baixa")
            recommendations_list.append("Segundo as diretrizes ACG 2019, amilase baixa não tem significado clínico isolado. Repetir se suspeita de pancreatite com lipase normal.")
        else:
            interpretation += " Normal."
            recommendations_list.append("Segundo as diretrizes ACG 2019, amilase normal indica ausência de pancreatite aguda com alta probabilidade negativa. Correlacionar com lipase e quadro clínico.")
        interpretations_list.append(interpretation)
    elif amilase is not None:
        interpretations_list.append(f"Amilase: {amilase} U/L (Faixa de referência não totalmente definida).")


    if lipase is not None and lipase_ref_max is not None and lipase_ref_min is not None:
        lipase_criticality, lipase_description = _get_criticality_level("Lipase", lipase, {
            'critical': [3 * lipase_ref_max, float('inf')],
            'significant': [(lipase_ref_max, 3 * lipase_ref_max)],
            'monitoring': [(-float('inf'), lipase_ref_max)]
        })
        interpretations_list.append(lipase_description)
        if lipase_criticality in ["CRITICAL", "SIGNIFICANT"]:
            is_critical_flag = True

        interpretation = f"Lipase: {lipase} U/L (Ref: {lipase_ref_min}-{lipase_ref_max})."
        if lipase > lipase_ref_max:
            abnormalities_list.append("Lipase Elevada")
            if lipase > 3 * lipase_ref_max:
                interpretation += " Elevada (>3x LSN). Altamente sugestivo de pancreatite aguda."
                recommendations_list.append("Lipase >3x LSN: Pancreatite aguda provável. Manejo clínico e investigação etiológica. Segundo as diretrizes ACG 2019, lipase >3x LSN tem sensibilidade de 90-95% e especificidade de 85-90% para pancreatite aguda.")
                # Add specific treatment recommendations
                recommendations_list.append("TREATMENT RECOMMENDATIONS: Segundo as diretrizes ACG 2019, iniciar jejum GI, hidratação venosa agressiva (250-500 mL/hora nas primeiras 24h), analgesia com paracetamol ou opioides se necessário. Evitar antibióticos profiláticos em pancreatite biliar leve.")
                recommendations_list.append("SPECIALIST CONSULTATION RECOMMENDED: Gastroenterologista para manejo de pancreatite aguda. Considerar CPRE se suspeita de coledocolitíase e colangite. Avaliar necessidade de necrosectomia se necrose pancreática infectada.")
            else: # Elevated but not >3x ULN
                interpretation += " Elevada (<3x LSN)."
                recommendations_list.append("Lipase elevada (<3x LSN): Considerar pancreatite se clínica compatível, mas avaliar outras causas se sintomas atípicos. Segundo as diretrizes ACG 2019, lipase 1.5-3x LSN pode indicar pancreatite leve ou em resolução.")
                interpretations_list.append("Causas de Lipase elevada (<3x LSN) incluem: pancreatite inicial/leve, insuficiência renal, cetoacidose, colecistite, obstrução intestinal, apendicite, doença celíaca, medicamentos (ex: opiáceos).")
                recommendations_list.append("DIAGNOSTIC WORKUP RECOMMENDED: Para suspeita de pancreatite, solicitar cálcio, triglicerídeos e imagem abdominal (USG/TC). Para suspeita de insuficiência renal, solicitar creatinina e ureia. Para suspeita de cetoacidose, solicitar glicose, cetona urinária/sérica.")
        elif lipase < lipase_ref_min:
            interpretation += " Baixa." # Low lipase is usually not clinically significant
            abnormalities_list.append("Lipase Baixa")
            recommendations_list.append("Segundo as diretrizes ACG 2019, lipase baixa não tem significado clínico isolado. Repetir se suspeita de pancreatite com amilase normal.")
        else:
            interpretation += " Normal."
            recommendations_list.append("Segundo as diretrizes ACG 2019, lipase normal indica ausência de pancreatite aguda com alta probabilidade negativa. Correlacionar com amilase e quadro clínico.")
        interpretations_list.append(interpretation)
    elif lipase is not None:
        interpretations_list.append(f"Lipase: {lipase} U/L (Faixa de referência não totalmente definida).")
        
    if not interpretations_list and not abnormalities_list:
        interpretations_list.append("Nenhuma interpretação pancreática específica gerada com os dados fornecidos.")
    
    # Add general recommendations for all cases
    if amilase is not None or lipase is not None:
        recommendations_list.append("GENERAL RECOMMENDATIONS: Segundo as diretrizes ACG 2019, amilase e lipase devem ser solicitados juntos para diagnóstico de pancreatite aguda. Lipase é mais específica e persiste elevada por mais tempo.")
        recommendations_list.append("DIAGNOSTIC WORKUP RECOMMENDED: Para suspeita de pancreatite, solicitar cálcio, triglicerídeos, função renal e imagem abdominal (USG/TC). Para pancreatite recorrente, investigar causas genéticas (PRSS1, SPINK1, CFTR).")
        recommendations_list.append("PATIENT EDUCATION: Informar sobre dieta pobre em gordura e álcool após episódio de pancreatite. Sintomas como dor abdominal intensa, náusea, vômito devem ser relatados imediatamente.")
    
    final_details_dict = {k: v for k, v in details_dict.items() if v is not None}

    return {
        "interpretation": "\n".join(interpretations_list),
        "abnormalities": list(dict.fromkeys(abnormalities_list)),
        "is_critical": is_critical_flag,
        "recommendations": list(dict.fromkeys(recommendations_list)),
        "details": final_details_dict
    }