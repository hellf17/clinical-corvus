"""
Hematology analysis functions for interpreting complete blood count (CBC) results.
"""

import math
from typing import Dict, List, Optional, Tuple, Any
import logging

from utils.reference_ranges import get_reference_range

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

# Helper function to safely get and convert lab value
def _get_float_value(data: Dict[str, Any], key: str) -> Optional[float]:
    value = data.get(key)
    if value is not None:
        if isinstance(value, (int, float)):
            return float(value)
        else:
            value_str = str(value)
            return _safe_convert_to_float(value_str)
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

# Helper function to safely get and convert lab value (duplicate removed)

# Helper function to get reference range
def _get_ref_range(param_key: str, sexo: Optional[str] = None) -> Optional[Tuple[float, float]]:
    return get_reference_range(param_key, sexo)

def analisar_hemograma(dados: Dict[str, Any], sexo: Optional[str] = None) -> Dict[str, Any]:
    """
    Analyze complete blood count (CBC) results and provide clinical interpretation.
    
    Args:
        dados: Dictionary containing CBC parameters. 
               Expected keys can be direct (e.g., 'Hb', 'Leuco') or with suffixes 
               for differentials (e.g., 'Neutrophils_perc', 'Neutrophils_abs').
               Common aliases like 'Segm' for Neutrophils % or 'Linf' for Lymphocytes % are also checked.
        sexo: Patient's sex ('M' or 'F') for gender-specific reference ranges.
        
    Returns:
        dict: Dictionary containing detailed interpretation, abnormalities, critical status,
              recommendations, and specific CBC parameters.
    """
    interpretations_list: List[str] = []
    abnormalities_list: List[str] = []
    recommendations_list: List[str] = []
    is_critical_flag: bool = False
    details_dict: Dict[str, Any] = {} 

    if not isinstance(dados, dict):
        return {
            "interpretation": "Dados de entrada inválidos.",
            "abnormalities": [], "is_critical": False, "recommendations": [], "details": {}
        }

    def _add_interpretation(
        param_display_name: str, value: float, unit: str, ref_range: Optional[Tuple[float, float]],
        low_msg_suffix: str, high_msg_suffix: str, normal_msg_suffix: str,
        low_abnormality_tag: str, high_abnormality_tag: str,
        param_key_for_details: str, # Key to use for details_dict
        critical_low_threshold: Optional[float] = None, critical_high_threshold: Optional[float] = None,
        low_recommendation: Optional[str] = None, high_recommendation: Optional[str] = None,
        critical_low_recommendation: Optional[str] = None, critical_high_recommendation: Optional[str] = None
    ):
        nonlocal is_critical_flag
        details_dict[param_key_for_details] = value
        full_param_name = f"{param_display_name} ({param_key_for_details})" if param_key_for_details != param_display_name else param_display_name


        if ref_range:
            details_dict[f"{param_key_for_details}_ref"] = f"{ref_range[0]} - {ref_range[1]}"
            min_ref, max_ref = ref_range

            if value < min_ref:
                interpretations_list.append(f"{full_param_name}: {value} {unit} ({low_msg_suffix})")
                abnormalities_list.append(low_abnormality_tag)
                if critical_low_threshold is not None and value < critical_low_threshold:
                    is_critical_flag = True
                    if critical_low_recommendation: recommendations_list.append(critical_low_recommendation)
                elif low_recommendation:
                    recommendations_list.append(low_recommendation)
            elif value > max_ref:
                interpretations_list.append(f"{full_param_name}: {value} {unit} ({high_msg_suffix})")
                abnormalities_list.append(high_abnormality_tag)
                if critical_high_threshold is not None and value > critical_high_threshold:
                    is_critical_flag = True
                    if critical_high_recommendation: recommendations_list.append(critical_high_recommendation)
                elif high_recommendation:
                    recommendations_list.append(high_recommendation)
            else:
                interpretations_list.append(f"{full_param_name}: {value} {unit} ({normal_msg_suffix})")
        else:
            interpretations_list.append(f"{full_param_name}: {value} {unit} (Referência não disponível)")
            details_dict[f"{param_key_for_details}_ref"] = "N/A"

    # --- Red Blood Cells ---
    hb_val = _get_float_value(dados, 'Hb')
    anemia_present = False
    anemia_severity_msg = ""
    hb_ref_range_for_ri = None # Store Hb ref for RI calculation

    if hb_val is not None:
        ref = _get_ref_range('Hb', sexo)
        hb_ref_range_for_ri = ref # Save for RI
        
        # Determine criticality level for hemoglobin
        hb_criticality, hb_description = _get_criticality_level("Hemoglobina", hb_val, {
            'critical': [20.0, -5.0], # >20.0 or <5.0
            'significant': [(18.0, 20.0), (5.0, 7.0)],  # 18.0-20.0 or 5.0-7.0
            'monitoring': [(7.0, 18.0)]  # 7.0-18.0 (normal range)
        })
        # Note: criticality assessment integrated into detailed interpretation below
        
        _add_interpretation('Hemoglobina', hb_val, 'g/dL', ref,
                            "Baixa", "Alta", "Normal",
                            "Anemia", "Policitemia", 'Hb',
                            critical_low_threshold=7.0,
                            low_recommendation="Anemia: Investigar causa. Se Hb < 10 g/dL, considerar avaliação mais aprofundada. Segundo as diretrizes da American Society of Hematology, investigar deficiência de ferro, doença crônica, hemólise ou perda aguda.",
                            high_recommendation="Policitemia: Investigar causas (desidratação, DPOC, Policitemia Vera). Segundo as diretrizes da American Society of Hematology, verificar viscosidade sanguínea e considerar flebotomia se Hb > 18.5 g/dL em homens ou > 16.5 g/dL em mulheres.",
                            critical_low_recommendation="Anemia Grave (Hb < 7.0 g/dL): Risco elevado. Considerar transfusão de hemácias e investigação urgente. Segundo as diretrizes da American Society of Hematology, transfundir se sintomático ou com cardiopatia. Monitorar sinais de sobrecarga circulatória.")
        if ref and hb_val < ref[0]:
            anemia_present = True
            if hb_val < 7.0: anemia_severity_msg = "Anemia Grave"
            elif hb_val < 10.0: anemia_severity_msg = "Anemia Moderada"
            else: anemia_severity_msg = "Anemia Leve"
    
    ht_val = _get_float_value(dados, 'Ht')
    ht_ref_range_for_ri = None # Store Ht ref for RI calculation
    if ht_val is not None:
        ref = _get_ref_range('Ht', sexo)
        ht_ref_range_for_ri = ref # Save for RI
        _add_interpretation('Hematócrito', ht_val, '%', ref,
                            "Reduzido", "Elevado", "Normal",
                            "Hematócrito Baixo", "Hematócrito Alto", "Ht")

    rbc_val = _get_float_value(dados, 'RBC')
    if rbc_val is not None:
        ref_rbc = _get_ref_range('RBC', sexo)
        _add_interpretation('Eritrócitos (RBC)', rbc_val, 'milhões/µL', ref_rbc,
                            "Baixos (Oligocitemia)", "Altos (Policitemia/Eritrocitose)", "Normais",
                            "Oligocitemia", "Policitemia/Eritrocitose", "RBC",
                            low_recommendation="Contagem de hemácias baixa: Correlacionar com Hb e Ht para avaliar anemia.",
                            high_recommendation="Contagem de hemácias alta: Correlacionar com Hb e Ht para avaliar policitemia.")

    # --- White Blood Cells (Leukocytes) ---
    leuco_val = _get_float_value(dados, 'Leuco')
    if leuco_val is not None:
        ref = _get_ref_range('Leuco')
        
        # Determine criticality level for leukocytes
        leuco_criticality, leuco_description = _get_criticality_level("Leucócitos Totais", leuco_val, {
            'critical': [50000, -500], # >50000 or <500
            'significant': [(30000, 50000), (500, 1000)],  # 30000-50000 or 500-1000
            'monitoring': [(1000, 30000)]  # 1000-30000 (normal range)
        })
        # Note: criticality assessment integrated into detailed interpretation below
        
        _add_interpretation('Leucócitos Totais', leuco_val, '/mm³', ref,
                            "Baixos", "Altos", "Normais",
                            "Leucopenia", "Leucocitose", "Leuco",
                            critical_low_threshold=1000.0, critical_high_threshold=30000.0,
                            low_recommendation="Leucopenia: Investigar causa (infecções virais, drogas, doenças hematológicas). Segundo as diretrizes da American Society of Hematology, verificar histórico de medicações e infecções recentes.",
                            high_recommendation="Leucocitose: Sugestivo de infecção, inflamação, estresse ou processo hematológico. Investigar. Segundo as diretrizes da American Society of Hematology, considerar leucemia mieloide crônica se leucócitos > 100.000/mm³ com predominância de neutrófilos maduros.",
                            critical_low_recommendation="Leucopenia Grave (<1000/mm³): Risco aumentado de infecções graves. Investigar urgentemente. Considerar neutropenia. Segundo as diretrizes da American Society of Hematology, iniciar profilaxia com G-CSF e antibióticos se febril.",
                            critical_high_recommendation="Leucocitose Muito Elevada (>30000/mm³): Sugestivo de infecção grave, reação leucemoide ou malignidade hematológica. Investigação urgente. Segundo as diretrizes da American Society of Hematology, considerar leucostase se > 100.000/mm³ com sintomas respiratórios ou neurológicos.")

    # --- Differential Leukocyte Counts ---
    diff_params = [
        {'name': 'Neutrófilos', 'base_key': 'Neutrophils', 'aliases_perc': ['Segm', 'Neutrophils_perc'], 'aliases_abs': ['Segmentados_abs', 'Neut_abs', 'Neutrophils_abs']},
        {'name': 'Linfócitos', 'base_key': 'Lymphocytes', 'aliases_perc': ['Linf', 'Lymphocytes_perc'], 'aliases_abs': ['Linf_abs', 'Lymphocytes_abs']},
        {'name': 'Monócitos', 'base_key': 'Monocytes', 'aliases_perc': ['Mono', 'Monocytes_perc'], 'aliases_abs': ['Mono_abs', 'Monocytes_abs']},
        {'name': 'Eosinófilos', 'base_key': 'Eosinophils', 'aliases_perc': ['Eosi', 'Eosinophils_perc'], 'aliases_abs': ['Eosi_abs', 'Eosinophils_abs']},
        {'name': 'Basófilos', 'base_key': 'Basophils', 'aliases_perc': ['Baso', 'Basophils_perc'], 'aliases_abs': ['Baso_abs', 'Basophils_abs']},
        {'name': 'Bastonetes', 'base_key': 'Bands', 'aliases_perc': ['Bastões', 'Bands_perc'], 'aliases_abs': ['Bastoes_abs', 'Bast_abs', 'Bands_abs']}
    ]

    for param_info in diff_params:
        param_display_name = param_info['name']
        base_key = param_info['base_key']
        
        abs_val = None
        for alias in param_info['aliases_abs']:
            abs_val = _get_float_value(dados, alias)
            if abs_val is not None: 
                details_dict[f"{base_key}_abs_direct"] = abs_val # Store which direct key was found
                break 
        
        perc_val = None
        for alias in param_info['aliases_perc']:
            perc_val = _get_float_value(dados, alias)
            if perc_val is not None: 
                details_dict[f"{base_key}_perc_direct"] = perc_val # Store which direct key was found
                break

        calculated_abs_from_perc = False
        if abs_val is None and perc_val is not None and leuco_val is not None and leuco_val > 0:
            abs_val = round((perc_val / 100.0) * leuco_val, 0) # Round to whole number for cell counts
            calculated_abs_from_perc = True
            details_dict[f"{base_key}_abs_calc_from_perc"] = abs_val
        
        # Absolute count interpretation
        if abs_val is not None:
            key_for_details_abs = f"{base_key}_abs"
            ref_abs = _get_ref_range(f"{base_key}_abs")
            
            low_msg, high_msg, normal_msg = "Baixos", "Altos", "Normais"
            low_abn, high_abn = f"{param_display_name} Baixos (Abs)", f"{param_display_name} Altos (Abs)"
            crit_low_abs, crit_high_abs = None, None
            low_rec, high_rec = f"Investigar causa de {param_display_name.lower()} baixos (abs).", f"Investigar causa de {param_display_name.lower()} altos (abs)."
            crit_low_rec, crit_high_rec = None, None
            
            # Add stratified critical value thresholds for lymphocytes
            if base_key == 'Lymphocytes':
                # Determine criticality level for lymphocytes (integrated into main interpretation)
                linfo_criticality, linfo_description = _get_criticality_level("Linfócitos", abs_val, {
                    'critical': [10000, -500], # >10000 or <500
                    'significant': [(5000, 10000), (500, 1000)],  # 5000-10000 or 500-1000
                    'monitoring': [(1000, 5000)]  # 1000-5000 (normal range)
                })
            
            # Add stratified critical value thresholds for monocytes
            if base_key == 'Monocytes':
                # Determine criticality level for monocytes (integrated into main interpretation)
                mono_criticality, mono_description = _get_criticality_level("Monócitos", abs_val, {
                    'critical': [5000, -100], # >5000 or <100
                    'significant': [(2000, 5000), (100, 500)],  # 2000-5000 or 100-500
                    'monitoring': [(500, 2000)]  # 500-2000 (normal range)
                })
            
            # Add stratified critical value thresholds for eosinophils
            if base_key == 'Eosinophils':
                # Determine criticality level for eosinophils (integrated into main interpretation)
                eosi_criticality, eosi_description = _get_criticality_level("Eosinófilos", abs_val, {
                    'critical': [5000, -50], # >5000 or <50
                    'significant': [(2000, 5000), (50, 500)],  # 2000-5000 or 50-500
                    'monitoring': [(500, 2000)]  # 500-2000 (normal range)
                })
            
            # Add stratified critical value thresholds for basophils
            if base_key == 'Basophils':
                # Determine criticality level for basophils (integrated into main interpretation)
                baso_criticality, baso_description = _get_criticality_level("Basófilos", abs_val, {
                    'critical': [2000, -20], # >2000 or <20
                    'significant': [(1000, 2000), (20, 200)],  # 1000-2000 or 20-200
                    'monitoring': [(200, 1000)]  # 200-1000 (normal range)
                })

            if base_key == 'Neutrophils':
                low_msg = "Baixos (Neutropenia)"
                low_abn = "Neutropenia (Abs)"
                
                # Determine criticality level for neutrophils (integrated into main interpretation)
                neutro_criticality, neutro_description = _get_criticality_level("Neutrófilos", abs_val, {
                    'critical': [10000, -500], # >10000 or <500
                    'significant': [(7500, 10000), (500, 1000)],  # 7500-10000 or 500-1000
                    'monitoring': [(1000, 7500)]  # 1000-7500 (normal range)
                })
                
                if ref_abs and abs_val < ref_abs[0]: # Specific neutropenia recommendations
                    if abs_val < 500:
                        crit_low_abs = abs_val # Value itself is the critical threshold boundary
                        crit_low_rec = "Neutropenia Grave (<500/mm³): Risco muito alto de infecção. Isolar, investigar e tratar urgentemente."
                    elif abs_val < 1000:
                        low_rec = "Neutropenia Moderada (500-1000/mm³): Risco aumentado de infecção. Monitorar."
                    elif abs_val < 1500:
                        low_rec = "Neutropenia Leve (1000-1500/mm³): Monitorar."
            elif base_key == 'Bands' and ref_abs and abs_val > ref_abs[1]:
                 high_msg = "Altos (Desvio à Esquerda/Bandemia)"
                 high_abn = "Desvio à Esquerda/Bandemia (Abs)"
                 
                 # Determine criticality level for bands (integrated into main interpretation)
                 bands_criticality, bands_description = _get_criticality_level("Bastonetes", abs_val, {
                     'critical': [5000, -100], # >5000 or <100
                     'significant': [(2000, 5000), (100, 500)],  # 2000-5000 or 100-500
                     'monitoring': [(500, 2000)]  # 500-2000 (normal range)
                 })
                 
                 high_rec = "Bandemia/Desvio à Esquerda (Abs): Sugere processo infeccioso/inflamatório agudo."
            
            _add_interpretation(param_display_name, abs_val, '/mm³', ref_abs,
                                low_msg, high_msg, normal_msg,
                                low_abn, high_abn, key_for_details_abs,
                                critical_low_threshold=crit_low_abs, critical_high_threshold=crit_high_abs,
                                low_recommendation=low_rec, high_recommendation=high_rec,
                                critical_low_recommendation=crit_low_rec, critical_high_recommendation=crit_high_rec)

        # Percentage count interpretation (only if not used for calculation or if it's the only value)
        if perc_val is not None:
            key_for_details_perc = f"{base_key}_perc"
            ref_perc = _get_ref_range(f"{base_key}_perc")
            _add_interpretation(param_display_name, perc_val, '%', ref_perc,
                                "Baixos (%)", "Altos (%)", "Normais (%)",
                                f"{param_display_name} Baixos (%)", f"{param_display_name} Altos (%)", key_for_details_perc)
            if calculated_abs_from_perc: # Add a note that this perc was used for calculation
                details_dict[f"{key_for_details_perc}_info"] = "Usado para cálculo absoluto"


    # --- Platelets ---
    plaq_val = _get_float_value(dados, 'Plaq')
    if plaq_val is not None:
        ref = _get_ref_range('Plaq')
        
        # Determine criticality level for platelets (integrated into main interpretation)
        plaq_criticality, plaq_description = _get_criticality_level("Plaquetas", plaq_val, {
            'critical': [1500000, -10000], # >1500000 or <10000
            'significant': [(1000000, 1500000), (10000, 20000)],  # 1000000-1500000 or 10000-20000
            'monitoring': [(20000, 1000000)]  # 20000-1000000 (normal range)
        })
        
        _add_interpretation('Plaquetas', plaq_val, '/mm³', ref,
                            "Baixas", "Altas", "Normais",
                            "Trombocitopenia", "Trombocitose", "Plaq",
                            critical_low_threshold=20000.0, critical_high_threshold=1000000.0,
                            low_recommendation="Trombocitopenia: Investigar causa. Risco de sangramento se < 50.000/mm³. Segundo as diretrizes da American Society of Hematology, investigar ITP, TTP, HUS, aplasia medular ou hipersplenismo.",
                            high_recommendation="Trombocitose: Investigar causa. Risco de trombose se > 600.000/mm³. Segundo as diretrizes da American Society of Hematology, verificar reação secundária (inflamação, pós-esplenectomia) ou doença mieloproliferativa.",
                            critical_low_recommendation="Trombocitopenia Grave (<20.000/mm³): Risco elevado de sangramento espontâneo. Avaliação urgente. Segundo as diretrizes da American Society of Hematology, considerar transfusão de plaquetas se sangramento ativo ou procedimento cirúrgico planejado.",
                            critical_high_recommendation="Trombocitose Extrema (>1.000/mm³): Considerar doença mieloproliferativa. Avaliar risco trombótico. Segundo as diretrizes da American Society of Hematology, considerar JAK2, CALR ou MPL mutation testing e iniciar aspirina para profilaxia trombótica.")

    # --- Reticulocytes ---
    retic_perc_val = _get_float_value(dados, 'Retic')
    if retic_perc_val is not None:
        ref_perc = _get_ref_range('Retic')
        
        # Determine criticality level for reticulocytes (integrated into main interpretation)
        retic_criticality, retic_description = _get_criticality_level("Reticulócitos", retic_perc_val, {
            'critical': [10.0, -0.1], # >10.0 or <0.1
            'significant': [(5.0, 10.0), (0.1, 1.0)],  # 5.0-10.0 or 0.1-1.0
            'monitoring': [(1.0, 5.0)]  # 1.0-5.0 (normal range)
        })
        
        _add_interpretation('Reticulócitos', retic_perc_val, '%', ref_perc,
                            "Reduzidos", "Aumentados", "Normais",
                            "Reticulopenia (%)", "Reticulocitose (%)", "Retic_perc",
                            low_recommendation="Reticulopenia (%): Sugere deficiência na produção eritrocitária. Investigar.",
                            high_recommendation="Reticulocitose (%): Sugere resposta medular à perda de hemácias ou tratamento.")
        
        abs_retic_val = None # Initialize before potential calculation
        # Calculate and interpret Absolute Reticulocyte Count
        # RBC count is typically in millions/µL (e.g., 4.5 means 4,500,000/µL or 4,500,000/mm³)
        # Retic_abs is often reported per µL or mm³
        if rbc_val is not None: # rbc_val should be available from earlier interpretation
            # Convert RBC from millions/µL to /µL for calculation
            rbc_count_per_microliter = rbc_val * 1_000_000 
            abs_retic_val = round((retic_perc_val / 100.0) * rbc_count_per_microliter, 0)
            ref_abs_retic = _get_ref_range('Retic_abs')
            if ref_abs_retic:
                _add_interpretation('Reticulócitos Absolutos', abs_retic_val, '/µL', ref_abs_retic,
                                    "Baixos", "Aumentados", "Normais",
                                    "Reticulopenia (Abs)", "Reticulocitose (Abs)", "Retic_abs",
                                    low_recommendation="Contagem absoluta de reticulócitos baixa: Confirma hipoproliferação medular.",
                                    high_recommendation="Contagem absoluta de reticulócitos alta: Confirma hiperproliferação medular (resposta à anemia, hemólise).")
            details_dict["Retic_abs_calc"] = abs_retic_val

        if abs_retic_val is not None:
            ref_abs = _get_ref_range('Retic_abs')
            _add_interpretation('Reticulócitos Absolutos', abs_retic_val, '/mm³', ref_abs,
                                "Reduzidos", "Aumentados", "Normais",
                                "Reticulopenia (Abs)", "Reticulocitose (Abs)", "Retic_abs",
                                low_recommendation="Reticulopenia Absoluta: Confirma baixa produção eritrocitária. Investigar causa (deficiências, aplasia, DRC).",
                                high_recommendation="Reticulocitose Absoluta: Confirma aumento da produção eritrocitária (resposta a hemólise, sangramento, tratamento de anemia).")

            # Reticulocyte Index (RI) Calculation
            if anemia_present and (ht_val is not None or hb_val is not None): # RI is most relevant in anemia
                ht_para_ri = None
                if ht_val is not None:
                    ht_para_ri = ht_val / 100.0 # Convert Ht from % to decimal for calculation
                elif hb_val is not None: # Estimate Ht from Hb if Ht not directly available (Ht ~ Hb * 3)
                    ht_para_ri = (hb_val * 3.0) / 100.0
                    interpretations_list.append("Nota: Hematócrito para cálculo do Índice Reticulocitário foi estimado a partir da Hemoglobina.")
                
                if ht_para_ri is not None:
                    maturation_factor = 1.0
                    if ht_para_ri < 0.15: maturation_factor = 3.0 # Or consider unreliable
                    elif ht_para_ri < 0.25: maturation_factor = 2.5
                    elif ht_para_ri < 0.35: maturation_factor = 2.0
                    elif ht_para_ri < 0.40: maturation_factor = 1.5
                    # else: factor is 1.0 (Ht >= 0.40)

                    # Using general normal Ht of 0.45 for the ratio part
                    # More precise would be sex-specific normal Ht if `sexo` is consistently available
                    ht_normal_referencia = 0.45 
                    if sexo == 'M' and ht_ref_range_for_ri: ht_normal_referencia = (ht_ref_range_for_ri[0] + ht_ref_range_for_ri[1]) / 200.0
                    elif sexo == 'F' and ht_ref_range_for_ri: ht_normal_referencia = (ht_ref_range_for_ri[0] + ht_ref_range_for_ri[1]) / 200.0
                    elif hb_ref_range_for_ri: # Fallback to Hb-derived normal Ht estimate if Ht ref not available
                         hb_normal_mid = (hb_ref_range_for_ri[0] + hb_ref_range_for_ri[1]) / 2.0
                         ht_normal_referencia = (hb_normal_mid * 3.0) / 100.0

                    if maturation_factor > 0: # Avoid division by zero if Ht too low making factor 0
                        ri = (retic_perc_val * (ht_para_ri / ht_normal_referencia)) / maturation_factor
                        details_dict['Indice_Reticulocitario_RI'] = f"{ri:.2f}"
                        ri_interpretation = f"Índice Reticulocitário (IR) estimado: {ri:.2f}. "
                        if ri < 2.0:
                            ri_interpretation += "Resposta medular inadequada (anemia hipoproliferativa)."
                            abnormalities_list.append("Índice Reticulocitário Baixo (<2) em Anemia")
                        else: # RI >= 2.0
                            ri_interpretation += "Resposta medular adequada (sugere hemólise, sangramento ou recuperação de deficiência)."
                            abnormalities_list.append("Índice Reticulocitário Normal/Alto (>=2) em Anemia")
                        interpretations_list.append(ri_interpretation)
                        recommendations_list.append("Avaliar o Índice Reticulocitário no contexto da anemia para classificar a resposta da medula óssea.")
                else:
                        interpretations_list.append("Não foi possível calcular o Índice Reticulocitário (fator de maturação inválido ou Ht muito baixo).")
            elif anemia_present:
                 interpretations_list.append("Índice Reticulocitário não pôde ser calculado (Ht/Hb ausente), mas a presença de anemia com reticulócitos X% requer avaliação da resposta medular.".replace("X%", str(retic_perc_val)))

    # --- Red Cell Indices (VCM, HCM, CHCM, RDW) ---
    vcm_val = _get_float_value(dados, 'VCM')
    if vcm_val is not None:
        ref = _get_ref_range('VCM')
        
        # Determine criticality level for VCM (integrated into main interpretation)
        vcm_criticality, vcm_description = _get_criticality_level("VCM (Volume Corpuscular Médio)", vcm_val, {
            'critical': [120.0, -60.0], # >120.0 or <60.0
            'significant': [(100.0, 120.0), (60.0, 80.0)],  # 100.0-120.0 or 60.0-80.0
            'monitoring': [(80.0, 100.0)]  # 80.0-100.0 (normal range)
        })
        
        _add_interpretation('VCM (Volume Corpuscular Médio)', vcm_val, 'fL', ref,
                            "Baixo (Microcitose)", "Alto (Macrocitose)", "Normal (Normocitose)",
                            "Microcitose", "Macrocitose", "VCM")

    hcm_val = _get_float_value(dados, 'HCM')
    if hcm_val is not None:
        ref = _get_ref_range('HCM')
        
        # Determine criticality level for HCM (integrated into main interpretation)
        hcm_criticality, hcm_description = _get_criticality_level("HCM (Hemoglobina Corpuscular Média)", hcm_val, {
            'critical': [40.0, -20.0], # >40.0 or <20.0
            'significant': [(33.0, 40.0), (20.0, 27.0)],  # 33.0-40.0 or 20.0-27.0
            'monitoring': [(27.0, 33.0)]  # 27.0-33.0 (normal range)
        })
        
        _add_interpretation('HCM (Hemoglobina Corpuscular Média)', hcm_val, 'pg', ref,
                            "Baixa (Hipocromia)", "Alta (Hipercromia)", "Normal (Normocromia)",
                            "Hipocromia", "Hipercromia", "HCM")

    chcm_val = _get_float_value(dados, 'CHCM')
    if chcm_val is not None:
        ref = _get_ref_range('CHCM')
        
        # Determine criticality level for CHCM (integrated into main interpretation)
        chcm_criticality, chcm_description = _get_criticality_level("CHCM (Conc. Hemoglobina Corpuscular Média)", chcm_val, {
            'critical': [40.0, -25.0], # >40.0 or <25.0
            'significant': [(36.0, 40.0), (25.0, 32.0)],  # 36.0-40.0 or 25.0-32.0
            'monitoring': [(32.0, 36.0)]  # 32.0-36.0 (normal range)
        })
        
        _add_interpretation('CHCM (Conc. Hemoglobina Corpuscular Média)', chcm_val, 'g/dL', ref,
                            "Baixa (Hipocromia)", "Alta (Esferocitose? Artefato?)", "Normal (Normocromia)",
                            "Hipocromia (CHCM)", "CHCM Alto", "CHCM")

    rdw_val = _get_float_value(dados, 'RDW')
    rdw_is_high = False
    if rdw_val is not None:
        ref = _get_ref_range('RDW')
        
        # Determine criticality level for RDW (integrated into main interpretation)
        rdw_criticality, rdw_description = _get_criticality_level("RDW (Amplitude de Distribuição Eritrocitária)", rdw_val, {
            'critical': [20.0, -10.0], # >20.0 or <10.0
            'significant': [(15.0, 20.0), (10.0, 12.0)],  # 15.0-20.0 or 10.0-12.0
            'monitoring': [(12.0, 15.0)]  # 12.0-15.0 (normal range)
        })
        
        _add_interpretation('RDW (Amplitude de Distribuição Eritrocitária)', rdw_val, '%', ref,
                            "Baixo (raro, sem significado clínico usual)", "Alto (Anisocitose)", "Normal",
                            "RDW Baixo", "Anisocitose (RDW Alto)", "RDW",
                            high_recommendation="RDW Alto (Anisocitose): Indica variação no tamanho dos eritrócitos. Correlacionar com VCM para classificação da anemia.")
        if ref and rdw_val > ref[1]:
            rdw_is_high = True

    # Anemia classification based on MCV and RDW if anemia is present
    if anemia_present and vcm_val is not None and rdw_val is not None:
        vcm_ref = _get_ref_range('VCM')
        mcv_is_low = vcm_ref and vcm_val < vcm_ref[0]
        mcv_is_normal = vcm_ref and vcm_ref[0] <= vcm_val <= vcm_ref[1]
        mcv_is_high = vcm_ref and vcm_val > vcm_ref[1]
        
        classification_notes = []
        if mcv_is_low:
            if rdw_is_high:
                classification_notes.append("Anemia Microcítica com RDW Alto: Sugestivo de deficiência de ferro. Considerar também hemoglobinopatias (ex: traço talassêmico com def. ferro).")
            else: # RDW normal
                classification_notes.append("Anemia Microcítica com RDW Normal: Sugestivo de traço talassêmico ou anemia de doença crônica (fase inicial).")
        elif mcv_is_normal:
            if rdw_is_high:
                classification_notes.append("Anemia Normocítica com RDW Alto: Pode indicar deficiência mista (ferro + B12/folato inicial), SMD, ou presença de reticulocitose significativa. Hemoglobinopatias (ex: S/beta-talassemia).")
            else: # RDW normal
                classification_notes.append("Anemia Normocítica com RDW Normal: Sugestivo de anemia de doença crônica, perda sanguínea aguda, doença renal crônica, aplasia medular (avaliar reticulócitos).")
        elif mcv_is_high:
            if rdw_is_high:
                classification_notes.append("Anemia Macrocítica com RDW Alto: Sugestivo de deficiência de B12 ou folato, hemólise autoimune, aglutininas a frio (artefato no VCM), SMD, quimioterapia.")
            else: # RDW normal
                classification_notes.append("Anemia Macrocítica com RDW Normal: Pode ocorrer em aplasia medular, doença hepática crônica, alcoolismo, hipotireoidismo, uso de certas drogas (ex: metotrexato, zidovudina).")
        
        if classification_notes:
            interpretations_list.append("Classificação da Anemia: " + " ".join(classification_notes))
            recommendations_list.append("Investigar causa da anemia conforme classificação por VCM e RDW. Considerar cinética do ferro, dosagens vitamínicas, reticulócitos.")

    # Check for Pancytopenia
    if leuco_val is not None and hb_val is not None and plaq_val is not None:
        leuco_ref = _get_ref_range('Leuco')
        hb_ref = _get_ref_range('Hb', sexo)
        plaq_ref = _get_ref_range('Plaq')

        is_leucopenia = leuco_ref and leuco_val < leuco_ref[0]
        is_anemia = hb_ref and hb_val < hb_ref[0] # Re-check anemia specifically for pancytopenia flag
        is_trombocitopenia = plaq_ref and plaq_val < plaq_ref[0]

        if is_leucopenia and is_anemia and is_trombocitopenia:
            pancytopenia_msg = "Pancitopenia (redução de leucócitos, hemoglobina/eritrócitos e plaquetas)."
            interpretations_list.append(pancytopenia_msg)
            abnormalities_list.append("Pancitopenia")
            recommendations_list.append("Pancitopenia detectada. Sugere disfunção medular significativa ou destruição periférica das três linhagens. Investigação hematológica urgente é necessária (ex: mielograma, biópsia de medula óssea). Causas incluem anemia aplásica, leucemias/linfomas, síndromes mielodisplásicas, quimioterapia/radioterapia, hiperesplenismo, infecções graves (ex: sepse, HIV avançado, calazar), deficiências vitamínicas severas (B12, folato).")
            is_critical_flag = True # Pancytopenia is a critical finding

    # Final assembly of interpretation strings
    unique_interpretations = sorted(list(set(interpretations_list)))
    final_interpretation_str = "\n".join(unique_interpretations)
    
    if not interpretations_list:
         final_interpretation_str = "Nenhum dado hematológico fornecido ou dados insuficientes para análise."
    elif not abnormalities_list and all(("Normal" in s or "Normais" in s) for s in unique_interpretations):
        final_interpretation_str = "Hemograma dentro dos parâmetros de referência analisados."
    
    # Ensure general message if specific abnormalities are found but overall interpretation is brief
    if abnormalities_list and len(final_interpretation_str.split("\n")) < len(abnormalities_list):
        if "Hemograma dentro dos parâmetros" not in final_interpretation_str:
             final_interpretation_str += "\nRevisar os achados detalhados para anormalidades específicas."


    return {
        "interpretation": final_interpretation_str,
        "abnormalities": sorted(list(set(abnormalities_list))),
        "is_critical": is_critical_flag,
        "recommendations": sorted(list(set(recommendations_list))),
        "details": details_dict
    }

def analisar_hematologia(dados, sexo=None): # Alias for backward compatibility
    return analisar_hemograma(dados, sexo) 

# Example usage (for testing - ensure REFERENCE_RANGES is populated as expected):
if __name__ == '__main__':
    # Mock/Ensure REFERENCE_RANGES for local testing if not running in full environment
    essential_keys = {
        'Hb': (12.0, 16.0), 'Ht': (36.0, 46.0), 'Leuco': (4000, 10000), 'Plaq': (150000, 450000),
        'Retic': (0.5, 2.5), # Updated typical Retic % range
        'RBC_M': (4.5, 5.5), 'RBC_F': (4.0, 5.0), 'RBC': (4.0, 5.5), # Added RBC ranges
        'Retic_abs': (25000, 75000), # Added Retic_abs range
        'VCM': (80.0, 100.0), 'HCM': (27.0, 33.0), 'CHCM': (32.0, 36.0), 'RDW': (11.5, 14.5),
        'Neutrophils_perc': (40, 75), 'Lymphocytes_perc': (20, 45), 'Monocytes_perc': (2, 10),
        'Eosinophils_perc': (1, 6), 'Basophils_perc': (0, 2), 'Bands_perc': (0, 5),
        'Neutrophils_abs': (1500, 7500), 'Lymphocytes_abs': (1000, 4000), 'Monocytes_abs': (100, 1000),
        'Eosinophils_abs': (20, 500), 'Basophils_abs': (0, 200), 'Bands_abs': (0, 700) # Bands abs often up to 700
    }
    for k, v in essential_keys.items():
        if k not in REFERENCE_RANGES:
            REFERENCE_RANGES[k] = v
            print(f"Mocking REFERENCE_RANGES for {k} = {v}")


    sample_data_normal = {
        'Hb': 14.0, 'Ht': 42.0, 'RBC': 4.8, 'Leuco': 7000, 'Plaq': 250000,
        'Neutrophils_perc': 60, 'Lymphocytes_perc': 30, 'Monocytes_perc': 5, 
        'Eosinophils_perc': 3, 'Basophils_perc': 1, 'Bands_perc': 1,
        'VCM': 90, 'HCM': 30, 'CHCM': 33, 'RDW': 12.5, 'Retic': 1.0
    }
    sample_data_anemia_neutropenia = {
        'Hb': 6.5, 'Ht': 25.0, 'RBC': 2.8, 'Leuco': 1200, 'Plaq': 150000,
        'Neutrophils_abs': 400, 
        'Lymphocytes_perc': 70, 
        'Monocytes_abs': 100,
        'VCM': 70, 'HCM': 22, 'RDW': 18, 'Retic': 0.3
    }
    sample_data_leukocytosis_bands = {
        'Hb': 13.0, 'Ht': 39.0, 'RBC': 4.5, 'Leuco': 35000, 'Plaq': 300000,
        'Segm': 75, # Alias for Neutrophils_perc
        'Bands_abs': 1200, 
        'Linf': 10 
    }
    
    print("\n--- Normal Sample (Male) ---")
    result_normal_m = analisar_hemograma(sample_data_normal, sexo='M')
    print(f"Interpretation: {result_normal_m['interpretation']}\nAbnormalities: {result_normal_m['abnormalities']}\nCritical: {result_normal_m['is_critical']}\nRecommendations: {result_normal_m['recommendations']}\nDetails: {result_normal_m['details']}\n")

    print("--- Anemia & Severe Neutropenia Sample (Female) ---")
    result_anemia_neut = analisar_hemograma(sample_data_anemia_neutropenia, sexo='F')
    print(f"Interpretation: {result_anemia_neut['interpretation']}\nAbnormalities: {result_anemia_neut['abnormalities']}\nCritical: {result_anemia_neut['is_critical']}\nRecommendations: {result_anemia_neut['recommendations']}\nDetails: {result_anemia_neut['details']}\n")

    print("--- Leukocytosis with Bandemia Sample (No Sex Provided) ---")
    result_leuk_bands = analisar_hemograma(sample_data_leukocytosis_bands)
    print(f"Interpretation: {result_leuk_bands['interpretation']}\nAbnormalities: {result_leuk_bands['abnormalities']}\nCritical: {result_leuk_bands['is_critical']}\nRecommendations: {result_leuk_bands['recommendations']}\nDetails: {result_leuk_bands['details']}\n")

    sample_edge_case_just_leuco = {'Leuco': 500}
    print("--- Edge Case: Only Severe Leukopenia (Neutropenia implied) ---")
    result_edge = analisar_hemograma(sample_edge_case_just_leuco)
    print(f"Interpretation: {result_edge['interpretation']}\nAbnormalities: {result_edge['abnormalities']}\nCritical: {result_edge['is_critical']}\nRecommendations: {result_edge['recommendations']}\nDetails: {result_edge['details']}\n")

    sample_no_data = {}
    print("--- Edge Case: No Data ---")
    result_no_data = analisar_hemograma(sample_no_data)
    print(f"Interpretation: {result_no_data['interpretation']}\nAbnormalities: {result_no_data['abnormalities']}\nCritical: {result_no_data['is_critical']}\nRecommendations: {result_no_data['recommendations']}\nDetails: {result_no_data['details']}\n")

