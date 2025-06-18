"""
Hepatic function analysis module for interpreting liver function tests.
"""

from src.utils.reference_ranges import REFERENCE_RANGES

def analisar_funcao_hepatica(dados):
    """
    Analyze liver function tests and provide clinical interpretation.
    
    Args:
        dados: Dictionary containing liver function parameters
        
    Returns:
        list: List of analysis findings and interpretations
    """
    resultados = []
    
    # Check if there's enough data to analyze
    if not any(k in dados for k in ['TGO', 'TGP', 'BT', 'BD', 'BI', 'GamaGT', 'FosfAlc', 'Albumina']):
        return []
    
    # Analyze transaminases
    alteracoes_hepaticas = False
    
    if 'TGO' in dados:
        tgo = dados['TGO']
        if tgo > 40:
            alteracoes_hepaticas = True
            resultados.append(f"TGO/AST elevada ({tgo} U/L)")
            if tgo > 1000:
                resultados.append("Elevação muito acentuada de TGO - sugere hepatite aguda grave, isquemia hepática ou hepatite medicamentosa/tóxica")
            elif tgo > 500:
                resultados.append("Elevação acentuada de TGO - comum em hepatites virais agudas, hepatite alcoólica ou hepatite medicamentosa")
            elif tgo > 100:
                resultados.append("Elevação moderada de TGO - pode ocorrer em diversas hepatopatias, incluindo doença hepática gordurosa")
            elif tgo > 40:
                resultados.append("Elevação discreta de TGO - inespecífica, pode ser transitória")
    
    if 'TGP' in dados:
        tgp = dados['TGP']
        if tgp > 40:
            alteracoes_hepaticas = True
            resultados.append(f"TGP/ALT elevada ({tgp} U/L)")
            if tgp > 1000:
                resultados.append("Elevação muito acentuada de TGP - sugere hepatite viral aguda, hepatite isquêmica ou hepatite medicamentosa/tóxica")
            elif tgp > 500:
                resultados.append("Elevação acentuada de TGP - comum em hepatites virais, hepatite medicamentosa")
            elif tgp > 100:
                resultados.append("Elevação moderada de TGP - pode ocorrer em diversas hepatopatias, incluindo NASH")
            elif tgp > 40:
                resultados.append("Elevação discreta de TGP - inespecífica, pode ser transitória")
    
    # Calculate AST/ALT ratio if both are available
    if 'TGO' in dados and 'TGP' in dados:
        tgo = dados['TGO']
        tgp = dados['TGP']
        ratio = tgo / tgp
        
        resultados.append(f"Relação AST/ALT (TGO/TGP): {ratio:.2f}")
        
        if ratio > 2.0:
            resultados.append("Relação AST/ALT > 2.0 - sugere hepatopatia alcoólica ou cirrose avançada")
        elif ratio > 1.0:
            resultados.append("Relação AST/ALT > 1.0 - pode indicar doença hepática alcoólica, cirrose ou hepatite por fármacos")
        elif ratio < 1.0:
            resultados.append("Relação AST/ALT < 1.0 - padrão mais comum em hepatites virais agudas e NASH")
    
    # Analyze cholestasis markers
    colestase = False
    
    if 'GamaGT' in dados:
        ggt = dados['GamaGT']
        if ggt > 60:
            alteracoes_hepaticas = True
            colestase = True
            resultados.append(f"Gama-GT elevada ({ggt} U/L)")
            if ggt > 500:
                resultados.append("Elevação acentuada de GGT - sugere obstrução biliar, colangite ou indução enzimática (álcool, medicamentos)")
            elif ggt > 200:
                resultados.append("Elevação moderada de GGT - pode indicar colestase, hepatite alcoólica ou medicamentosa")
            elif ggt > 60:
                resultados.append("Elevação discreta de GGT - inespecífica, pode ocorrer com uso de álcool, certos medicamentos ou esteatose hepática")
    
    if 'FosfAlc' in dados:
        fosfatase = dados['FosfAlc']
        if fosfatase > 120:
            alteracoes_hepaticas = True
            colestase = True
            resultados.append(f"Fosfatase Alcalina elevada ({fosfatase} U/L)")
            if fosfatase > 300:
                resultados.append("Elevação importante de Fosfatase Alcalina - sugere obstrução biliar, colangite esclerosante primária ou metástases hepáticas")
            elif fosfatase > 120:
                resultados.append("Elevação moderada de Fosfatase Alcalina - pode indicar colestase, infiltração hepática ou doença óssea")
    
    # If both GGT and ALP are elevated, it strongly suggests cholestasis
    if 'GamaGT' in dados and 'FosfAlc' in dados and dados['GamaGT'] > 60 and dados['FosfAlc'] > 120:
        resultados.append("Padrão colestático (elevação de Gama-GT e Fosfatase Alcalina) - sugere obstrução biliar, colangite ou colestase intra-hepática")
    
    # Analyze bilirubin
    if 'BT' in dados:
        bt = dados['BT']
        if bt > 1.2:
            alteracoes_hepaticas = True
            resultados.append(f"Bilirrubina Total elevada ({bt} mg/dL)")
            if bt > 12.0:
                resultados.append("Hiperbilirrubinemia acentuada - sugere obstrução biliar completa, hepatite grave ou síndrome de Crigler-Najjar")
            elif bt > 3.0:
                resultados.append("Hiperbilirrubinemia moderada - pode ocorrer em diversas hepatopatias, hemólise ou síndrome de Gilbert")
            elif bt > 1.2:
                resultados.append("Hiperbilirrubinemia discreta - pode ser fisiológica (Gilbert) ou indicar discreta disfunção hepática/hemólise")
    
    # Analyze direct (conjugated) and indirect (unconjugated) bilirubin
    if 'BD' in dados and 'BT' in dados:
        bd = dados['BD']
        bt = dados['BT']
        bi = bt - bd  # Calculate indirect bilirubin if not provided
        
        if bd > 0.3:
            resultados.append(f"Bilirrubina Direta elevada ({bd} mg/dL)")
            if bd / bt > 0.5:
                resultados.append("Padrão de hiperbilirrubinemia predominantemente direta - sugere colestase ou hepatocelular")
        
        if 'BI' in dados:
            bi = dados['BI']  # Use provided value if available
            
        if bi > 1.0:
            resultados.append(f"Bilirrubina Indireta elevada ({bi} mg/dL)")
            if bi / bt > 0.8 and bt > 1.2:
                resultados.append("Padrão de hiperbilirrubinemia predominantemente indireta - sugere hemólise ou síndrome de Gilbert")
    
    # Analyze protein metabolism
    if 'Albumina' in dados:
        albumina = dados['Albumina']
        albumina_min, albumina_max = REFERENCE_RANGES['Albumina']
        
        if albumina < albumina_min:
            alteracoes_hepaticas = True
            resultados.append(f"Albumina reduzida ({albumina} g/dL)")
            if albumina < 2.5:
                resultados.append("Hipoalbuminemia grave - sugere doença hepática avançada, síndrome nefrótica ou desnutrição grave")
            elif albumina < 3.0:
                resultados.append("Hipoalbuminemia moderada - pode indicar hepatopatia crônica, desnutrição ou doenças inflamatórias crônicas")
            elif albumina < albumina_min:
                resultados.append("Hipoalbuminemia leve - pode ser vista em diversas condições, incluindo inflamação aguda")
        elif albumina > albumina_max:
            resultados.append(f"Albumina elevada ({albumina} g/dL)")
            resultados.append("Hiperalbuminemia geralmente indica desidratação")
        else:
            resultados.append(f"Albumina normal ({albumina} g/dL)")
    
    # Analyze coagulation parameters if available
    if 'RNI' in dados:
        rni = dados['RNI']
        if rni > 1.3:
            alteracoes_hepaticas = True
            resultados.append(f"RNI/INR elevado ({rni})")
            if rni > 2.0:
                resultados.append("Coagulopatia importante - sugere insuficiência hepática grave ou coagulopatia de consumo")
            elif rni > 1.3:
                resultados.append("Coagulopatia leve a moderada - pode indicar disfunção hepática ou deficiência de vitamina K")
    
    # Provide comprehensive assessment if multiple parameters are altered
    if alteracoes_hepaticas:
        # Check for hepatocellular vs cholestatic pattern
        if 'TGO' in dados and 'TGP' in dados and 'GamaGT' in dados and 'FosfAlc' in dados:
            tgo = dados['TGO']
            tgp = dados['TGP']
            ggt = dados['GamaGT']
            fosfatase = dados['FosfAlc']
            
            r_value = (tgo / 40) / (fosfatase / 120)  # Calculate R value using ULN
            
            if r_value > 5:
                resultados.append("Padrão predominantemente hepatocelular (R > 5) - sugere hepatite viral, hepatite tóxica ou isquêmica")
            elif r_value < 2:
                resultados.append("Padrão predominantemente colestático (R < 2) - sugere obstrução biliar, medicamentos colestáticos ou cirrose biliar primária")
            else:
                resultados.append("Padrão misto hepatocelular-colestático (R entre 2-5) - pode ocorrer em várias doenças, incluindo hepatite alcoólica, drogas ou doença infiltrativa")
        
        # Check for synthetic function
        if 'Albumina' in dados and 'RNI' in dados:
            albumina = dados['Albumina']
            rni = dados['RNI']
            
            if albumina < 3.5 and rni > 1.3:
                resultados.append("Comprometimento da função sintética hepática (hipoalbuminemia + coagulopatia) - sugere doença hepática crônica avançada")
    
        # Check for markers of cirrhosis
        if ('Plaq' in dados and dados['Plaq'] < 150000 and
            'Albumina' in dados and dados['Albumina'] < 3.5 and
            'RNI' in dados and dados['RNI'] > 1.3):
            resultados.append("Achados sugestivos de cirrose hepática (trombocitopenia, hipoalbuminemia e coagulopatia)")
    
    # Check for specific enzyme abnormalities
    if 'Amilase' in dados and dados['Amilase'] > 100:
        resultados.append(f"Amilase elevada ({dados['Amilase']} U/L) - considerar pancreatite, parotidite ou insuficiência renal")
        
    if 'Lipase' in dados and dados['Lipase'] > 60:
        resultados.append(f"Lipase elevada ({dados['Lipase']} U/L) - maior especificidade para pancreatite que a amilase")
        if 'Amilase' in dados and dados['Amilase'] > 100 and dados['Lipase'] > 60:
            resultados.append("Elevação concomitante de amilase e lipase - altamente sugestivo de pancreatite aguda")
    
    return resultados 