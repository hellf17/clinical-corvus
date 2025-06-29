"""
Blood gas analysis functions for interpreting arterial blood gas results.
"""

from src.utils.reference_ranges import REFERENCE_RANGES
from functools import lru_cache

def analisar_gasometria(dados):
    """
    Analyze arterial blood gas values and provide diagnostic interpretation.
    
    Args:
        dados: Dictionary with blood gas values
        
    Returns:
        list: List of interpretations and findings
    """
    # Extract values from the data dictionary
    pH = dados.get('pH')
    pCO2 = dados.get('pCO2')
    pO2 = dados.get('pO2')
    HCO3 = dados.get('HCO3-')
    BE = dados.get('BE')
    SpO2 = dados.get('SpO2')
    FiO2 = dados.get('FiO2')
    lactato = dados.get('Lactato')
    
    # Convert all values to float (if they are numeric)
    params = {}
    for key, value in [('pH', pH), ('pCO2', pCO2), ('pO2', pO2), 
                       ('HCO3', HCO3), ('BE', BE), ('SpO2', SpO2), 
                       ('FiO2', FiO2), ('lactato', lactato)]:
        if value is not None:
            try:
                params[key] = float(value)
            except (ValueError, TypeError):
                # Skip if value cannot be converted to float
                pass
    
    # Call the cached function with the prepared parameters
    if 'pH' in params and 'pCO2' in params:
        # Extract the individual parameters with proper defaults for caching
        ph_value = params.get('pH')
        pco2_value = params.get('pCO2')
        po2_value = params.get('pO2', None)
        hco3_value = params.get('HCO3', None)
        be_value = params.get('BE', None)
        spo2_value = params.get('SpO2', None)
        fio2_value = params.get('FiO2', None)
        lactato_value = params.get('lactato', None)
        
        # Call the cached analysis function
        return _analisar_gasometria_cached(
            ph_value, pco2_value, po2_value, hco3_value, 
            be_value, spo2_value, fio2_value, lactato_value
        )
    
    return []  # Return empty list if not enough data

@lru_cache(maxsize=128)
def _analisar_gasometria_cached(ph, pco2, po2=None, hco3=None, be=None, spo2=None, fio2=None, lactato=None):
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
        
    Returns:
        list: List of interpretations and findings
    """
    resultados = []
    
    # Reference ranges
    pH_min, pH_max = REFERENCE_RANGES['pH']
    pCO2_min, pCO2_max = REFERENCE_RANGES['pCO2']
    
    # Calculate HCO3 if not provided using Henderson-Hasselbalch equation (approximate)
    if hco3 is None and ph is not None and pco2 is not None:
        hco3 = 0.03 * pco2 * (10**(ph - 6.1))
    
    # Lists to store acid-base status
    disturbio_primario = []
    disturbios_secundarios = []
    
    # pH analysis
    if ph < pH_min:
        resultados.append(f"pH reduzido ({ph}) - Acidemia")
        
        # Analyze primary disturbance - Respiratory acidosis
        if pco2 > pCO2_max:
            # Check if this is a primary disturbance or compensation
            if not disturbios_secundarios:  # Only add if not already detected as a secondary disturbance
                disturbio_primario.append("Acidose Respiratória")
                
                # Calculate expected compensation (Winter's formula for acute resp. acidosis)
                if hco3 is not None:
                    expected_hco3 = 24 + ((pco2 - 40) * 0.1)
                    if abs(hco3 - expected_hco3) > 2:
                        if hco3 < expected_hco3:
                            disturbios_secundarios.append("Acidose Metabólica (distúrbio misto)")
                        else:
                            disturbios_secundarios.append("Alcalose Metabólica (distúrbio misto)")
        
        # Analyze primary disturbance - Metabolic acidosis
        if hco3 is not None and hco3 < REFERENCE_RANGES['HCO3-'][0]:
            # Check if this is a primary disturbance or compensation
            if not any("Acidose Metabólica" in d for d in disturbios_secundarios):
                disturbio_primario.append("Acidose Metabólica")
                
                # Calculate expected compensation (acute metabolic acidosis)
                expected_pco2 = 40 - (1.2 * (24 - hco3))
                if abs(pco2 - expected_pco2) > 2:
                    if pco2 > expected_pco2:
                        disturbios_secundarios.append("Acidose Respiratória (distúrbio misto)")
                    else:
                        disturbios_secundarios.append("Alcalose Respiratória (distúrbio misto)")
    
    elif ph > pH_max:
        resultados.append(f"pH elevado ({ph}) - Alcalemia")
        
        # Analyze primary disturbance - Respiratory alkalosis
        if pco2 < pCO2_min:
            # Only add if not already detected as a secondary disturbance
            if not any("Alcalose Respiratória" in d for d in disturbios_secundarios):
                disturbio_primario.append("Alcalose Respiratória")
                
                # Calculate expected compensation
                if hco3 is not None:
                    expected_hco3 = 24 - ((40 - pco2) * 0.2)  # Acute resp. alkalosis
                    if abs(hco3 - expected_hco3) > 2:
                        if hco3 < expected_hco3:
                            disturbios_secundarios.append("Acidose Metabólica (distúrbio misto)")
                        else:
                            disturbios_secundarios.append("Alcalose Metabólica (distúrbio misto)")
        
        # Analyze primary disturbance - Metabolic alkalosis
        if hco3 is not None and hco3 > REFERENCE_RANGES['HCO3-'][1]:
            # Only add if not already detected as a secondary disturbance
            if not any("Alcalose Metabólica" in d for d in disturbios_secundarios):
                disturbio_primario.append("Alcalose Metabólica")
                
                # Calculate expected compensation
                expected_pco2 = 40 + (0.6 * (hco3 - 24))
                if abs(pco2 - expected_pco2) > 2:
                    if pco2 > expected_pco2:
                        disturbios_secundarios.append("Acidose Respiratória (distúrbio misto)")
                    else:
                        disturbios_secundarios.append("Alcalose Respiratória (distúrbio misto)")
    
    else:
        resultados.append(f"pH normal ({ph})")
        
        # Check for mixed compensated disturbances (normal pH with abnormal parameters)
        if (pco2 > pCO2_max and hco3 is not None and hco3 > REFERENCE_RANGES['HCO3-'][1]):
            disturbio_primario.append("Distúrbio misto compensado: Acidose respiratória + Alcalose metabólica")
            
        elif (pco2 < pCO2_min and hco3 is not None and hco3 < REFERENCE_RANGES['HCO3-'][0]):
            disturbio_primario.append("Distúrbio misto compensado: Alcalose respiratória + Acidose metabólica")
    
    # If no primary disturbances were found but compensatory mechanisms are present
    if not disturbio_primario and disturbios_secundarios:
        disturbio_primario.append(f"Distúrbio misto: {' e '.join(disturbios_secundarios)}")
        disturbios_secundarios = []
    
    # Add primary disturbance to results
    for disturbio in disturbio_primario:
        resultados.append(f"Distúrbio primário: {disturbio}")
    
    # Add compensations and secondary disturbances
    for disturbio in disturbios_secundarios:
        resultados.append(f"Distúrbio secundário: {disturbio}")
    
    # Analyze oxygenation
    if po2 is not None:
        if po2 < REFERENCE_RANGES['pO2'][0]:
            resultados.append(f"pO2 reduzido ({po2} mmHg) - Hipoxemia")
            
            # Severity of hypoxemia
            if po2 < 60:
                resultados.append("Hipoxemia moderada a grave")
                if spo2 is not None and spo2 < 90:
                    resultados.append("ALERTA: Hipoxemia grave com dessaturação")
            else:
                resultados.append("Hipoxemia leve")
        else:
            resultados.append(f"pO2 adequado ({po2} mmHg)")
    
    # Calculate A-a gradient if PO2 and FiO2 are available
    if po2 is not None and fio2 is not None:
        # Convert FiO2 to decimal if it's a percentage
        fio2_decimal = fio2 / 100 if fio2 > 1 else fio2
        
        # Calculate PAO2 (Alveolar O2)
        pao2 = (fio2_decimal * (760 - 47)) - (pco2 / 0.8)
        
        # Calculate A-a gradient
        aa_gradient = pao2 - po2
        
        # Add age-adjusted normal value
        # Normal A-a gradient = 2.5 + (0.21 * age)
        # Using 50 as default age if not provided
        normal_gradient = 10  # Assuming middle-aged adult
        
        resultados.append(f"Gradiente alvéolo-arterial de O2: {aa_gradient:.1f} mmHg")
        
        if aa_gradient > normal_gradient + 10:
            resultados.append("Gradiente A-a aumentado - sugere alteração de troca gasosa (V/Q mismatch, shunt ou difusão)")
        elif aa_gradient > normal_gradient:
            resultados.append("Gradiente A-a levemente aumentado")
        else:
            resultados.append("Gradiente A-a normal")
            
        # Calculate P/F ratio (PaO2/FiO2) - important for ARDS/ALI diagnosis
        pf_ratio = po2 / fio2_decimal
        resultados.append(f"Relação P/F: {pf_ratio:.1f}")
        
        if pf_ratio < 100:
            resultados.append("ALERTA: Relação P/F < 100 - compatível com SDRA grave (Berlin)")
        elif pf_ratio < 200:
            resultados.append("Relação P/F < 200 - compatível com SDRA moderada (Berlin)")
        elif pf_ratio < 300:
            resultados.append("Relação P/F < 300 - compatível com SDRA leve (Berlin)")
    
    # Evaluate lactate if available
    if lactato is not None:
        lactato_min, lactato_max = REFERENCE_RANGES['Lactato']
        
        if lactato > lactato_max:
            resultados.append(f"Lactato elevado ({lactato} mmol/L)")
            
            if lactato > 4:
                resultados.append("ALERTA: Hiperlactatemia grave - avaliar perfusão tecidual")
                if ph < pH_min and hco3 is not None and hco3 < REFERENCE_RANGES['HCO3-'][0]:
                    resultados.append("Acidose láctica - possível choque, hipoperfusão grave ou intoxicação")
            elif lactato > 2:
                resultados.append("Hiperlactatemia moderada - considerar causas de hipoperfusão")
        else:
            resultados.append(f"Lactato normal ({lactato} mmol/L)")
    
    # Add educational notes
    if len(disturbio_primario) > 0:
        if "Acidose Respiratória" in disturbio_primario[0]:
            resultados.append("Nota: Acidose respiratória pode ser causada por hipoventilação alveolar (depressão do centro respiratório, doenças neuromusculares) ou retenção de CO2 (DPOC exacerbada, asma grave)")
        elif "Acidose Metabólica" in disturbio_primario[0]:
            if be is not None and be < -10:
                resultados.append("Nota: Acidose metabólica com gap aniônico aumentado (lactato, cetoacidose, uremia, intoxicações) ou normal (diarreia, acidose tubular renal)")
            else:
                resultados.append("Nota: Acidose metabólica leve a moderada")
        elif "Alcalose Respiratória" in disturbio_primario[0]:
            resultados.append("Nota: Alcalose respiratória é causada por hiperventilação (ansiedade, dor, infecção, hipóxia, embolia pulmonar, sepse inicial)")
        elif "Alcalose Metabólica" in disturbio_primario[0]:
            resultados.append("Nota: Alcalose metabólica pode ser causada por perda de H+ (vômitos, lavagem gástrica), uso de diuréticos, excesso de mineralocorticoides")
    
    return resultados 