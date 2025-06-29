from typing import Dict, Any, List, Optional
from utils.reference_ranges import REFERENCE_RANGES
import math
import logging

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

def analisar_marcadores_inflamatorios(data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
    """
    Analisa marcadores inflamatórios.
    """
    interpretations: List[str] = []
    abnormalities: List[str] = []
    recommendations: List[str] = []
    is_critical = False
    processed_markers = False
    details: Dict[str, Any] = {}

    # PCR (Proteína C Reativa)
    # Expected key from obter_unidade/obter_valores_referencia and normalizer: 'PCR' or 'proteína c reativa'
    # For data dict, it's likely the short form like 'PCR' if from PDF, or normalized name if direct.
    pcr_keys = ['PCR', 'proteína c reativa', 'pcr']
    pcr_val_data = None
    for key in pcr_keys:
        if key in data:
            pcr_val_data = data[key]
            break
    
    if pcr_val_data is not None:
        processed_markers = True
        try:
            pcr_val = _safe_convert_to_float(pcr_val_data)
            if pcr_val is not None:
                details['PCR'] = pcr_val
                pcr_ref_min, pcr_ref_max = REFERENCE_RANGES['PCR']
                details['PCR_ref'] = f"{pcr_ref_min}-{pcr_ref_max} mg/dL"

                if pcr_val > pcr_ref_max:
                    interpretations.append(f"Proteína C Reativa (PCR) acentuadamente elevada: {pcr_val} mg/dL.")
                    abnormalities.append(f"PCR acentuadamente elevada ({pcr_val} mg/dL)")
            pcr_val = float(pcr_val_data)
            # Reference: utils.reference_ranges.REFERENCE_RANGES['PCR'] = (0, 0.5) # mg/dL
            if pcr_val > 5.0: # Significantly elevated
                interpretations.append(f"Proteína C Reativa (PCR) acentuadamente elevada: {pcr_val} mg/dL.")
                abnormalities.append(f"PCR acentuadamente elevada ({pcr_val} mg/dL)")
                recommendations.append("Investigar processo inflamatório/infeccioso agudo. Considerar marcadores adicionais e exames de imagem se clinicamente indicado.")
                is_critical = True
            elif pcr_val > 0.5:
                interpretations.append(f"Proteína C Reativa (PCR) elevada: {pcr_val} mg/dL.")
                abnormalities.append(f"PCR elevada ({pcr_val} mg/dL)")
                recommendations.append("Sugere processo inflamatório/infeccioso. Correlacionar com clínica.")
            else:
                interpretations.append(f"Proteína C Reativa (PCR) dentro dos valores de referência: {pcr_val} mg/dL.")
        except (ValueError, TypeError):
            interpretations.append(f"Valor de PCR não numérico: {pcr_val_data}.")

    # VHS (Velocidade de Hemossedimentação)
    # Expected key: 'VHS' or 'velocidade de hemossedimentação'
    vhs_keys = ['VHS', 'velocidade de hemossedimentação', 'vhs']
    vhs_val_data = None
    for key in vhs_keys:
        if key in data:
            vhs_val_data = data[key]
            break

    if vhs_val_data is not None:
        processed_markers = True
        try:
            vhs_val = float(vhs_val_data)
            patient_sex = kwargs.get('sexo', 'male').lower() # Default to male if sex not provided
            
            vhs_ref_low, vhs_ref_high = (None, None)
            if patient_sex == 'female':
                vhs_ref_low, vhs_ref_high = REFERENCE_RANGES.get('VHS_Female', (0, 20)) # Default female range
            else: # Male or unknown
                vhs_ref_low, vhs_ref_high = REFERENCE_RANGES.get('VHS_Male', (0, 15)) # Default male range

            if vhs_val > vhs_ref_high:
                interpretations.append(f"Velocidade de Hemossedimentação (VHS) elevada: {vhs_val} mm/h (Ref: <{vhs_ref_high} mm/h).")
                abnormalities.append(f"VHS elevada ({vhs_val} mm/h)")
                if not recommendations: # Add general recommendation if not already present from PCR
                    recommendations.append("Correlacionar com quadro clínico para investigação de processo inflamatório, infeccioso ou neoplásico.")
            else:
                interpretations.append(f"Velocidade de Hemossedimentação (VHS) dentro dos valores de referência: {vhs_val} mm/h (Ref: <{vhs_ref_high} mm/h).")
        except (ValueError, TypeError):
            interpretations.append(f"Valor de VHS não numérico: {vhs_val_data}.")

    # Procalcitonina (PCT)
    pct_keys = ['Procalcitonina', 'PCT', 'procalcitonina', 'pct']
    pct_val_data = None
    for key in pct_keys:
        if key in data:
            pct_val_data = data[key]
            break
    
    if pct_val_data is not None:
        processed_markers = True
        try:
            pct_val = float(pct_val_data)
            # Ref: REFERENCE_RANGES['Procalcitonina'] = (0, 0.05) ng/mL
            # Thresholds for interpretation:
            # < 0.05: Normal (low likelihood of bacterial infection)
            # 0.05 - 0.49: Slightly elevated (unlikely systemic bacterial infection, consider local or other inflammation)
            # 0.5 - 1.99: Moderate risk of systemic bacterial infection (sepsis possible)
            # 2.0 - 9.99: High risk of severe systemic bacterial infection (severe sepsis likely)
            # >= 10.0: Very high likelihood of septic shock

            interpretation_pct = f"Procalcitonina (PCT): {pct_val} ng/mL. "
            if pct_val >= 10.0:
                interpretation_pct += "Valor muito elevado, alta probabilidade de choque séptico."
                abnormalities.append(f"Procalcitonina muito elevada ({pct_val} ng/mL) - Risco de choque séptico")
                recommendations.append("PCT > 10 ng/mL: Iniciar/escalonar antibioticoterapia empírica de amplo espectro imediatamente. Manejo agressivo da sepse.")
                is_critical = True
            elif pct_val >= 2.0:
                interpretation_pct += "Valor elevado, alta probabilidade de sepse bacteriana grave."
                abnormalities.append(f"Procalcitonina elevada ({pct_val} ng/mL) - Risco de sepse grave")
                recommendations.append("PCT 2-10 ng/mL: Considerar fortemente infecção bacteriana sistêmica. Avaliar início/ajuste de antibióticos.")
                is_critical = True
            elif pct_val >= 0.5:
                interpretation_pct += "Valor moderadamente elevado, sugere possível infecção bacteriana sistêmica."
                abnormalities.append(f"Procalcitonina moderadamente elevada ({pct_val} ng/mL)")
                recommendations.append("PCT 0.5-2 ng/mL: Infecção bacteriana sistêmica possível. Monitorar clinicamente e considerar outros marcadores.")
            elif pct_val > 0.05:
                interpretation_pct += "Valor discretamente elevado. Baixa probabilidade de infecção bacteriana sistêmica, mas não exclui infecção localizada ou outras causas inflamatórias."
                abnormalities.append(f"Procalcitonina discretamente elevada ({pct_val} ng/mL)")
            else: # <= 0.05
                interpretation_pct += "Dentro do valor de referência. Baixa probabilidade de infecção bacteriana sistêmica significativa."
            interpretations.append(interpretation_pct)

        except (ValueError, TypeError):
            interpretations.append(f"Valor de Procalcitonina não numérico: {pct_val_data}.")

    # Ferritina
    ferritina_keys = ['Ferritina', 'ferritina']
    ferritina_val_data = None
    for key in ferritina_keys:
        if key in data:
            ferritina_val_data = data[key]
            break
    
    if ferritina_val_data is not None:
        processed_markers = True
        try:
            ferritina_val = float(ferritina_val_data)
            patient_sex = kwargs.get('sexo', 'male').lower()
            ferritina_ref_key = 'Ferritina_Male' if patient_sex == 'male' else 'Ferritina_Female'
            
            fer_ref_low, fer_ref_high = (None, None)
            if ferritina_ref_key in REFERENCE_RANGES:
                fer_ref_low, fer_ref_high = REFERENCE_RANGES[ferritina_ref_key]
            
            interpretation_fer = f"Ferritina: {ferritina_val} ng/mL. "
            if fer_ref_low is not None and fer_ref_high is not None:
                if ferritina_val < fer_ref_low:
                    interpretation_fer += f"Valor baixo (Ref {patient_sex.capitalize()}: {fer_ref_low}-{fer_ref_high} ng/mL). Sugere deficiência de ferro."
                    abnormalities.append(f"Ferritina baixa ({ferritina_val} ng/mL) - Deficiência de Ferro")
                    recommendations.append("Ferritina baixa: Investigar e tratar deficiência de ferro.")
                elif ferritina_val > fer_ref_high:
                    interpretation_fer += f"Valor elevado (Ref {patient_sex.capitalize()}: {fer_ref_low}-{fer_ref_high} ng/mL). "
                    if ferritina_val > 1000:
                        interpretation_fer += "Nível muito elevado. Pode indicar inflamação/infecção severa, doença hepática, sobrecarga de ferro significativa ou hemocromatose. "
                        recommendations.append("Ferritina > 1000 ng/mL: Investigar inflamação severa, doença hepática, e sobrecarga de ferro (ex: saturação de transferrina, estudos genéticos para hemocromatose se indicado).")
                        abnormalities.append(f"Ferritina muito elevada ({ferritina_val} ng/mL) - Sobrecarga de Ferro?/Inflamação Grave?")
                    else:
                        interpretation_fer += "Pode ser um reagente de fase aguda (inflamação/infecção) ou indicar sobrecarga de ferro. "
                        recommendations.append("Ferritina elevada: Correlacionar com outros marcadores inflamatórios e, se suspeita de sobrecarga de ferro, avaliar saturação de transferrina.")
                        abnormalities.append(f"Ferritina elevada ({ferritina_val} ng/mL) - Fase Aguda?/Sobrecarga Ferro?")
                else:
                    interpretation_fer += f"Dentro dos valores de referência (Ref {patient_sex.capitalize()}: {fer_ref_low}-{fer_ref_high} ng/mL)."
            else:
                interpretation_fer += "Faixa de referência para sexo não encontrada ou não definida."
            interpretations.append(interpretation_fer)
        except (ValueError, TypeError):
            interpretations.append(f"Valor de Ferritina não numérico: {ferritina_val_data}.")

    # Add Ferritina, Procalcitonina etc. as needed

    if not processed_markers:
        interpretations.append("Nenhum marcador inflamatório comum (PCR, VHS) fornecido ou reconhecido para análise.")
    elif not abnormalities and interpretations: # Markers processed, but all normal
        interpretations.append("Principais marcadores inflamatórios avaliados estão dentro dos limites da normalidade.")


    final_interpretation = "\n".join(filter(None, interpretations))
    if not final_interpretation and processed_markers and not abnormalities :
        final_interpretation = "Marcadores inflamatórios analisados dentro da faixa de referência."
    elif not final_interpretation and not processed_markers:
        final_interpretation = "Dados insuficientes para análise de marcadores inflamatórios."


    return {
        "interpretation": final_interpretation if final_interpretation else "Não foi possível gerar uma interpretação para os marcadores inflamatórios.",
        "abnormalities": list(set(abnormalities)), # Ensure unique
        "is_critical": is_critical,
        "recommendations": list(set(recommendations)), # Ensure unique
        "details": {} # Analyzers provide interpretation, not reformatted lab results
    } 