"""
Hematology analysis functions for interpreting complete blood count (CBC) results.
"""

from src.utils.reference_ranges import REFERENCE_RANGES

def analisar_hemograma(dados, sexo=None):
    """
    Analyze complete blood count (CBC) results and provide clinical interpretation.
    
    Args:
        dados: Dictionary containing CBC parameters (Hb, Ht, Leuco, Plaq, etc.)
        sexo: Patient's sex ('M' or 'F') for gender-specific reference ranges
        
    Returns:
        list: List of analysis findings and interpretations
    """
    resultados = []
    
    # Check if there's enough data to analyze
    if not any(k in dados for k in ['Hb', 'Ht', 'Leuco', 'Plaq']):
        return []
    
    # Analyze hemoglobin level
    if 'Hb' in dados:
        hb = dados['Hb']
        # Adjust reference range based on gender
        if sexo == 'M':
            hb_min, hb_max = 13.5, 17.5  # Male reference range
        elif sexo == 'F':
            hb_min, hb_max = 12.0, 16.0  # Female reference range
        else:
            hb_min, hb_max = REFERENCE_RANGES['Hb']  # Default range
            
        if hb < hb_min:
            resultados.append(f"Anemia (Hb: {hb} g/dL)")
            if hb < 7.0:
                resultados.append("Anemia grave - considerar transfusão de hemácias")
            elif hb < 10.0:
                resultados.append("Anemia moderada")
        elif hb > hb_max:
            resultados.append(f"Policitemia (Hb: {hb} g/dL)")
            resultados.append("Causas de policitemia incluem desidratação, doença pulmonar crônica, policitemia vera, ou altitude elevada")
        else:
            resultados.append(f"Hemoglobina normal ({hb} g/dL)")
    
    # Analyze hematocrit
    if 'Ht' in dados:
        ht = dados['Ht']
        # Adjust reference range based on gender
        if sexo == 'M':
            ht_min, ht_max = 41, 53  # Male reference range
        elif sexo == 'F':
            ht_min, ht_max = 36, 46  # Female reference range
        else:
            ht_min, ht_max = REFERENCE_RANGES['Ht']  # Default range
            
        if ht < ht_min:
            resultados.append(f"Hematócrito reduzido (Ht: {ht}%)")
        elif ht > ht_max:
            resultados.append(f"Hematócrito elevado (Ht: {ht}%)")
    
    # Analyze leukocytes
    if 'Leuco' in dados:
        leuco = dados['Leuco']
        leuco_min, leuco_max = REFERENCE_RANGES['Leuco']
        
        if leuco < leuco_min:
            resultados.append(f"Leucopenia ({leuco} /mm³)")
            if leuco < 1000:
                resultados.append("Leucopenia grave - risco aumentado de infecções oportunistas")
            elif leuco < 2000:
                resultados.append("Neutropenia significativa - considerar isolamento protetor")
        elif leuco > leuco_max:
            resultados.append(f"Leucocitose ({leuco} /mm³)")
            if leuco > 20000:
                resultados.append("Leucocitose importante - sugestivo de infecção grave, inflamação ou processo hematológico")
            elif leuco > 12000:
                resultados.append("Leucocitose moderada - comum em infecções bacterianas")
        else:
            resultados.append(f"Leucócitos normais ({leuco} /mm³)")
    
    # Analyze differential (if available)
    if 'Bastões' in dados:
        bastonetes = dados['Bastões']
        if bastonetes > 500:
            resultados.append(f"Desvio à esquerda (Bastões: {bastonetes} /mm³)")
            resultados.append("Sugere processo infeccioso/inflamatório agudo em curso")
    
    if 'Segm' in dados:
        segmentados = dados['Segm']
        if segmentados > 7500:
            resultados.append(f"Neutrofilia (Segmentados: {segmentados} /mm³)")
            resultados.append("Sugere infecção bacteriana, inflamação ou estresse")
        elif segmentados < 1500:
            resultados.append(f"Neutropenia (Segmentados: {segmentados} /mm³)")
            resultados.append("Risco aumentado de infecções bacterianas")
    
    # Analyze platelets
    if 'Plaq' in dados:
        plaq = dados['Plaq']
        plaq_min, plaq_max = REFERENCE_RANGES['Plaq']
        
        if plaq < plaq_min:
            resultados.append(f"Trombocitopenia ({plaq} /mm³)")
            if plaq < 20000:
                resultados.append("Trombocitopenia grave - risco elevado de sangramento espontâneo")
            elif plaq < 50000:
                resultados.append("Trombocitopenia moderada - risco de sangramento em procedimentos invasivos")
            elif plaq < 100000:
                resultados.append("Trombocitopenia leve - geralmente sem risco de sangramento espontâneo")
        elif plaq > plaq_max:
            resultados.append(f"Trombocitose ({plaq} /mm³)")
            if plaq > 1000000:
                resultados.append("Trombocitose extrema - considerar doença mieloproliferativa")
            elif plaq > 600000:
                resultados.append("Trombocitose importante - aumento do risco trombótico")
        else:
            resultados.append(f"Plaquetas normais ({plaq} /mm³)")
    
    # Analyze reticulocytes (if available)
    if 'Retic' in dados:
        retic = dados['Retic']
        retic_min, retic_max = REFERENCE_RANGES['Retic']
        
        if retic < retic_min:
            resultados.append(f"Reticulócitos reduzidos ({retic}%)")
            resultados.append("Sugere deficiência na produção de eritrócitos (anemia aplásica, deficiência nutricional)")
        elif retic > retic_max:
            resultados.append(f"Reticulócitos aumentados ({retic}%)")
            resultados.append("Sugere resposta medular à perda de hemácias (hemorragia, hemólise) ou tratamento de anemia")
    
    # Analyze red cell indices (if available)
    if 'VCM' in dados:
        vcm = dados['VCM']
        if vcm < 80:
            resultados.append(f"Microcitose (VCM: {vcm} fL)")
            resultados.append("Sugere deficiência de ferro, talassemia ou anemia de doença crônica")
        elif vcm > 100:
            resultados.append(f"Macrocitose (VCM: {vcm} fL)")
            resultados.append("Sugere deficiência de B12/folato, alcoolismo, hepatopatia ou síndrome mielodisplásica")

    if 'HCM' in dados:
        hcm = dados['HCM']
        if hcm < 27:
            resultados.append(f"Hipocromia (HCM: {hcm} pg)")
        elif hcm > 33:
            resultados.append(f"Hipercromia (HCM: {hcm} pg)")

    if 'RDW' in dados:
        rdw = dados['RDW']
        if rdw > 14.5:
            resultados.append(f"Anisocitose aumentada (RDW: {rdw}%)")
            resultados.append("Aumento da variabilidade no tamanho dos eritrócitos - comum em deficiência de ferro e outras anemias")
    
    # Comprehensive interpretation based on multiple parameters
    if 'Hb' in dados and 'VCM' in dados and 'HCM' in dados:
        hb = dados['Hb']
        vcm = dados['VCM']
        hcm = dados['HCM']
        
        # Anemia classification based on morphology
        if hb < (12.0 if sexo == 'F' else 13.5):
            if vcm < 80 and hcm < 27:
                resultados.append("Padrão compatível com anemia microcítica hipocrômica (considerar deficiência de ferro como principal causa)")
            elif vcm > 100:
                resultados.append("Padrão compatível com anemia macrocítica (considerar deficiência de B12/folato, alcoolismo)")
            elif vcm >= 80 and vcm <= 100 and hcm >= 27:
                resultados.append("Padrão compatível com anemia normocítica normocrômica (considerar anemia de doença crônica, insuficiência renal)")
    
    return resultados 