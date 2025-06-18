"""
Renal function analysis module for interpreting kidney-related lab tests.
"""

from src.utils.reference_ranges import REFERENCE_RANGES

def analisar_funcao_renal(dados, idade=None, sexo=None, peso=None, altura=None, etnia=None):
    """
    Analyze renal function parameters and provide clinical interpretation.
    
    Args:
        dados: Dictionary containing renal parameters (Creat, Ur, etc.)
        idade: Patient's age in years (for eGFR calculation)
        sexo: Patient's sex ('M' or 'F') for gender-specific calculations
        peso: Patient's weight in kg (for clearance calculations)
        altura: Patient's height in cm (for body surface area)
        etnia: Patient's ethnicity (for eGFR adjustments)
        
    Returns:
        list: List of analysis findings and interpretations
    """
    resultados = []
    
    # Check if there's enough data to analyze
    if not any(k in dados for k in ['Creat', 'Ur', 'TFG']):
        return []
    
    # Analyze creatinine
    if 'Creat' in dados:
        creat = dados['Creat']
        creat_min, creat_max = REFERENCE_RANGES['Creat']
        
        if creat < creat_min:
            resultados.append(f"Creatinina reduzida ({creat} mg/dL)")
            resultados.append("Valor baixo de creatinina pode indicar desnutrição ou perda de massa muscular")
        elif creat > creat_max:
            resultados.append(f"Creatinina elevada ({creat} mg/dL)")
            if creat > 3.0:
                resultados.append("Elevação significativa da creatinina - insuficiência renal importante")
            elif creat > 2.0:
                resultados.append("Elevação moderada da creatinina - disfunção renal moderada")
            elif creat > creat_max:
                resultados.append("Elevação leve da creatinina - pode indicar disfunção renal inicial")
        else:
            resultados.append(f"Creatinina normal ({creat} mg/dL)")
        
        # Calculate estimated GFR if age and sex are available
        if idade and sexo:
            # Use CKD-EPI equation for eGFR calculation
            if sexo == 'F':
                if creat <= 0.7:
                    egfr = 144 * (creat/0.7)**-0.329 * 0.993**idade
                else:
                    egfr = 144 * (creat/0.7)**-1.209 * 0.993**idade
                
                # Adjust for ethnicity if black
                if etnia and etnia.lower() == 'negro':
                    egfr *= 1.159
            else:  # Male
                if creat <= 0.9:
                    egfr = 141 * (creat/0.9)**-0.411 * 0.993**idade
                else:
                    egfr = 141 * (creat/0.9)**-1.209 * 0.993**idade
                
                # Adjust for ethnicity if black
                if etnia and etnia.lower() == 'negro':
                    egfr *= 1.159
            
            resultados.append(f"TFG estimada (CKD-EPI): {egfr:.1f} mL/min/1.73m²")
            
            # Classify CKD stage based on eGFR
            if egfr >= 90:
                resultados.append("Função renal normal ou aumentada (Estágio G1 se doença renal presente)")
            elif egfr >= 60:
                resultados.append("Redução leve da função renal (Estágio G2 se doença renal presente)")
            elif egfr >= 45:
                resultados.append("Redução leve a moderada da função renal (Estágio G3a)")
            elif egfr >= 30:
                resultados.append("Redução moderada a grave da função renal (Estágio G3b)")
            elif egfr >= 15:
                resultados.append("Redução grave da função renal (Estágio G4)")
            else:
                resultados.append("Falência renal (Estágio G5) - considerar terapia de substituição renal")
    
    # Analyze urea
    if 'Ur' in dados:
        ureia = dados['Ur']
        ur_min, ur_max = REFERENCE_RANGES['Ur']
        
        if ureia < ur_min:
            resultados.append(f"Ureia reduzida ({ureia} mg/dL)")
            resultados.append("Possíveis causas: desnutrição, baixa ingestão proteica, doença hepática grave")
        elif ureia > ur_max:
            resultados.append(f"Ureia elevada ({ureia} mg/dL)")
            if ureia > 200:
                resultados.append("Ureia criticamente elevada - alta probabilidade de síndrome urêmica")
            elif ureia > 100:
                resultados.append("Azotemia grave - indicativo de disfunção renal significativa")
            elif ureia > ur_max:
                resultados.append("Elevação leve a moderada - pode ser devido a desidratação, aumento do catabolismo proteico ou disfunção renal")
        else:
            resultados.append(f"Ureia normal ({ureia} mg/dL)")
    
    # Calculate BUN/Creatinine ratio if both are available
    if 'Ur' in dados and 'Creat' in dados:
        ureia = dados['Ur']
        creat = dados['Creat']
        bun = ureia / 2.14  # Convert ureia to BUN (Blood Urea Nitrogen)
        ratio = bun / creat
        
        resultados.append(f"Relação BUN/Creatinina: {ratio:.1f}")
        
        if ratio > 20:
            resultados.append("Relação BUN/Creatinina elevada - sugere causa pré-renal (desidratação, sangramento GI, aumento do catabolismo proteico)")
        elif ratio < 10:
            resultados.append("Relação BUN/Creatinina reduzida - sugere baixa ingestão proteica, doença hepática ou rabdomiólise")
    
    # Analyze electrolytes relevant to renal function
    if 'K+' in dados and dados['K+'] > 5.5 and 'Creat' in dados and dados['Creat'] > 1.5:
        resultados.append(f"Hipercalemia ({dados['K+']} mmol/L) em contexto de disfunção renal - monitorar de perto")
    
    # Analyze urinalysis data (if available)
    if 'ProtCreatRatio' in dados:
        prot_creat = dados['ProtCreatRatio']
        prot_min, prot_max = REFERENCE_RANGES['ProtCreatRatio']
        
        if prot_creat > prot_max:
            resultados.append(f"Relação proteína/creatinina urinária elevada ({prot_creat} mg/mg)")
            if prot_creat > 3.0:
                resultados.append("Proteinúria nefrótica (>3g/g) - sugere glomerulopatia")
            elif prot_creat > 1.0:
                resultados.append("Proteinúria significativa - indica lesão glomerular relevante")
            elif prot_creat > 0.2:
                resultados.append("Proteinúria leve a moderada - pode ser vista em diversas nefropatias")
    
    if 'ProteinuriaVol' in dados:
        proteinuria = dados['ProteinuriaVol']
        prot_min, prot_max = REFERENCE_RANGES['ProteinuriaVol']
        
        if proteinuria > prot_max:
            resultados.append(f"Proteinúria de 24h aumentada ({proteinuria} mg/24h)")
            if proteinuria > 3500:
                resultados.append("Proteinúria em nível nefrótico (>3.5g/24h) - sugere doença glomerular")
            elif proteinuria > 1000:
                resultados.append("Proteinúria significativa - indica lesão renal relevante")
    
    # Check for hematuria
    if 'UrineHem' in dados:
        hemacell = dados['UrineHem']
        if hemacell > REFERENCE_RANGES['UrineHem'][1]:
            resultados.append(f"Hematúria ({hemacell} células/campo)")
            resultados.append("Hematúria pode indicar infecção urinária, litíase, neoplasia, glomerulopatia ou outras patologias renais/urológicas")
    
    # Check for leukocyturia
    if 'UrineLeuco' in dados:
        leucocitos = dados['UrineLeuco']
        if leucocitos > REFERENCE_RANGES['UrineLeuco'][1]:
            resultados.append(f"Leucocitúria ({leucocitos} células/campo)")
            resultados.append("Leucocitúria sugere infecção do trato urinário ou nefrite intersticial")
    
    # Assess acid-base status in renal context if blood gas data is available
    if 'pH' in dados and 'HCO3-' in dados and 'Creat' in dados and dados['Creat'] > 2.0:
        ph = dados['pH']
        hco3 = dados['HCO3-']
        
        if ph < 7.35 and hco3 < 22:
            resultados.append("Acidose metabólica em paciente com disfunção renal - provável acidose tubular renal ou acidose urêmica")
    
    return resultados 