"""
Pancreatic function analysis module for interpreting pancreatic enzyme tests.
"""

from typing import Dict, Any, List, Optional
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

def analisar_coagulacao(data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
    """
    Analisa parâmetros de coagulação.
    """
    interpretations: List[str] = []
    abnormalities: List[str] = []
    recommendations: List[str] = []
    is_critical = False
    processed_markers = False
    details = {}

    # INR / RNI (Tempo de Protrombina)
    # Expected key: 'INR', 'RNI', or 'tempo de protrombina'
    inr_keys = ['INR', 'RNI', 'inr', 'rni', 'tempo de protrombina']
    inr_val_data = None
    for key in inr_keys:
        if key in data:
            inr_val_data = data[key]
            break

    if inr_val_data is not None:
        processed_markers = True
        inr_val = _safe_convert_to_float(str(inr_val_data))
        if inr_val is not None:
            # General reference for non-anticoagulated: 0.8-1.2. Therapeutic: 2.0-3.0 or higher.
            if inr_val > 5.0:
                interpretations.append(f"INR acentuadamente elevado: {inr_val}. Risco de sangramento.")
                abnormalities.append(f"INR acentuadamente elevado ({inr_val})")
                recommendations.append("Risco elevado de sangramento. Suspender anticoagulantes se em uso e considerar reversão se clinicamente indicado (ex: Vitamina K, Complexo Protrombínico).")
                is_critical = True
            elif inr_val > 1.2 and not (2.0 <= inr_val <= 3.5): # Elevated but not clearly in common therapeutic range
                 interpretations.append(f"INR elevado: {inr_val}. Avaliar contexto clínico (uso de anticoagulantes, doença hepática).")
                 abnormalities.append(f"INR elevado ({inr_val})")
                 recommendations.append("Monitorar INR. Se não estiver em anticoagulação, investigar causa (ex: deficiência de Vit K, doença hepática).")
            elif 2.0 <= inr_val <= 3.5: # Common therapeutic range
                 interpretations.append(f"INR em faixa terapêutica para anticoagulação oral: {inr_val}.")
            else: # Normal or subtherapeutic if on anticoagulation
                 interpretations.append(f"INR dentro dos valores de referência ou subterapêutico: {inr_val}.")
        else:
            interpretations.append(f"Valor de INR não numérico: {inr_val_data}.")

    # TTPA (Tempo de Tromboplastina Parcial Ativada)
    # Expected key: 'TTPA', 'tempo de tromboplastina parcial ativada', 'ttp', 'TTPA (Relação)', 'TTPA (Segundos)'
    ttpa_keys = ['TTPA', 'tempo de tromboplastina parcial ativada', 'ttp', 'TTPA (Relação)', 'TTPA (Segundos)']
    ttpa_val_data = None
    ttpa_ratio_val_data = None
    for key in ttpa_keys:
        if key in data:
            if key == 'TTPA (Relação)':
                ttpa_ratio_val_data = data[key]
            else:
                ttpa_val_data = data[key]
            break
    
    if ttpa_val_data is not None:
        processed_markers = True
        ttpa_val = _safe_convert_to_float(str(ttpa_val_data))
        if ttpa_val is not None:
            ttpa_ref_low, ttpa_ref_high = REFERENCE_RANGES.get('TTPA', (25, 40)) # Default from REFERENCE_RANGES
            details['TTPA_Segundos'] = ttpa_val
            details['TTPA_Ref'] = f"{ttpa_ref_low}-{ttpa_ref_high} Segundos"

            if ttpa_val > ttpa_ref_high:
                interpretations.append(f"Tempo de Tromboplastina Parcial Ativada (TTPA) prolongado: {ttpa_val} Segundos.")
                abnormalities.append(f"TTPA prolongado ({ttpa_val} Segundos)")
                recommendations.append("TTPA prolongado sugere alteração na via intrínseca da coagulação. Investigar causas (ex: heparina, deficiência de fatores, anticoagulante lúpico).")
                if ttpa_val > (ttpa_ref_high + 20): # Example: significantly prolonged
                    is_critical = True 
            elif ttpa_val < ttpa_ref_low:
                interpretations.append(f"Tempo de Tromboplastina Parcial Ativada (TTPA) encurtado: {ttpa_val} Segundos (Ref: {ttpa_ref_low}-{ttpa_ref_high} Segundos).")
                abnormalities.append(f"TTPA encurtado ({ttpa_val} Segundos)")
                recommendations.append("TTPA encurtado pode estar associado a estados de hipercoagulabilidade ou ser artefato. Correlacionar com clínica.")
            else:
                interpretations.append(f"Tempo de Tromboplastina Parcial Ativada (TTPA) dentro dos valores de referência: {ttpa_val} Segundos (Ref: {ttpa_ref_low}-{ttpa_ref_high} Segundos).")
        else:
            interpretations.append(f"Valor de TTPA não numérico: {ttpa_val_data}.")

    # Fibrinogen analysis
    fibrinogen_keys = ['Fibrinogeno', 'Fibrinogênio', 'Fib']
    fibrinogen_val_data = None
    for key in fibrinogen_keys:
        if key in data:
            fibrinogen_val_data = data[key]
            break
    
    if fibrinogen_val_data is not None:
        processed_markers = True
        fibrinogen_val = _safe_convert_to_float(str(fibrinogen_val_data))
        if fibrinogen_val is not None:
            fib_ref_low, fib_ref_high = REFERENCE_RANGES.get('Fibrinogeno', (200, 400))
            details['Fibrinogeno_mg_dL'] = fibrinogen_val
            details['Fibrinogeno_Ref'] = f"{fib_ref_low}-{fib_ref_high} mg/dL"

            if fibrinogen_val < fib_ref_low:
                interpretations.append(f"Fibrinogênio baixo: {fibrinogen_val} mg/dL.")
                abnormalities.append(f"Fibrinogênio Baixo ({fibrinogen_val} mg/dL)")
                recommendations.append("Hipofibrinogenemia: investigar causas (ex: DIC, doença hepática grave, transfusão maciça, disfibrinogenemia). Risco aumentado de sangramento.")
                if fibrinogen_val < 100: # Critical threshold for severe hypofibrinogenemia
                    interpretations.append("Fibrinogênio criticamente baixo (<100 mg/dL). Risco elevado de sangramento grave.")
                    recommendations.append("Considerar reposição de fibrinogênio (ex: crioprecipitado, concentrado de fibrinogênio) se sangramento ativo ou alto risco.")
                    is_critical = True
            elif fibrinogen_val > fib_ref_high:
                interpretations.append(f"Fibrinogênio elevado: {fibrinogen_val} mg/dL.")
                abnormalities.append(f"Fibrinogênio Elevado ({fibrinogen_val} mg/dL)")
                recommendations.append("Hiperfibrinogenemia: é um reagente de fase aguda. Considerar inflamação, infecção, trauma, gravidez, síndrome nefrótica. Pode contribuir para estado pró-trombótico.")
            else:
                interpretations.append(f"Fibrinogênio dentro dos valores de referência: {fibrinogen_val} mg/dL.")
        else:
            interpretations.append(f"Valor de Fibrinogênio não numérico: {fibrinogen_val_data}.")

    # D-Dimer analysis
    d_dimer_keys = ['D-dimer', 'D-dímero', 'Dimeros-D', 'DimerosD']
    d_dimer_val_data = None
    for key in d_dimer_keys:
        if key in data:
            d_dimer_val_data = data[key]
            break
    
    if d_dimer_val_data is not None:
        processed_markers = True
        d_dimer_val = _safe_convert_to_float(str(d_dimer_val_data))
        if d_dimer_val is not None:
            # Using the generic cutoff from REFERENCE_RANGES, but emphasizing it\'s assay-dependent.
            # Units are assumed ng/mL FEU as per REFERENCE_RANGES entry.
            dd_ref_low, dd_ref_high = REFERENCE_RANGES.get('D-dimer', (0, 500)) 
            details['D-dimer_ng_mL_FEU'] = d_dimer_val
            details['D-dimer_Ref'] = f"< {dd_ref_high} ng/mL FEU (valor de corte local e unidades do ensaio DEVEM ser verificados)"

            interpretations.append("Interpretação do D-dímero é altamente dependente do ensaio, unidades (ex: ng/mL FEU, ng/mL DDU, mg/L FEU), e do valor de corte local. Ajuste por idade (idade x 10 ng/mL para >50 anos) pode ser aplicável para exclusão de TEV.")
            
            # Simplified logic based on a generic cutoff (e.g., 500 ng/mL FEU)
            if d_dimer_val > dd_ref_high:
                interpretations.append(f"D-dímero elevado: {d_dimer_val} ng/mL FEU (Ref: < {dd_ref_high}).")
                abnormalities.append(f"D-dímero Elevado ({d_dimer_val} ng/mL FEU)")
                recommendations.append("D-dímero elevado sugere ativação da coagulação e fibrinólise. Causas incluem TEV (Tromboembolismo Venoso), CIVD, cirurgia/trauma recente, infecção/inflamação, malignidade, gravidez. Baixa especificidade para TEV.")
                recommendations.append("Se suspeita de TEV (ex: TVP, TEP) e D-dímero elevado, considerar exames de imagem confirmatórios (ex: Doppler MMII, AngioTC de tórax) após avaliação da probabilidade pré-teste.")
                # D-dimer alone is not usually critical, but context might be
            else:
                interpretations.append(f"D-dímero não elevado: {d_dimer_val} ng/mL FEU (Ref: < {dd_ref_high}).")
                recommendations.append("D-dímero dentro da faixa de referência. Em pacientes com baixa a moderada probabilidade pré-teste de TEV, um D-dímero normal tem alto valor preditivo negativo para excluir TEV.")
        else:
            interpretations.append(f"Valor de D-dímero não numérico: {d_dimer_val_data}.")

    # Platelet count consideration (if available)
    platelet_keys = ['Plaquetas', 'PLT', 'Plaq']
    platelet_val_data = None
    for key in platelet_keys:
        if key in data:
            platelet_val_data = data[key]
            break
    
    if platelet_val_data is not None:
        # Not marking as processed_markers = True here, as it's an adjunctive interpretation
        platelet_val = _safe_convert_to_float(str(platelet_val_data))
        if platelet_val is not None:
            plaq_ref_low, plaq_ref_high = REFERENCE_RANGES.get('Plaq', (150000, 450000))
            details['Plaquetas_contagem'] = platelet_val
            details['Plaquetas_Ref'] = f"{plaq_ref_low}-{plaq_ref_high}/mm³"

            if platelet_val < plaq_ref_low:
                interpretations.append(f"Contagem de plaquetas baixa (Trombocitopenia): {platelet_val}/mm³. Risco aumentado de sangramento, especialmente se < 50.000/mm³ ou associado a outras coagulopatias.")
                abnormalities.append(f"Trombocitopenia ({platelet_val}/mm³)")
                if platelet_val < 20000:
                    recommendations.append("Trombocitopenia severa (<20.000/mm³). Risco crítico de sangramento espontâneo. Avaliação hematológica urgente e considerar transfusão de plaquetas se indicado.")
                    is_critical = True
                elif platelet_val < 50000:
                    recommendations.append("Trombocitopenia (<50.000/mm³). Monitorar e investigar causa. Evitar procedimentos invasivos se possível.")
            elif platelet_val > plaq_ref_high:
                interpretations.append(f"Contagem de plaquetas elevada (Trombocitose): {platelet_val}/mm³. Pode ser reacional ou indicar distúrbio mieloproliferativo.")
                abnormalities.append(f"Trombocitose ({platelet_val}/mm³)")
            # No specific interpretation for normal platelets within coagulation panel, assumed covered by hematology.
        else:
            interpretations.append(f"Valor de Plaquetas não numérico: {platelet_val_data}.")

    if not processed_markers:
        interpretations.append("Nenhum parâmetro de coagulação comum (INR) fornecido ou reconhecido para análise.")
    elif not abnormalities and interpretations:
        interpretations.append("Principais parâmetros de coagulação avaliados estão dentro dos limites da normalidade ou faixa terapêutica esperada.")

    final_interpretation = "\n".join(filter(None, interpretations))
    if not final_interpretation and processed_markers and not abnormalities:
        final_interpretation = "Parâmetros de coagulação analisados dentro da faixa de referência."
    elif not final_interpretation and not processed_markers:
        final_interpretation = "Dados insuficientes para análise de coagulação."

    return {
        "interpretation": final_interpretation if final_interpretation else "Não foi possível gerar uma interpretação para os parâmetros de coagulação.",
        "abnormalities": list(set(abnormalities)),
        "is_critical": is_critical,
        "recommendations": list(set(recommendations)),
        "details": details
    } 