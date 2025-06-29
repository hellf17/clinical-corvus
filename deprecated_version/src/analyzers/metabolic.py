"""
Metabolic analysis module for interpreting glucose metabolism, lipids, and other metabolic parameters.
"""

from src.utils.reference_ranges import REFERENCE_RANGES

def analisar_metabolismo(dados, idade=None, sexo=None, jejum=True):
    """
    Analyze metabolic parameters including glucose, HbA1c, uric acid, and lipid profile.
    
    Args:
        dados: Dictionary containing metabolic parameters
        idade: Patient's age in years (for interpretation)
        sexo: Patient's sex ('M' or 'F') for gender-specific reference ranges
        jejum: Whether the tests were performed in fasting state (boolean)
        
    Returns:
        list: List of analysis findings and interpretations
    """
    resultados = []
    
    # Check if there's enough data to analyze
    if not any(k in dados for k in ['Glicose', 'HbA1c', 'AcidoUrico']):
        return []
    
    # Analyze glucose metabolism
    has_diabetes = False
    pre_diabetes = False
    
    if 'Glicose' in dados:
        glicose = dados['Glicose']
        glicose_min, glicose_max = REFERENCE_RANGES['Glicose']
        
        if jejum:
            # Fasting glucose interpretation
            if glicose < 70:
                resultados.append(f"Hipoglicemia em jejum ({glicose} mg/dL)")
                if glicose < 54:
                    resultados.append("Hipoglicemia significativa - considerar sintomas neuroglicoênicos")
                elif glicose < 70:
                    resultados.append("Hipoglicemia leve - verificar sintomas e contexto clínico")
            elif glicose >= 126:
                has_diabetes = True
                resultados.append(f"Glicemia de jejum elevada ({glicose} mg/dL)")
                if glicose > 200:
                    resultados.append("Hiperglicemia acentuada - compatível com diabetes mal controlado ou diabetes descompensado")
                else:
                    resultados.append("Glicemia de jejum ≥126 mg/dL - critério para diabetes mellitus (requer confirmação)")
            elif glicose >= 100 and glicose < 126:
                pre_diabetes = True
                resultados.append(f"Glicemia de jejum alterada ({glicose} mg/dL)")
                resultados.append("Glicemia de jejum 100-125 mg/dL - compatível com pré-diabetes (glicemia de jejum alterada)")
            else:
                resultados.append(f"Glicose em jejum normal ({glicose} mg/dL)")
        else:
            # Random (non-fasting) glucose interpretation
            if glicose < 70:
                resultados.append(f"Hipoglicemia ao acaso ({glicose} mg/dL)")
                resultados.append("Hipoglicemia em não-jejum é anormal - investigar hipoglicemia reativa ou medicamentosa")
            elif glicose >= 200:
                has_diabetes = True
                resultados.append(f"Glicemia casual elevada ({glicose} mg/dL)")
                resultados.append("Glicemia ao acaso ≥200 mg/dL com sintomas é critério para diabetes mellitus")
            elif glicose > 140 and glicose < 200:
                resultados.append(f"Glicemia pós-prandial alterada ({glicose} mg/dL)")
                resultados.append("Valores entre 140-199 mg/dL pós-prandiais sugerem tolerância diminuída à glicose - considerar pré-diabetes")
            else:
                resultados.append(f"Glicose casual normal ({glicose} mg/dL)")
    
    # Analyze glycated hemoglobin (HbA1c)
    if 'HbA1c' in dados:
        hba1c = dados['HbA1c']
        hba1c_min, hba1c_max = REFERENCE_RANGES['HbA1c']
        
        if hba1c >= 6.5:
            has_diabetes = True
            resultados.append(f"HbA1c elevada ({hba1c}%)")
            if hba1c >= 9.0:
                resultados.append("HbA1c ≥9.0% - controle glicêmico muito ruim, alto risco de complicações")
            elif hba1c >= 8.0:
                resultados.append("HbA1c 8.0-8.9% - controle glicêmico ruim, adequar tratamento")
            elif hba1c >= 7.0:
                resultados.append("HbA1c 7.0-7.9% - controle glicêmico inadequado para a maioria dos pacientes")
            elif hba1c >= 6.5:
                resultados.append("HbA1c 6.5-6.9% - critério diagnóstico para diabetes (meta de controle aceitável para idosos)")
        elif hba1c >= 5.7 and hba1c < 6.5:
            pre_diabetes = True
            resultados.append(f"HbA1c intermediária ({hba1c}%)")
            resultados.append("HbA1c 5.7-6.4% - compatível com pré-diabetes, risco aumentado para diabetes")
        else:
            resultados.append(f"HbA1c normal ({hba1c}%)")
    
    # Summary of glucose metabolism findings
    if has_diabetes:
        if 'Glicose' in dados and 'HbA1c' in dados:
            resultados.append("Padrão compatível com Diabetes Mellitus - avaliar critérios diagnósticos e possível tratamento")
    elif pre_diabetes:
        resultados.append("Padrão compatível com Pré-Diabetes - considerar mudanças no estilo de vida e monitoramento")
    
    # Analyze uric acid
    if 'AcidoUrico' in dados:
        urico = dados['AcidoUrico']
        urico_min, urico_max = REFERENCE_RANGES['AcidoUrico']
        
        # Adjust reference range by sex
        if sexo == 'F':
            urico_max = 6.0  # Lower upper limit for females
        
        if urico > urico_max:
            resultados.append(f"Ácido úrico elevado ({urico} mg/dL)")
            if urico > 8.0:
                resultados.append("Hiperuricemia acentuada - risco aumentado para gota, litíase e nefropatia")
            elif urico > urico_max:
                resultados.append("Hiperuricemia leve a moderada - pode ser assintomática ou associada a síndrome metabólica")
        elif urico < urico_min:
            resultados.append(f"Ácido úrico reduzido ({urico} mg/dL)")
            resultados.append("Hipouricemia - pode ser vista em síndrome de Fanconi, uso de medicamentos uricosúricos ou deficiência de xantina oxidase")
        else:
            resultados.append(f"Ácido úrico normal ({urico} mg/dL)")
    
    # Analyze lipid profile (if available)
    if 'CT' in dados or 'HDL' in dados or 'LDL' in dados or 'TG' in dados:
        resultados.append("== Perfil Lipídico ==")
        
        if 'CT' in dados:
            ct = dados['CT']  # Total cholesterol
            if ct >= 240:
                resultados.append(f"Colesterol total elevado ({ct} mg/dL)")
                resultados.append("Colesterol ≥240 mg/dL - hipercolesterolemia significativa, avaliar risco cardiovascular")
            elif ct >= 200:
                resultados.append(f"Colesterol total limítrofe ({ct} mg/dL)")
                resultados.append("Colesterol 200-239 mg/dL - limítrofe alto, considerar risco cardiovascular global")
            else:
                resultados.append(f"Colesterol total ótimo/desejável ({ct} mg/dL)")
        
        if 'LDL' in dados:
            ldl = dados['LDL']  # LDL cholesterol
            if ldl >= 190:
                resultados.append(f"LDL-colesterol muito elevado ({ldl} mg/dL)")
                resultados.append("LDL ≥190 mg/dL - considerar hipercolesterolemia familiar, alto risco cardiovascular")
            elif ldl >= 160:
                resultados.append(f"LDL-colesterol elevado ({ldl} mg/dL)")
                resultados.append("LDL 160-189 mg/dL - alto risco cardiovascular, considerar tratamento intensivo")
            elif ldl >= 130:
                resultados.append(f"LDL-colesterol limítrofe alto ({ldl} mg/dL)")
                resultados.append("LDL 130-159 mg/dL - avaliar risco cardiovascular global para decisão terapêutica")
            elif ldl >= 100:
                resultados.append(f"LDL-colesterol acima do ideal ({ldl} mg/dL)")
                resultados.append("LDL 100-129 mg/dL - considerar tratamento em pacientes de alto risco")
            else:
                resultados.append(f"LDL-colesterol ótimo ({ldl} mg/dL)")
        
        if 'HDL' in dados:
            hdl = dados['HDL']  # HDL cholesterol
            hdl_baixo = hdl < 40 if sexo == 'M' else hdl < 50  # Different thresholds by sex
            
            if hdl_baixo:
                resultados.append(f"HDL-colesterol reduzido ({hdl} mg/dL)")
                resultados.append(f"HDL baixo (<40 mg/dL para homens, <50 mg/dL para mulheres) - fator de risco cardiovascular")
            elif hdl >= 60:
                resultados.append(f"HDL-colesterol elevado ({hdl} mg/dL)")
                resultados.append("HDL ≥60 mg/dL - fator protetor cardiovascular")
            else:
                resultados.append(f"HDL-colesterol normal ({hdl} mg/dL)")
        
        if 'TG' in dados:
            tg = dados['TG']  # Triglycerides
            
            if not jejum:
                resultados.append("Observação: Valores de triglicerídeos não-jejum devem ser interpretados com cautela")
            
            if tg >= 500:
                resultados.append(f"Triglicerídeos muito elevados ({tg} mg/dL)")
                resultados.append("TG ≥500 mg/dL - risco de pancreatite, considerar tratamento específico")
            elif tg >= 200:
                resultados.append(f"Hipertrigliceridemia ({tg} mg/dL)")
                resultados.append("TG 200-499 mg/dL - associado a síndrome metabólica e resistência insulínica")
            elif tg >= 150:
                resultados.append(f"Triglicerídeos limítrofes ({tg} mg/dL)")
                resultados.append("TG 150-199 mg/dL - limite superior, associado a risco cardiovascular aumentado")
            else:
                resultados.append(f"Triglicerídeos normais ({tg} mg/dL)")
        
        # Calculate non-HDL cholesterol if both total cholesterol and HDL are available
        if 'CT' in dados and 'HDL' in dados:
            ct = dados['CT']
            hdl = dados['HDL']
            non_hdl = ct - hdl
            
            resultados.append(f"Colesterol não-HDL: {non_hdl} mg/dL")
            if non_hdl >= 190:
                resultados.append("Colesterol não-HDL ≥190 mg/dL - risco cardiovascular muito alto")
            elif non_hdl >= 160:
                resultados.append("Colesterol não-HDL 160-189 mg/dL - risco cardiovascular alto")
            elif non_hdl >= 130:
                resultados.append("Colesterol não-HDL 130-159 mg/dL - risco cardiovascular moderado")
    
    # Assess for metabolic syndrome if multiple parameters are available
    if ('Glicose' in dados and dados['Glicose'] >= 100 and 
            (('HDL' in dados and ((sexo == 'M' and dados['HDL'] < 40) or (sexo == 'F' and dados['HDL'] < 50))) or
             ('TG' in dados and dados['TG'] >= 150))):
        # If we have at least 2 components of metabolic syndrome, add a note
        resultados.append("Observação: Presença de múltiplas alterações metabólicas - considerar avaliação para síndrome metabólica")
        resultados.append("(Diagnóstico requer 3+ de: glicemia jejum ≥100, HDL baixo, TG ≥150, HAS, obesidade abdominal)")
    
    # Analyze thyroid function (if available)
    if 'TSH' in dados or 'T4L' in dados:
        resultados.append("== Função Tireoidiana ==")
        
        if 'TSH' in dados:
            tsh = dados['TSH']
            tsh_min, tsh_max = REFERENCE_RANGES['TSH']
            
            if tsh < tsh_min:
                resultados.append(f"TSH reduzido ({tsh} µUI/mL)")
                if tsh < 0.1:
                    resultados.append("TSH suprimido (<0.1 µUI/mL) - sugere hipertireoidismo significativo")
                else:
                    resultados.append("TSH discretamente reduzido - pode indicar hipertireoidismo subclínico ou uso de levotiroxina em excesso")
            elif tsh > tsh_max:
                resultados.append(f"TSH elevado ({tsh} µUI/mL)")
                if tsh > 10:
                    resultados.append("TSH >10 µUI/mL - sugere hipotireoidismo significativo")
                else:
                    resultados.append("TSH discretamente elevado - pode indicar hipotireoidismo subclínico")
            else:
                resultados.append(f"TSH normal ({tsh} µUI/mL)")
        
        if 'T4L' in dados:
            t4l = dados['T4L']
            t4l_min, t4l_max = REFERENCE_RANGES['T4L']
            
            if t4l < t4l_min:
                resultados.append(f"T4 livre reduzido ({t4l} ng/dL)")
                if 'TSH' in dados and dados['TSH'] > tsh_max:
                    resultados.append("Padrão compatível com hipotireoidismo primário (↑TSH, ↓T4L)")
                elif 'TSH' in dados and dados['TSH'] < tsh_min:
                    resultados.append("Padrão compatível com hipotireoidismo central (↓TSH, ↓T4L) - avaliar função hipofisária")
            elif t4l > t4l_max:
                resultados.append(f"T4 livre elevado ({t4l} ng/dL)")
                if 'TSH' in dados and dados['TSH'] < tsh_min:
                    resultados.append("Padrão compatível com hipertireoidismo primário (↓TSH, ↑T4L)")
                elif 'TSH' in dados and dados['TSH'] > tsh_max:
                    resultados.append("Padrão discordante (↑TSH, ↑T4L) - considerar resistência a hormônios tireoidianos, síndrome do doente eutireoidiano ou interferência laboratorial")
            else:
                resultados.append(f"T4 livre normal ({t4l} ng/dL)")
                if 'TSH' in dados and dados['TSH'] > tsh_max:
                    resultados.append("Padrão compatível com hipotireoidismo subclínico (↑TSH, T4L normal)")
                elif 'TSH' in dados and dados['TSH'] < tsh_min:
                    resultados.append("Padrão compatível com hipertireoidismo subclínico (↓TSH, T4L normal)")
    
    return resultados 