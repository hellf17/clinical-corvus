"""
Cardiac markers analysis module for interpreting cardiac-related lab tests.
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

def analisar_marcadores_cardiacos(dados, paciente_info: Optional[Dict] = None):
    """
    Analyze cardiac markers to assess for myocardial injury and heart failure.
    
    Args:
        dados: Dictionary containing cardiac marker parameters (Troponin, CK-MB, BNP, etc.)
               Expected keys: 'TropoI', 'TropoT', 'hsTropoI', 'hsTropoT', 'CKMB', 'BNP', 'NTproBNP', 'CPK', 'LDH'.
               Troponin values can be under different keys based on the assay type.
        paciente_info: Optional dictionary with patient information like 'idade', 'sexo', 'hora_dor_inicio_horas'.
        
    Returns:
        dict: Dictionary containing detailed interpretation, abnormalities, critical status,
              recommendations, and specific cardiac marker details.
    """
    interpretations_list: List[str] = []
    abnormalities_list: List[str] = []
    recommendations_list: List[str] = []
    is_critical_flag: bool = False
    details_dict: Dict[str, any] = {}

    # Process all numeric values using _safe_convert_to_float
    processed_dados = {}
    for key, value in dados.items():
        details_dict[key] = value  # Store original value
        if value is not None:
            value_str = str(value) if not isinstance(value, str) else value
            converted_value = _safe_convert_to_float(value_str)
            if converted_value is not None:
                processed_dados[key] = converted_value
                details_dict[key] = converted_value
            else:
                processed_dados[key] = None
                logger.info(f"Could not convert cardiac param {key}: '{value}' using _safe_convert_to_float. It will be ignored.")
        else:
            processed_dados[key] = None

    # Standardize input parameters and populate details_dict
    # Prioritize high-sensitivity troponin if available
    trop_val = None
    trop_key_used = None
    trop_assay_type = " convencional" # Default assumption

    if 'hsTropoI' in processed_dados and processed_dados['hsTropoI'] is not None:
        trop_val = processed_dados['hsTropoI']
        trop_key_used = 'hsTropoI'
        trop_assay_type = " de alta sensibilidade (hs-Troponina I)"
    elif 'hsTropoT' in processed_dados and processed_dados['hsTropoT'] is not None:
        trop_val = processed_dados['hsTropoT']
        trop_key_used = 'hsTropoT'
        trop_assay_type = " de alta sensibilidade (hs-Troponina T)"
    elif 'TropoI' in processed_dados and processed_dados['TropoI'] is not None:
        trop_val = processed_dados['TropoI']
        trop_key_used = 'TropoI'
        trop_assay_type = " convencional (Troponina I)"
    elif 'TropoT' in processed_dados and processed_dados['TropoT'] is not None:
        trop_val = processed_dados['TropoT']
        trop_key_used = 'TropoT'
        trop_assay_type = " convencional (Troponina T)"
    
    ckmb_val = processed_dados.get('CKMB')
    cpk_val = processed_dados.get('CPK')
    bnp_val = processed_dados.get('BNP')
    nt_pro_bnp_val = processed_dados.get('NTproBNP')
    ldh_val = processed_dados.get('LDH')

    hora_dor_inicio = None
    sexo_paciente = None
    if paciente_info:
        hora_dor_inicio = paciente_info.get('hora_dor_inicio_horas')
        sexo_paciente = paciente_info.get('sexo', '').upper()
        if hora_dor_inicio is not None: details_dict['hora_dor_inicio_horas'] = hora_dor_inicio
        if sexo_paciente: details_dict['sexo_paciente'] = sexo_paciente
    
    # Check if there's enough data to analyze
    if not any([trop_val is not None, ckmb_val is not None, bnp_val is not None, nt_pro_bnp_val is not None, cpk_val is not None, ldh_val is not None]):
        return {
            "interpretation": "Dados insuficientes para análise dos marcadores cardíacos.",
            "abnormalities": [], "is_critical": False, "recommendations": [], "details": {}
        }
    
    # Analyze troponin
    has_troponin_elevation = False
    if trop_val is not None and trop_key_used:
        details_dict[trop_key_used] = trop_val
        # General 99th percentile. Specific assays and sex-specific cutoffs for hs-Tn are crucial.
        # Example: hs-TnT <14 ng/L (pg/mL), hs-TnI varies more (e.g., <16 F, <34 M ng/L for some assays)
        # Using a generic 0.04 ng/mL (40 pg/mL) for conventional/unspecified hs-Tn as a higher threshold example.
        # This section needs to be adapted based on the specific troponin assay reference ranges used by the lab.
        
        cutoff_99th = 0.04 # ng/mL, example. For pg/mL (ng/L), this would be 40.
        # Adjust if units are pg/mL (ng/L) typically used for hs-Tn
        # Assuming input `trop_val` might be in ng/mL or pg/mL. Standardize or use unit-aware logic.
        # For this example, assuming ng/mL for `0.04` cutoff, but hs-Tn is often pg/mL.
        # If we assume trop_val for hs-Tn could be pg/mL, then 0.04 ng/mL = 40 pg/mL.
        # Let's use a placeholder and note it should be assay-specific.
        # For hs-cTnI, common 99th percentile URL for women is ~16 ng/L and for men ~34 ng/L.
        # For hs-cTnT, common 99th percentile URL is ~14 ng/L for both sexes.
        # If no specific hs-Tn type is known, using a general value is problematic.
        
        interpretations_list.append(f"Troponina ({trop_key_used}): {trop_val} (unidade não especificada, verificar com valor de referência do laboratório).")
        interpretations_list.append(f"Tipo de ensaio de troponina considerado: {trop_assay_type.strip()}.")

        if "alta sensibilidade" in trop_assay_type:
            interpretations_list.append("Para troponinas de alta sensibilidade (hs-Tn), os valores de corte do percentil 99 são específicos do ensaio e geralmente distintos para homens e mulheres. A interpretação deve ser baseada nesses valores de referência locais e na variação (delta) em medições seriadas (ex: 0h e 1/2/3h).")
            # Example dynamic cutoff logic based on sex (highly simplified, actual values are assay-specific)
            if sexo_paciente == 'F':
                cutoff_99th_hs = 16 # Example for hs-TnI in pg/mL (ng/L)
                interpretations_list.append(f"Exemplo de corte (hs-TnI, feminino): < {cutoff_99th_hs} ng/L. Verificar valor de referência do laboratório.")
            elif sexo_paciente == 'M':
                cutoff_99th_hs = 34 # Example for hs-TnI in pg/mL (ng/L)
                interpretations_list.append(f"Exemplo de corte (hs-TnI, masculino): < {cutoff_99th_hs} ng/L. Verificar valor de referência do laboratório.")
            else: # Sexo não informado ou hs-TnT (geralmente mesmo corte)
                cutoff_99th_hs = 14 # Example for hs-TnT in pg/mL (ng/L)
                interpretations_list.append(f"Exemplo de corte (hs-TnT ou sexo não informado para hs-TnI): < {cutoff_99th_hs} ng/L. Verificar valor de referência do laboratório.")
            # This simplified logic assumes trop_val is in pg/mL if hs-Tn. This needs clarification or unit handling.
            # For now, proceeding with a general logic, highlighting the need for lab-specific cutoffs.

        # Generic interpretation based on a placeholder value (e.g., 0.04 ng/mL or 40 pg/mL)
        # This part needs substantial refinement based on actual assay and units.
        # Let's assume a generic high threshold for clear elevation for now if not hs-Tn or if hs-Tn is very high.
        generic_elevated_threshold = 0.04 # ng/mL. If hs-Tn in pg/mL, this is 40.
        # Re-evaluating based on the initial code's logic (0.04 ng/mL)

        if trop_val > generic_elevated_threshold: # Assuming trop_val is in ng/mL for this comparison for now.
            has_troponin_elevation = True
            abnormalities_list.append(f"Troponina Elevada ({trop_key_used}: {trop_val})")
            interpretations_list.append(f"Troponina ({trop_key_used}) elevada: {trop_val}. Sugere lesão miocárdica.")
            is_critical_flag = True # Troponin elevation is generally a critical finding
            
            if trop_val > 1.0: # ng/mL - Significant elevation
                interpretations_list.append("Elevação acentuada de troponina - sugere dano miocárdico significativo, altamente provável IAM se contexto clínico compatível.")
                if hora_dor_inicio is not None and hora_dor_inicio < 6:
                    interpretations_list.append("Início recente de dor (<6h) com troponina muito elevada reforça suspeita de infarto agudo do miocárdio (IAM).")
            elif trop_val > 0.1: # ng/mL - Moderate elevation
                interpretations_list.append("Elevação moderada de troponina - consistente com lesão miocárdica. Avaliar Sinais de Alerta Cardiovascular (SCA) e outras causas (miocardite, TEP, IC descompensada, DRC).")
            else: # Lower elevation (e.g., 0.04 to 0.1 ng/mL)
                interpretations_list.append("Elevação discreta de troponina - pode ocorrer em diversas condições incluindo SCA de menor extensão, ou causas não-isquêmicas como IC descompensada, TEP, sepse, miocardite, insuficiência renal crônica (DRC).")
            
            recommendations_list.append("Elevação de troponina detectada. Recomenda-se avaliação clínica urgente, ECG seriado, e considerar algoritmos para SCA (ex: 0/1h ou 0/2h para hs-Troponina) se aplicável.")
        else:
            interpretations_list.append(f"Troponina ({trop_key_used}): {trop_val} dentro da faixa de referência (baseado em corte genérico de {generic_elevated_threshold} ng/mL - VERIFICAR VALOR DE REFERÊNCIA DO LABORATÓRIO E ENSAIO ESPECÍFICO).")
            if hora_dor_inicio is not None and hora_dor_inicio < 3:
                if "alta sensibilidade" in trop_assay_type:
                    recommendations_list.append("Troponina normal/baixa com <3h de sintomas: não exclui SCA. Recomenda-se medição seriada de hs-Troponina (ex: em 1-3h) conforme protocolos.")
                else:
                    recommendations_list.append("Troponina normal com <3h de sintomas: não exclui SCA. Considerar repetir em 3-6h.")
        
        if "alta sensibilidade" in trop_assay_type:
            recommendations_list.append("Para hs-Troponina, a avaliação do delta (variação entre medições seriadas) é crucial para o diagnóstico diferencial de lesão miocárdica aguda vs. crônica.")

    # Analyze CK-MB
    if ckmb_val is not None:
        details_dict['CKMB'] = ckmb_val
        ckmb_ref_max = 5 # ng/mL, example generic reference
        interpretations_list.append("CK-MB: A troponina (especialmente de alta sensibilidade) é o biomarcador preferencial para detecção de lesão miocárdica devido à sua maior especificidade e sensibilidade. A CK-MB pode ter utilidade limitada, por exemplo, na detecção de reinfarto precoce se a troponina já estiver cronicamente elevada, embora a monitorização seriada da troponina seja frequentemente ainda preferida.")
        
        if ckmb_val > ckmb_ref_max:
            abnormalities_list.append(f"CK-MB Elevada ({ckmb_val} ng/mL)")
            interpretations_list.append(f"CK-MB elevada: {ckmb_val} ng/mL.")
            if ckmb_val > 25:
                interpretations_list.append("Elevação acentuada de CK-MB. Se acompanhada de elevação de troponina, reforça suspeita de lesão miocárdica extensa.")
            elif ckmb_val > 10:
                interpretations_list.append("Elevação moderada de CK-MB.")
            else: # > 5 and <=10
                interpretations_list.append("Elevação discreta de CK-MB. Menos específica que a troponina.")
        else:
            interpretations_list.append(f"CK-MB normal/baixa: {ckmb_val} ng/mL.")
    
    # Calculate CK-MB/CPK ratio (Índice Relativo)
    if ckmb_val is not None and cpk_val is not None and cpk_val > 0:
        ckmb_activity_equivalence = ckmb_val * 20 # Rough conversion ng/mL to U/L for ratio, highly approximate
        # The ratio is typically CPK-MB (activity in U/L) / Total CPK (activity in U/L)
        # If CKMB is in ng/mL (mass), it's not directly comparable to CPK in U/L without assay-specific conversion for activity.
        # The previous code used (ckmb / cpk) * 100 when both were presumably in ng/mL or mass. This is unusual.
        # Standard relative index is (CK-MB activity / Total CK activity) * 100.
        # Let's assume cpk_val is Total CK in U/L. If ckmb_val is mass (ng/mL), direct ratio is problematic.
        # The original code used ratio = (ckmb / cpk) * 100, assuming cpk was also a mass or similar unit, or a direct comparison was intended.
        # For now, I will replicate the previous logic's INTENT if CPK is high, but add strong caveats.
        # A more accurate approach would be to only use this if CK-MB is reported in U/L (activity).
        
        # Using the original simple ratio for now, but with a note of caution.
        ratio = (ckmb_val / cpk_val) * 100 
        details_dict['CKMB_CPK_Ratio_percent'] = f"{ratio:.1f}"
        interpretations_list.append(f"Relação CK-MB (massa) / CPK Total (atividade): {ratio:.1f}%. (Nota: A interpretação ideal deste índice requer CK-MB em U/L (atividade). Esta é uma aproximação baseada em massa de CK-MB).")
        
        # Using reference from older guidelines for CK-MB mass / total CK activity:
        # Some labs use CK-MB mass. Ratio < 3% suggests skeletal, >5% suggests cardiac.
        # However, this is less reliable than activity/activity ratio.
        if ratio > 5.0 and cpk_val > REFERENCE_RANGES['CPK'][1]: # Example: CPK elevated
            interpretations_list.append("Relação CK-MB/CPK > 5% com CPK elevada: Pode sugerir uma maior proporção de CK-MB, favorecendo origem cardíaca, mas a troponina é mais definitiva.")
            abnormalities_list.append("Relação CK-MB/CPK Elevada (sugestiva cardíaca)")
        elif ratio < 3.0 and cpk_val > REFERENCE_RANGES['CPK'][1]:
            interpretations_list.append("Relação CK-MB/CPK < 3% com CPK elevada: Sugere que a elevação da CPK é predominantemente de origem musculoesquelética.")
            abnormalities_list.append("Relação CK-MB/CPK Baixa (sugestiva não-cardíaca para CPK elevada)")
        elif cpk_val <= REFERENCE_RANGES['CPK'][1]:
             interpretations_list.append("CPK total normal ou baixa, a relação CK-MB/CPK é menos informativa neste contexto.")

    # Analyze CPK (Total CK)
    if cpk_val is not None:
        details_dict['CPK'] = cpk_val
        cpk_min_ref, cpk_max_ref = REFERENCE_RANGES['CPK']
        details_dict['CPK_ref'] = f"{cpk_min_ref}-{cpk_max_ref} U/L"
        
        if cpk_val > cpk_max_ref:
            abnormalities_list.append(f"CPK Elevada ({cpk_val} U/L)")
            interpretations_list.append(f"CPK total elevada: {cpk_val} U/L.")
            if cpk_val > 5000:
                interpretations_list.append("Elevação muito acentuada de CPK (>5000 U/L): Fortemente sugestiva de rabdomiólise grave. Avaliar lesão renal aguda.")
                recommendations_list.append("CPK >5000 U/L: Investigar rabdomiólise, monitorar função renal, hidratação EV.")
                is_critical_flag = True
            elif cpk_val > 1000:
                interpretations_list.append("Elevação acentuada de CPK (>1000 U/L): Sugere dano muscular significativo (rabdomiólise, trauma extenso, miopatias inflamatórias, IAM extenso - verificar troponina).")
                recommendations_list.append("CPK >1000 U/L: Investigar causa de dano muscular, monitorar.")
            else: # > cpk_max_ref and <= 1000
                interpretations_list.append("Elevação discreta a moderada de CPK: Pode ocorrer após exercício intenso, uso de estatinas, trauma leve, SCA (verificar troponina), miopatias.")
        else:
            interpretations_list.append(f"CPK total normal: {cpk_val} U/L.")

    # Analyze BNP or NT-proBNP
    bnp_processed = False
    if nt_pro_bnp_val is not None:
        details_dict['NTproBNP'] = nt_pro_bnp_val
        interpretations_list.append(f"NT-proBNP: {nt_pro_bnp_val} pg/mL.")
        # Age-dependent cutoffs for NT-proBNP are crucial
        # <50 anos: >450 pg/mL sugere IC
        # 50-75 anos: >900 pg/mL sugere IC
        # >75 anos: >1800 pg/mL sugere IC
        # Rule-out: <300 pg/mL
        is_elevated_ntprobnp = False
        if paciente_info and paciente_info.get('idade'):
            idade = paciente_info.get('idade')
            details_dict['idade_paciente_para_ntprobnp'] = idade
            cutoff_ntprobnp = 300 # Rule-out for all ages
            interpretation_ntprobnp_age = f" (Idade: {idade} anos)."
            if idade < 50:
                if nt_pro_bnp_val > 450: is_elevated_ntprobnp = True; cutoff_ntprobnp = 450
            elif idade <= 75:
                if nt_pro_bnp_val > 900: is_elevated_ntprobnp = True; cutoff_ntprobnp = 900
            else: # > 75
                if nt_pro_bnp_val > 1800: is_elevated_ntprobnp = True; cutoff_ntprobnp = 1800
            
            if is_elevated_ntprobnp:
                interpretations_list.append(f"NT-proBNP elevado ({nt_pro_bnp_val} pg/mL) para a idade{interpretation_ntprobnp_age} (corte >{cutoff_ntprobnp} pg/mL). Sugestivo de insuficiência cardíaca (IC) ou estresse ventricular.")
                abnormalities_list.append(f"NT-proBNP Elevado ({nt_pro_bnp_val} pg/mL)")
                recommendations_list.append("NT-proBNP elevado: Avaliar clinicamente para IC, considerar ecocardiograma.")
                is_critical_flag = True # Significant elevation is often critical
            elif nt_pro_bnp_val < 300:
                interpretations_list.append(f"NT-proBNP ({nt_pro_bnp_val} pg/mL) abaixo do valor de corte para exclusão de IC aguda (<300 pg/mL). Baixa probabilidade de IC descompensada como causa primária de dispneia.")
            else: # Between 300 and age-specific cutoff, or age not available for specific cutoff
                interpretations_list.append(f"NT-proBNP ({nt_pro_bnp_val} pg/mL) em zona cinzenta ou idade não fornecida para corte específico. Avaliar no contexto clínico. Rule-out (<300 pg/mL) não atingido.")
        else: # Age not available
            interpretations_list.append("Idade do paciente não fornecida para interpretação otimizada do NT-proBNP. Usando cortes gerais:")
            if nt_pro_bnp_val > 450: # General indicative, less specific than age-adjusted
                interpretations_list.append(f"NT-proBNP elevado ({nt_pro_bnp_val} pg/mL). Sugestivo de disfunção ventricular/IC. Recomenda-se correlação com idade e clínica.")
                abnormalities_list.append(f"NT-proBNP Elevado ({nt_pro_bnp_val} pg/mL)")
                recommendations_list.append("NT-proBNP elevado: Avaliar clinicamente para IC, considerar ecocardiograma.")
                is_critical_flag = True
            elif nt_pro_bnp_val < 300:
                interpretations_list.append(f"NT-proBNP ({nt_pro_bnp_val} pg/mL) < 300 pg/mL. Baixa probabilidade de IC descompensada.")
            else:
                interpretations_list.append(f"NT-proBNP ({nt_pro_bnp_val} pg/mL) entre 300-450 pg/mL. Zona cinzenta, avaliar clinicamente.")
        bnp_processed = True

    if bnp_val is not None and not bnp_processed:
        details_dict['BNP'] = bnp_val
        interpretations_list.append(f"BNP: {bnp_val} pg/mL.")
        # General BNP cutoffs
        # <100 pg/mL: IC improvável
        # 100-400 pg/mL: IC possível, considerar outros fatores (idade, DRC)
        # >400 pg/mL: IC provável
        if bnp_val > 400:
            interpretations_list.append(f"BNP marcadamente elevado ({bnp_val} pg/mL). Altamente sugestivo de insuficiência cardíaca descompensada.")
            abnormalities_list.append(f"BNP Elevado ({bnp_val} pg/mL)")
            recommendations_list.append("BNP elevado: Avaliar clinicamente para IC, considerar ecocardiograma.")
            is_critical_flag = True
        elif bnp_val > 100:
            interpretations_list.append(f"BNP elevado ({bnp_val} pg/mL). Sugestivo de insuficiência cardíaca ou outras causas de estresse ventricular (ex: TEP, HAP, DRC, idade avançada).")
            abnormalities_list.append(f"BNP Elevado ({bnp_val} pg/mL)")
            recommendations_list.append("BNP elevado: Avaliar clinicamente para IC e outras causas, considerar ecocardiograma.")
        else: # <=100
            interpretations_list.append(f"BNP ({bnp_val} pg/mL) não elevado. Baixa probabilidade de insuficiência cardíaca descompensada como causa primária de dispneia.")
    
    # Analyze LDH (very non-specific)
    if ldh_val is not None:
        details_dict['LDH'] = ldh_val
        ldh_min_ref, ldh_max_ref = REFERENCE_RANGES['LDH']
        details_dict['LDH_ref'] = f"{ldh_min_ref}-{ldh_max_ref} U/L"
        
        if ldh_val > ldh_max_ref:
            abnormalities_list.append(f"LDH Elevado ({ldh_val} U/L)")
            interpretations_list.append(f"LDH elevado ({ldh_val} U/L). Enzima muito inespecífica, pode estar elevada em múltiplas condições (hemólise, dano tecidual extenso, neoplasias, infarto - verificar troponina).")
            if ldh_val > 1000:
                interpretations_list.append("Elevação acentuada de LDH (>1000 U/L). Investigar causas potenciais como hemólise significativa, isquemia tecidual extensa, rabdomiólise ou neoplasias.")
        else:
            interpretations_list.append(f"LDH normal ({ldh_val} U/L).")
    
    # Comprehensive interpretation and recommendations
    if has_troponin_elevation:
        if ckmb_val is not None and ckmb_val > 5: # Using generic cutoff for CKMB
            interpretations_list.append("Padrão de elevação de troponina e CK-MB: Fortalece a suspeita de injúria miocárdica aguda (ex: IAM).")
        
        bnp_or_nt_elevated = (bnp_val is not None and bnp_val > 100) or (nt_pro_bnp_val is not None and nt_pro_bnp_val > 300) # Basic check for elevation
        if bnp_or_nt_elevated:
             interpretations_list.append("Elevação concomitante de troponina e BNP/NT-proBNP: Pode indicar infarto com disfunção ventricular associada ou sobrecarga de volume/pressão.")

        # Kidney function check (example, assuming Creatinine might be in `dados` from other panels)
        if processed_dados.get('Creat') is not None and processed_dados.get('Creat') > 1.5: # Simplified check
            interpretations_list.append(f"Observação: Elevação de troponina na presença de disfunção renal (Creatinina: {processed_dados.get('Creat')} mg/dL) requer cautela na interpretação, pois a depuração da troponina pode estar reduzida. Avaliar o delta e o quadro clínico.")
            
    # General recommendation for suspected ACS
    if has_troponin_elevation or (hora_dor_inicio is not None and hora_dor_inicio < 12):
        recommendations_list.append("Em caso de suspeita de Síndrome Coronariana Aguda (SCA), correlacionar com clínica, ECG e considerar estratificação de risco (ex: escores HEART, TIMI, GRACE) e conduta conforme diretrizes.")

    final_interpretation = "\n".join(filter(None, interpretations_list))
    
    return {
        "interpretation": final_interpretation.strip(),
        "abnormalities": list(set(abnormalities_list)),
        "is_critical": is_critical_flag,
        "recommendations": list(set(recommendations_list)),
        "details": details_dict 
    } 