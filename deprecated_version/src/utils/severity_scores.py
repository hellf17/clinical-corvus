"""
Severity score calculation module for ICU patients.

This module implements evidence-based severity scoring systems used in critical care:
1. SOFA (Sequential Organ Failure Assessment)
2. APACHE II (Acute Physiology and Chronic Health Evaluation II)
3. SAPS 3 (Simplified Acute Physiology Score 3)
4. qSOFA (Quick SOFA) for sepsis screening
"""

def calcular_sofa(parametros):
    """
    Calculate SOFA (Sequential Organ Failure Assessment) score.
    
    The SOFA score assesses the severity of organ dysfunction across 6 systems:
    - Respiratory (PaO2/FiO2)
    - Coagulation (Platelets)
    - Liver (Bilirubin)
    - Cardiovascular (Mean arterial pressure or vasopressors)
    - CNS (Glasgow Coma Scale)
    - Renal (Creatinine or urine output)
    
    Args:
        parametros: Dictionary with patient parameters:
            - 'pao2': PaO2 in mmHg
            - 'fio2': FiO2 as a decimal (0.21 to 1.0)
            - 'plaquetas': Platelet count in 10^3/µL
            - 'bilirrubina': Total bilirubin in mg/dL
            - 'pad': Diastolic blood pressure in mmHg
            - 'pas': Systolic blood pressure in mmHg
            - 'aminas': Whether vasopressors are being used (boolean)
            - 'dopamina': Dopamine dose in µg/kg/min
            - 'dobutamina': Dobutamine use (boolean)
            - 'noradrenalina': Norepinephrine dose in µg/kg/min
            - 'adrenalina': Epinephrine dose in µg/kg/min
            - 'glasgow': Glasgow Coma Scale (3-15)
            - 'creatinina': Creatinine in mg/dL
            - 'diurese': Urine output in mL/day
    
    Returns:
        tuple: (sofa_score, component_scores, interpretation)
    """
    scores = {
        'respiratorio': 0,
        'coagulacao': 0,
        'hepatico': 0,
        'cardiovascular': 0,
        'neurologico': 0,
        'renal': 0
    }
    
    # Respiratory score (PaO2/FiO2 ratio)
    if 'pao2' in parametros and 'fio2' in parametros:
        pao2 = parametros['pao2']
        fio2 = parametros['fio2']
        
        # Ensure FiO2 is in decimal format
        if fio2 > 1:
            fio2 = fio2 / 100
        
        if fio2 > 0:
            ratio = pao2 / fio2
            
            if ratio < 100:
                scores['respiratorio'] = 4
            elif ratio < 200:
                scores['respiratorio'] = 3
            elif ratio < 300:
                scores['respiratorio'] = 2
            elif ratio < 400:
                scores['respiratorio'] = 1
    
    # Coagulation score (Platelets)
    if 'plaquetas' in parametros:
        plaq = parametros['plaquetas']
        
        if plaq < 20:
            scores['coagulacao'] = 4
        elif plaq < 50:
            scores['coagulacao'] = 3
        elif plaq < 100:
            scores['coagulacao'] = 2
        elif plaq < 150:
            scores['coagulacao'] = 1
    
    # Liver score (Bilirubin)
    if 'bilirrubina' in parametros:
        bili = parametros['bilirrubina']
        
        if bili >= 12.0:
            scores['hepatico'] = 4
        elif bili >= 6.0:
            scores['hepatico'] = 3
        elif bili >= 2.0:
            scores['hepatico'] = 2
        elif bili >= 1.2:
            scores['hepatico'] = 1
    
    # Cardiovascular score (Hypotension or vasopressors)
    if 'aminas' in parametros and parametros['aminas']:
        # If using vasopressors, score depends on the agent and dose
        if 'noradrenalina' in parametros and parametros['noradrenalina'] > 0:
            if parametros['noradrenalina'] > 0.1:
                scores['cardiovascular'] = 4
            else:
                scores['cardiovascular'] = 3
        elif 'adrenalina' in parametros and parametros['adrenalina'] > 0:
            if parametros['adrenalina'] > 0.1:
                scores['cardiovascular'] = 4
            else:
                scores['cardiovascular'] = 3
        elif 'dopamina' in parametros and parametros['dopamina'] > 0:
            if parametros['dopamina'] > 15:
                scores['cardiovascular'] = 4
            elif parametros['dopamina'] > 5:
                scores['cardiovascular'] = 3
            else:
                scores['cardiovascular'] = 2
        elif 'dobutamina' in parametros and parametros['dobutamina']:
            scores['cardiovascular'] = 2
    elif 'pad' in parametros and 'pas' in parametros:
        # Calculate MAP if no vasopressors
        map_value = parametros['pad'] + (parametros['pas'] - parametros['pad']) / 3
        
        if map_value < 70:
            scores['cardiovascular'] = 1
    
    # Neurological score (Glasgow Coma Scale)
    if 'glasgow' in parametros:
        glasgow = parametros['glasgow']
        
        if glasgow < 6:
            scores['neurologico'] = 4
        elif glasgow < 10:
            scores['neurologico'] = 3
        elif glasgow < 13:
            scores['neurologico'] = 2
        elif glasgow < 15:
            scores['neurologico'] = 1
    
    # Renal score (Creatinine or urine output)
    if 'creatinina' in parametros:
        creat = parametros['creatinina']
        
        if creat >= 5.0:
            scores['renal'] = 4
        elif creat >= 3.5:
            scores['renal'] = 3
        elif creat >= 2.0:
            scores['renal'] = 2
        elif creat >= 1.2:
            scores['renal'] = 1
    
    # Override with urine output if it gives a higher score
    if 'diurese' in parametros:
        diurese = parametros['diurese']
        
        if diurese < 200:
            renal_score_by_diurese = 4
        elif diurese < 500:
            renal_score_by_diurese = 3
        else:
            renal_score_by_diurese = 0
        
        if renal_score_by_diurese > scores['renal']:
            scores['renal'] = renal_score_by_diurese
    
    # Calculate total SOFA score
    total_score = sum(scores.values())
    
    # Prepare interpretation
    interpretacao = []
    if total_score > 11:
        interpretacao.append(f"SOFA score {total_score} - Disfunção orgânica grave, mortalidade estimada >50%")
    elif total_score > 8:
        interpretacao.append(f"SOFA score {total_score} - Disfunção orgânica importante, mortalidade estimada 20-50%")
    elif total_score > 5:
        interpretacao.append(f"SOFA score {total_score} - Disfunção orgânica moderada, monitorizar de perto")
    elif total_score > 2:
        interpretacao.append(f"SOFA score {total_score} - Disfunção orgânica leve")
    else:
        interpretacao.append(f"SOFA score {total_score} - Disfunção orgânica mínima ou ausente")
    
    # Add details about individual system scores
    for system, score in scores.items():
        if score > 0:
            system_names = {
                'respiratorio': 'Respiratório',
                'coagulacao': 'Coagulação',
                'hepatico': 'Hepático',
                'cardiovascular': 'Cardiovascular',
                'neurologico': 'Neurológico',
                'renal': 'Renal'
            }
            interpretacao.append(f"{system_names[system]}: {score}")
    
    return total_score, scores, interpretacao

def calcular_qsofa(parametros):
    """
    Calculate qSOFA (Quick SOFA) score for rapid bedside assessment.
    
    The qSOFA score includes 3 criteria:
    - Altered mental status (GCS < 15)
    - Respiratory rate ≥ 22 breaths/min
    - Systolic blood pressure ≤ 100 mmHg
    
    Args:
        parametros: Dictionary with patient parameters:
            - 'glasgow': Glasgow Coma Scale (3-15)
            - 'fr': Respiratory rate (breaths/min)
            - 'pas': Systolic blood pressure (mmHg)
    
    Returns:
        tuple: (qsofa_score, interpretation)
    """
    score = 0
    components = []
    
    # Mental status (GCS < 15)
    if 'glasgow' in parametros and parametros['glasgow'] < 15:
        score += 1
        components.append("Alteração do estado mental (GCS < 15)")
    
    # Respiratory rate ≥ 22
    if 'fr' in parametros and parametros['fr'] >= 22:
        score += 1
        components.append("Frequência respiratória elevada (≥ 22 irpm)")
    
    # Systolic BP ≤ 100
    if 'pas' in parametros and parametros['pas'] <= 100:
        score += 1
        components.append("Pressão arterial sistólica baixa (≤ 100 mmHg)")
    
    # Interpretation
    interpretacao = []
    if score >= 2:
        interpretacao.append(f"qSOFA score {score} - Risco aumentado de desfecho desfavorável em paciente com suspeita de infecção")
        interpretacao.append("Considerar avaliação para sepse, incluindo cálculo do SOFA completo")
    else:
        interpretacao.append(f"qSOFA score {score} - Baixo risco de desfecho desfavorável")
    
    if components:
        interpretacao.append("Componentes positivos: " + ", ".join(components))
    
    return score, interpretacao

def calcular_apache2(parametros):
    """
    Calculate APACHE II (Acute Physiology and Chronic Health Evaluation II) score.
    
    APACHE II score includes:
    - 12 physiological measurements (temperature, MAP, heart rate, etc.)
    - Age points
    - Chronic health points
    
    Args:
        parametros: Dictionary with patient parameters:
            - 'temp': Temperature in °C
            - 'pad': Diastolic blood pressure in mmHg
            - 'pas': Systolic blood pressure in mmHg
            - 'fc': Heart rate in beats/min
            - 'fr': Respiratory rate in breaths/min
            - 'pao2': PaO2 in mmHg
            - 'fio2': FiO2 as a decimal (0.21 to 1.0)
            - 'ph': Arterial pH
            - 'na': Serum sodium in mEq/L
            - 'k': Serum potassium in mEq/L
            - 'creatinina': Serum creatinine in mg/dL
            - 'ht': Hematocrit in %
            - 'leuco': White blood cell count in 10^3/µL
            - 'glasgow': Glasgow Coma Scale (3-15)
            - 'idade': Age in years
            - 'doenca_cronica': Presence of chronic health issues (boolean)
            - 'cirurgia_eletiva': Whether patient had elective surgery (boolean)
            - 'tipo_internacao': Type of admission ('clinica', 'cirurgica_eletiva', 'cirurgica_urgencia')
    
    Returns:
        tuple: (apache_score, point_breakdown, mortality, interpretation)
    """
    pontos = {
        'temperatura': 0,
        'pad_media': 0,
        'fc': 0,
        'fr': 0,
        'oxigenacao': 0,
        'ph': 0,
        'na': 0,
        'k': 0,
        'creatinina': 0,
        'ht': 0,
        'leuco': 0,
        'glasgow': 0,
        'idade': 0,
        'doenca_cronica': 0
    }
    
    # Temperature
    if 'temp' in parametros:
        temp = parametros['temp']
        if temp >= 41 or temp < 30:
            pontos['temperatura'] = 4
        elif temp >= 39 or temp < 32:
            pontos['temperatura'] = 3
        elif temp >= 38.5 or temp < 34:
            pontos['temperatura'] = 1
        elif 36 <= temp <= 38.4:
            pontos['temperatura'] = 0
        else:
            pontos['temperatura'] = 2
    
    # Mean Arterial Pressure
    if 'pad' in parametros and 'pas' in parametros:
        pad = parametros['pad']
        pas = parametros['pas']
        map_value = pad + (pas - pad) / 3
        
        if map_value >= 160 or map_value < 50:
            pontos['pad_media'] = 4
        elif map_value >= 130 or map_value < 70:
            pontos['pad_media'] = 2
        elif map_value >= 110 or map_value < 70:
            pontos['pad_media'] = 1
        else:
            pontos['pad_media'] = 0
    
    # Heart Rate
    if 'fc' in parametros:
        fc = parametros['fc']
        if fc >= 180 or fc < 40:
            pontos['fc'] = 4
        elif fc >= 140 or fc < 55:
            pontos['fc'] = 3
        elif fc >= 110 or fc < 70:
            pontos['fc'] = 2
        else:
            pontos['fc'] = 0
    
    # Respiratory Rate
    if 'fr' in parametros:
        fr = parametros['fr']
        if fr >= 50 or fr < 6:
            pontos['fr'] = 4
        elif fr >= 35:
            pontos['fr'] = 3
        elif fr >= 25 or fr < 12:
            pontos['fr'] = 1
        else:
            pontos['fr'] = 0
    
    # Oxygenation
    if 'pao2' in parametros and 'fio2' in parametros:
        pao2 = parametros['pao2']
        fio2 = parametros['fio2']
        
        # Ensure FiO2 is in decimal format
        if fio2 > 1:
            fio2 = fio2 / 100
        
        # If FiO2 >= 0.5, use A-a gradient
        if fio2 >= 0.5:
            # A-a gradient calculation
            paco2 = parametros.get('pco2', 40)  # Assume 40 if not provided
            a_a_gradient = (713 * fio2 - paco2/0.8) - pao2
            
            if a_a_gradient >= 500:
                pontos['oxigenacao'] = 4
            elif a_a_gradient >= 350:
                pontos['oxigenacao'] = 3
            elif a_a_gradient >= 200:
                pontos['oxigenacao'] = 2
            else:
                pontos['oxigenacao'] = 0
        else:
            # Use PaO2 directly
            if pao2 < 55:
                pontos['oxigenacao'] = 4
            elif pao2 < 60:
                pontos['oxigenacao'] = 3
            elif pao2 < 70:
                pontos['oxigenacao'] = 1
            else:
                pontos['oxigenacao'] = 0
    
    # Arterial pH
    if 'ph' in parametros:
        ph = parametros['ph']
        if ph >= 7.7 or ph < 7.15:
            pontos['ph'] = 4
        elif ph >= 7.6 or ph < 7.25:
            pontos['ph'] = 3
        elif ph >= 7.5 or ph < 7.33:
            pontos['ph'] = 1
        else:
            pontos['ph'] = 0
    
    # Serum Sodium
    if 'na' in parametros:
        na = parametros['na']
        if na >= 180 or na < 110:
            pontos['na'] = 4
        elif na >= 160 or na < 120:
            pontos['na'] = 3
        elif na >= 155 or na < 130:
            pontos['na'] = 1
        else:
            pontos['na'] = 0
    
    # Serum Potassium
    if 'k' in parametros:
        k = parametros['k']
        if k >= 7 or k < 2.5:
            pontos['k'] = 4
        elif k >= 6 or k < 3:
            pontos['k'] = 3
        elif k >= 5.5 or k < 3.5:
            pontos['k'] = 1
        else:
            pontos['k'] = 0
    
    # Creatinine (points doubled if acute renal failure)
    if 'creatinina' in parametros:
        creatinina = parametros['creatinina']
        ira = parametros.get('insuficiencia_renal_aguda', False)
        
        if creatinina >= 3.5:
            pontos['creatinina'] = 4
        elif creatinina >= 2:
            pontos['creatinina'] = 3
        elif creatinina >= 1.5:
            pontos['creatinina'] = 2
        elif creatinina < 0.6:
            pontos['creatinina'] = 2
        else:
            pontos['creatinina'] = 0
            
        if ira:
            pontos['creatinina'] *= 2
    
    # Hematocrit
    if 'ht' in parametros:
        ht = parametros['ht']
        if ht >= 60 or ht < 20:
            pontos['ht'] = 4
        elif ht >= 50 or ht < 30:
            pontos['ht'] = 2
        elif 45.9 <= ht <= 49.9 or 30 <= ht <= 45.9:
            pontos['ht'] = 1
        else:
            pontos['ht'] = 0
    
    # White Blood Cell Count
    if 'leuco' in parametros:
        leuco = parametros['leuco'] / 1000  # Convert to 10^3/μL
        if leuco >= 40 or leuco < 1:
            pontos['leuco'] = 4
        elif leuco >= 20 or leuco < 3:
            pontos['leuco'] = 2
        elif 15 <= leuco < 20:
            pontos['leuco'] = 1
        else:
            pontos['leuco'] = 0
    
    # Glasgow Coma Scale
    if 'glasgow' in parametros:
        glasgow = parametros['glasgow']
        pontos['glasgow'] = 15 - glasgow
    
    # Age Points
    if 'idade' in parametros:
        idade = parametros['idade']
        if idade >= 75:
            pontos['idade'] = 6
        elif idade >= 65:
            pontos['idade'] = 5
        elif idade >= 55:
            pontos['idade'] = 3
        elif idade >= 45:
            pontos['idade'] = 2
        else:
            pontos['idade'] = 0
    
    # Chronic Health Points
    if 'doenca_cronica' in parametros and parametros['doenca_cronica']:
        if 'tipo_internacao' in parametros:
            if parametros['tipo_internacao'] == 'clinica' or parametros['tipo_internacao'] == 'cirurgica_urgencia':
                pontos['doenca_cronica'] = 5
            else:  # Elective surgery
                pontos['doenca_cronica'] = 2
    
    # Calculate total APACHE II score
    total_apache = sum(pontos.values())
    
    # Estimate mortality based on APACHE II score
    mortality_table = {
        0: 0.04, 1: 0.04, 2: 0.04, 3: 0.04, 4: 0.04,
        5: 0.06, 6: 0.06, 7: 0.06, 8: 0.06,
        9: 0.08, 10: 0.08, 11: 0.08, 12: 0.08,
        13: 0.10, 14: 0.15, 15: 0.15,
        16: 0.20, 17: 0.20, 18: 0.20, 19: 0.20,
        20: 0.30, 21: 0.30, 22: 0.30, 23: 0.30, 24: 0.30,
        25: 0.40, 26: 0.40, 27: 0.40, 28: 0.40, 29: 0.40,
        30: 0.50, 31: 0.55, 32: 0.55, 33: 0.55, 34: 0.60,
        35: 0.65, 36: 0.65, 37: 0.65, 38: 0.65, 39: 0.70,
        40: 0.75, 41: 0.80, 42: 0.80, 43: 0.80, 44: 0.85,
        45: 0.85
    }
    
    # Cap at 45 for mortality calculation
    mortality_index = min(total_apache, 45)
    mortality_rate = mortality_table.get(mortality_index, 0.85)  # Default to 85% for very high scores
    
    # Prepare interpretation
    interpretacao = []
    
    if total_apache >= 35:
        interpretacao.append(f"APACHE II score {total_apache} - Prognóstico muito grave (mortalidade hospitalar estimada: {mortality_rate*100:.1f}%)")
    elif total_apache >= 25:
        interpretacao.append(f"APACHE II score {total_apache} - Prognóstico grave (mortalidade hospitalar estimada: {mortality_rate*100:.1f}%)")
    elif total_apache >= 15:
        interpretacao.append(f"APACHE II score {total_apache} - Prognóstico moderado a grave (mortalidade hospitalar estimada: {mortality_rate*100:.1f}%)")
    elif total_apache >= 8:
        interpretacao.append(f"APACHE II score {total_apache} - Prognóstico leve a moderado (mortalidade hospitalar estimada: {mortality_rate*100:.1f}%)")
    else:
        interpretacao.append(f"APACHE II score {total_apache} - Bom prognóstico (mortalidade hospitalar estimada: {mortality_rate*100:.1f}%)")
    
    # Add details about major points contributors
    major_contributors = sorted([(k, v) for k, v in pontos.items() if v > 0], key=lambda x: x[1], reverse=True)[:3]
    
    if major_contributors:
        contributors_map = {
            'temperatura': 'Temperatura',
            'pad_media': 'Pressão arterial média',
            'fc': 'Frequência cardíaca',
            'fr': 'Frequência respiratória',
            'oxigenacao': 'Oxigenação',
            'ph': 'pH arterial',
            'na': 'Sódio',
            'k': 'Potássio',
            'creatinina': 'Creatinina',
            'ht': 'Hematócrito',
            'leuco': 'Leucócitos',
            'glasgow': 'Escala de Glasgow',
            'idade': 'Idade',
            'doenca_cronica': 'Doença crônica'
        }
        
        contributor_text = "Principais contribuintes: " + ", ".join([f"{contributors_map[k]} ({v} pts)" for k, v in major_contributors])
        interpretacao.append(contributor_text)
    
    return total_apache, pontos, mortality_rate, interpretacao

def calcular_saps3(parametros):
    """
    Calculate SAPS 3 (Simplified Acute Physiology Score 3).
    
    SAPS 3 evaluates severity using variables from three boxes:
    - Box I: Demographics, chronic diseases, and pre-admission status
    - Box II: Reason for ICU admission
    - Box III: Acute physiology
    
    Args:
        parametros: Dictionary with patient parameters (extensive list required)
    
    Returns:
        tuple: (saps3_score, mortality_rate, interpretation)
    """
    # This is a simplified implementation focusing on the most important components
    # A full implementation would require many more parameters
    
    pontos = 0
    
    # Box I: Demographics, chronic diseases, and pre-admission status
    if 'idade' in parametros:
        idade = parametros['idade']
        if idade < 40:
            pontos += 0
        elif idade < 60:
            pontos += 5
        elif idade < 70:
            pontos += 9
        elif idade < 75:
            pontos += 13
        elif idade < 80:
            pontos += 15
        else:
            pontos += 18
    
    if 'comorbidades' in parametros:
        comorbidades = parametros['comorbidades']
        if 'cancer' in comorbidades:
            pontos += 6 if comorbidades['cancer'] == 'metastatico' else 3
        if 'insuficiencia_cardiaca' in comorbidades and comorbidades['insuficiencia_cardiaca']:
            pontos += 6
        if 'cirrose' in comorbidades and comorbidades['cirrose']:
            pontos += 8
    
    if 'dias_previos_hospital' in parametros:
        if parametros['dias_previos_hospital'] >= 14:
            pontos += 6
    
    if 'medicacao_vasoativa' in parametros and parametros['medicacao_vasoativa']:
        pontos += 3
    
    # Box II: Reason for ICU admission
    if 'causa_internacao' in parametros:
        causa = parametros['causa_internacao']
        if causa == 'cirurgia_eletiva':
            pontos += 0
        elif causa == 'cirurgia_urgencia':
            pontos += 6
        elif causa == 'trauma':
            pontos += 7
        
    if 'infeccao' in parametros:
        infeccao = parametros['infeccao']
        if infeccao == 'nosocomial':
            pontos += 4
        elif infeccao == 'respiratoria':
            pontos += 5
    
    # Box III: Acute physiology
    if 'glasgow' in parametros:
        glasgow = parametros['glasgow']
        if glasgow < 5:
            pontos += 15
        elif glasgow < 8:
            pontos += 10
        elif glasgow < 10:
            pontos += 6
        elif glasgow < 13:
            pontos += 4
        elif glasgow < 15:
            pontos += 2
    
    if 'plaquetas' in parametros:
        plaq = parametros['plaquetas']
        if plaq < 20:
            pontos += 13
        elif plaq < 50:
            pontos += 8
        elif plaq < 100:
            pontos += 5
    
    if 'bilirrubina' in parametros:
        bili = parametros['bilirrubina']
        if bili >= 6.0:
            pontos += 6
        elif bili >= 2.0:
            pontos += 4
    
    if 'creatinina' in parametros:
        creat = parametros['creatinina']
        if creat >= 3.5:
            pontos += 7
        elif creat >= 2.0:
            pontos += 4
        elif creat >= 1.2:
            pontos += 2
    
    if 'fc' in parametros:
        fc = parametros['fc']
        if fc >= 140:
            pontos += 11
        elif fc >= 120:
            pontos += 5
        elif fc < 40:
            pontos += 11
    
    if 'pas' in parametros:
        pas = parametros['pas']
        if pas < 70:
            pontos += 10
        elif pas < 90:
            pontos += 5
        elif pas >= 200:
            pontos += 5
    
    if 'pao2' in parametros and 'fio2' in parametros:
        pao2 = parametros['pao2']
        fio2 = parametros['fio2']
        
        # Ensure FiO2 is in decimal format
        if fio2 > 1:
            fio2 = fio2 / 100
        
        ratio = pao2 / fio2
        if ratio < 100:
            pontos += 11
        elif ratio < 200:
            pontos += 9
    
    if 'ph' in parametros:
        ph = parametros['ph']
        if ph < 7.25:
            pontos += 8
    
    # Calculate mortality rate using SAPS 3 global equation
    logit = -32.6659 + 0.1101 * pontos
    mortality_rate = 1 / (1 + (2.7182818284 ** -logit))
    
    # Prepare interpretation
    interpretacao = []
    
    if pontos >= 70:
        interpretacao.append(f"SAPS 3 score {pontos} - Prognóstico muito grave (mortalidade hospitalar estimada: {mortality_rate*100:.1f}%)")
    elif pontos >= 50:
        interpretacao.append(f"SAPS 3 score {pontos} - Prognóstico grave (mortalidade hospitalar estimada: {mortality_rate*100:.1f}%)")
    elif pontos >= 40:
        interpretacao.append(f"SAPS 3 score {pontos} - Prognóstico moderado (mortalidade hospitalar estimada: {mortality_rate*100:.1f}%)")
    else:
        interpretacao.append(f"SAPS 3 score {pontos} - Prognóstico favorável (mortalidade hospitalar estimada: {mortality_rate*100:.1f}%)")
    
    return pontos, mortality_rate, interpretacao 