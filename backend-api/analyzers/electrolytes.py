"""
Electrolyte analysis functions for interpreting electrolyte imbalances.
"""

import math
from typing import Dict, List, Optional
import logging

from utils.reference_ranges import REFERENCE_RANGES
from functools import lru_cache

logger = logging.getLogger(__name__)

def _safe_convert_to_float(value_str: Optional[str]) -> Optional[float]:
    if value_str is None:
        return None
    
    cleaned_value_str = value_str.strip()

    if ',' in cleaned_value_str:
        cleaned_value_str = cleaned_value_str.replace('.', '').replace(',', '.')
    # If only dots, float() should handle it assuming it's a valid US-style float.
    # More complex cleaning for multiple dots without commas might be needed if encountered.

    try:
        return float(cleaned_value_str)
    except ValueError:
        logger.warning(f"Could not convert '{value_str}' (cleaned: '{cleaned_value_str}') to float.")
        # Attempt to extract number if common non-numeric characters are present
        # This is a basic attempt, can be made more robust with regex for specific patterns
        if cleaned_value_str.startswith('<'):
            try: return float(cleaned_value_str[1:])
            except ValueError: pass
        if cleaned_value_str.startswith('>'):
            try: return float(cleaned_value_str[1:])
            except ValueError: pass
        return None 

def analisar_eletrolitos(dados):
    """
    Analyze electrolyte values and provide clinical interpretation.
    
    Args:
        dados: List of dictionaries or dictionary containing electrolyte parameters (Na+, K+, Ca+, etc.)
        
    Returns:
        dict: Dictionary containing detailed interpretation, abnormalities, critical status,
              recommendations, and specific electrolyte parameters.
    """
    params = {}
    raw_params_to_convert = {}

    if isinstance(dados, list):
        for exam in dados:
            if 'test' in exam and 'value' in exam:
                test_name = exam['test']
                value = exam['value']
                if 'sod' in test_name.lower() or test_name.lower() == 'na+':
                    raw_params_to_convert['Na+'] = value
                elif 'pot' in test_name.lower() or test_name.lower() == 'k+':
                    raw_params_to_convert['K+'] = value
                elif 'clor' in test_name.lower() or test_name.lower() == 'cl-':
                    raw_params_to_convert['Cl-'] = value
                elif 'calc' in test_name.lower() and 'ion' not in test_name.lower() and 'corr' not in test_name.lower():
                    raw_params_to_convert['Ca+'] = value
                elif ('ion' in test_name.lower() and 'calc' in test_name.lower()) or test_name.lower() == 'ica':
                    raw_params_to_convert['iCa'] = value
                elif 'mag' in test_name.lower() or test_name.lower() == 'mg+':
                    raw_params_to_convert['Mg+'] = value
                elif 'phos' in test_name.lower() or test_name.lower() == 'p' or test_name.lower() == 'fosf':
                    raw_params_to_convert['P'] = value
                elif 'album' in test_name.lower():
                    raw_params_to_convert['Albumina'] = value
    else: # Assuming dados is a dictionary
        for key, value in dados.items():
            std_key = key
            if 'sod' in key.lower()or key.lower() == 'na+': std_key = 'Na+'
            elif 'pot' in key.lower()or key.lower() == 'k+': std_key = 'K+'
            elif 'clor' in key.lower()or key.lower() == 'cl-': std_key = 'Cl-'
            elif 'calc' in key.lower() and 'ion' not in key.lower() and 'corr' not in key.lower(): std_key = 'Ca+'
            elif ('ion' in key.lower() and 'calc' in key.lower())or key.lower() == 'ica': std_key = 'iCa'
            elif 'mag' in key.lower()or key.lower() == 'mg+': std_key = 'Mg+'
            elif 'phos' in key.lower()or key.lower() == 'p' or key.lower() == 'fosf': std_key = 'P'
            elif 'album' in key.lower(): std_key = 'Albumina'
            raw_params_to_convert[std_key] = value

    # Convert values using _safe_convert_to_float
    for key, raw_value in raw_params_to_convert.items():
        if raw_value is not None:
            # Ensure raw_value is a string before passing to _safe_convert_to_float if it might be other types
            value_str = str(raw_value) if not isinstance(raw_value, str) else raw_value
            converted_value = _safe_convert_to_float(value_str)
            if converted_value is not None:
                params[key] = converted_value
            else:
                logger.info(f"Could not convert value for {key}: '{raw_value}' using _safe_convert_to_float. It will be ignored for analysis.")
    
    return _analisar_eletrolitos_cached(
        params.get('Na+'),
        params.get('K+'),
        params.get('Cl-'),
        params.get('Ca+'),
        params.get('iCa'),
        params.get('Mg+'),
        params.get('P'),
        params.get('Albumina')
    )

@lru_cache(maxsize=128)
def _analisar_eletrolitos_cached(na=None, k=None, cl=None, ca=None, ica=None, mg=None, p=None, alb=None):
    """
    Cached version of electrolyte analysis for improved performance.
    All parameters must be immutable (numerical values) for the cache to work.
    
    Args:
        na: Sodium value in mmol/L (optional)
        k: Potassium value in mmol/L (optional)
        cl: Chloride value in mmol/L (optional)
        ca: Calcium value in mg/dL (optional)
        ica: Ionized calcium value in mmol/L (optional)
        mg: Magnesium value in mg/dL (optional)
        p: Phosphorus value in mg/dL (optional)
        alb: Albumin value in g/dL (optional, for corrected calcium)
        
    Returns:
        dict: Dictionary containing detailed interpretation, abnormalities, critical status,
              recommendations, and specific electrolyte parameters.
    """
    interpretations_list: List[str] = []
    abnormalities_list: List[str] = []
    recommendations_list: List[str] = []
    is_critical_flag: bool = False
    details_dict: Dict[str, any] = {}
    
    # Analyze sodium levels
    if na is not None:
        na_min_ref, na_max_ref = REFERENCE_RANGES['Na+']
        details_dict['Na+'] = {"valor": na, "ref": f"{na_min_ref}-{na_max_ref} mmol/L"}
        val_str = f" ({na} mmol/L)"
        if na < na_min_ref:
            severity = "Leve"
            if na < 130: severity = "Moderada"
            if na < 125: severity = "Significativa/Grave"
            msg = f"Hiponatremia {severity.lower()}{val_str}"
            interpretations_list.append(msg)
            abnormalities_list.append(f"Hiponatremia ({severity})")
            if severity == "Significativa/Grave":
                recommendations_list.append("Hiponatremia significativa/grave - Risco de edema cerebral, confusão, convulsões, coma. Investigar causa (ex: perdas, SIADH, polidipsia, insuficiência cardíaca/renal/hepática). Corrigir lentamente para evitar desmielinização osmótica.")
                is_critical_flag = True
            elif severity == "Moderada":
                 recommendations_list.append("Hiponatremia moderada - Avaliar volemia e investigar causa. Monitorar.")
            else: # Leve
                 recommendations_list.append("Hiponatremia leve - Investigar causa e monitorar.")
        elif na > na_max_ref:
            severity = "Leve"
            if na > 150: severity = "Moderada"
            if na > 160: severity = "Significativa/Grave"
            msg = f"Hipernatremia {severity.lower()}{val_str}"
            interpretations_list.append(msg)
            abnormalities_list.append(f"Hipernatremia ({severity})")
            if severity == "Significativa/Grave":
                recommendations_list.append("Hipernatremia significativa/grave - Risco de desidratação celular, hemorragia cerebral, especialmente em idosos e crianças. Investigar causa (ex: perdas insensíveis, diabetes insipidus, falta de acesso à água, excesso de sal). Corrigir lentamente.")
                is_critical_flag = True
            elif severity == "Moderada":
                recommendations_list.append("Hipernatremia moderada - Investigar causa (desidratação, perdas renais). Monitorar e corrigir déficit de água livre.")
            else: # Leve
                recommendations_list.append("Hipernatremia leve - Avaliar hidratação e investigar causa.")
        else:
            interpretations_list.append(f"Sódio normal{val_str}")
    
    # Analyze potassium levels
    if k is not None:
        k_min_ref, k_max_ref = REFERENCE_RANGES['K+']
        details_dict['K+'] = {"valor": k, "ref": f"{k_min_ref}-{k_max_ref} mmol/L"}
        val_str = f" ({k} mmol/L)"
        if k < k_min_ref:
            severity = "Leve"
            if k < 3.0: severity = "Moderada"
            if k < 2.5: severity = "Grave"
            msg = f"Hipocalemia {severity.lower()}{val_str}"
            interpretations_list.append(msg)
            abnormalities_list.append(f"Hipocalemia ({severity})")
            if severity == "Grave":
                recommendations_list.append("Hipocalemia grave - Risco de arritmias cardíacas graves (FV, TV), parada cardíaca, paralisia muscular. Requer reposição intravenosa de potássio com monitorização ECG e laboratorial.")
                is_critical_flag = True
            elif severity == "Moderada":
                recommendations_list.append("Hipocalemia moderada - Risco de arritmias, fraqueza muscular, íleo paralítico. Investigar causa (perdas GI/renais, shift intracelular) e repor potássio (VO ou IV).")
            else: # Leve
                recommendations_list.append("Hipocalemia leve - Investigar causa e considerar reposição oral de potássio, especialmente se sintomático ou com risco cardíaco.")
        elif k > k_max_ref:
            severity = "Leve"
            if k > 5.5: severity = "Moderada"
            if k > 6.0: severity = "Moderada a Significativa" # Staging often groups 6.0-6.5
            if k > 6.5: severity = "Grave"
            msg = f"Hipercalemia {severity.lower()}{val_str}"
            interpretations_list.append(msg)
            abnormalities_list.append(f"Hipercalemia ({severity})")
            if severity == "Grave":
                recommendations_list.append("Hipercalemia grave - Risco de arritmias ventriculares, assistolia, parada cardíaca. Requer intervenção imediata (gluconato de cálcio, insulina+glicose, beta2-agonistas, diuréticos, resinas, diálise). Investigar causa (DRC, LRA, medicamentos, hemólise, rabdomiólise, acidose). ECG urgente.")
                is_critical_flag = True
            elif severity == "Moderada a Significativa" or severity == "Moderada":
                recommendations_list.append("Hipercalemia moderada a significativa - Risco aumentado de arritmias. ECG, monitorização. Investigar e tratar causa. Considerar medidas para reduzir potássio sérico.")
            else: # Leve
                recommendations_list.append("Hipercalemia leve - Investigar causa (ex: dieta, medicamentos, função renal). Monitorar.")
        else:
            interpretations_list.append(f"Potássio normal{val_str}")

    # Analyze Chloride levels
    if cl is not None:
        cl_min_ref, cl_max_ref = REFERENCE_RANGES['Cl-']
        details_dict['Cl-'] = {"valor": cl, "ref": f"{cl_min_ref}-{cl_max_ref} mmol/L"}
        val_str = f" ({cl} mmol/L)"
        if cl < cl_min_ref:
            msg = f"Hipocloremia{val_str}"
            interpretations_list.append(msg)
            abnormalities_list.append("Hipocloremia")
            recommendations_list.append("Hipocloremia - Considerar causas como perdas gastrointestinais (vômitos, SNG), uso de diuréticos, alcalose metabólica, acidose respiratória crônica compensada. Avaliar equilíbrio ácido-básico e hidratação.")
            if cl < 85 and na is not None and na < 135: # Example of severe hypochloremia with hyponatremia
                is_critical_flag = True # Can be associated with severe metabolic alkalosis
                recommendations_list.append("Hipocloremia acentuada, especialmente se associada a outros distúrbios, pode ser crítica. Corrigir causa base.")
        elif cl > cl_max_ref:
            msg = f"Hipercloremia{val_str}"
            interpretations_list.append(msg)
            abnormalities_list.append("Hipercloremia")
            recommendations_list.append("Hipercloremia - Considerar causas como infusão excessiva de salina, acidose metabólica hiperclorêmica (ex: diarreia, ATR), acidose respiratória compensada, diabetes insipidus. Avaliar equilíbrio ácido-básico.")
            if na is not None and cl > (na - 20): # Simplified check for potential NAGMA if Na-Cl diff is small
                 recommendations_list.append("Hipercloremia com diferença Na-Cl reduzida pode sugerir acidose metabólica de ânion gap normal. Verificar gasometria.")
        else:
            interpretations_list.append(f"Cloreto normal{val_str}")
    
    # Analyze total calcium and corrected calcium
    if ca is not None:
        ca_min_ref, ca_max_ref = REFERENCE_RANGES['Ca+']
        details_dict['Ca+'] = {"valor": ca, "ref": f"{ca_min_ref}-{ca_max_ref} mg/dL"}
        val_str_ca_total = f" ({ca} mg/dL)"
        ca_corrigido = None
        if alb is not None:
            try:
                alb_val = float(alb)
                details_dict['Albumina_g_dL'] = alb_val
                # Formula: Ca Corrigido (mg/dL) = Ca Total (mg/dL) + 0.8 * (4.0 - Albumina (g/dL))
                # Normal albumin is ~4.0 g/dL. For each 1 g/dL decrease in albumin below 4.0, add 0.8 mg/dL to total calcium.
                if 0 < alb_val < 8.0 : # Check for plausible albumin range
                    ca_corrigido = ca + 0.8 * (4.0 - alb_val)
                    details_dict['Ca_Corrigido_mg_dL'] = f"{ca_corrigido:.2f}" # Store as string with formatting
                    interpretations_list.append(f"Cálcio total: {ca} mg/dL. Albumina: {alb_val} g/dL. Cálcio corrigido estimado: {ca_corrigido:.2f} mg/dL.")
                else:
                    interpretations_list.append(f"Cálcio total: {ca} mg/dL. Albumina ({alb_val} g/dL) fora da faixa usual para correção confiável do cálcio. Interpretar cálcio iônico se disponível.")
            except (ValueError, TypeError):
                 interpretations_list.append(f"Cálcio total: {ca} mg/dL. Valor de albumina não numérico ({alb}) para cálculo do cálcio corrigido.")
        else:
            interpretations_list.append(f"Cálcio total: {ca} mg/dL. Albumina não fornecida para cálculo do cálcio corrigido.")
        
        # Interpret based on corrected calcium if available, otherwise total calcium
        # If ionized calcium (iCa) is available, it is the preferred measure.
        ca_a_interpretar = ca_corrigido if ca_corrigido is not None else ca
        ref_label = "(corrigido)" if ca_corrigido is not None else "(total)"

        if ca_a_interpretar < ca_min_ref:
            severity = "Leve"
            if ca_a_interpretar < 8.0: severity = "Moderada"
            if ca_a_interpretar < 7.0: severity = "Grave"
            msg = f"Hipocalcemia {severity.lower()} {ref_label}{val_str_ca_total if ca_corrigido is None else f' (corrigido: {ca_corrigido:.2f} mg/dL)'}"
            interpretations_list.append(msg)
            abnormalities_list.append(f"Hipocalcemia ({severity} {ref_label.strip('()')})")
            if severity == "Grave":
                recommendations_list.append("Hipocalcemia grave - Risco de tetania, laringoespasmo, convulsões, arritmias (prolongamento QT). ECG, monitorização. Reposição IV de cálcio urgente.")
                is_critical_flag = True
            elif severity == "Moderada":
                recommendations_list.append("Hipocalcemia moderada - Sintomas podem incluir parestesias, cãibras, fadiga. Investigar causa (deficiência Vit D, hipoparatireoidismo, DRC, pancreatite, medicamentos). Repor cálcio.")
            else: # Leve
                recommendations_list.append("Hipocalcemia leve - Frequentemente assintomática. Investigar causa e monitorar.")
        elif ca_a_interpretar > ca_max_ref:
            severity = "Leve"
            if ca_a_interpretar > 11.5: severity = "Moderada"
            if ca_a_interpretar > 13.0: severity = "Grave" # thresholds vary, >14 often crisis
            msg = f"Hipercalcemia {severity.lower()} {ref_label}{val_str_ca_total if ca_corrigido is None else f' (corrigido: {ca_corrigido:.2f} mg/dL)'}"
            interpretations_list.append(msg)
            abnormalities_list.append(f"Hipercalcemia ({severity} {ref_label.strip('()')})")
            if severity == "Grave":
                recommendations_list.append("Hipercalcemia grave - Risco de crise hipercalcêmica (náuseas, vômitos, poliúria, letargia, coma), arritmias (encurtamento QT), IRA. Hidratação vigorosa, diuréticos de alça (após volemia), bifosfonatos, calcitonina. Investigar causa (hiperparatireoidismo primário, malignidade). ECG.")
                is_critical_flag = True
            elif severity == "Moderada":
                recommendations_list.append("Hipercalcemia moderada - Sintomas podem incluir fadiga, constipação, dor abdominal, confusão. Investigar causa e tratar.")
            else: # Leve
                recommendations_list.append("Hipercalcemia leve - Frequentemente assintomática. Investigar causa (mais comum hiperpara primário leve ou malignidade inicial). Monitorar.")
        elif ca_corrigido is not None: # If corrected Ca was calculated and is normal
             interpretations_list.append(f"Cálcio corrigido normal ({ca_corrigido:.2f} mg/dL). O cálcio total ({ca} mg/dL) pode estar alterado devido à albumina.")
        else: # Total Ca is normal, and no corrected Ca calculated
            interpretations_list.append(f"Cálcio total normal{val_str_ca_total}")
    
    # Analyze ionized calcium if available (often preferred over total/corrected)
    if ica is not None:
        ica_min_ref, ica_max_ref = REFERENCE_RANGES['iCa']
        details_dict['iCa'] = {"valor": ica, "ref": f"{ica_min_ref}-{ica_max_ref} mmol/L"}
        val_str = f" ({ica} mmol/L)"
        if ica < ica_min_ref:
            severity = "Leve"
            if ica < 1.0: severity = "Moderada"
            if ica < 0.8: severity = "Grave"
            msg = f"Cálcio iônico baixo (Hipocalcemia iônica {severity.lower()}){val_str}"
            interpretations_list.append(msg)
            abnormalities_list.append(f"Hipocalcemia iônica ({severity})")
            recommendations_list.append("Cálcio iônico é a forma fisiologicamente ativa. Baixo iCa confirma hipocalcemia funcional.")
            if severity == "Grave":
                recommendations_list.append("Hipocalcemia iônica grave - Risco de sintomas neuromusculares e cardíacos agudos. Reposição IV urgente.")
                is_critical_flag = True # Overrides total/corrected if iCa is critically low
            elif severity == "Moderada":
                recommendations_list.append("Hipocalcemia iônica moderada. Considerar reposição e investigar causa.")
        elif ica > ica_max_ref:
            severity = "Leve"
            if ica > 1.4: severity = "Moderada"
            if ica > 1.5: severity = "Grave"
            msg = f"Cálcio iônico elevado (Hipercalcemia iônica {severity.lower()}){val_str}"
            interpretations_list.append(msg)
            abnormalities_list.append(f"Hipercalcemia iônica ({severity})")
            recommendations_list.append("Cálcio iônico elevado confirma hipercalcemia funcional. Investigar causas.")
            if severity == "Grave": is_critical_flag = True # Can contribute to critical status
        else:
            interpretations_list.append(f"Cálcio iônico normal{val_str}")
        interpretations_list.append("Cálcio iônico é preferível ao cálcio total/corrigido para avaliar o status de cálcio, especialmente em pacientes críticos ou com distúrbios da albumina ou ácido-básicos.")
    
    # Analyze magnesium levels
    if mg is not None:
        mg_min_ref, mg_max_ref = REFERENCE_RANGES['Mg+']
        details_dict['Mg+'] = {"valor": mg, "ref": f"{mg_min_ref}-{mg_max_ref} mg/dL"}
        val_str = f" ({mg} mg/dL)"
        if mg < mg_min_ref: # Using reference range now
            severity = "Leve"
            if mg < 1.2: severity = "Moderada" # Example thresholds
            if mg < 1.0: severity = "Grave"
            msg = f"Hipomagnesemia {severity.lower()}{val_str}"
            interpretations_list.append(msg)
            abnormalities_list.append(f"Hipomagnesemia ({severity})")
            recommendations_list.append("Hipomagnesemia pode causar arritmias (ex: Torsades de Pointes), fraqueza muscular, tetania e agravar hipocalemia e hipocalcemia. Investigar causa (perdas GI/renais, medicamentos, alcoolismo, má absorção). Repor Mg.")
            if severity == "Grave":
                 is_critical_flag = True
                 recommendations_list.append("Hipomagnesemia severa - Risco de Torsades de Pointes e outras arritmias graves. Reposição IV urgente.")
        elif mg > mg_max_ref:
            severity = "Leve"
            if mg > 3.0: severity = "Moderada"
            if mg > 4.0: severity = "Grave"
            msg = f"Hipermagnesemia {severity.lower()}{val_str}"
            interpretations_list.append(msg)
            abnormalities_list.append(f"Hipermagnesemia ({severity})")
            recommendations_list.append("Hipermagnesemia - Causas: insuficiência renal, excesso de reposição de Mg, antiácidos/laxantes com Mg. Sintomas: hipotensão, bradicardia, sonolência, hiporreflexia, parada cardiorrespiratória em casos graves.")
            if severity == "Grave":
                is_critical_flag = True
                recommendations_list.append("Hipermagnesemia grave - Risco de depressão respiratória, bloqueio cardíaco, parada cardíaca. Interromper fontes de Mg, antagonizar com cálcio IV, forçar diurese, diálise se necessário.")
        else:
            interpretations_list.append(f"Magnésio normal{val_str}")
    
    # Analyze phosphorus levels
    if p is not None:
        p_min_ref, p_max_ref = REFERENCE_RANGES['P']
        details_dict['P'] = {"valor": p, "ref": f"{p_min_ref}-{p_max_ref} mg/dL"}
        val_str = f" ({p} mg/dL)"
        if p < p_min_ref:
            severity = "Leve"
            if p < 2.0: severity = "Moderada"
            if p < 1.0: severity = "Grave"
            msg = f"Hipofosfatemia {severity.lower()}{val_str}"
            interpretations_list.append(msg)
            abnormalities_list.append(f"Hipofosfatemia ({severity})")
            recommendations_list.append("Hipofosfatemia - Causas: realimentação, alcalose respiratória, hiperparatireoidismo, deficiência de Vit D, má absorção, diuréticos. Sintomas: fraqueza muscular, disfunção cardíaca/respiratória, hemólise, alteração mental.")
            if severity == "Grave":
                is_critical_flag = True
                recommendations_list.append("Hipofosfatemia severa - Risco de insuficiência respiratória, disfunção cardíaca, rabdomiólise, coma. Reposição IV cuidadosa.")
        elif p > p_max_ref:
            severity = "Leve"
            if p > 5.5: severity = "Moderada"
            if p > 7.0: severity = "Grave"
            msg = f"Hiperfosfatemia {severity.lower()}{val_str}"
            interpretations_list.append(msg)
            abnormalities_list.append(f"Hiperfosfatemia ({severity})")
            recommendations_list.append("Hiperfosfatemia - Causas: insuficiência renal (principal), hipoparatireoidismo, destruição celular (rabdomiólise, lise tumoral), excesso de Vit D, acidose. Pode levar a hipocalcemia e calcificação metastática.")
            if severity == "Grave":
                is_critical_flag = True
                recommendations_list.append("Hiperfosfatemia grave - Tratar causa base, quelantes de fósforo, hidratação. Monitorar cálcio.")
        else:
            interpretations_list.append(f"Fósforo normal{val_str}")
    
    # Combined disturbances (example)
    if na is not None and k is not None and cl is not None:
        na_val = float(na)
        k_val = float(k)
        cl_val = float(cl)
        # Check for potential NAGMA through Na-Cl difference, if Anion Gap isn't directly calculated here
        # Anion Gap = Na - (Cl + HCO3). If HCO3 is low, and AG is normal, then Cl might be high.
        # A simpler proxy: Na - Cl. Normally around 36 (e.g., 140 - 104). Lower difference can suggest NAGMA.
        if (na_val - cl_val) < 30 and cl_val > REFERENCE_RANGES['Cl-'][1]:
             interpretations_list.append("Diferença Na-Cl reduzida com hipercloremia pode ser um indicador de Acidose Metabólica de Ânion Gap Normal (NAGMA). Correlacionar com gasometria arterial para pH e HCO3-.")

    if ca is not None and p is not None:
        _, ca_max_ref = REFERENCE_RANGES['Ca+']
        p_min_ref, _ = REFERENCE_RANGES['P']
        ca_min_ref, _ = REFERENCE_RANGES['Ca+']
        _, p_max_ref = REFERENCE_RANGES['P']

        if ca > ca_max_ref and p < p_min_ref:
            msg = "Hipercalcemia com hipofosfatemia - considerar hiperparatireoidismo primário."
            interpretations_list.append(msg)
            abnormalities_list.append("Hipercalcemia com Hipofosfatemia")
        elif ca < ca_min_ref and p > p_max_ref:
            msg = "Hipocalcemia com hiperfosfatemia - considerar insuficiência renal ou hipoparatireoidismo."
            interpretations_list.append(msg)
            abnormalities_list.append("Hipocalcemia com Hiperfosfatemia")

    final_interpretation = "\n".join(filter(None, interpretations_list))

    return {
        "interpretation": final_interpretation if final_interpretation else "Dados insuficientes para análise de eletrólitos.",
        "abnormalities": list(set(abnormalities_list)),
        "is_critical": is_critical_flag,
        "recommendations": list(set(recommendations_list)),
        "details": details_dict
    }

# Alias para manter compatibilidade com o nome acentuado
analisar_eletrólitos = analisar_eletrolitos 