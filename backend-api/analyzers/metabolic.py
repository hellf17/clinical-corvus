"""
Metabolic analysis module for interpreting glucose metabolism, lipids, and other metabolic parameters.
"""

import math
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

def analisar_metabolismo(dados: Dict[str, any], idade: Optional[int] = None, sexo: Optional[str] = None, jejum: bool = True) -> Dict[str, any]:
    """
    Analyze metabolic parameters including glucose, HbA1c, uric acid, lipid profile, and thyroid function.
    
    Args:
        dados: Dictionary containing metabolic parameters
        idade: Patient's age in years (for interpretation)
        sexo: Patient's sex ('M' or 'F') for gender-specific reference ranges
        jejum: Whether the tests were performed in fasting state (boolean)
        
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
    params_to_convert = ['Glicose', 'HbA1c', 'AcidoUrico', 'CT', 'LDL', 'HDL', 'TG', 'TSH', 'T4L']

    for key, raw_value in dados.items():
        details_dict[key] = raw_value
        if key in params_to_convert:
            if raw_value is not None:
                value_str = str(raw_value) if not isinstance(raw_value, str) else raw_value
                converted_value = _safe_convert_to_float(value_str)
                if converted_value is not None:
                    processed_dados[key] = converted_value
                    details_dict[key] = converted_value
                else:
                    processed_dados[key] = None
                    logger.info(f"Could not convert metabolic param {key}: '{raw_value}'. It will be ignored for numeric analysis.")
            else:
                processed_dados[key] = None
        else:
            processed_dados[key] = raw_value

    details_dict['jejum'] = jejum
    if idade: details_dict['idade_paciente'] = idade
    if sexo: details_dict['sexo_paciente'] = sexo

    if not any(k in processed_dados and processed_dados[k] is not None for k in params_to_convert):
        if not any(k in dados and dados[k] is not None for k in params_to_convert):
            return {
                "interpretation": "Dados insuficientes para análise metabólica.",
                "abnormalities": [], "is_critical": False, "recommendations": [], "details": details_dict
            }

    glicose = processed_dados.get('Glicose')
    hba1c = processed_dados.get('HbA1c')

    if glicose is not None:
        glicose_min_ref, glicose_max_ref = REFERENCE_RANGES['Glicose']
        details_dict['Glicose_ref_jejum'] = f"{glicose_min_ref}-{glicose_max_ref} mg/dL"
        
        if jejum:
            if glicose < 70:
                interpretations_list.append(f"Hipoglicemia em jejum ({glicose} mg/dL).")
                abnormalities_list.append("Hipoglicemia")
                if glicose < 54:
                    interpretations_list.append("Hipoglicemia clinicamente significativa (<54 mg/dL) - risco de sintomas neuroglicopênicos. Investigar causa e tratar.")
                    recommendations_list.append("Hipoglicemia severa. Investigar causa e tratar imediatamente. Administrar glicose se sintomático.")
                    is_critical_flag = True
                else:
                    recommendations_list.append("Verificar sintomas de hipoglicemia. Ajustar medicação antidiabética se aplicável.")
            elif glicose >= 126:
                has_diabetes_criteria = True
                interpretations_list.append(f"Glicemia de jejum elevada ({glicose} mg/dL) - Critério ADA/OMS para Diabetes Mellitus.")
                abnormalities_list.append("Hiperglicemia (Jejum) - Critério Diabetes")
                recommendations_list.append("Glicemia de jejum >=126 mg/dL é critério ADA/OMS para diabetes mellitus (requer confirmação ou outros critérios). Iniciar/ajustar tratamento.")
                if glicose > 250:
                    interpretations_list.append("Hiperglicemia acentuada - risco de cetoacidose ou estado hiperosmolar. Avaliação urgente.")
                    is_critical_flag = True
                    recommendations_list.append("Hiperglicemia severa. Avaliar sinais de descompensação diabética aguda (cetoacidose, EHH).")
            elif glicose >= 100:
                has_prediabetes_criteria = True
                interpretations_list.append(f"Glicemia de jejum alterada ({glicose} mg/dL) - Critério ADA/OMS para Pré-Diabetes.")
                abnormalities_list.append("Glicemia de Jejum Alterada - Critério Pré-Diabetes")
                recommendations_list.append("Glicemia de jejum 100-125 mg/dL é compatível com pré-diabetes (critério ADA/OMS). Recomendar mudanças no estilo de vida e monitoramento.")
            else:
                interpretations_list.append(f"Glicose em jejum normal ({glicose} mg/dL).")
        else:
            details_dict['Glicose_ref_casual'] = "<140 mg/dL (ideal), <200 mg/dL (aceitável)"
            if glicose < 70:
                interpretations_list.append(f"Hipoglicemia casual ({glicose} mg/dL). Investigar causa (reativa, medicamentosa).")
                abnormalities_list.append("Hipoglicemia")
                if glicose < 54: is_critical_flag = True; recommendations_list.append("Hipoglicemia severa casual. Tratar e investigar.")
            elif glicose >= 200:
                has_diabetes_criteria = True
                interpretations_list.append(f"Glicemia casual elevada ({glicose} mg/dL) - Potencial critério ADA/OMS para Diabetes Mellitus (se sintomas presentes).")
                abnormalities_list.append("Hiperglicemia (Casual) - Potencial Critério Diabetes")
                recommendations_list.append("Glicemia casual >=200 mg/dL com sintomas de diabetes é critério ADA/OMS para diabetes mellitus. Avaliar HbA1c e iniciar/ajustar tratamento.")
                if glicose > 300: is_critical_flag = True; recommendations_list.append("Hiperglicemia severa casual. Avaliar descompensação.")
            elif glicose >= 140:
                has_prediabetes_criteria = True
                interpretations_list.append(f"Glicemia casual/pós-prandial alterada ({glicose} mg/dL) - Sugere Tolerância à Glicose Diminuída (Pré-Diabetes, critério ADA/OMS).")
                abnormalities_list.append("Tolerância à Glicose Diminuída - Critério Pré-Diabetes")
                recommendations_list.append("Valores entre 140-199 mg/dL casuais/pós-prandiais sugerem tolerância diminuída à glicose (pré-diabetes, critério ADA/OMS).")
            else:
                interpretations_list.append(f"Glicose casual normal ({glicose} mg/dL).")
    
    if hba1c is not None:
        hba1c_normal_max = REFERENCE_RANGES['HbA1c'][1]
        details_dict['HbA1c_ref'] = f"< {hba1c_normal_max}% (Normal), 5.7-6.4% (Pré-Diabetes), >=6.5% (Diabetes)"
        if hba1c >= 6.5:
            has_diabetes_criteria = True
            interpretations_list.append(f"HbA1c elevada ({hba1c}%) - Critério ADA/OMS para Diabetes Mellitus.")
            abnormalities_list.append("HbA1c Elevada - Critério Diabetes")
            if hba1c >= 9.0:
                interpretations_list.append("HbA1c >=9.0% - controle glicêmico muito ruim, alto risco de complicações crônicas.")
                recommendations_list.append("Controle glicêmico inadequado. Intensificar tratamento e educação sobre diabetes.")
                is_critical_flag = True
            elif hba1c >= 7.0:
                target_min, target_max = REFERENCE_RANGES.get('HbA1c_target', (6.5, 7.0))
                interpretations_list.append(f"HbA1c {hba1c}% - controle glicêmico inadequado para a maioria (meta usual ADA/OMS: <{target_max}%).")
                recommendations_list.append("Reavaliar e otimizar tratamento do diabetes.")
            else:
                interpretations_list.append(f"HbA1c {hba1c}% - critério diagnóstico ADA/OMS para diabetes e/ou meta de controle para alguns pacientes.")
        elif hba1c >= 5.7:
            has_prediabetes_criteria = True
            interpretations_list.append(f"HbA1c em faixa de pré-diabetes ({hba1c}%) - Critério ADA/OMS.")
            abnormalities_list.append("HbA1c Pré-Diabetes - Critério ADA/OMS")
            recommendations_list.append("HbA1c 5.7-6.4% indica pré-diabetes (critério ADA/OMS), risco aumentado para diabetes. Modificações no estilo de vida são cruciais.")
        else:
            interpretations_list.append(f"HbA1c normal ({hba1c}%).")
    
    if has_diabetes_criteria:
        interpretations_list.append("Achados compatíveis com Diabetes Mellitus. Confirmar diagnóstico se ainda não estabelecido e otimizar tratamento.")
        abnormalities_list.append("Diabetes Mellitus (Critérios Presentes)")
    elif has_prediabetes_criteria:
        interpretations_list.append("Achados compatíveis com Pré-Diabetes. Intervenções no estilo de vida são recomendadas para prevenir progressão.")
        abnormalities_list.append("Pré-Diabetes (Critérios Presentes)")

    urico = processed_dados.get('AcidoUrico')
    if urico is not None:
        urico_min_ref, urico_max_ref_male = REFERENCE_RANGES['AcidoUrico']
        urico_max_ref_female = REFERENCE_RANGES['AcidoUrico_F'][1] if 'AcidoUrico_F' in REFERENCE_RANGES else 6.0
        urico_ref_str = f"{urico_min_ref}-{urico_max_ref_male} mg/dL (M), {urico_min_ref}-{urico_max_ref_female} mg/dL (F)"
        details_dict['AcidoUrico_ref'] = urico_ref_str

        current_urico_max_ref = urico_max_ref_male
        if sexo == 'F': current_urico_max_ref = urico_max_ref_female

        if urico > current_urico_max_ref:
            interpretations_list.append(f"Ácido úrico elevado ({urico} mg/dL).")
            abnormalities_list.append("Hiperuricemia")
            recommendations_list.append("Avaliar sintomas de gota, litíase renal e fatores de risco cardiovascular. Considerar tratamento se sintomático ou muito elevado.")
            if urico > 10:
                interpretations_list.append("Hiperuricemia acentuada (>10 mg/dL) - alto risco para gota e nefropatia.")
                is_critical_flag = True
        elif urico < urico_min_ref:
            interpretations_list.append(f"Ácido úrico reduzido ({urico} mg/dL). Causas: Sd. Fanconi, medicamentos, dieta pobre em purinas.")
            abnormalities_list.append("Hipouricemia")
        else:
            interpretations_list.append(f"Ácido úrico normal ({urico} mg/dL).")

    ct = processed_dados.get('CT')
    ldl = processed_dados.get('LDL')
    hdl = processed_dados.get('HDL')
    tg = processed_dados.get('TG')
    non_hdl = None

    if any(val is not None for val in [ct, ldl, hdl, tg]):
        interpretations_list.append("--- Perfil Lipídico ---")
        if ct is not None:
            ct_ref_desirable = REFERENCE_RANGES['CT'][1]
            details_dict['CT_ref'] = f"Desejável: <{ct_ref_desirable} mg/dL"
            if ct >= 240:
                interpretations_list.append(f"Colesterol total elevado ({ct} mg/dL). Risco cardiovascular aumentado.")
                abnormalities_list.append("Hipercolesterolemia Total")
            elif ct >= 200:
                interpretations_list.append(f"Colesterol total limítrofe ({ct} mg/dL).")
                abnormalities_list.append("Colesterol Total Limítrofe")
            else:
                interpretations_list.append(f"Colesterol total desejável ({ct} mg/dL).")
        
        if ldl is not None:
            ldl_ref_optimal = REFERENCE_RANGES['LDL'][1]
            details_dict['LDL_ref'] = f"Ótimo: <{ldl_ref_optimal} mg/dL (varia com risco CV)"
            if ldl >= 190:
                interpretations_list.append(f"LDL-colesterol muito elevado ({ldl} mg/dL). Alto risco CV. Considerar hipercolesterolemia familiar.")
                abnormalities_list.append("LDL Muito Elevado")
                recommendations_list.append("Tratamento intensivo para redução de LDL é recomendado. Investigar hipercolesterolemia familiar.")
                is_critical_flag = True
            elif ldl >= 160:
                interpretations_list.append(f"LDL-colesterol elevado ({ldl} mg/dL).")
                abnormalities_list.append("LDL Elevado")
            elif ldl >= 130:
                interpretations_list.append(f"LDL-colesterol limítrofe alto ({ldl} mg/dL).")
                abnormalities_list.append("LDL Limítrofe Alto")
            elif ldl >= 100:
                interpretations_list.append(f"LDL-colesterol acima do ideal ({ldl} mg/dL).")
            else:
                interpretations_list.append(f"LDL-colesterol ótimo ({ldl} mg/dL).")
        
        if hdl is not None:
            hdl_ref_low_m = REFERENCE_RANGES['HDL_M'][0]
            hdl_ref_low_f = REFERENCE_RANGES['HDL_F'][0]
            hdl_ref_high = 60
            details_dict['HDL_ref'] = f">{hdl_ref_low_m} (M), >{hdl_ref_low_f} (F); Protetor: >{hdl_ref_high} mg/dL"
            is_hdl_low = (sexo == 'M' and hdl < hdl_ref_low_m) or (sexo == 'F' and hdl < hdl_ref_low_f) or (sexo is None and hdl < hdl_ref_low_m)
            if is_hdl_low:
                interpretations_list.append(f"HDL-colesterol reduzido ({hdl} mg/dL). Fator de risco cardiovascular.")
                abnormalities_list.append("HDL Baixo")
            elif hdl >= hdl_ref_high:
                interpretations_list.append(f"HDL-colesterol elevado ({hdl} mg/dL). Fator protetor cardiovascular.")
            else:
                interpretations_list.append(f"HDL-colesterol normal ({hdl} mg/dL).")
        
        if tg is not None:
            tg_ref_normal = REFERENCE_RANGES['TG'][1]
            details_dict['TG_ref'] = f"Desejável: <{tg_ref_normal} mg/dL (jejum)"
            if not jejum: interpretations_list.append("Obs: Triglicerídeos não medidos em jejum, interpretar com cautela.")
            if tg >= 500:
                interpretations_list.append(f"Triglicerídeos muito elevados ({tg} mg/dL). Risco de pancreatite.")
                abnormalities_list.append("Hipertrigliceridemia Severa")
                recommendations_list.append("Tratamento urgente para redução de triglicerídeos devido ao risco de pancreatite.")
                is_critical_flag = True
            elif tg >= 200:
                interpretations_list.append(f"Hipertrigliceridemia ({tg} mg/dL). Associado a síndrome metabólica.")
                abnormalities_list.append("Hipertrigliceridemia")
            elif tg >= 150:
                interpretations_list.append(f"Triglicerídeos limítrofes ({tg} mg/dL).")
                abnormalities_list.append("Triglicerídeos Limítrofes")
            else:
                interpretations_list.append(f"Triglicerídeos normais ({tg} mg/dL).")
        
        if ct is not None and hdl is not None:
            non_hdl = ct - hdl
            details_dict['Nao_HDL_colesterol'] = non_hdl
            non_hdl_target = REFERENCE_RANGES['Nao_HDL'][1]
            details_dict['Nao_HDL_ref'] = f"Desejável: <{non_hdl_target} mg/dL (varia com risco CV)"
            interpretation_non_hdl = f"Colesterol não-HDL calculado: {non_hdl:.1f} mg/dL. "
            interpretation_non_hdl += "O Colesterol não-HDL é um importante marcador de risco cardiovascular, especialmente útil quando os triglicerídeos estão elevados (>200 mg/dL), pois inclui todas as lipoproteínas aterogênicas."
            
            if non_hdl >= non_hdl_target + 60:
                interpretation_non_hdl += f" Valor muito elevado (meta <{non_hdl_target} mg/dL). Risco cardiovascular significativamente aumentado."
                abnormalities_list.append("Não-HDL Colesterol Muito Elevado")
                recommendations_list.append(f"Colesterol Não-HDL muito elevado. Otimizar terapia hipolipemiante. Meta individualizada baseada no risco CV total (geralmente LDL meta + 30mg/dL, ex: <{non_hdl_target} mg/dL).")
            elif non_hdl >= non_hdl_target + 30:
                interpretation_non_hdl += f" Valor elevado (meta <{non_hdl_target} mg/dL). Risco cardiovascular aumentado."
                abnormalities_list.append("Não-HDL Colesterol Elevado")
                recommendations_list.append(f"Colesterol Não-HDL elevado. Considerar intensificação da terapia hipolipemiante. Meta: <{non_hdl_target} mg/dL ou conforme risco CV.")
            elif non_hdl >= non_hdl_target:
                interpretation_non_hdl += f" Valor acima da meta ideal (<{non_hdl_target} mg/dL)."
                abnormalities_list.append("Não-HDL Colesterol Acima do Ideal")
                recommendations_list.append(f"Colesterol Não-HDL acima da meta ideal. Avaliar necessidade de ajuste terapêutico. Meta: <{non_hdl_target} mg/dL ou conforme risco CV.")
            else:
                interpretation_non_hdl += f" Valor dentro da meta desejável (idealmente <{non_hdl_target} mg/dL, dependendo do risco cardiovascular individual)."
            interpretations_list.append(interpretation_non_hdl)
        
        metabolic_syndrome_components = 0
        if glicose is not None and jejum and glicose >=100: metabolic_syndrome_components +=1
        if tg is not None and tg >= 150: metabolic_syndrome_components +=1
        if hdl is not None and ((sexo == 'M' and hdl < 40) or (sexo == 'F' and hdl < 50)): metabolic_syndrome_components +=1
        if metabolic_syndrome_components >= 2:
            interpretations_list.append("Presença de múltiplos componentes de síndrome metabólica (glicemia, TG, HDL). Avaliar PA e circunferência abdominal para diagnóstico completo.")
            abnormalities_list.append("Componentes de Síndrome Metabólica Presentes")
            recommendations_list.append("Risco cardiovascular aumentado. Avaliar para Síndrome Metabólica completa e manejo agressivo de fatores de risco.")

    tsh = processed_dados.get('TSH')
    t4l = processed_dados.get('T4L')

    if tsh is not None or t4l is not None:
        interpretations_list.append("--- Função Tireoidiana ---")
        tsh_min_ref, tsh_max_ref = REFERENCE_RANGES['TSH']
        details_dict['TSH_ref'] = f"{tsh_min_ref}-{tsh_max_ref} µUI/mL"
        if t4l is not None:
            t4l_min_ref, t4l_max_ref = REFERENCE_RANGES['T4L']
            details_dict['T4L_ref'] = f"{t4l_min_ref}-{t4l_max_ref} ng/dL"
        else:
            t4l_min_ref, t4l_max_ref = (None, None)

        if tsh is not None:
            if tsh < tsh_min_ref:
                interpretations_list.append(f"TSH reduzido ({tsh} µUI/mL).")
                abnormalities_list.append("TSH Baixo (Sugestivo de Hipertireoidismo)")
                if t4l is not None and t4l_max_ref is not None and t4l > t4l_max_ref:
                    interpretations_list.append("Padrão compatível com hipertireoidismo primário (TSH baixo, T4L alto).")
                    recommendations_list.append("Avaliação para hipertireoidismo primário (Doença de Graves, bócio multinodular tóxico).")
                elif t4l is not None and t4l_min_ref is not None and t4l_max_ref is not None and t4l >= t4l_min_ref and t4l <= t4l_max_ref:
                    interpretations_list.append("Sugestivo de hipertireoidismo subclínico (TSH baixo, T4L normal).")
                if tsh < 0.1: is_critical_flag = True
            elif tsh > tsh_max_ref:
                interpretations_list.append(f"TSH elevado ({tsh} µUI/mL).")
                abnormalities_list.append("TSH Elevado (Sugestivo de Hipotireoidismo)")
                if t4l is not None and t4l_min_ref is not None and t4l < t4l_min_ref:
                    interpretations_list.append("Padrão compatível com hipotireoidismo primário (TSH alto, T4L baixo).")
                    recommendations_list.append("Iniciar/ajustar reposição de levotiroxina para hipotireoidismo primário.")
                elif t4l is not None and t4l_min_ref is not None and t4l_max_ref is not None and t4l >= t4l_min_ref and t4l <= t4l_max_ref:
                    interpretations_list.append("Sugestivo de hipotireoidismo subclínico (TSH alto, T4L normal).")
                if tsh > 20: is_critical_flag = True
                recommendations_list.append("TSH muito elevado. Investigar e tratar hipotireoidismo primário. Se sintomas graves, avaliar coma mixedematoso.")
            else:
                interpretations_list.append(f"TSH normal ({tsh} µUI/mL).")
        
        if t4l is not None and (tsh is None or (tsh >= tsh_min_ref and tsh <= tsh_max_ref)):
            if t4l < t4l_min_ref:
                interpretations_list.append(f"T4 Livre reduzido ({t4l} ng/dL) com TSH normal/ausente. Considerar hipotireoidismo central ou doença não tireoidiana.")
                abnormalities_list.append("T4L Baixo Isolado")
            elif t4l > t4l_max_ref:
                interpretations_list.append(f"T4 Livre elevado ({t4l} ng/dL) com TSH normal/ausente. Considerar resistência a hormônio tireoidiano, interferência laboratorial ou hipertireoidismo central (raro).")
                abnormalities_list.append("T4L Elevado Isolado")
        elif t4l is not None:
            interpretations_list.append(f"T4 Livre ({t4l} ng/dL). Interpretação conjunta com TSH já realizada.")

    final_interpretation = "\n".join(interpretations_list) if interpretations_list else "Não foi possível gerar interpretação detalhada dos parâmetros metabólicos."
    if not abnormalities_list and not interpretations_list:
        final_interpretation = "Parâmetros metabólicos aparentemente normais com base nos dados fornecidos."
        if not processed_dados or not any(processed_dados.values()): final_interpretation = "Dados insuficientes para análise metabólica."
    
    return {
        "interpretation": final_interpretation,
        "abnormalities": list(dict.fromkeys(abnormalities_list)),
        "is_critical": is_critical_flag,
        "recommendations": list(dict.fromkeys(recommendations_list)),
        "details": details_dict
    } 