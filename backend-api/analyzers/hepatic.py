"""
Hepatic function analysis module for interpreting liver function tests.
"""

import math
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

def analisar_funcao_hepatica(dados: Dict[str, any]) -> Dict[str, any]:
    """
    Analyze liver function tests and provide clinical interpretation.
    
    Args:
        dados: Dictionary containing liver function parameters (TGO, TGP, BT, BD, BI, GamaGT, \
               FosfAlc, Albumina, RNI).
        
    Returns:
        dict: Dictionary containing detailed interpretation, abnormalities, critical status,\
              recommendations, and specific parameters.
    """
    interpretations_list: List[str] = []
    abnormalities_list: List[str] = []
    recommendations_list: List[str] = []
    is_critical_flag: bool = False
    details_dict: Dict[str, any] = {}

    # Standardize and store all provided data in details_dict, converting to float where possible
    processed_dados: Dict[str, Optional[float]] = {}
    for key, value in dados.items():
        details_dict[key] = value # Store original value first
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
                    logger.info(f"Could not convert hepatic param {key}: '{value}'. It will be ignored.")
        else:
            processed_dados[key] = None
            logger.info(f"Hepatic param {key} is None. It will be ignored.")

    # Check if there's enough data to analyze for hepatic function
    valid_keys = ['TGO', 'TGP', 'BT', 'BD', 'BI', 'GamaGT', 'FosfAlc', 'Albumina', 'RNI']
    if not any(k in processed_dados and processed_dados[k] is not None for k in valid_keys):
        return {
            "interpretation": "Dados insuficientes para análise da função hepática.",
            "abnormalities": [], "is_critical": False, "recommendations": [], "details": details_dict
        }

    # Analyze transaminases (TGO/AST, TGP/ALT)
    tgo = processed_dados.get('TGO')
    tgp = processed_dados.get('TGP')

    if tgo is not None:
        tgo_criticality, tgo_description = _get_criticality_level("TGO/AST", tgo, {
            'critical': [10000],
            'significant': [(1000, 10000)],
            'monitoring': [(40, 1000)]
        })
        # Note: criticality assessment integrated into detailed interpretation below
        if tgo_criticality == "CRITICAL":
            is_critical_flag = True

    if tgp is not None:
        tgp_criticality, tgp_description = _get_criticality_level("TGP/ALT", tgp, {
            'critical': [10000],
            'significant': [(1000, 10000)],
            'monitoring': [(56, 1000)]
        })
        # Note: criticality assessment integrated into detailed interpretation below
        if tgp_criticality == "CRITICAL":
            is_critical_flag = True
    
    # Ensure TGO and TGP reference ranges are available before accessing
    tgo_ref_min, tgo_ref_max = (None, None)
    if 'TGO' in REFERENCE_RANGES:
        tgo_ref_min, tgo_ref_max = REFERENCE_RANGES['TGO']
    else:
        interpretations_list.append("Faixa de referência para TGO não encontrada.")
        # Optionally return or handle error

    tgp_ref_min, tgp_ref_max = (None, None)
    if 'TGP' in REFERENCE_RANGES:
        tgp_ref_min, tgp_ref_max = REFERENCE_RANGES['TGP']
    else:
        interpretations_list.append("Faixa de referência para TGP não encontrada.")
        # Optionally return or handle error

    if tgo is not None and tgo_ref_max is not None:
        if tgo > tgo_ref_max:
            msg = f"TGO/AST elevada ({tgo} U/L, Ref: <{tgo_ref_max})."
            interpretations_list.append(msg)
            abnormalities_list.append("TGO Elevada")
            if tgo > 1000:
                interpretations_list.append("Elevação muito acentuada de TGO (>25x LSN) - sugere hepatite aguda grave (viral, tóxica, isquêmica).")
                recommendations_list.append("Investigação urgente para lesão hepática aguda grave. Considerar hospitalização. Segundo as diretrizes da AASLD, hepatite aguda com TGO/ALT >1000 U/L requer avaliação imediata para transplante hepático.")
                is_critical_flag = True
                # Add specific diagnostic workup
                recommendations_list.append("DIAGNOSTIC WORKUP RECOMMENDED: Solicitar vírus da hepatite (A, B, C, EBV, CMV), autoanticorpos (ANA, ASMA, LKM), ceruloplasmina, ferro, alfa-1-antitripsina. Considerar paracetamol e toxinas.")
            elif tgo_ref_max is not None and tgo > 5 * tgo_ref_max: # e.g., > 200 if ref is 40
                interpretations_list.append("Elevação acentuada de TGO - comum em hepatites virais agudas, hepatite alcoólica, medicamentosa.")
                recommendations_list.append("Segundo as diretrizes da AASLD, TGO 5-25x LSN indica hepatite moderada. Investigar etiologia viral, alcoólica ou medicamentosa.")
                recommendations_list.append("TREATMENT RECOMMENDATIONS: Suspender hepatotoxinas. Para hepatite alcoólica: considerar prednisona se Maddrey >32. Para hepatite viral: suporte sintomático.")
            elif tgo_ref_max is not None and tgo > 2 * tgo_ref_max: # e.g., > 80 if ref is 40
                interpretations_list.append("Elevação moderada de TGO - pode ocorrer em diversas hepatopatias, incluindo DGHNA.")
                recommendations_list.append("Segundo as diretrizes da AASLD, TGO 2-5x LSN indica hepatopatia leve. Investigar esteatose hepática, medicamentos e doenças autoimunes.")
                recommendations_list.append("PATIENT EDUCATION: Informar sobre dieta hipocalórica, exercício físico e suspensão de álcool. Monitorar função hepática em 3-6 meses.")
            else:
                interpretations_list.append("Elevação discreta de TGO - inespecífica, avaliar cronicidade e outros exames.")
                recommendations_list.append("Segundo as diretrizes da AASLD, TGO leve pode ser normal em alguns pacientes. Repetir em 3-6 meses se persistente.")
        else:
            interpretations_list.append(f"TGO/AST normal ({tgo} U/L).")

    if tgp is not None and tgp_ref_max is not None:
        if tgp > tgp_ref_max:
            msg = f"TGP/ALT elevada ({tgp} U/L, Ref: <{tgp_ref_max})."
            interpretations_list.append(msg)
            abnormalities_list.append("TGP Elevada")
            if tgp > 1000:
                interpretations_list.append("Elevação muito acentuada de TGP (>25x LSN) - sugere hepatite viral aguda, isquêmica ou medicamentosa/tóxica.")
                recommendations_list.append("Investigação urgente para lesão hepática aguda grave. Considerar hospitalização. Segundo as diretrizes da AASLD, ALT >1000 U/L indica hepatite aguda severa com risco de falência hepática.")
                is_critical_flag = True
                # Add specific treatment recommendations
                recommendations_list.append("SPECIALIST CONSULTATION RECOMMENDED: Hepatologista imediatamente para avaliação de transplante hepático. Monitorar INR, bilirrubina, creatinina e grau de encefalopatia.")
            elif tgp_ref_max is not None and tgp > 5 * tgp_ref_max:
                interpretations_list.append("Elevação acentuada de TGP - comum em hepatites virais, hepatite medicamentosa.")
                recommendations_list.append("Segundo as diretrizes da AASLD, ALT 5-25x LSN indica hepatite moderada. Investigar hepatite viral (HAV, HBV, HCV, EBV, CMV) e medicamentosa.")
                recommendations_list.append("TREATMENT RECOMMENDATIONS: Suspender todos os hepatotóxicos. Para hepatite medicamentosa: considerar N-acetilcisteína se suspeita de paracetamol. Para hepatite viral: suporte sintomático.")
            elif tgp_ref_max is not None and tgp > 2 * tgp_ref_max:
                interpretations_list.append("Elevação moderada de TGP - pode ocorrer em diversas hepatopatias, incluindo DGHNA/NASH.")
                recommendations_list.append("Segundo as diretrizes da AASLD, ALT 2-5x LSN indica hepatopatia leve. Investigar esteatose hepática não alcoólica e medicamentos.")
                recommendations_list.append("PATIENT EDUCATION: Informar sobre dieta hipocalórica, exercício físico e perda de peso gradual (5-10% do peso). Evitar álcool e hepatotóxicos.")
            else:
                interpretations_list.append("Elevação discreta de TGP - inespecífica, avaliar cronicidade.")
                recommendations_list.append("Segundo as diretrizes da AASLD, ALT leve pode ser normal em alguns pacientes. Repetir em 3-6 meses se persistente e sintomático.")
        else:
            interpretations_list.append(f"TGP/ALT normal ({tgp} U/L).")

    if tgo is not None and tgp is not None and tgp > 0 and tgo_ref_max is not None and tgp_ref_max is not None:
        ratio = tgo / tgp
        details_dict['AST_ALT_ratio'] = f"{ratio:.2f}"
        # Only add ratio to interpretations if one of the transaminases is elevated
        tgo_elevated = tgo > tgo_ref_max
        tgp_elevated = tgp > tgp_ref_max
        if tgo_elevated or tgp_elevated:
            interpretations_list.append(f"Relação AST/ALT (TGO/TGP): {ratio:.2f}.")
        
        # Disease-specific interpretations of the ratio remain conditional on elevated transaminases
        if ratio > 2.0 and tgo_elevated and tgp_elevated: # check tgo_elevated and tgp_elevated instead of tgo > tgo_ref_max etc.
            interpretations_list.append("Relação AST/ALT > 2.0 com transaminases elevadas - sugere fortemente hepatopatia alcoólica ou cirrose avançada.")
            abnormalities_list.append("Relação AST/ALT > 2 (Sugestivo Alcoólica/Cirrose)")
        elif ratio > 1.0 and tgo_elevated and tgp_elevated:
            interpretations_list.append("Relação AST/ALT > 1.0 com transaminases elevadas - pode indicar doença hepática alcoólica, cirrose, ou hepatite por fármacos.")
            abnormalities_list.append("Relação AST/ALT > 1 (Sugestivo Alcoólica/Cirrose)")
        elif ratio < 1.0 and tgo_elevated and tgp_elevated:
            interpretations_list.append("Relação AST/ALT < 1.0 com transaminases elevadas - padrão comum em hepatites virais agudas e DGHNA/NASH.")
            abnormalities_list.append("Relação AST/ALT < 1 (Sugestivo Hepático)")

    # Analyze cholestasis markers (GamaGT, Fosfatase Alcalina)
    ggt = processed_dados.get('GamaGT')
    fosf_alc = processed_dados.get('FosfAlc')
    
    ggt_ref_min, ggt_ref_max = (None, None)
    if 'GamaGT' in REFERENCE_RANGES:
        ggt_ref_min, ggt_ref_max = REFERENCE_RANGES['GamaGT']
    else:
        interpretations_list.append("Faixa de referência para GamaGT não encontrada.")

    fosf_alc_ref_min, fosf_alc_ref_max = (None, None)
    if 'FosfAlc' in REFERENCE_RANGES:
        fosf_alc_ref_min, fosf_alc_ref_max = REFERENCE_RANGES['FosfAlc']
    else:
        interpretations_list.append("Faixa de referência para Fosfatase Alcalina não encontrada.")

    colestase_presente = False
    if ggt is not None and ggt_ref_max is not None:
        if ggt > ggt_ref_max:
            colestase_presente = True
            interpretations_list.append(f"Gama-GT elevada ({ggt} U/L, Ref: <{ggt_ref_max}).")
            abnormalities_list.append("Gama-GT Elevada")
            if ggt_ref_max is not None and ggt > 5 * ggt_ref_max: # e.g. > 300 if ref is 60
                interpretations_list.append("Elevação acentuada de GGT - sugere obstrução biliar, colangite ou indução enzimática significativa (álcool, medicamentos).")
                recommendations_list.append("Segundo as diretrizes da AASLD, GGT >5x LSN indica colestase significativa. Investigar obstrução biliar com USG abdominal e colangio-RM.")
                recommendations_list.append("DIAGNOSTIC WORKUP RECOMMENDED: Solicitar USG abdominal imediato. Se obstrução confirmada, considerar colangio-RM ou colangiopancreatografia retrógrada endoscópica (CPRE).")
            else:
                interpretations_list.append("Elevação de GGT - pode indicar colestase, hepatite alcoólica/medicamentosa ou esteatose.")
                recommendations_list.append("Segundo as diretrizes da AASLD, GGT leve a moderada pode indicar esteatose hepática ou uso de medicamentos. Investigar etiologia com histórico clínico.")
        else:
            interpretations_list.append(f"Gama-GT normal ({ggt} U/L).")

    if fosf_alc is not None and fosf_alc_ref_max is not None:
        if fosf_alc > fosf_alc_ref_max:
            colestase_presente = True
            interpretations_list.append(f"Fosfatase Alcalina elevada ({fosf_alc} U/L, Ref: <{fosf_alc_ref_max}).")
            abnormalities_list.append("Fosfatase Alcalina Elevada")
            if fosf_alc_ref_max is not None and fosf_alc > 3 * fosf_alc_ref_max: # e.g. > 360 if ref is 120
                interpretations_list.append("Elevação importante de Fosfatase Alcalina - sugere obstrução biliar, colangite, metástases hepáticas ou doença óssea significativa.")
                recommendations_list.append("Investigar causa da elevação da FA (imagem abdominal, marcadores ósseos se necessário).")
            else:
                interpretations_list.append("Elevação de Fosfatase Alcalina - pode indicar colestase, infiltração hepática ou doença óssea.")
        else:
            interpretations_list.append(f"Fosfatase Alcalina normal ({fosf_alc} U/L).")

    if ggt is not None and fosf_alc is not None and ggt_ref_max is not None and fosf_alc_ref_max is not None and ggt > ggt_ref_max and fosf_alc > fosf_alc_ref_max:
        interpretations_list.append("Padrão colestático (elevação de Gama-GT e Fosfatase Alcalina) - sugere obstrução biliar, colangite ou colestase intra-hepática. Considerar ultrassonografia abdominal.")
        abnormalities_list.append("Padrão Colestático")
        recommendations_list.append("Investigar possível colestase com exames de imagem (USG abdominal).")

    # Analyze bilirubin (BT, BD, BI)
    bt = processed_dados.get('BT')
    bd = processed_dados.get('BD')
    bi = processed_dados.get('BI')

    if bt is not None:
        bt_criticality, bt_description = _get_criticality_level("Bilirrubina Total", bt, {
            'critical': [20.0],
            'significant': [(5.0, 20.0)],
            'monitoring': [(1.2, 5.0)]
        })
        # Note: criticality assessment integrated into detailed interpretation below
        if bt_criticality == "CRITICAL":
            is_critical_flag = True
    
    bt_ref_min, bt_ref_max = (None, None)
    if 'BT' in REFERENCE_RANGES:
        bt_ref_min, bt_ref_max = REFERENCE_RANGES['BT']
    else:
        interpretations_list.append("Faixa de referência para Bilirrubina Total não encontrada.")

    bd_ref_min, bd_ref_max = (None, None)
    if 'BD' in REFERENCE_RANGES:
        bd_ref_min, bd_ref_max = REFERENCE_RANGES['BD']
    else:
        interpretations_list.append("Faixa de referência para Bilirrubina Direta não encontrada.")

    if bt is not None and bt_ref_max is not None:
        if bt > bt_ref_max:
            interpretations_list.append(f"Bilirrubina Total elevada ({bt} mg/dL, Ref: <{bt_ref_max}).")
            abnormalities_list.append("Hiperbilirrubinemia Total")
            if bt > 12.0:
                interpretations_list.append("Hiperbilirrubinemia acentuada (>12 mg/dL) - sugere obstrução biliar completa, hepatite grave, ou síndromes raras. Risco de encefalopatia.")
                is_critical_flag = True
                recommendations_list.append("Hiperbilirrubinemia crítica. Avaliação urgente da causa e manejo de complicações. Segundo as diretrizes da AASLD, bilirrubina >12 mg/dL indica falência hepática aguda.")
                recommendations_list.append("SPECIALIST CONSULTATION RECOMMENDED: Hepatologista imediatamente para avaliação de transplante hepático. Monitorar INR, creatinina, grau de encefalopatia e infecções.")
            elif bt > 3.0:
                interpretations_list.append("Hiperbilirrubinemia moderada (icterícia clínica) - pode ocorrer em diversas hepatopatias, hemólise ou Sd. Gilbert.")
                recommendations_list.append("Segundo as diretrizes da AASLD, bilirrubina 3-12 mg/dL indica icterícia clínica. Investigar etiologia com relação BD/BI enzimas hepáticas.")
                recommendations_list.append("DIAGNOSTIC WORKUP RECOMMENDED: Solicitar relação BD/BI, TGO/TGP, fosfatase alcalina e GGT. Para icterícia mista: considerar hepatite viral e obstrução biliar.")
            else:
                interpretations_list.append("Hiperbilirrubinemia discreta - pode ser fisiológica (Gilbert), ou indicar disfunção hepática/hemólise inicial.")
                recommendations_list.append("Segundo as diretrizes da AASLD, bilirrubina leve pode ser normal em alguns pacientes ou indicar Síndrome de Gilbert. Repetir se sintomática.")

            calculated_bi_from_bt_bd = None
            if bd is not None and bd_ref_max is not None:
                calculated_bi_from_bt_bd = bt - bd
                details_dict['BI_calculada'] = calculated_bi_from_bt_bd
                if bd > bd_ref_max:
                    interpretations_list.append(f"Bilirrubina Direta elevada ({bd} mg/dL, Ref: <{bd_ref_max}).")
                    abnormalities_list.append("Hiperbilirrubinemia Direta")
                    if bd / bt > 0.5:
                        interpretations_list.append("Padrão de hiperbilirrubinemia predominantemente direta - sugere colestase (intra ou extra-hepática) ou lesão hepatocelular.")
                        abnormalities_list.append("Predomínio Bilirrubina Direta")
                        recommendations_list.append("Investigar causas de colestase ou lesão hepatocelular (USG, sorologias).")
                
                effective_bi = bi if bi is not None else calculated_bi_from_bt_bd
                # Approximate BI ref_max: bt_ref_max - bd_ref_min (assuming bd_ref_min is usually 0 or very low)
                # This logic needs careful review if BI is critical and not directly provided
                approx_bi_ref_max = bt_ref_max - (REFERENCE_RANGES['BD'][0] if 'BD' in REFERENCE_RANGES else 0)
                if effective_bi is not None and effective_bi > approx_bi_ref_max: 
                    if (bd is None or bd_ref_max is None or bd <= bd_ref_max or effective_bi / bt > 0.8):
                        interpretations_list.append(f"Bilirrubina Indireta elevada ({effective_bi:.2f} mg/dL).")
                        abnormalities_list.append("Hiperbilirrubinemia Indireta")
                        if effective_bi / bt > 0.8:
                            interpretations_list.append("Padrão de hiperbilirrubinemia predominantemente indireta - sugere hemólise ou defeitos de conjugação (ex: Sd. Gilbert).")
                            abnormalities_list.append("Predomínio Bilirrubina Indireta")
                            recommendations_list.append("Investigar hemólise (LDH, haptoglobina, reticulócitos) ou considerar Sd. Gilbert se leve e isolada.")
            elif bi is not None: # BI provided, BT elevated, BD not available or its range is not found
                 # Similar logic for BI if BT is elevated and BI is provided
                approx_bi_ref_max_alt = bt_ref_max # Fallback if BD range is problematic
                if bi > approx_bi_ref_max_alt: 
                    interpretations_list.append(f"Bilirrubina Indireta elevada ({bi} mg/dL).")
                    abnormalities_list.append("Hiperbilirrubinemia Indireta")
                    interpretations_list.append("Sugere hemólise ou defeitos de conjugação. BT e BD necessários para melhor diferenciação.")
        else:
            interpretations_list.append(f"Bilirrubina Total normal ({bt} mg/dL).")

    # Analyze protein metabolism (Albumina)
    albumina = processed_dados.get('Albumina')
    alb_min_ref, alb_max_ref = (None, None)
    if 'Albumina' in REFERENCE_RANGES:
        alb_min_ref, alb_max_ref = REFERENCE_RANGES['Albumina']
    else:
        interpretations_list.append("Faixa de referência para Albumina não encontrada.")

    if albumina is not None and alb_min_ref is not None:
        if albumina < alb_min_ref:
            interpretations_list.append(f"Albumina reduzida ({albumina} g/dL, Ref: {alb_min_ref}-{alb_max_ref}).")
            abnormalities_list.append("Hipoalbuminemia")
            if albumina < 2.5:
                interpretations_list.append("Hipoalbuminemia grave - sugere doença hepática crônica avançada (cirrose), síndrome nefrótica, ou desnutrição grave.")
                recommendations_list.append("Avaliar função hepática global, proteinúria e estado nutricional. Risco de complicações (ascite, edema).")
                is_critical_flag = True 
            elif albumina < 3.0:
                interpretations_list.append("Hipoalbuminemia moderada - pode indicar hepatopatia crônica, desnutrição, ou doenças inflamatórias crônicas.")
            else:
                interpretations_list.append("Hipoalbuminemia leve - pode ser vista em diversas condições, incluindo inflamação aguda.")
        elif alb_max_ref is not None and albumina > alb_max_ref:
            interpretations_list.append(f"Albumina elevada ({albumina} g/dL) - geralmente indica desidratação.")
            abnormalities_list.append("Hiperalbuminemia (Desidratação?)")
        else:
            interpretations_list.append(f"Albumina normal ({albumina} g/dL).")

    # Analyze INR (RNI) for hepatic synthetic function
    rni = processed_dados.get('RNI') # RNI is used as key in REFERENCE_RANGES for baseline INR
    inr_ref_min, inr_ref_max = (None, None)
    if 'RNI' in REFERENCE_RANGES: # Using RNI key for non-anticoagulated reference
        inr_ref_min, inr_ref_max = REFERENCE_RANGES['RNI']
    
    if rni is not None and inr_ref_max is not None:
        details_dict['RNI_interpretado_funcao_hepatica'] = rni
        if rni > inr_ref_max:
            # This interpretation assumes patient is NOT on anticoagulants.
            # If on anticoagulants, this interpretation is not valid and should be handled by coagulation panel.
            interpretation_inr = f"INR (RNI) elevado: {rni}. "
            if rni > 1.5: # Significantly elevated for non-anticoagulated
                interpretation_inr += "Em paciente sem anticoagulação conhecida, sugere disfunção sintética hepática significativa (ex: cirrose, insuficiência hepática aguda). Correlacionar com outros marcadores e clínica."
                abnormalities_list.append("INR Elevado (Disfunção Hepática?)")
                recommendations_list.append("INR elevado em paciente não anticoagulado: Avaliar função hepática global. Pode indicar prognóstico reservado em hepatopatias.")
                if rni > 2.0: # Often a threshold for more severe dysfunction
                    is_critical_flag = True
                    recommendations_list.append("INR > 2.0 (sem anticoagulação): Risco aumentado de sangramento e indicador de insuficiência hepática. Avaliação urgente.")
            elif rni > inr_ref_max: # Mildly elevated
                interpretation_inr += "Em paciente sem anticoagulação conhecida, pode indicar disfunção sintética hepática leve a moderada ou deficiência de Vitamina K. Investigar."
                abnormalities_list.append("INR Levemente Elevado (Disfunção Hepática? Vit K?)")
            interpretations_list.append(interpretation_inr)
        else:
            interpretations_list.append(f"INR (RNI) dentro da faixa de referência para não anticoagulados ({rni}).")
    elif rni is not None:
        interpretations_list.append(f"INR (RNI) fornecido ({rni}), mas faixa de referência para não anticoagulados não encontrada para interpretação no contexto hepático.")

    # MELD Score Calculation (Simplified example, requires Creatinine, Bilirubin, INR)
    # MELD = 3.78 * ln(Bilirrubina Total mg/dL) + 11.2 * ln(INR) + 9.57 * ln(Creatinina mg/dL) + 6.43

    # Hepatocellular vs Cholestatic (R value) - Ensure all refs are present
    if (tgo is not None and tgp is not None and fosf_alc is not None and 
        tgo > 0 and tgp > 0 and fosf_alc > 0 and 
        tgo_ref_max is not None and tgp_ref_max is not None and fosf_alc_ref_max is not None):
        
        alt_ratio = tgp / tgp_ref_max 
        alp_ratio = fosf_alc / fosf_alc_ref_max
        if alp_ratio > 0: # Avoid division by zero if fosf_alc_ref_max is 0 for some reason
            r_value = alt_ratio / alp_ratio
            details_dict['R_value_hepatocellular_cholestatic'] = f"{r_value:.2f}"
            interpretations_list.append(f"Valor R (ALT_ratio/ALP_ratio): {r_value:.2f}.")
            
            ggt_normal = False
            if ggt is not None and ggt_ref_max is not None:
                ggt_normal = ggt <= ggt_ref_max
            
            fosf_alc_elevated = False
            if fosf_alc is not None and fosf_alc_ref_max is not None:
                fosf_alc_elevated = fosf_alc > fosf_alc_ref_max

            if r_value > 5:
                interpretations_list.append("Padrão predominantemente hepatocelular (Valor R > 5).")
                abnormalities_list.append("Lesão Hepatocelular (R>5)")
            elif r_value < 2:
                base_interpretation_r_cholestatic = "Padrão predominantemente colestático (Valor R < 2)."
                if fosf_alc_elevated and ggt_normal:
                    base_interpretation_r_cholestatic += " No entanto, com Gama-GT normal, a elevação isolada da Fosfatase Alcalina pode sugerir origem não hepática (ex: óssea) ou colestase muito inicial/específica."
                    recommendations_list.append("Considerar isoenzimas da Fosfatase Alcalina ou marcadores ósseos se suspeita de origem não hepática da FA elevada com GGT normal.")
                interpretations_list.append(base_interpretation_r_cholestatic)
                abnormalities_list.append("Lesão Colestática (R<2)")
            else: # 2 <= R_value <= 5
                interpretations_list.append("Padrão misto (hepatocelular e colestático) (Valor R entre 2-5).")
                abnormalities_list.append("Lesão Mista (R 2-5)")

    final_details_dict = {k: v for k, v in details_dict.items() if v is not None}

    return {
        "interpretation": "\n".join(interpretations_list) if interpretations_list else "Nenhuma interpretação hepática gerada.",
        "abnormalities": list(dict.fromkeys(abnormalities_list)),
        "is_critical": is_critical_flag,
        "recommendations": list(dict.fromkeys(recommendations_list)),
        "details": final_details_dict
    } 