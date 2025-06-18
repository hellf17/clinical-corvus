"""
Renal function analysis module for interpreting kidney-related lab tests.
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

def analisar_funcao_renal(exams, **patient_kwargs):
    """
    Analyze renal function parameters and provide clinical interpretation.
    
    Args:
        exams: Dictionary or list of dictionaries containing kidney-related tests
        **patient_kwargs: Patient demographic data like idade, sexo, etnia
        
    Returns:
        dict: Dictionary containing detailed interpretation, abnormalities, critical status,
              recommendations, and specific renal parameters.
    """
    interpretations_list: List[str] = []
    abnormalities_list: List[str] = [] # This will store strings describing abnormalities
    recommendations_list: List[str] = []
    is_critical_flag: bool = False
    details_dict: Dict[str, any] = {}
    
    # Standardize input format
    standardized_params: Dict[str, Optional[float]] = {}
    if isinstance(exams, list):
        for exam in exams:
            if 'test' in exam and 'value' in exam:
                value_str = str(exam['value']) if exam['value'] is not None else None
                converted_value = _safe_convert_to_float(value_str)
                if converted_value is not None:
                    standardized_params[exam['test']] = converted_value
                else:
                    logger.info(f"Could not convert renal param {exam['test']}: '{exam['value']}' using _safe_convert_to_float. It will be ignored.")
    elif isinstance(exams, dict):
        for key, value in exams.items():
            if value is not None:
                value_str = str(value) if not isinstance(value, str) else value
                converted_value = _safe_convert_to_float(value_str)
                if converted_value is not None:
                    standardized_params[key] = converted_value
                else:
                    logger.info(f"Could not convert renal param {key}: '{value}' using _safe_convert_to_float. It will be ignored.")
    else:
        return {
            "interpretation": "Dados de entrada inválidos para análise renal.",
            "abnormalities": [], "is_critical": False, "recommendations": [], "details": {}
        }
    
    # Check for at least one renal test
    renal_test_keys = ['Creat', 'Ur', 'ProtCreatRatio', 'ProteinuriaVol', 'UrineHem', 'UrineLeuco', 'K+']
    if not any(k in standardized_params for k in renal_test_keys):
        return {
            "interpretation": "Dados insuficientes para análise da função renal.",
            "abnormalities": [], "is_critical": False, "recommendations": [], "details": standardized_params
        }
    
    # Populate details_dict with all provided standardized_params initially
    for key, value in standardized_params.items():
        details_dict[key] = value
    
    # Get patient demographics
    idade = patient_kwargs.get('idade')
    sexo = patient_kwargs.get('sexo')
    etnia = patient_kwargs.get('etnia')
    if idade: details_dict['idade_paciente'] = idade
    if sexo: details_dict['sexo_paciente'] = sexo
    if etnia: details_dict['etnia_paciente'] = etnia
    
    # Analyze creatinine & eGFR
    if 'Creat' in standardized_params and standardized_params['Creat'] is not None:
        creat_value = standardized_params['Creat']
        creat_min_ref, creat_max_ref = REFERENCE_RANGES['Creat']
        details_dict['Creat_ref'] = f"{creat_min_ref}-{creat_max_ref} mg/dL"
        
        if creat_value < creat_min_ref:
            interpretations_list.append(f"Creatinina reduzida: {creat_value} mg/dL. Pode indicar desnutrição ou baixa massa muscular.")
            abnormalities_list.append("Creatinina Baixa")
        elif creat_value > creat_max_ref:
            interpretations_list.append(f"Creatinina elevada: {creat_value} mg/dL.")
            abnormalities_list.append("Creatinina Elevada")
            if creat_value > 3.0:
                interpretations_list.append("Disfunção renal significativa/importante - considerar lesão renal aguda ou doença renal crônica avançada.")
                recommendations_list.append("Avaliação nefrológica urgente. Monitorar débito urinário e sinais de uremia.")
                is_critical_flag = True
            elif creat_value > 2.0:
                interpretations_list.append("Disfunção renal moderada - avaliar causa e evolução.")
                recommendations_list.append("Monitorar função renal. Investigar causa da elevação da creatinina.")
            else: # creat_value > creat_max_ref but <= 2.0
                interpretations_list.append("Disfunção renal leve - avaliar contexto clínico.")
                recommendations_list.append("Repetir exame, avaliar histórico e fatores de risco.")
        else:
            interpretations_list.append(f"Creatinina normal: {creat_value} mg/dL.")
        
        # Calculate eGFR (CKD-EPI)
        if idade is not None and sexo is not None and creat_value is not None:
            try:
                idade_val = float(idade)
                k_val, alpha_val, scr_ratio_val = (0.0, 0.0, 0.0) # Initialize to float
                
                if sexo.upper() == 'F':
                    k_val = 0.7
                    alpha_val = -0.241 # exponent for female, if creat/k <= 1 (new CKD-EPI 2021)
                    if creat_value / k_val > 1: alpha_val = -1.200 # exponent for female, if creat/k > 1 (new CKD-EPI 2021)
                    egfr_factor = 142
                    if etnia and etnia.lower() in ["negro", "black", "afrodescendente"]:
                        # CKD-EPI 2021 removed race coefficient, but some labs might still use older versions or specific adjustments
                        # For now, using the 2021 CKD-EPI formula as standard which does not use race.
                        pass
                else: # Male or other
                    k_val = 0.9
                    alpha_val = -0.302 # exponent for male, if creat/k <= 1
                    if creat_value / k_val > 1: alpha_val = -1.200 # exponent for male, if creat/k > 1
                    egfr_factor = 142
                    if etnia and etnia.lower() in ["negro", "black", "afrodescendente"]:
                        pass
                
                scr_k_ratio = creat_value / k_val
                egfr = egfr_factor * (min(scr_k_ratio, 1.0)**alpha_val) * (max(scr_k_ratio, 1.0)**-1.200) * (0.9938**idade_val)
                if sexo.upper() == 'F': egfr *= 1.012 # Female coefficient for 2021 CKD-EPI
                
                details_dict['TFG_estimada_CKD_EPI_2021_race_free'] = f"{egfr:.1f} mL/min/1.73m²"
                interpretations_list.append(f"TFG estimada (CKD-EPI 2021, sem ajuste racial): {egfr:.1f} mL/min/1.73m².")
                
                if egfr >= 90:
                    interpretations_list.append("Estágio G1: Função renal normal ou aumentada (se outros sinais de doença renal). Investigar outros sinais se suspeita.")
                elif egfr >= 60:
                    interpretations_list.append("Estágio G2: Redução leve da função renal. Monitorar e controlar fatores de risco.")
                    abnormalities_list.append("TFG Reduzida (Estágio G2)")
                elif egfr >= 45:
                    interpretations_list.append("Estágio G3a: Redução leve a moderada da função renal. Evitar nefrotóxicos, ajustar doses.")
                    abnormalities_list.append("TFG Reduzida (Estágio G3a)")
                elif egfr >= 30:
                    interpretations_list.append("Estágio G3b: Redução moderada a grave da função renal. Encaminhar para nefrologista.")
                    abnormalities_list.append("TFG Reduzida (Estágio G3b)")
                    if creat_value > creat_max_ref: recommendations_list.append("Acompanhamento nefrológico para DRC estágio G3b.")
                elif egfr >= 15:
                    interpretations_list.append("Estágio G4: Redução grave da função renal. Acompanhamento nefrológico regular, preparo para TRS.")
                    abnormalities_list.append("TFG Reduzida (Estágio G4)")
                    is_critical_flag = True # Stage G4 is considered severe/critical by many guidelines for action
                    recommendations_list.append("DRC Estágio G4. Acompanhamento nefrológico intensivo e planejamento de terapia renal substitutiva.")
                else: # egfr < 15
                    interpretations_list.append("Estágio G5: Falência renal. Necessidade de terapia renal substitutiva.")
                    abnormalities_list.append("TFG Reduzida (Estágio G5 - Falência Renal)")
                    is_critical_flag = True
                    recommendations_list.append("DRC Estágio G5 (Falência Renal). Iniciar/avaliar terapia renal substitutiva urgentemente.")
            except Exception as e:
                interpretations_list.append(f"Não foi possível calcular TFG estimada: {e}")
    
    # Analyze urea
    if 'Ur' in standardized_params and standardized_params['Ur'] is not None:
        urea_value = standardized_params['Ur']
        ur_min_ref, ur_max_ref = REFERENCE_RANGES['Ur']
        details_dict['Ur_ref'] = f"{ur_min_ref}-{ur_max_ref} mg/dL"
        
        if urea_value < ur_min_ref:
            interpretations_list.append(f"Ureia reduzida: {urea_value} mg/dL. Causas: baixa ingesta proteica, hepatopatia grave, hiperhidratação.")
            abnormalities_list.append("Ureia Baixa")
        elif urea_value > ur_max_ref:
            interpretations_list.append(f"Ureia elevada: {urea_value} mg/dL.")
            abnormalities_list.append("Ureia Elevada (Azotemia)")
            if urea_value > 200:
                interpretations_list.append("Azotemia muito grave - alta probabilidade de síndrome urêmica.")
                recommendations_list.append("Azotemia crítica. Avaliação urgente para uremia e necessidade de diálise.")
                is_critical_flag = True
            elif urea_value > 100:
                interpretations_list.append("Azotemia grave - indicativo de disfunção renal significativa ou outras causas de hipercatabolismo/sangramento digestivo.")
                recommendations_list.append("Investigar causa da azotemia grave. Monitorar função renal e hidratação.")
            else: # urea_value > ur_max_ref but <= 100
                interpretations_list.append("Azotemia leve a moderada - pode ser devido a desidratação, aumento do catabolismo proteico, ou disfunção renal inicial.")
                recommendations_list.append("Avaliar hidratação, dieta proteica e função renal.")
        else:
            interpretations_list.append(f"Ureia normal: {urea_value} mg/dL.")
    
    # BUN/Creatinine ratio
    if 'Ur' in standardized_params and 'Creat' in standardized_params and \
       standardized_params['Ur'] is not None and standardized_params['Creat'] is not None and standardized_params['Creat'] > 0:
        urea_val = standardized_params['Ur']
        creat_val = standardized_params['Creat']
        bun_val = urea_val / 2.14
        ratio = bun_val / creat_val
        details_dict['Relacao_BUN_Creatinina'] = f"{ratio:.1f}"
        interpretations_list.append(f"Relação BUN/Creatinina: {ratio:.1f}.")
        if ratio > 20:
            interpretations_list.append("Relação BUN/Creatinina elevada: sugere causa pré-renal (ex: desidratação, sangramento TGI, catabolismo aumentado) ou dieta hiperproteica.")
            abnormalities_list.append("Relação BUN/Creatinina Elevada")
            recommendations_list.append("Avaliar volemia, sangramentos e ingesta proteica.")
        elif ratio < 10:
            interpretations_list.append("Relação BUN/Creatinina reduzida: sugere baixa ingesta proteica, doença hepática grave, rabdomiólise ou SIADH.")
            abnormalities_list.append("Relação BUN/Creatinina Baixa")
            recommendations_list.append("Avaliar ingesta proteica, função hepática e hidratação.")
    
    # Potassium in renal context (simplified)
    if 'K+' in standardized_params and standardized_params['K+'] is not None and \
       'Creat' in standardized_params and standardized_params['Creat'] is not None:
        k_value = standardized_params['K+']
        creat_value = standardized_params['Creat']
        _, k_max_ref = REFERENCE_RANGES['K+']
        _, creat_max_ref = REFERENCE_RANGES['Creat']
        if k_value > k_max_ref and creat_value > creat_max_ref:
            interpretations_list.append(f"Hipercalemia ({k_value} mmol/L) em contexto de disfunção renal (Creat: {creat_value} mg/dL). Risco aumentado de arritmias.")
            abnormalities_list.append("Hipercalemia com Disfunção Renal")
            recommendations_list.append("Monitorar K+ sérico, ECG. Avaliar necessidade de medidas para redução do K+.")
            if k_value > 6.5: is_critical_flag = True # Critical hyperkalemia
    
    # Proteinuria (Ratio)
    if 'ProtCreatRatio' in standardized_params and standardized_params['ProtCreatRatio'] is not None:
        pcr_value = standardized_params['ProtCreatRatio'] # Assuming g/g or mg/mg based on lab
        # Assuming reference < 0.2 g/g (or 200 mg/g). Adjust as needed.
        pcr_ref_max = 0.2
        details_dict['ProtCreatRatio_ref'] = f"< {pcr_ref_max} g/g (ou mg/mg)"
        if pcr_value > pcr_ref_max:
            interpretations_list.append(f"Relação Proteína/Creatinina urinária elevada: {pcr_value} (unidade conforme lab).")
            abnormalities_list.append("Proteinúria (Relação Prot/Creat Elevada)")
            if pcr_value > 3.0: # Nephrotic range (e.g., >3-3.5 g/g)
                interpretations_list.append("Proteinúria em nível nefrótico. Sugere glomerulopatia. Investigação nefrológica urgente.")
                recommendations_list.append("Avaliação nefrológica para síndrome nefrótica.")
                is_critical_flag = True # Nephrotic range proteinuria is often managed urgently
            elif pcr_value > 1.0:
                interpretations_list.append("Proteinúria significativa. Indica lesão glomerular/renal relevante.")
                recommendations_list.append("Investigar causa da proteinúria. Acompanhamento nefrológico.")
            else: # pcr_value > pcr_ref_max but <= 1.0
                interpretations_list.append("Proteinúria leve a moderada. Pode indicar nefropatia incipiente ou outras causas.")
                recommendations_list.append("Monitorar proteinúria, função renal e pressão arterial.")
        else:
            interpretations_list.append(f"Relação Proteína/Creatinina urinária normal: {pcr_value}.")
    
    # Proteinuria (Volume 24h)
    if 'ProteinuriaVol' in standardized_params and standardized_params['ProteinuriaVol'] is not None:
        prot_vol_value = standardized_params['ProteinuriaVol'] # Assuming mg/24h
        prot_vol_ref_max = 150 # mg/24h
        details_dict['ProteinuriaVol_ref'] = f"< {prot_vol_ref_max} mg/24h"
        if prot_vol_value > prot_vol_ref_max:
            interpretations_list.append(f"Proteinúria de 24h aumentada: {prot_vol_value} mg/24h.")
            abnormalities_list.append("Proteinúria (Volume 24h Elevado)")
            if prot_vol_value > 3500: # Nephrotic range
                interpretations_list.append("Proteinúria em nível nefrótico (>3.5g/24h). Sugere doença glomerular.")
                recommendations_list.append("Avaliação nefrológica para síndrome nefrótica.")
                is_critical_flag = True
            elif prot_vol_value > 1000:
                interpretations_list.append("Proteinúria significativa (>1g/24h). Indica lesão renal relevante.")
                recommendations_list.append("Investigar causa. Acompanhamento nefrológico.")
            else:
                interpretations_list.append("Proteinúria leve a moderada. Monitorar.")
        else:
            interpretations_list.append(f"Proteinúria de 24h normal: {prot_vol_value} mg/24h.")
    
    # Albumin-to-Creatinine Ratio (ACR / RAC)
    acr_value_mg_g = None
    acr_value_mg_mmol = None
    acr_keys_mg_g = ['RAC_mg_g', 'ACR_mg_g', 'AlbCreatRatio_mg_g', 'RelacaoAlbuminuriaCreatininuria_mg_g']
    acr_keys_mg_mmol = ['RAC_mg_mmol', 'ACR_mg_mmol', 'AlbCreatRatio_mg_mmol', 'RelacaoAlbuminuriaCreatininuria_mg_mmol']

    for key in acr_keys_mg_g:
        if key in standardized_params and standardized_params[key] is not None:
            acr_value_mg_g = standardized_params[key]
            details_dict['RAC_valor_fornecido_mg_g'] = acr_value_mg_g
            break
    if acr_value_mg_g is None: # If not found in mg/g, check for mg/mmol
        for key in acr_keys_mg_mmol:
            if key in standardized_params and standardized_params[key] is not None:
                acr_value_mg_mmol = standardized_params[key]
                details_dict['RAC_valor_fornecido_mg_mmol'] = acr_value_mg_mmol
                # Convert to mg/g for consistent internal logic if needed, or use dual reference ranges
                # For simplicity, this example will primarily use mg/g and convert if mg/mmol is primary.
                # If mg/mmol is found, we can estimate mg/g: value_mg_mmol * 8.84 (approx if Cr in mg/dL) or use mg/mmol refs directly
                # For this implementation, we will assume that if one unit is provided, we use that unit's ref range.
                break

    if acr_value_mg_g is not None:
        # Interpret using mg/g
        rac_ref_min_mg_g, rac_ref_max_mg_g = REFERENCE_RANGES['RAC_mg_g']
        details_dict['RAC_ref_mg_g'] = f"Normal: <{rac_ref_max_mg_g} mg/g; Microalbuminúria: {rac_ref_max_mg_g}-300 mg/g; Macroalbuminúria: >300 mg/g"
        interpretation_acr = f"Relação Albumina/Creatinina (RAC): {acr_value_mg_g} mg/g. "
        if acr_value_mg_g > 300:
            interpretation_acr += "Albumina urinária severamente aumentada (Macroalbuminúria)."
            abnormalities_list.append("Macroalbuminúria (RAC > 300 mg/g)")
            recommendations_list.append("Macroalbuminúria indica dano renal significativo. Acompanhamento nefrológico e manejo agressivo dos fatores de risco (PA, glicemia, dislipidemia) são essenciais. Considerar IECA/BRA.")
            is_critical_flag = True # Often considered a marker for more severe/urgent attention
        elif acr_value_mg_g >= rac_ref_max_mg_g: # 30-300 mg/g
            interpretation_acr += "Albumina urinária moderadamente aumentada (Microalbuminúria)."
            abnormalities_list.append("Microalbuminúria (RAC 30-300 mg/g)")
            recommendations_list.append("Microalbuminúria é um marcador precoce de doença renal, especialmente em diabetes e hipertensão. Recomenda-se otimizar controle da PA, glicemia, e considerar IECA/BRA conforme diretrizes.")
        else: # < 30 mg/g
            interpretation_acr += "Albumina urinária normal."
        interpretations_list.append(interpretation_acr)
    
    elif acr_value_mg_mmol is not None:
        # Interpret using mg/mmol
        rac_ref_min_mg_mmol, rac_ref_max_mg_mmol = REFERENCE_RANGES['RAC_mg_mmol']
        details_dict['RAC_ref_mg_mmol'] = f"Normal: <{rac_ref_max_mg_mmol} mg/mmol; Microalbuminúria: {rac_ref_max_mg_mmol}-34 mg/mmol; Macroalbuminúria: >34 mg/mmol"
        interpretation_acr = f"Relação Albumina/Creatinina (RAC): {acr_value_mg_mmol} mg/mmol. "
        if acr_value_mg_mmol > 34: # Corresponds to >300 mg/g
            interpretation_acr += "Albumina urinária severamente aumentada (Macroalbuminúria)."
            abnormalities_list.append("Macroalbuminúria (RAC > 34 mg/mmol)")
            recommendations_list.append("Macroalbuminúria indica dano renal significativo. Acompanhamento nefrológico e manejo agressivo dos fatores de risco (PA, glicemia, dislipidemia) são essenciais. Considerar IECA/BRA.")
            is_critical_flag = True
        elif acr_value_mg_mmol >= rac_ref_max_mg_mmol: # 3.4-34 mg/mmol
            interpretation_acr += "Albumina urinária moderadamente aumentada (Microalbuminúria)."
            abnormalities_list.append("Microalbuminúria (RAC 3.4-34 mg/mmol)")
            recommendations_list.append("Microalbuminúria é um marcador precoce de doença renal, especialmente em diabetes e hipertensão. Recomenda-se otimizar controle da PA, glicemia, e considerar IECA/BRA conforme diretrizes.")
        else: # < 3.4 mg/mmol
            interpretation_acr += "Albumina urinária normal."
        interpretations_list.append(interpretation_acr)

    # Urinalysis - Hematuria
    if 'UrineHem' in standardized_params and standardized_params['UrineHem'] is not None:
        hem_value = standardized_params['UrineHem'] # Assuming cells/campo or qualitative
        hem_ref_max = REFERENCE_RANGES['UrineHem'][1] # e.g., 2-5 cells/HPF
        details_dict['UrineHem_ref'] = f"< {hem_ref_max} células/campo"
        if hem_value > hem_ref_max:
            interpretations_list.append(f"Hematúria presente: {hem_value} (valor conforme lab).")
            abnormalities_list.append("Hematúria")
            recommendations_list.append("Investigar causa da hematúria (infecção, litíase, neoplasia, glomerulopatia).")
    
    # Urinalysis - Leukocyturia
    if 'UrineLeuco' in standardized_params and standardized_params['UrineLeuco'] is not None:
        leuco_value = standardized_params['UrineLeuco'] # Assuming cells/campo or qualitative
        leuco_ref_max = REFERENCE_RANGES['UrineLeuco'][1] # e.g., 5 cells/HPF
        details_dict['UrineLeuco_ref'] = f"< {leuco_ref_max} células/campo"
        if leuco_value > leuco_ref_max:
            interpretations_list.append(f"Leucocitúria presente: {leuco_value} (valor conforme lab).")
            abnormalities_list.append("Leucocitúria")
            recommendations_list.append("Sugere infecção do trato urinário ou inflamação renal/urinária. Considerar urocultura.")
    
    final_interpretation = "\n".join(interpretations_list) if interpretations_list else "Não foi possível gerar interpretação detalhada da função renal."
    if not abnormalities_list and not interpretations_list:
        final_interpretation = "Função renal aparentemente normal com base nos dados fornecidos."
        if not standardized_params: final_interpretation = "Dados insuficientes para análise da função renal."
    
    return {
        "interpretation": final_interpretation,
        "abnormalities": list(dict.fromkeys(abnormalities_list)),
        "is_critical": is_critical_flag,
        "recommendations": list(dict.fromkeys(recommendations_list)),
        "details": details_dict
    } 