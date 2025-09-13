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
            if isinstance(pcr_val_data, (int, float)):
                pcr_val = float(pcr_val_data)
            else:
                pcr_val = _safe_convert_to_float(pcr_val_data)
            if pcr_val is not None:
                details['PCR'] = pcr_val
                pcr_ref_min, pcr_ref_max = REFERENCE_RANGES['PCR']
                details['PCR_ref'] = f"{pcr_ref_min}-{pcr_ref_max} mg/dL"

                # Reference: utils.reference_ranges.REFERENCE_RANGES['PCR'] = (0, 0.5) # mg/dL
                pcr_criticality, pcr_description = _get_criticality_level("PCR", pcr_val, {
                    'critical': [5.0, float('inf')],
                    'significant': [(1.0, 5.0)],
                    'monitoring': [(0.5, 1.0)]
                })
                interpretations.append(pcr_description)
                if pcr_criticality in ["CRITICAL", "SIGNIFICANT"]:
                    is_critical = True
                
                if pcr_val > 5.0: # Significantly elevated
                    interpretations.append(f"Proteína C Reativa (PCR) acentuadamente elevada: {pcr_val} mg/dL.")
                    abnormalities.append(f"PCR acentuadamente elevada ({pcr_val} mg/dL)")
                    recommendations.append("Investigar processo inflamatório/infeccioso agudo. Considerar marcadores adicionais e exames de imagem se clinicamente indicado. Segundo as diretrizes IDSA 2019, PCR >5 mg/dL sugere infecção bacteriana significativa.")
                    # Add specific treatment recommendations
                    recommendations.append("TREATMENT RECOMMENDATIONS: Para infecção bacteriana confirmada, iniciar antibioticoterapia empírica baseada no foco infeccioso e gravidade clínica. Monitorar PCR seriada para resposta ao tratamento.")
                elif pcr_val > pcr_ref_max:
                    interpretations.append(f"Proteína C Reativa (PCR) elevada: {pcr_val} mg/dL.")
                    abnormalities.append(f"PCR elevada ({pcr_val} mg/dL)")
                    recommendations.append("Sugere processo inflamatório/infeccioso. Correlacionar com clínica. Segundo as diretrizes ACR 2019, PCR 0.5-5 mg/dL indica inflamação leve a moderada.")
                    recommendations.append("DIAGNOSTIC WORKUP RECOMMENDED: Para suspeita de artrite reumatoide, solicitar FR e anti-CCP. Para suspeita de LES, solicitar ANA e anti-dsDNA. Para infecção, considerar hemoculturas e urocultura.")
                else:
                    interpretations.append(f"Proteína C Reativa (PCR) dentro dos valores de referência: {pcr_val} mg/dL.")
                    recommendations.append("Segundo as diretrizes ACR 2019, PCR <0.5 mg/dL indica ausência de inflamação significativa. Repetir se sintomas persistentes.")
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
            if isinstance(vhs_val_data, (int, float)):
                vhs_val = float(vhs_val_data)
            else:
                vhs_val = float(vhs_val_data)
            patient_sex = kwargs.get('sexo', 'male').lower() # Default to male if sex not provided
            
            vhs_ref_low, vhs_ref_high = (None, None)
            if patient_sex == 'female':
                vhs_ref_low, vhs_ref_high = REFERENCE_RANGES.get('VHS_Female', (0, 20)) # Default female range
            else: # Male or unknown
                vhs_ref_low, vhs_ref_high = REFERENCE_RANGES.get('VHS_Male', (0, 15)) # Default male range

            vhs_criticality, vhs_description = _get_criticality_level("VHS", vhs_val, {
                'critical': [100, float('inf')],
                'significant': [(50, 100)],
                'monitoring': [(vhs_ref_high, 50)] # Above normal, below significant
            })
            interpretations.append(vhs_description)
            if vhs_criticality in ["CRITICAL", "SIGNIFICANT"]:
                is_critical = True

            if vhs_val > vhs_ref_high:
                interpretations.append(f"Velocidade de Hemossedimentação (VHS) elevada: {vhs_val} mm/h (Ref: <{vhs_ref_high} mm/h).")
                abnormalities.append(f"VHS elevada ({vhs_val} mm/h)")
                if not recommendations: # Add general recommendation if not already present from PCR
                    recommendations.append("Correlacionar com quadro clínico para investigação de processo inflamatório, infeccioso ou neoplásico. Segundo as diretrizes ACR 2019, VHS > limite superior normal sugere inflamação sistêmica.")
                # Add specific diagnostic workup recommendations
                recommendations.append("DIAGNOSTIC WORKUP RECOMMENDED: Para suspeita de artrite reumatoide, solicitar FR, anti-CCP e radiografias articulares. Para suspeita de polimialgia reumática/giant cell arteritis, considerar biópsia de artéria temporal se idade >50 anos. Para suspeita de neoplasia, investigar sintomas sistêmicos e solicitar tomografia.")
                recommendations.append("PATIENT EDUCATION: Informar sobre importância de seguir investigação diagnóstica para identificar causa da inflamação. Sintomas como dor articular, rigidez matinal, febre, perda de peso devem ser relatados.")
            else:
                interpretations.append(f"Velocidade de Hemossedimentação (VHS) dentro dos valores de referência: {vhs_val} mm/h (Ref: <{vhs_ref_high} mm/h).")
                recommendations.append("Segundo as diretrizes ACR 2019, VHS normal indica ausência de inflamação sistêmica significativa. Repetir se sintomas persistentes ou clínica sugestiva de doença inflamatória.")
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
            if isinstance(pct_val_data, (int, float)):
                pct_val = float(pct_val_data)
            else:
                pct_val = float(pct_val_data)
            # Ref: REFERENCE_RANGES['Procalcitonina'] = (0, 0.05) ng/mL
            # Thresholds for interpretation:
            # < 0.05: Normal (low likelihood of bacterial infection)
            # 0.05 - 0.49: Slightly elevated (unlikely systemic bacterial infection, consider local or other inflammation)
            # 0.5 - 1.99: Moderate risk of systemic bacterial infection (sepsis possible)
            # 2.0 - 9.99: High risk of severe systemic bacterial infection (severe sepsis likely)
            # >= 10.0: Very high likelihood of septic shock

            interpretation_pct = f"Procalcitonina (PCT): {pct_val} ng/mL. "
            
            pct_criticality, pct_description = _get_criticality_level("Procalcitonina", pct_val, {
                'critical': [10.0, float('inf')],
                'significant': [(2.0, 10.0)],
                'monitoring': [(0.5, 2.0)]
            })
            interpretations.append(pct_description)
            if pct_criticality in ["CRITICAL", "SIGNIFICANT"]:
                is_critical = True

            if pct_val >= 10.0:
                interpretation_pct += "Valor muito elevado, alta probabilidade de choque séptico."
                abnormalities.append(f"Procalcitonina muito elevada ({pct_val} ng/mL) - Risco de choque séptico")
                recommendations.append("PCT > 10 ng/mL: Iniciar/escalonar antibioticoterapia empírica de amplo espectro imediatamente. Manejo agressivo da sepse. Segundo as diretrizes SSC 2021, PCT >10 ng/mL indica sepse grave com alto risco de mortalidade.")
                # Add specific treatment recommendations
                recommendations.append("TREATMENT RECOMMENDATIONS: Segundo as diretrizes SSC 2021, iniciar protocolo de ressuscitação da sepse (expansão volêmica, vasopressores se necessário, antibioticoterapia empírica). Considerar suporte ventilatório mecânico se insuficiência respiratória.")
                recommendations.append("SPECIALIST CONSULTATION RECOMMENDED: UTI imediatamente para manejo de sepse grave. Considerar infecção cirúrgica se suspeita de coleção ou perfuração.")
            elif pct_val >= 2.0:
                interpretation_pct += "Valor elevado, alta probabilidade de sepse bacteriana grave."
                abnormalities.append(f"Procalcitonina elevada ({pct_val} ng/mL) - Risco de sepse grave")
                recommendations.append("PCT 2-10 ng/mL: Considerar fortemente infecção bacteriana sistêmica. Avaliar início/ajuste de antibióticos. Segundo as diretrizes IDSA 2019, PCT 2-10 ng/mL indica infecção bacteriana sistêmica com risco de sepse.")
                # Add specific treatment recommendations
                recommendations.append("DIAGNOSTIC WORKUP RECOMMENDED: Solicitar hemoculturas antes de antibioticoterapia. Investigar foco infeccioso com exames de imagem (RX tórax, USG/TC abdome, ecocardiograma se sopro cardíaco).")
                recommendations.append("TREATMENT RECOMMENDATIONS: Segundo as diretrizes IDSA 2019, iniciar antibioticoterapia empírica baseada no foco suspeito e comorbidades. Monitorar PCT seriada a cada 24-48 horas para resposta ao tratamento.")
            elif pct_val >= 0.5:
                interpretation_pct += "Valor moderadamente elevado, sugere possível infecção bacteriana sistêmica."
                abnormalities.append(f"Procalcitonina moderadamente elevada ({pct_val} ng/mL)")
                recommendations.append("PCT 0.5-2 ng/mL: Infecção bacteriana sistêmica possível. Monitorar clinicamente e considerar outros marcadores. Segundo as diretrizes IDSA 2019, PCT 0.5-2 ng/mL indica infecção bacteriana leve a moderada.")
                recommendations.append("PATIENT EDUCATION: Informar sobre importância de completar antibioticoterapia prescrita. Sintomas como febre persistente, dificuldade respiratória, queda da pressão arterial devem ser relatados imediatamente.")
            elif pct_val > 0.05:
                interpretation_pct += "Valor discretamente elevado. Baixa probabilidade de infecção bacteriana sistêmica, mas não exclui infecção localizada ou outras causas inflamatórias."
                abnormalities.append(f"Procalcitonina discretamente elevada ({pct_val} ng/mL)")
                recommendations.append("Segundo as diretrizes IDSA 2019, PCT 0.05-0.5 ng/mL indica baixa probabilidade de infecção bacteriana sistêmica. Repetir se sintomas persistentes ou piora clínica.")
                recommendations.append("DIAGNOSTIC WORKUP RECOMMENDED: Para suspeita de infecção localizada, investigar foco específico (ex: pielonefrite, pneumonia, celulite). Considerar PCR e VHS para avaliação inflamatória adicional.")
            else: # <= 0.05
                interpretation_pct += "Dentro do valor de referência. Baixa probabilidade de infecção bacteriana sistêmica significativa."
                recommendations.append("Segundo as diretrizes IDSA 2019, PCT <0.05 ng/mL indica baixa probabilidade de infecção bacteriana sistêmica. Repetir se quadro clínico sugestivo de infecção.")
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
            if isinstance(ferritina_val_data, (int, float)):
                ferritina_val = float(ferritina_val_data)
            else:
                ferritina_val = float(ferritina_val_data)
            patient_sex = kwargs.get('sexo', 'male').lower()
            ferritina_ref_key = 'Ferritina_Male' if patient_sex == 'male' else 'Ferritina_Female'
            
            fer_ref_low, fer_ref_high = (None, None)
            if ferritina_ref_key in REFERENCE_RANGES:
                fer_ref_low, fer_ref_high = REFERENCE_RANGES[ferritina_ref_key]
            
            interpretation_fer = f"Ferritina: {ferritina_val} ng/mL. "
            
            # Define sex-specific criticality thresholds
            fer_criticality_thresholds = {}
            if patient_sex == 'male':
                fer_criticality_thresholds = {
                    'critical': [(-float('inf'), 15)], # Severe deficiency
                    'significant': [(1000, float('inf'))], # Iron overload/Severe inflammation
                    'monitoring': [(15, 30), (500, 1000)] # Deficiency risk, Inflammation/Iron overload risk
                }
            else: # female or default
                fer_criticality_thresholds = {
                    'critical': [(-float('inf'), 15)], # Severe deficiency
                    'significant': [(1000, float('inf'))], # Iron overload/Severe inflammation
                    'monitoring': [(15, 30), (500, 1000)] # Deficiency risk, Inflammation/Iron overload risk
                }
            
            fer_criticality, fer_description = _get_criticality_level("Ferritina", ferritina_val, fer_criticality_thresholds)
            interpretations.append(fer_description)
            if fer_criticality in ["CRITICAL", "SIGNIFICANT"]:
                is_critical = True

            if fer_ref_low is not None and fer_ref_high is not None:
                if ferritina_val < fer_ref_low:
                    interpretation_fer += f"Valor baixo (Ref {patient_sex.capitalize()}: {fer_ref_low}-{fer_ref_high} ng/mL). Sugere deficiência de ferro."
                    abnormalities.append(f"Ferritina baixa ({ferritina_val} ng/mL) - Deficiência de Ferro")
                    recommendations.append("Ferritina baixa: Investigar e tratar deficiência de ferro. Segundo as diretrizes ASH 2019, ferritina <30 ng/mL indica deficiência de ferro com alta especificidade.")
                    # Add specific treatment recommendations
                    recommendations.append("TREATMENT RECOMMENDATIONS: Segundo as diretrizes ASH 2019, iniciar sulfato ferroso 325 mg 1-2x/dia com refeições. Alternativas: gluconato ferroso, succinato ferroso ou ferro IV se intolerância oral ou má absorção.")
                    recommendations.append("PATIENT EDUCATION: Informar sobre dieta rica em ferro (carnes vermelhas, frango, peixe, vegetais verde-escuros, leguminosas). Associar vitamina C (suco de laranja) para melhor absorção. Evitar chá/café próximo às refeições.")
                elif ferritina_val > fer_ref_high:
                    interpretation_fer += f"Valor elevado (Ref {patient_sex.capitalize()}: {fer_ref_low}-{fer_ref_high} ng/mL). "
                    if ferritina_val > 1000:
                        interpretation_fer += "Nível muito elevado. Pode indicar inflamação/infecção severa, doença hepática, sobrecarga de ferro significativa ou hemocromatose. "
                        recommendations.append("Ferritina > 1000 ng/mL: Investigar inflamação severa, doença hepática, e sobrecarga de ferro (ex: saturação de transferrina, estudos genéticos para hemocromatose se indicado). Segundo as diretrizes AASLD 2019, ferritina >1000 ng/mL indica risco significativo de sobrecarga de ferro.")
                        abnormalities.append(f"Ferritina muito elevada ({ferritina_val} ng/mL) - Sobrecarga de Ferro?/Inflamação Grave?")
                        # Add specific diagnostic workup recommendations
                        recommendations.append("DIAGNOSTIC WORKUP RECOMMENDED: Solicitar saturação de transferrina (>45% sugere sobrecarga de ferro), TIBC, genótipo HFE (C282Y, H63D) para hemocromatose hereditária. Avaliar função hepática (ALT, AST, gama-GT) e vírus da hepatite.")
                        recommendations.append("SPECIALIST CONSULTATION RECOMMENDED: Hematologista para investigação de sobrecarga de ferro e hepatologista se alterações hepáticas. Considerar ressonância magnética hepática para quantificação de ferro.")
                    else:
                        interpretation_fer += "Pode ser um reagente de fase aguda (inflamação/infecção) ou indicar sobrecarga de ferro. "
                        recommendations.append("Ferritina elevada: Correlacionar com outros marcadores inflamatórios e, se suspeita de sobrecarga de ferro, avaliar saturação de transferrina. Segundo as diretrizes AASLD 2019, ferritina 200-1000 ng/mL pode indicar inflamação ou sobrecarga de ferro leve.")
                        abnormalities.append(f"Ferritina elevada ({ferritina_val} ng/mL) - Fase Aguda?/Sobrecarga Ferro?")
                        recommendations.append("DIAGNOSTIC WORKUP RECOMMENDED: Para suspeita de inflamação, solicitar PCR, VHS e citocinas (IL-6, TNF-alfa). Para suspeita de sobrecarga de ferro, solicitar saturação de transferrina e TIBC.")
                else:
                    interpretation_fer += f"Dentro dos valores de referência (Ref {patient_sex.capitalize()}: {fer_ref_low}-{fer_ref_high} ng/mL)."
                    recommendations.append("Segundo as diretrizes ASH 2019, ferritina normal indica ausência de deficiência de ferro significativa. Repetir se sintomas de anemia persistirem.")
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
        final_interpretation = "Marcadores inflamatórios analisados dentro da faixa de referência. Segundo as diretrizes ACR 2019, ausência de elevação de marcadores inflamatórios indica baixa probabilidade de doença inflamatória sistêmica ativa."
    elif not final_interpretation and not processed_markers:
        final_interpretation = "Dados insuficientes para análise de marcadores inflamatórios. Segundo as diretrizes ACR 2019, solicitar PCR, VHS e outros marcadores inflamatórios se suspeita clínica de doença inflamatória."

    # Add general recommendations for all cases
    if processed_markers:
        recommendations.append("GENERAL RECOMMENDATIONS: Segundo as diretrizes ACR 2019, correlacionar achados laboratoriais com quadro clínico completo. Considerar repetição de marcadores em 1-2 semanas se sintomas persistentes mas marcadores normais.")
        recommendations.append("DIAGNOSTIC WORKUP RECOMMENDED: Para suspeita de doença autoimune, solicitar ANA, fator reumatoide, anti-CCP, complementos (C3, C4). Para suspeita de infecção, solicitar hemoculturas, urocultura e exames de imagem conforme foco suspeito.")
        recommendations.append("PATIENT EDUCATION: Informar sobre importância de seguir investigação diagnóstica mesmo com marcadores normais se sintomas persistentes. Sintomas como dor articular, rigidez matinal, febre, perda de peso devem ser relatados.")

    return {
        "interpretation": final_interpretation if final_interpretation else "Não foi possível gerar uma interpretação para os marcadores inflamatórios.",
        "abnormalities": list(set(abnormalities)), # Ensure unique
        "is_critical": is_critical,
        "recommendations": list(set(recommendations)), # Ensure unique
        "details": details # Return the populated details dictionary
    }