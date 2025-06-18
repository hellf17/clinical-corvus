"""
Blood gas analysis functions for interpreting arterial blood gas results.
"""

import math
from typing import Dict, List, Optional, Any
import logging

from utils.reference_ranges import REFERENCE_RANGES
from functools import lru_cache

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

def analisar_gasometria(dados):
    """
    Analyze arterial blood gas values and provide diagnostic interpretation.
    
    Args:
        dados: Dictionary with blood gas values
        
    Returns:
        dict: Dictionary containing detailed interpretation, abnormalities, critical status,
              recommendations, and specific blood gas parameters.
    """
    raw_params_to_convert = {
        'pH': dados.get('pH'),
        'pCO2': dados.get('pCO2'),
        'pO2': dados.get('pO2'),
        'HCO3': dados.get('HCO3-'), # Note: key in dados is 'HCO3-'
        'BE': dados.get('BE'),
        'SpO2': dados.get('SpO2'),
        'FiO2': dados.get('FiO2'),
        'lactato': dados.get('Lactato'),
        'Hb': dados.get('Hb'),
        'Na': dados.get('Na+'), # Note: key in dados is 'Na+'
        'K': dados.get('K+'),   # Note: key in dados is 'K+'
        'Cl': dados.get('Cl-')  # Note: key in dados is 'Cl-'
    }
    
    params = {}
    for key, raw_value in raw_params_to_convert.items():
        if raw_value is not None:
            # _safe_convert_to_float expects string, ensure conversion if raw_value is not string
            value_str = str(raw_value) if not isinstance(raw_value, str) else raw_value
            converted_value = _safe_convert_to_float(value_str)
            if converted_value is not None:
                params[key] = converted_value
            else:
                logger.info(f"Could not convert value for {key}: '{raw_value}' using _safe_convert_to_float. It will be ignored.")

    if 'pH' in params and 'pCO2' in params:
        _analisar_gasometria_cached.cache_clear() # Ensure cache is cleared if behavior implies it
        
        return _analisar_gasometria_cached(
            params.get('pH'),
            params.get('pCO2'),
            params.get('pO2'),
            params.get('HCO3'), 
            params.get('BE'),
            params.get('SpO2'),
            params.get('FiO2'),
            params.get('lactato'), 
            params.get('Hb'),
            params.get('Na'),
            params.get('K'),
            params.get('Cl')
        )
    
    logger.info("Dados insuficientes (pH ou pCO2 ausentes após conversão) para análise gasométrica.")
    return {} 

def clear_cache():
    """Clear the analysis function cache. Useful for testing."""
    _analisar_gasometria_cached.cache_clear()

@lru_cache(maxsize=128)
def _analisar_gasometria_cached(ph, pco2, po2=None, hco3=None, be=None, spo2=None, fio2=None, 
                              lactato=None, hb=None, na=None, k=None, cl=None):
    """
    Cached version of blood gas analysis for improved performance.
    All parameters must be immutable (numerical values) for the cache to work.
    
    Args:
        ph: Blood pH value
        pco2: pCO2 value in mmHg
        po2: pO2 value in mmHg (optional)
        hco3: HCO3- value in mEq/L (optional)
        be: Base excess value (optional)
        spo2: SpO2 percentage (optional)
        fio2: FiO2 percentage or decimal (optional)
        lactato: Lactate value (optional)
        hb: Hemoglobin value (optional)
        na: Sodium value (optional)
        k: Potassium value (optional)
        cl: Chloride value (optional)
        
    Returns:
        dict: Dictionary containing detailed interpretation, abnormalities, critical status,
              recommendations, and specific blood gas parameters.
    """
    interpretations_list: List[str] = []
    abnormalities_list: List[str] = []
    recommendations_list: List[str] = []
    is_critical_flag: bool = False
    acid_base_status_str: Optional[str] = None
    oxygenation_status_str: Optional[str] = None
    compensation_status_str: Optional[str] = None
    details_dict: Dict[str, Any] = {} # Added to store detailed results like P/F ratio

    # Populate details_dict with all provided parameters initially
    if ph is not None: details_dict['pH_fornecido'] = ph
    if pco2 is not None: details_dict['pCO2_fornecido'] = pco2
    if po2 is not None: details_dict['pO2_fornecido'] = po2
    if hco3 is not None: details_dict['HCO3_fornecido'] = hco3
    if be is not None: details_dict['BE_fornecido'] = be
    if spo2 is not None: details_dict['SpO2_fornecida'] = spo2
    if fio2 is not None: details_dict['FiO2_fornecida'] = fio2
    if lactato is not None: details_dict['Lactato_fornecido'] = lactato
    if hb is not None: details_dict['Hb_fornecida'] = hb
    if na is not None: details_dict['Na_fornecido'] = na
    if k is not None: details_dict['K_fornecido'] = k
    if cl is not None: details_dict['Cl_fornecido'] = cl
    
    # Reference ranges
    pH_min, pH_max = REFERENCE_RANGES['pH']
    pCO2_min, pCO2_max = REFERENCE_RANGES['pCO2']
    
    # Calculate HCO3 if not provided using Henderson-Hasselbalch equation (approximate)
    if hco3 is None and ph is not None and pco2 is not None:
        try:
            hco3 = 0.03 * pco2 * (10**(ph - 6.1))
        except OverflowError:
            hco3 = None # Calculation failed, proceed without it
            interpretations_list.append("HCO3 não pôde ser calculado devido a valores extremos de pH.")
    
    disturbio_primario: List[str] = []
    disturbios_secundarios: List[str] = []
    
    # pH analysis
    if ph < pH_min:
        acidemia_text = f"pH reduzido ({ph:.2f}) - Acidemia"
        interpretations_list.append(acidemia_text)
        abnormalities_list.append(acidemia_text)
        acid_base_status_str = "Acidemia"
        if ph < 7.20: # Example critical threshold
            is_critical_flag = True
            recommendations_list.append("Acidemia severa. Considerar intervenção imediata.")
        
        if pco2 > pCO2_max:
            if not disturbios_secundarios:
                disturbio_primario.append("Acidose Respiratória")
                if hco3 is not None:
                    expected_hco3 = 24 + ((pco2 - 40) * 0.1)
                    if abs(hco3 - expected_hco3) > 2:
                        if hco3 < expected_hco3: disturbios_secundarios.append("Acidose Metabólica Concomitante")
                        else: disturbios_secundarios.append("Alcalose Metabólica Concomitante")
                    else: compensation_status_str = "Compensação metabólica em desenvolvimento/parcial" if hco3 > REFERENCE_RANGES['HCO3-'][1] else "Sem compensação metabólica significativa"
        
        if hco3 is not None and hco3 < REFERENCE_RANGES['HCO3-'][0]:
            if not any("Acidose Metabólica" in d for d in disturbios_secundarios) and "Acidose Metabólica" not in disturbio_primario:
                disturbio_primario.append("Acidose Metabólica")
                expected_pco2 = 1.5 * hco3 + 8 
                if abs(pco2 - expected_pco2) > 2:
                    if pco2 > expected_pco2: disturbios_secundarios.append("Acidose Respiratória Concomitante")
                    else: disturbios_secundarios.append("Alcalose Respiratória Concomitante")
                else: compensation_status_str = "Compensação respiratória adequada/em desenvolvimento" if pco2 < pCO2_min else "Sem compensação respiratória significativa"
    
    elif ph > pH_max:
        alcalemia_text = f"pH elevado ({ph:.2f}) - Alcalemia"
        interpretations_list.append(alcalemia_text)
        abnormalities_list.append(alcalemia_text)
        acid_base_status_str = "Alcalemia"
        if ph > 7.60: # Example critical threshold
            is_critical_flag = True
            recommendations_list.append("Alcalemia severa. Investigar e corrigir causa base.")
        
        if pco2 < pCO2_min:
            if not any("Alcalose Respiratória" in d for d in disturbios_secundarios):
                disturbio_primario.append("Alcalose Respiratória")
                if hco3 is not None:
                    expected_hco3 = 24 - ((40 - pco2) * 0.2) 
                    if abs(hco3 - expected_hco3) > 2:
                        if hco3 < expected_hco3: disturbios_secundarios.append("Acidose Metabólica Concomitante")
                        else: disturbios_secundarios.append("Alcalose Metabólica Concomitante")
                    else: compensation_status_str = "Compensação metabólica em desenvolvimento/parcial" if hco3 < REFERENCE_RANGES['HCO3-'][0] else "Sem compensação metabólica significativa"
        
        if hco3 is not None and hco3 > REFERENCE_RANGES['HCO3-'][1]:
            if not any("Alcalose Metabólica" in d for d in disturbios_secundarios) and "Alcalose Metabólica" not in disturbio_primario:
                disturbio_primario.append("Alcalose Metabólica")
                expected_pco2 = 0.7 * hco3 + 20
                if abs(pco2 - expected_pco2) > 2:
                    if pco2 > expected_pco2: disturbios_secundarios.append("Acidose Respiratória Concomitante")
                    else: disturbios_secundarios.append("Alcalose Respiratória Concomitante")
                else: compensation_status_str = "Compensação respiratória adequada/em desenvolvimento" if pco2 > pCO2_max else "Sem compensação respiratória significativa"
    else:
        interpretations_list.append(f"pH normal ({ph:.2f})")
        acid_base_status_str = "Equilíbrio ácido-básico normal (baseado no pH)"
        # Check for compensated disorders despite normal pH
        if pco2 > pCO2_max and hco3 is not None and hco3 > REFERENCE_RANGES['HCO3-'][1]:
            disturbio_primario.append("Acidose Respiratória Compensada por Alcalose Metabólica")
            compensation_status_str = "Compensado"
        elif pco2 < pCO2_min and hco3 is not None and hco3 < REFERENCE_RANGES['HCO3-'][0]:
            disturbio_primario.append("Alcalose Respiratória Compensada por Acidose Metabólica")
            compensation_status_str = "Compensado"
        elif pco2 > pCO2_max: # pH normal mas PCO2 alto
             disturbio_primario.append("Potencial Acidose Respiratória Compensada")
             if hco3 is None or hco3 <= REFERENCE_RANGES['HCO3-'][1]:
                recommendations_list.append("pH normal com PCO2 elevado; HCO3 não sugere compensação completa. Verificar cronicidade.")
        elif pco2 < pCO2_min: # pH normal mas PCO2 baixo
             disturbio_primario.append("Potencial Alcalose Respiratória Compensada")
             if hco3 is None or hco3 >= REFERENCE_RANGES['HCO3-'][0]:
                recommendations_list.append("pH normal com PCO2 baixo; HCO3 não sugere compensação completa. Investigar causa da hiperventilação.")
        elif hco3 is not None and hco3 > REFERENCE_RANGES['HCO3-'][1]:
            disturbio_primario.append("Potencial Alcalose Metabólica Compensada")
        elif hco3 is not None and hco3 < REFERENCE_RANGES['HCO3-'][0]:
            disturbio_primario.append("Potencial Acidose Metabólica Compensada")
    
    if not compensation_status_str and (disturbio_primario or disturbios_secundarios):
        compensation_status_str = "Não compensado ou compensação inadequada"
    elif not (disturbio_primario or disturbios_secundarios) and not acid_base_status_str:
        acid_base_status_str = "Normal"
    
    # Consolidate interpretations
    if disturbio_primario:
        interpretations_list.append(f"Distúrbio primário: {', '.join(disturbio_primario)}")
        abnormalities_list.extend(disturbio_primario)
    if disturbios_secundarios:
        interpretations_list.append(f"Distúrbio(s) secundário(s)/concomitante(s): {', '.join(disturbios_secundarios)}")
        abnormalities_list.extend(disturbios_secundarios)
    
    # Anion Gap (if Na, Cl, HCO3 available)
    anion_gap = None
    if na is not None and cl is not None and hco3 is not None:
        anion_gap = na - (cl + hco3)
        ag_min, ag_max = REFERENCE_RANGES['AnionGap']
        ag_status = f"Anion Gap: {anion_gap:.1f} mEq/L (Ref: {ag_min}-{ag_max})"
        interpretations_list.append(ag_status)
        if anion_gap > ag_max:
            ag_abnormality = "Anion Gap Elevado"
            interpretations_list.append(ag_abnormality)
            abnormalities_list.append(ag_abnormality)
            recommendations_list.append("Anion Gap elevado sugere acidose metabólica com ganho de ácidos (ex: cetoacidose, uremia, intoxicações). Investigar.")
            if "Acidose Metabólica" not in disturbio_primario and not any("Acidose Metabólica" in d for d in disturbios_secundarios):
                 # If AGMA is present but not identified by pH/HCO3, flag it
                 interpretations_list.append("Acidose Metabólica de Anion Gap Elevado (AGMA) presente, mesmo que pH/HCO3 não sejam classicamente de acidose.")
                 abnormalities_list.append("AGMA oculta ou incipiente")
        elif anion_gap < ag_min:
             interpretations_list.append("Anion Gap Baixo. Considerar hipoalbuminemia ou erro laboratorial.")
             abnormalities_list.append("Anion Gap Baixo")
    
    # Delta-Delta Ratio (if AGMA and HCO3 changed)
    if anion_gap and anion_gap > REFERENCE_RANGES['AnionGap'][1] and hco3 is not None:
        delta_ag = anion_gap - ((REFERENCE_RANGES['AnionGap'][0] + REFERENCE_RANGES['AnionGap'][1]) / 2) # AG - normal AG (midpoint)
        delta_hco3 = REFERENCE_RANGES['HCO3-'][1] - hco3 # Normal HCO3 (upper) - measured HCO3
        if delta_hco3 != 0:
            delta_ratio = delta_ag / delta_hco3
            details_dict['Delta_Ratio'] = f"{delta_ratio:.2f}"
            interpretation_dd = f"Relação Delta/Delta: {delta_ratio:.2f}. "
            if delta_ratio < 0.4:
                interpretation_dd += "Sugere acidose metabólica hiperclorêmica (NAGMA) concomitante ou perda de bicarbonato."
            elif delta_ratio < 1: # Typically 0.4-0.8 or < 1
                interpretation_dd += "Sugere AGMA pura ou com componente de NAGMA. Se < 0.8, pode haver NAGMA."
            elif delta_ratio <= 2: # Typically 1-2
                interpretation_dd += "Sugere acidose metabólica de ânion gap elevado (AGMA) pura ou predominante."
            else: # > 2
                interpretation_dd += "Sugere alcalose metabólica concomitante ou AGMA com HCO3 cronicamente baixo."
            interpretations_list.append(interpretation_dd)
            if "Acidose Metabólica" in disturbio_primario or any("Acidose Metabólica" in d for d in disturbios_secundarios):
                 recommendations_list.append(f"Avaliar relação Delta/Delta ({delta_ratio:.2f}) para distúrbios mistos.")

    # Oxygenation Analysis (including P/F ratio)
    if po2 is not None:
        po2_ref_min, po2_ref_max = REFERENCE_RANGES['pO2']
        details_dict['pO2_interpretado'] = po2
        details_dict['pO2_ref'] = f"{po2_ref_min}-{po2_ref_max} mmHg"

        if po2 < po2_ref_min:
            hipoxemia_text = f"Hipoxemia (pO2: {po2:.1f} mmHg)."
            oxygenation_status_str = "Hipoxemia"
            interpretations_list.append(hipoxemia_text)
            abnormalities_list.append("Hipoxemia")
            if po2 < 60:
                recommendations_list.append("Hipoxemia significativa. Otimizar oferta de O2. Investigar causa.")
                is_critical_flag = True
            elif po2 < 80:
                recommendations_list.append("Hipoxemia leve. Monitorar e avaliar necessidade de O2 suplementar.")
        elif po2 > po2_ref_max:
            hiperoxia_text = f"Hiperoxia (pO2: {po2:.1f} mmHg). Evitar se não indicada."
            oxygenation_status_str = "Hiperoxia"
            interpretations_list.append(hiperoxia_text)
            abnormalities_list.append("Hiperoxia")
            recommendations_list.append("Hiperoxia. Considerar redução da FiO2 se clinicamente seguro.")
        else:
            oxygenation_status_str = "Normoxia"
            interpretations_list.append(f"Normoxia (pO2: {po2:.1f} mmHg).")

        # P/F Ratio Calculation
        if fio2 is not None:
            fio2_decimal = fio2
            if fio2 > 1.0:  # Assuming FiO2 might be given as percentage
                fio2_decimal = fio2 / 100.0
            
            if 0.21 <= fio2_decimal <= 1.0: # Valid FiO2 range
                pf_ratio = po2 / fio2_decimal
                details_dict['PF_Ratio'] = f"{pf_ratio:.1f}"
                pf_interpretation = f"Relação PaO2/FiO2 (P/F): {pf_ratio:.1f}. "
                if pf_ratio >= 300:
                    pf_interpretation += "Sem hipoxemia significativa ou hipoxemia leve pela P/F."
                elif pf_ratio >= 200:
                    pf_interpretation += "Sugestivo de Lesão Pulmonar Aguda / SDRA Leve (se critérios de Berlim preenchidos)."
                    abnormalities_list.append("P/F Ratio Baixo (SDRA Leve?)")
                elif pf_ratio >= 100:
                    pf_interpretation += "Sugestivo de SDRA Moderada (se critérios de Berlim preenchidos)."
                    abnormalities_list.append("P/F Ratio Baixo (SDRA Moderada?)")
                    is_critical_flag = True # Moderate ARDS is often critical
                else: # < 100
                    pf_interpretation += "Sugestivo de SDRA Grave (se critérios de Berlim preenchidos)."
                    abnormalities_list.append("P/F Ratio Baixo (SDRA Grave?)")
                    is_critical_flag = True # Severe ARDS is critical
                interpretations_list.append(pf_interpretation)
                recommendations_list.append("Avaliar P/F ratio no contexto clínico de SDRA e otimizar ventilação/oxigenação.")
            else:
                interpretations_list.append(f"FiO2 fornecida ({fio2}) fora do intervalo válido (21-100% ou 0.21-1.0) para cálculo P/F confiável.")
        else: # FiO2 not provided
            interpretations_list.append("FiO2 não fornecida, P/F ratio não pôde ser calculado.")
    else: # pO2 not provided
        oxygenation_status_str = "Não avaliável (pO2 não fornecido)"
        interpretations_list.append("Oxigenação não pôde ser avaliada (pO2 não fornecido).")

    # Refine Compensation Terminology (Example for Acidose Respiratória)
    # This section needs careful review and integration with existing compensation logic
    # The existing logic already identifies "Compensado", "em desenvolvimento/parcial", "Sem compensação"
    # We can make the text more explicit based on whether pH is normalized.

    # Example: Inside pH < pH_min -> if pco2 > pCO2_max (Acidose Respiratória)
    # OLD: else: compensation_status_str = "Compensação metabólica em desenvolvimento/parcial" if hco3 > REFERENCE_RANGES['HCO3-'][1] else "Sem compensação metabólica significativa"
    # NEW approach idea:
    # if ph < pH_min and pco2 > pCO2_max: # Primary Respiratory Acidosis
    #    if hco3 is not None:
    #        # Acute compensation: Expected HCO3 = 24 + 0.1 * (pCO2 - 40) for each 10mmHg pCO2 rise
    #        # Chronic compensation: Expected HCO3 = 24 + 0.35-0.4 * (pCO2 - 40) for each 10mmHg pCO2 rise
    #        # For simplicity, stick to existing single formula or use specific acute/chronic context if available.
    #        expected_hco3_acute = 24 + ((pco2 - 40) * 0.1) # This is already in use
    #        # Check if HCO3 is moving towards compensation
    #        if hco3 > REFERENCE_RANGES['HCO3-'][1]: # Bicarb is high, suggesting compensation
    #            if ph >= pH_min and ph <= pH_max: # pH normalized
    #                 compensation_status_str = "Acidose Respiratória Cronicamente Compensada (pH normalizado)" # If chronic formula was used
    #            elif abs(hco3 - expected_hco3_acute) <= 2: # Close to expected acute
    #                 compensation_status_str = "Acidose Respiratória Aguda com compensação metabólica esperada/parcial."
    #            elif hco3 > expected_hco3_acute + 2:
    #                 compensation_status_str = "Acidose Respiratória com compensação metabólica maior que o esperado agudamente (pode ser crônica ou mista)."
    #            else: # HCO3 increased but less than expected_hco3_acute
    #                 compensation_status_str = "Acidose Respiratória com compensação metabólica parcial/inicial."
    #        else: # HCO3 not significantly elevated
    #            compensation_status_str = "Acidose Respiratória Aguda Não Compensada ou com compensação mínima."

    # The above is an example. The current logic is complex. I will keep the existing compensation messages for now
    # but ensure they are consistently applied and perhaps add a more general statement about compensation level if pH is normalized.
    # If pH is normal AND primary disorder identified (e.g. pCO2 high, HCO3 high):
    if pH_min <= ph <= pH_max:
        if "Acidose Respiratória Compensada por Alcalose Metabólica" in disturbio_primario or \
           "Alcalose Respiratória Compensada por Acidose Metabólica" in disturbio_primario:
            compensation_status_str = "Distúrbio Ácido-Básico Misto/Compensado (pH normalizado)"

    # Enhanced Metabolic Acidosis Recommendations
    if "Acidose Metabólica" in disturbio_primario or any("Acidose Metabólica" in d for d in disturbios_secundarios):
        if anion_gap is not None:
            if anion_gap <= REFERENCE_RANGES['AnionGap'][1]: # Normal Anion Gap
                if "Anion Gap Elevado" not in abnormalities_list: # Ensure it's truly NAGMA
                    recommendations_list.append("Acidose Metabólica com Ânion Gap Normal (NAGMA). Considerar perdas de bicarbonato (GI ou renal - ex: diarreia, ATR) ou infusão de cloretos.")
                    if "Acidose Metabólica" not in abnormalities_list: abnormalities_list.append("Acidose Metabólica (NAGMA?)")
        else: # Anion gap not calculable
            recommendations_list.append("Acidose metabólica presente, mas ânion gap não pôde ser calculado. Investigar causas de AGMA e NAGMA.")

    # Final assembly of results
    final_interpretation = "\n".join(filter(None, interpretations_list))
    if compensation_status_str:
        final_interpretation += f"\nEstado de Compensação: {compensation_status_str}."
    if acid_base_status_str:
         final_interpretation = f"Status Ácido-Base Geral: {acid_base_status_str}.\n" + final_interpretation
    if oxygenation_status_str:
        final_interpretation = f"Status de Oxigenação: {oxygenation_status_str}.\n" + final_interpretation

    # Add all collected details to the details_dict
    details_dict['pH_interpretado'] = ph
    details_dict['pCO2_interpretado'] = pco2
    if hco3 is not None: details_dict['HCO3_calculado_ou_fornecido'] = f"{hco3:.1f}"
    if be is not None: details_dict['BE_interpretado'] = be
    if spo2 is not None: details_dict['SpO2_interpretada'] = spo2
    if lactato is not None: 
        details_dict['Lactato_interpretado'] = lactato
        lact_ref_min, lact_ref_max = REFERENCE_RANGES['Lactato']
        details_dict['Lactato_ref'] = f"{lact_ref_min}-{lact_ref_max} mmol/L"
        if lactato > lact_ref_max:
            lactato_text = f"Lactato elevado ({lactato:.1f} mmol/L)."
            interpretations_list.append(lactato_text) # Add to main interpretations as well
            abnormalities_list.append("Hiperlactatemia")
            if lactato > 4.0:
                recommendations_list.append("Hiperlactatemia significativa. Investigar hipoperfusão tecidual, sepse, choque.")
                is_critical_flag = True
            else:
                recommendations_list.append("Lactato elevado. Monitorar e investigar causa.")
    if hb is not None: details_dict['Hb_interpretada'] = hb
    if na is not None: details_dict['Na_interpretado'] = na
    if k is not None: details_dict['K_interpretado'] = k
    if cl is not None: details_dict['Cl_interpretado'] = cl
    if anion_gap is not None: details_dict['Anion_Gap_calculado'] = f"{anion_gap:.1f}"
    
    # Add reference ranges to details for clarity
    details_dict['pH_ref'] = f"{pH_min}-{pH_max}"
    details_dict['pCO2_ref'] = f"{pCO2_min}-{pCO2_max} mmHg"
    if 'HCO3-' in REFERENCE_RANGES: 
        hco3_ref_min, hco3_ref_max = REFERENCE_RANGES['HCO3-']
        details_dict['HCO3_ref'] = f"{hco3_ref_min}-{hco3_ref_max} mEq/L"

    return {
        "interpretation": final_interpretation.strip(),
        "abnormalities": list(set(abnormalities_list)), # Remove duplicates
        "is_critical": is_critical_flag,
        "recommendations": list(set(recommendations_list)), # Remove duplicates
        "details": details_dict 
    }

# Example usage (for testing purposes, not part of the main API call flow)
if __name__ == '__main__':
    # Example Data Sets for testing
    test_cases = [
        # Acidose Respiratória Aguda Não Compensada
        {"dados": {"pH": 7.25, "pCO2": 60, "HCO3-": 24, "pO2": 70, "FiO2": 21, "Na+": 140, "Cl-": 100}, "nome": "Acidose Respiratória Aguda"},
        # Acidose Metabólica com Anion Gap Elevado (Cetoacidose)
        {"dados": {"pH": 7.15, "pCO2": 25, "HCO3-": 10, "pO2": 90, "FiO2": 21, "Na+": 135, "Cl-": 95, "Lactato": 1.5}, "nome": "AGMA (Cetoacidose)"},
        # Alcalose Respiratória Aguda
        {"dados": {"pH": 7.55, "pCO2": 25, "HCO3-": 23, "pO2": 100, "FiO2": 21}, "nome": "Alcalose Respiratória Aguda"},
        # Alcalose Metabólica com compensação respiratória
        {"dados": {"pH": 7.50, "pCO2": 50, "HCO3-": 35, "pO2": 85, "FiO2": 21}, "nome": "Alcalose Metabólica Compensada"},
        # Gasometria Normal
        {"dados": {"pH": 7.40, "pCO2": 40, "HCO3-": 24, "pO2": 95, "FiO2": 21, "Lactato": 1.0, "Na+": 140, "Cl-": 104}, "nome": "Gasometria Normal"},
        # Hipoxemia com SDRA Grave
        {"dados": {"pH": 7.35, "pCO2": 45, "HCO3-": 25, "pO2": 55, "FiO2": 100, "Lactato": 2.0}, "nome": "Hipoxemia / SDRA Grave"},
        # Acidose Mista (Metabólica e Respiratória)
        {"dados": {"pH": 7.10, "pCO2": 60, "HCO3-": 15, "pO2": 65, "FiO2": 40, "Na+": 138, "Cl-": 100}, "nome": "Acidose Mista"},
        # NAGMA (Acidose Metabólica Hiperclorêmica)
        {"dados": {"pH": 7.28, "pCO2": 30, "HCO3-": 15, "Na+": 140, "Cl-": 115, "pO2": 90, "FiO2": 21}, "nome": "NAGMA"}
    ]

    for test in test_cases:
        print(f"--- Analisando Caso: {test['nome']} ---")
        resultado = analisar_gasometria(test["dados"])
        print(f"Interpretação: {resultado.get('interpretation')}")
        print(f"Anormalidades: {resultado.get('abnormalities')}")
        print(f"Crítico: {resultado.get('is_critical')}")
        print(f"Recomendações: {resultado.get('recommendations')}")
        print(f"Detalhes: {resultado.get('details')}")
        # print(f"Status Ácido-Base: {resultado.get('acid_base_status')}") # Old keys, access via details or main interpretation
        # print(f"Status Oxigenação: {resultado.get('oxygenation_status')}")
        # print(f"Status Compensação: {resultado.get('compensation_status')}")
        print("-------------------------------------\n") 