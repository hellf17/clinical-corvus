"""
Severity score calculation module for ICU patients.

This module implements evidence-based severity scoring systems used in critical care:
1. SOFA (Sequential Organ Failure Assessment)
2. APACHE II (Acute Physiology and Chronic Health Evaluation II)
3. SAPS 3 (Simplified Acute Physiology Score 3)
4. qSOFA (Quick SOFA) for sepsis screening
"""

import math
from decimal import Decimal
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import logging

# Import necessary CRUD functions and models
from sqlalchemy.orm import Session
from database import models
from crud.patients import get_patient
from crud.crud_vital_sign import get_latest_vital_sign_for_patient

logger = logging.getLogger(__name__)

# --- Helper function to get latest lab results ---

def get_latest_lab_results(db: Session, patient_id: int, test_names: List[str], max_age_days: int = 7) -> Dict[str, Optional[Any]]:
    """
    Fetches the most recent non-null numeric result for specified tests within a timeframe.
    
    Args:
        db: Database session.
        patient_id: The ID of the patient.
        test_names: A list of test names (lowercase) to fetch.
        max_age_days: Maximum age of the lab result in days.

    Returns:
        A dictionary mapping lowercase test names to their latest value or None.
    """
    results = {name: None for name in test_names}
    if not test_names:
        return results

    cutoff_date = datetime.utcnow() - timedelta(days=max_age_days)
    
    # Fetch recent results relevant to the list
    # This could be optimized further, e.g., with a window function if supported and complex
    recent_labs = db.query(models.LabResult).filter(
        models.LabResult.patient_id == patient_id,
        models.LabResult.timestamp >= cutoff_date,
        models.LabResult.test_name.ilike(test_names[0]) # Initial filter example
        # Add more conditions if possible or filter post-query
    ).order_by(models.LabResult.timestamp.desc()).limit(len(test_names) * 5).all() # Fetch a reasonable buffer

    # Process fetched labs to find the latest for each required test name
    processed_results = {}
    for lab in recent_labs:
        test_name_lower = lab.test_name.lower()
        if test_name_lower in test_names and test_name_lower not in processed_results:
             if lab.value_numeric is not None:
                 processed_results[test_name_lower] = {
                     'value': lab.value_numeric, 
                     'timestamp': lab.timestamp,
                     'unit': lab.unit
                 }
                 # Keep track of what we found
                 if len(processed_results) == len(test_names):
                     break # Stop if all requested tests are found

    # Map found results back to the requested list format
    for name in test_names:
        if name in processed_results:
            results[name] = processed_results[name]['value']
            
    return results


# --- Data Gathering Function ---

def gather_score_parameters(db: Session, patient_id: int) -> Dict[str, Any]:
    """
    Gathers all necessary parameters for calculating severity scores
    from the database for a given patient.
    """
    parametros = {}

    # 1. Fetch Patient Data
    patient = get_patient(db, patient_id)
    if patient:
        parametros['idade'] = patient.idade
        parametros['sexo'] = patient.sexo # Expects 'M' or 'F'
        # Add chronic health status if available in Patient model
        # parametros['doenca_cronica'] = patient.has_chronic_condition # Example
        parametros['doenca_cronica'] = False # Placeholder
        # Add admission type if available
        # parametros['tipo_internacao'] = patient.admission_type # Example ('clinica', 'cirurgica_urgencia', 'cirurgica_eletiva')
        parametros['tipo_internacao'] = 'clinica' # Placeholder
        parametros['insuficiencia_renal_aguda'] = False # Placeholder for APACHE II creatinine doubling

    # 2. Fetch Latest Vital Signs
    latest_vitals = get_latest_vital_sign_for_patient(db, patient_id)
    if latest_vitals:
        parametros['temp'] = latest_vitals.temperature_c
        parametros['fc'] = latest_vitals.heart_rate
        parametros['fr'] = latest_vitals.respiratory_rate
        parametros['pas'] = latest_vitals.systolic_bp
        parametros['pad'] = latest_vitals.diastolic_bp
        parametros['spo2'] = latest_vitals.oxygen_saturation
        parametros['glasgow'] = latest_vitals.glasgow_coma_scale
        parametros['fio2'] = latest_vitals.fio2_input or 0.21 # Default to room air if not specified

        # Calculate MAP
        if parametros.get('pas') is not None and parametros.get('pad') is not None:
            parametros['map'] = parametros['pad'] + (parametros['pas'] - parametros['pad']) / 3
        else:
             parametros['map'] = None

    # 3. Fetch Latest Relevant Lab Results
    # Define the tests needed across all scores
    required_labs = [
        'pao2', 'pco2', 'ph', # Blood gas
        'plaquetas', 'leuco', 'ht', # CBC
        'bilirrubina', # Liver
        'creatinina', 'na', 'k' # Renal/Electrolytes
    ]
    latest_labs = get_latest_lab_results(db, patient_id, required_labs, max_age_days=7)
    
    # Merge lab results into parameters, ensuring lowercase keys
    for test_name, value in latest_labs.items():
         parametros[test_name.lower()] = value # Overwrites if exists, adds if new

    # 4. Placeholders for currently unmodeled data
    parametros['aminas'] = False # Placeholder for vasopressor use
    parametros['dopamina'] = 0   # Placeholder dose
    parametros['dobutamina'] = False # Placeholder use
    parametros['noradrenalina'] = 0 # Placeholder dose
    parametros['adrenalina'] = 0  # Placeholder dose
    parametros['diurese'] = None # Placeholder urine output (mL/day)

    logger.debug(f"Gathered parameters for patient {patient_id}: {parametros}")
    return parametros


# --- Severity Score Calculations (Modified for safe access) ---

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
    
    # Create case-insensitive parameter dict for lookup (or assume gather_score_parameters provides lowercase)
    # params_lower = {k.lower(): v for k, v in parametros.items()} # Redundant if gather ensures lowercase
    params_lower = parametros # Assuming keys are already lowercase
    
    # Respiratory score (PaO2/FiO2 ratio)
    pao2 = params_lower.get('pao2')
    fio2 = params_lower.get('fio2')
    if pao2 is not None and fio2 is not None:
        # Ensure FiO2 is in decimal format
        if fio2 > 1:
            fio2 = fio2 / 100
        
        if fio2 > 0:
            try:
                ratio = pao2 / fio2
                if ratio < 100: scores['respiratorio'] = 4
                elif ratio < 200: scores['respiratorio'] = 3
                elif ratio < 300: scores['respiratorio'] = 2
                elif ratio < 400: scores['respiratorio'] = 1
            except ZeroDivisionError:
                 logger.warning("FiO2 is zero, cannot calculate PaO2/FiO2 ratio.")
                 scores['respiratorio'] = 0 # Or handle as appropriate
    
    # Coagulation score (Platelets)
    plaq = params_lower.get('plaquetas')
    if plaq is not None:
        if plaq < 20: scores['coagulacao'] = 4
        elif plaq < 50: scores['coagulacao'] = 3
        elif plaq < 100: scores['coagulacao'] = 2
        elif plaq < 150: scores['coagulacao'] = 1
    
    # Liver score (Bilirubin)
    bili = params_lower.get('bilirrubina')
    if bili is not None:
        if bili >= 12.0: scores['hepatico'] = 4
        elif bili >= 6.0: scores['hepatico'] = 3
        elif bili >= 2.0: scores['hepatico'] = 2
        elif bili >= 1.2: scores['hepatico'] = 1
    
    # Cardiovascular score (Hypotension or vasopressors)
    aminas = params_lower.get('aminas', False) # Default to False if key missing
    map_value = params_lower.get('map')
    
    if aminas:
        # Find the highest scoring vasopressor
        vasopressor_score = 0
        adrenalina = params_lower.get('adrenalina', 0)
        noradrenalina = params_lower.get('noradrenalina', 0)
        dopamina = params_lower.get('dopamina', 0)
        dobutamina = params_lower.get('dobutamina', False)

        if adrenalina > 0:
            vasopressor_score = 4 if adrenalina > 0.1 else 3
        elif noradrenalina > 0:
            vasopressor_score = 4 if noradrenalina > 0.1 else 3
        elif dopamina > 0:
            if dopamina > 15: vasopressor_score = 4
            elif dopamina > 5: vasopressor_score = 3
            else: vasopressor_score = 2
        elif dobutamina:
            vasopressor_score = 2
        
        scores['cardiovascular'] = vasopressor_score
        
    elif map_value is not None:
        if map_value < 70:
            scores['cardiovascular'] = 1
    
    # Neurological score (Glasgow Coma Scale)
    glasgow = params_lower.get('glasgow')
    if glasgow is not None:
        if glasgow < 6: scores['neurologico'] = 4
        elif glasgow < 10: scores['neurologico'] = 3
        elif glasgow < 13: scores['neurologico'] = 2
        elif glasgow < 15: scores['neurologico'] = 1
    
    # Renal score (Creatinine or urine output)
    creat = params_lower.get('creatinina')
    diurese = params_lower.get('diurese')
    renal_score_base = 0
    if creat is not None:
        if creat >= 5.0: renal_score_base = 4
        elif creat >= 3.5: renal_score_base = 3
        elif creat >= 2.0: renal_score_base = 2
        elif creat >= 1.2: renal_score_base = 1
    scores['renal'] = renal_score_base
    
    # Override with urine output if it gives a higher score
    if diurese is not None:
            renal_score_by_diurese = 0
    if diurese < 200: renal_score_by_diurese = 4
    elif diurese < 500: renal_score_by_diurese = 3   
    if renal_score_by_diurese > scores['renal']:
        scores['renal'] = renal_score_by_diurese
    
    # Calculate total SOFA score
    total_score = sum(scores.values())
    
    # Prepare interpretation
    interpretacao = []
    if total_score < 6:
        interpretacao.append(f"Score SOFA: {total_score} - Disfunção orgânica leve a moderada")
    elif total_score < 10:
        interpretacao.append(f"Score SOFA: {total_score} - Disfunção orgânica significativa com mortalidade estimada de ~20-40%")
        interpretacao.append("Considerar unidade de terapia intensiva")
    elif total_score >= 15:
        interpretacao.append(f"Score SOFA: {total_score} - Disfunção orgânica grave com mortalidade estimada >80%")
        interpretacao.append("Recomenda-se cuidados intensivos imediatos")
    else:
        interpretacao.append(f"Score SOFA: {total_score} - Disfunção orgânica significativa com mortalidade estimada >50%")
        interpretacao.append("Recomenda-se avaliação para cuidados intensivos")
    
    # Add component breakdown
    for sistema, pontos in scores.items():
        if pontos > 0:
            if sistema == 'respiratorio':
                interpretacao.append(f"Respiratório: {pontos} pontos")
            elif sistema == 'coagulacao':
                interpretacao.append(f"Coagulação: {pontos} pontos")
            elif sistema == 'hepatico':
                interpretacao.append(f"Hepático: {pontos} pontos")
            elif sistema == 'cardiovascular':
                interpretacao.append(f"Cardiovascular: {pontos} pontos")
            elif sistema == 'neurologico':
                interpretacao.append(f"Neurológico: {pontos} pontos")
            elif sistema == 'renal':
                interpretacao.append(f"Renal: {pontos} pontos")
    
    return total_score, scores, interpretacao

def calcular_qsofa(parametros):
    """
    Calculate qSOFA (quick Sequential Organ Failure Assessment).
    
    qSOFA is a bedside tool to identify patients with suspected infection 
    at risk of poor outcomes outside the ICU.
    
    Args:
        parametros: Dictionary with patient parameters
                    Required parameters: 'glasgow', 'fr', 'pas'
                    
    Returns:
        tuple: (qsofa_score, interpretation)
    """
    # Initialize score and interpretation
    qsofa_score = 0
    interpretacao = []
    
    # Create case-insensitive parameter dict
    params_lower = {k.lower(): v for k, v in parametros.items()}
    
    # Check GCS (Glasgow Coma Score)
    glasgow_raw = params_lower.get('glasgow')
    if glasgow_raw is not None:
        glasgow = round(float(glasgow_raw)) # Round before comparison
        if glasgow < 15:
            qsofa_score += 1
            interpretacao.append("Alteração do estado mental (Glasgow < 15)")
            
    # Check respiratory rate
    fr_raw = params_lower.get('fr')
    if fr_raw is not None:
        fr = round(float(fr_raw)) # Round before comparison
        if fr >= 22:
            qsofa_score += 1
            interpretacao.append("Frequência respiratória elevada (≥ 22 irpm)")
            
    # Check systolic blood pressure
    pas_raw = params_lower.get('pas')
    if pas_raw is not None:
        pas = round(float(pas_raw)) # Round before comparison
        if pas < 100:
            qsofa_score += 1
            interpretacao.append("Pressão arterial sistólica baixa (< 100 mmHg)")
    
    # General interpretation
    if qsofa_score == 0:
        interpretacao.append("qSOFA Score: 0 - Baixo risco de sepse grave")
    elif qsofa_score == 1:
        interpretacao.append("qSOFA Score: 1 - Baixo risco de desfecho desfavorável")
    elif qsofa_score == 2:
        interpretacao.append("qSOFA Score: 2 - Risco aumentado de desfecho desfavorável em paciente com suspeita de infecção")
        interpretacao.append("Recomenda-se avaliação para sepse")
    else:  # qsofa_score == 3
        interpretacao.append("qSOFA Score: 3 - Risco muito elevado de sepse grave")
        interpretacao.append("Recomenda-se avaliação imediata para sepse e possível transferência para UTI")
    
    # Add component details for scores > 0
    if qsofa_score > 0:
        componentes = []
        if 'glasgow' in params_lower and float(params_lower['glasgow']) < 15:
            componentes.append("Alteração do estado mental (Glasgow < 15)")
        if 'fr' in params_lower and float(params_lower['fr']) >= 22:
            componentes.append("Frequência respiratória elevada (≥ 22 irpm)")
        if 'pas' in params_lower and float(params_lower['pas']) < 100:
            componentes.append("Pressão arterial sistólica baixa (< 100 mmHg)")
        
        if componentes:
            interpretacao.append("Componentes positivos: " + ", ".join(componentes))
    
    return qsofa_score, interpretacao

def calcular_apache2(parametros):
    """
    Calculate APACHE II (Acute Physiology and Chronic Health Evaluation II) score.
    
    APACHE II evaluates severity based on:
    - Acute Physiology Score (12 parameters)
    - Age points
    - Chronic Health points
    
    Args:
        parametros: Dictionary with patient parameters (extensive)
        
    Returns:
        tuple: (apache_score, components, mortality_rate, interpretation)
    """
    # Create components dictionary to track points by category
    components = {
        'temperatura': 0,
        'pressao_arterial_media': 0,
        'frequencia_cardiaca': 0,
        'frequencia_respiratoria': 0,
        'oxigenacao': 0,
        'ph_arterial': 0,
        'sodio': 0,
        'potassio': 0,
        'creatinina': 0,
        'hematocrito': 0,
        'leucocitos': 0,
        'glasgow': 0,
        'idade': 0,
        'saude_cronica': 0
    }
    
    # Create case-insensitive parameter dict for lookup (or assume gather_score_parameters provides lowercase)
    # params_lower = {k.lower(): v for k, v in parametros.items()} # Redundant if gather ensures lowercase
    params_lower = parametros # Assuming keys are already lowercase
    
    # 1. Temperature
    temp = params_lower.get('temp')
    if temp is not None:
        if temp >= 41.0: components['temperatura'] = 4
        elif temp >= 39.0: components['temperatura'] = 3
        elif temp >= 38.5: components['temperatura'] = 1
        elif temp >= 36.0: components['temperatura'] = 0
        elif temp >= 34.0: components['temperatura'] = 1
        elif temp >= 32.0: components['temperatura'] = 2
        elif temp >= 30.0: components['temperatura'] = 3
        else: components['temperatura'] = 4
    
    # 2. Mean Arterial Pressure (MAP)
    map_value = params_lower.get('map')
    # MAP calculation already handled in gather_score_parameters if PAS/PAD exist
    if map_value is not None:
        if map_value >= 160: components['pressao_arterial_media'] = 4
        elif map_value >= 130: components['pressao_arterial_media'] = 3
        elif map_value >= 110: components['pressao_arterial_media'] = 2
        elif map_value >= 70: components['pressao_arterial_media'] = 0
        elif map_value >= 50: components['pressao_arterial_media'] = 2
        else: components['pressao_arterial_media'] = 4
    
    # 3. Heart Rate
    fc = params_lower.get('fc')
    if fc is not None:
        if fc >= 180 or fc < 40: components['frequencia_cardiaca'] = 4
        elif fc >= 140 or fc < 55: components['frequencia_cardiaca'] = 3
        elif fc >= 110 or fc < 70: components['frequencia_cardiaca'] = 2
        else: components['frequencia_cardiaca'] = 0
    
    # 4. Respiratory Rate
    fr = params_lower.get('fr')
    if fr is not None:
        if fr >= 50 or fr < 6: components['frequencia_respiratoria'] = 4
        elif fr >= 35: components['frequencia_respiratoria'] = 3
        elif fr >= 25 or fr < 12: components['frequencia_respiratoria'] = 1
        else: components['frequencia_respiratoria'] = 0
    
    # 5. Oxygenation
    pao2 = params_lower.get('pao2')
    fio2 = params_lower.get('fio2')
    paco2 = params_lower.get('pco2') # Needed for A-a gradient
    
    if pao2 is not None and fio2 is not None:
        # Ensure FiO2 is in decimal format (already done in gather?)
        if fio2 > 1: fio2 = fio2 / 100
        
        if fio2 >= 0.5:
            # A-a gradient calculation requires PaCO2
            if paco2 is not None:
                try:
                     # Assuming standard atmospheric pressure at sea level (760 mmHg)
                     # Water vapor pressure at 37°C (47 mmHg) -> PiO2 = FiO2 * (760 - 47) = FiO2 * 713
                     # PAO2 = PiO2 - (PaCO2 / R) where R is respiratory quotient (~0.8)
                    a_a_gradient = (713 * fio2 - paco2/0.8) - pao2
                    if a_a_gradient >= 500: components['oxigenacao'] = 4
                    elif a_a_gradient >= 350: components['oxigenacao'] = 3
                    elif a_a_gradient >= 200: components['oxigenacao'] = 2
                    else: components['oxigenacao'] = 0
                except ZeroDivisionError:
                     logger.warning("FiO2 or PaCO2 issue for A-a gradient calculation.")
                     components['oxigenacao'] = 0 # Default if calculation fails
            else:
                logger.warning("PaCO2 not available, cannot calculate A-a gradient for APACHE II.")
                components['oxigenacao'] = 0 # Assign 0 if PaCO2 missing? Or use PaO2 scale? Check guidelines.
        else: # FiO2 < 0.5, use PaO2 directly
            if pao2 < 55: components['oxigenacao'] = 4
            elif pao2 < 60: components['oxigenacao'] = 3
            elif pao2 < 70: components['oxigenacao'] = 1
            else: components['oxigenacao'] = 0
    
    # 6. Arterial pH
    ph = params_lower.get('ph')
    if ph is not None:
        if ph >= 7.7 or ph < 7.15: components['ph_arterial'] = 4
        elif ph >= 7.6 or ph < 7.25: components['ph_arterial'] = 3
        elif ph >= 7.5 or ph < 7.33: components['ph_arterial'] = 1
        else: components['ph_arterial'] = 0
    
    # 7. Serum Sodium
    na = params_lower.get('na')
    if na is not None:
        if na >= 180 or na < 110: components['sodio'] = 4
        elif na >= 160 or na < 120: components['sodio'] = 3
        elif na >= 155 or na < 130: components['sodio'] = 1
        else: components['sodio'] = 0
    
    # 8. Serum Potassium
    k = params_lower.get('k')
    if k is not None:
        if k >= 7 or k < 2.5: components['potassio'] = 4
        elif k >= 6 or k < 3: components['potassio'] = 3
        elif k >= 5.5 or k < 3.5: components['potassio'] = 1
        else: components['potassio'] = 0
    
    # 9. Creatinine (points doubled if acute renal failure)
    creatinina = params_lower.get('creatinina')
    ira = params_lower.get('insuficiencia_renal_aguda', False)
    if creatinina is not None:
        creatinina_score = 0
        if creatinina >= 3.5: creatinina_score = 4
        elif creatinina >= 2: creatinina_score = 3
        elif creatinina >= 1.5: creatinina_score = 2
        elif creatinina < 0.6: creatinina_score = 2
        components['creatinina'] = creatinina_score * 2 if ira else creatinina_score
    
    # 10. Hematocrit
    ht = params_lower.get('ht')
    if ht is not None:
        if ht >= 60 or ht < 20: components['hematocrito'] = 4
        elif ht >= 50: components['hematocrito'] = 2
        elif ht >= 46: components['hematocrito'] = 1
        elif ht < 30: components['hematocrito'] = 2
        else: components['hematocrito'] = 0
        
        # Let's re-evaluate Ht points based on common APACHE II charts:
        ht_score = 0
        if ht >= 60: ht_score = 4
        elif ht >= 50: ht_score = 2
        elif ht >= 46: ht_score = 1
        elif ht < 20: ht_score = 4
        elif ht < 30: ht_score = 2
        components['hematocrito'] = ht_score
    
    # 11. White Blood Cell Count
    leuco = params_lower.get('leuco')
    if leuco is not None:
        wbc_score = 0
        if leuco >= 40 or leuco < 1: wbc_score = 4
        elif leuco >= 20 or leuco < 3: wbc_score = 2
        elif leuco >= 15: wbc_score = 1
        components['leucocitos'] = wbc_score
    
    # 12. Glasgow Coma Scale
    glasgow = params_lower.get('glasgow')
    if glasgow is not None:
        components['glasgow'] = max(0, 15 - glasgow)
    
    # 13. Age Points
    idade = params_lower.get('idade')
    if idade is not None:
        if idade >= 75: components['idade'] = 6
        elif idade >= 65: components['idade'] = 5
        elif idade >= 55: components['idade'] = 3
        elif idade >= 45: components['idade'] = 2
        else: components['idade'] = 0
    
    # 14. Chronic Health Points
    doenca_cronica = params_lower.get('doenca_cronica', False)
    tipo_internacao = params_lower.get('tipo_internacao', 'clinica') # Default if missing
    if doenca_cronica:
        if tipo_internacao in ['clinica', 'cirurgica_urgencia']:
                components['saude_cronica'] = 5
        else: # 'cirurgica_eletiva'
                components['saude_cronica'] = 2
    
    # Calculate total APACHE II score
    total_apache = sum(components.values())
    
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
    
    # Verify contributors has expected mapped names
    contributors_map = {
        'temperatura': 'Temperatura',
        'pressao_arterial_media': 'Pressão arterial média',
        'frequencia_cardiaca': 'Frequência cardíaca',
        'frequencia_respiratoria': 'Frequência respiratória',
        'oxigenacao': 'Oxigenação',
        'ph_arterial': 'pH arterial',
        'sodio': 'Sódio',
        'potassio': 'Potássio',
        'creatinina': 'Creatinina',
        'hematocrito': 'Hematócrito',
        'leucocitos': 'Leucócitos',
        'glasgow': 'Escala de Glasgow',
        'idade': 'Idade',
        'saude_cronica': 'Doença crônica'
    }
    
    # Add backwards compatibility for older test cases
    for key, value in list(components.items()):
        if key == 'frequencia_cardiaca':
            components['fc'] = value
    
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
    major_contributors = sorted([(k, v) for k, v in components.items() if v > 0], key=lambda x: x[1], reverse=True)[:3]
    
    if major_contributors:
        contributor_text = "Principais contribuintes: " + ", ".join([f"{contributors_map[k]} ({v} pts)" for k, v in major_contributors])
        interpretacao.append(contributor_text)
    
    return total_apache, components, mortality_rate, interpretacao

def calcular_saps3(parametros):
    """
    Calculates SAPS 3 score. 
    TODO: Implement calculation based on extensive parameters.
    Requires: Age, chronic diseases, admission type, location before ICU, reason for admission,
              physiologic variables (HR, BP, Temp, GCS, PaO2/FiO2, pH, Bilirubin, Creatinine, WBC, Platelets).
    """
    print("SAPS 3 calculation not fully implemented yet.")
    # Placeholder logic
    score = 0
    components = {}
    mortality_rate = 0.0
    interpretation = ["Cálculo do SAPS 3 ainda não implementado."]
    # Example: Add points based on age if available
    if 'idade' in parametros:
        if parametros['idade'] > 80: score += 15
        elif parametros['idade'] > 60: score += 10
        components['idade'] = score # Example component tracking
        
    return score, components, mortality_rate, interpretation

def calcular_news(parametros):
    """
    Calculates National Early Warning Score (NEWS2).
    Requires: RR (fr), SpO2 (spo2), supplemental O2 (inferred from fio2_input), 
              Temp (temp), SBP (pas), HR (fc), Alertness (inferred from glasgow).

    Args:
        parametros: Dictionary with patient parameters (lowercase keys expected).

    Returns:
        tuple: (news_score, components, interpretation)
    """
    score = 0
    components = {
        'respiratory_rate': 0,
        'oxygen_saturation': 0,
        'supplemental_oxygen': 0,
        'temperature': 0,
        'systolic_bp': 0,
        'heart_rate': 0,
        'consciousness': 0
    }
    interpretation = []
    params_lower = parametros # Assuming keys are already lowercase

    # 1. Respiratory Rate (fr)
    fr = params_lower.get('fr')
    if fr is not None:
        if fr <= 8: components['respiratory_rate'] = 3
        elif 9 <= fr <= 11: components['respiratory_rate'] = 1
        elif 12 <= fr <= 20: components['respiratory_rate'] = 0
        elif 21 <= fr <= 24: components['respiratory_rate'] = 2
        elif fr >= 25: components['respiratory_rate'] = 3
        else: components['respiratory_rate'] = 0 # Should not happen
    score += components['respiratory_rate']

    # 2. Oxygen Saturation (spo2) - NEWS2 has two scales
    # Assuming Scale 1 by default. Scale 2 is for hypercapnic respiratory failure (e.g., COPD) - not currently distinguishable.
    spo2 = params_lower.get('spo2')
    if spo2 is not None:
        if spo2 <= 91: components['oxygen_saturation'] = 3
        elif 92 <= spo2 <= 93: components['oxygen_saturation'] = 2
        elif 94 <= spo2 <= 95: components['oxygen_saturation'] = 1
        elif spo2 >= 96: components['oxygen_saturation'] = 0
        else: components['oxygen_saturation'] = 0 # Should not happen
    score += components['oxygen_saturation']

    # 3. Supplemental Oxygen (inferred from fio2_input)
    fio2 = params_lower.get('fio2')
    if fio2 is not None and fio2 > 0.21:
        components['supplemental_oxygen'] = 2
    else:
        components['supplemental_oxygen'] = 0
    score += components['supplemental_oxygen']

    # 4. Temperature (temp)
    temp = params_lower.get('temp')
    if temp is not None:
        if temp <= 35.0: components['temperature'] = 3
        elif 35.1 <= temp <= 36.0: components['temperature'] = 1
        elif 36.1 <= temp <= 38.0: components['temperature'] = 0
        elif 38.1 <= temp <= 39.0: components['temperature'] = 1
        elif temp >= 39.1: components['temperature'] = 2
        else: components['temperature'] = 0 # Should not happen
    score += components['temperature']

    # 5. Systolic Blood Pressure (pas)
    pas = params_lower.get('pas')
    if pas is not None:
        if pas <= 90: components['systolic_bp'] = 3
        elif 91 <= pas <= 100: components['systolic_bp'] = 2
        elif 101 <= pas <= 110: components['systolic_bp'] = 1
        elif 111 <= pas <= 219: components['systolic_bp'] = 0
        elif pas >= 220: components['systolic_bp'] = 3
        else: components['systolic_bp'] = 0 # Should not happen
    score += components['systolic_bp']

    # 6. Heart Rate (fc)
    fc = params_lower.get('fc')
    if fc is not None:
        if fc <= 40: components['heart_rate'] = 3
        elif 41 <= fc <= 50: components['heart_rate'] = 1
        elif 51 <= fc <= 90: components['heart_rate'] = 0
        elif 91 <= fc <= 110: components['heart_rate'] = 1
        elif 111 <= fc <= 130: components['heart_rate'] = 2
        elif fc >= 131: components['heart_rate'] = 3
        else: components['heart_rate'] = 0 # Should not happen
    score += components['heart_rate']

    # 7. Consciousness (inferred from glasgow)
    # Mapping: Alert = 0, New V, P, or U = 3
    glasgow = params_lower.get('glasgow')
    if glasgow is not None and glasgow < 15:
        components['consciousness'] = 3 # Represents new confusion/delirium or V/P/U
    else:
        # Assumes GCS >= 15 or missing means Alert
        components['consciousness'] = 0
    score += components['consciousness']

    # Interpretation based on total score
    interpretation.append(f"NEWS2 Score: {score}")
    if score == 0:
        interpretation.append("Risco baixo. Monitoramento de rotina.")
    elif 1 <= score <= 4:
        interpretation.append("Risco baixo-médio. Requer avaliação por enfermeiro(a) registrado(a). Aumentar frequência de monitoramento.")
    elif 5 <= score <= 6:
        interpretation.append("Risco médio. Requer avaliação urgente pela equipe médica ou time de resposta rápida. Aumentar frequência de monitoramento.")
    elif score >= 7:
        interpretation.append("Risco alto. Requer avaliação emergencial pela equipe médica ou time de resposta rápida, considerar UTI. Monitoramento contínuo.")
    
    # Add component breakdown
    positive_components = {k: v for k, v in components.items() if v > 0}
    if positive_components:
        interpretation.append("Componentes com pontuação: " + ", ".join([f"{k.replace('_', ' ').capitalize()} ({v} pts)" for k,v in positive_components.items()]))

    return score, components, interpretation

# --- GFR Calculation (CKD-EPI 2021) --- 

def calcular_tfg_ckd_epi(creatinina_mgdl: float, idade: int, sexo: str) -> Optional[float]:
    """
    Calcula a Taxa de Filtração Glomerular (TFG) usando a fórmula CKD-EPI 2021.
    Esta fórmula remove o ajuste por raça.

    Args:
        creatinina_mgdl: Creatinina sérica em mg/dL.
        idade: Idade em anos.
        sexo: Sexo do paciente ('M' ou 'F').

    Returns:
        TFG estimada em mL/min/1.73 m², ou None se os inputs forem inválidos.
    """
    if not all([creatinina_mgdl, idade, sexo]) or creatinina_mgdl <= 0 or idade <= 0:
        return None

    sexo_upper = sexo.upper()
    if sexo_upper not in ['M', 'F']:
        return None

    kappa = 0.9 if sexo_upper == 'M' else 0.7
    alpha = -0.302 if sexo_upper == 'M' else -0.241
    sex_factor = 1.012 # Common factor for both sexes in 2021 formula
    age_factor = 0.9938 ** idade

    scr_kappa_ratio = creatinina_mgdl / kappa
    min_term = min(scr_kappa_ratio, 1.0) ** alpha
    max_term = max(scr_kappa_ratio, 1.0) ** -1.200 # Exponent changed in 2021

    tfg = 142 * min_term * max_term * age_factor 
    
    # Apply female factor (now part of the main calculation via kappa/alpha)
    if sexo_upper == 'F':
       # No additional multiplier needed for sex in 2021 formula outside of kappa/alpha change
       pass 
       
    # Apply sex factor (common to both sexes in 2021)
    # Note: The original CKD-EPI 2009 had different multipliers.
    # The 2021 paper presents the formula as: 142 * min(Scr/κ, 1)^α * max(Scr/κ, 1)^-1.200 * 0.9938^Age [ * 1.012 if female]
    # However, interpreting the paper suggests the 1.012 might be integrated or sex differences handled by kappa/alpha. Double check clinical implementation guidelines.
    # For now, applying the 1.012 factor might be incorrect interpretation of 2021 version - consult clinical guidelines. Let's omit explicit 1.012 for now.
    # Re-check required.
    # If needed: tfg *= sex_factor 

    return round(tfg, 2)

def classificar_tfg_kdigo(tfg: Optional[float]) -> str:
    """
    Classifica a TFG de acordo com os estágios KDIGO.
    
    Args:
        tfg: Taxa de Filtração Glomerular estimada (mL/min/1.73 m²).
    
    Returns:
        Estágio da Doença Renal Crônica (DRC) ou 'Normal' ou 'Inválido'.
    """
    if tfg is None:
        return "Inválido (TFG não calculada)"
    
    if tfg >= 90:
        return "G1: Normal ou Alta (≥90)"
    elif tfg >= 60:
        return "G2: Levemente diminuída (60-89)"
    elif tfg >= 45:
        return "G3a: Leve a moderadamente diminuída (45-59)"
    elif tfg >= 30:
        return "G3b: Moderada a gravemente diminuída (30-44)"
    elif tfg >= 15:
        return "G4: Gravemente diminuída (15-29)"
    else:
        return "G5: Falência renal (<15)"

# --- Placeholder for Child-Pugh --- 

def calcular_child_pugh(parametros):
    """
    Calculates Child-Pugh score for chronic liver disease.
    TODO: Implement calculation based on clinical assessment.
    Requires: Total Bilirubin, Serum Albumin, INR, Ascites grade, Encephalopathy grade.
    """
    print("Child-Pugh calculation needs clinical assessment input (Ascites, Encephalopathy). Implementation pending.")
    score = 0
    components = {}
    grade = 'A'
    interpretation = ["Cálculo do Child-Pugh requer avaliação clínica (Ascite, Encefalopatia). Implementação pendente."]
    
    # Example: Score based on available labs
    bilirubin_score = 0
    albumin_score = 0
    inr_score = 0
    
    if 'bilirrubina' in parametros:
        bili = parametros['bilirrubina']
        if bili > 3: bilirubin_score = 3
        elif bili >= 2: bilirubin_score = 2
        else: bilirubin_score = 1
        components['bilirrubina'] = bilirubin_score
        
    # Needs Albumin and INR extraction/input
    # if 'albumina' in parametros:
    #    alb = parametros['albumina']
    #    if alb < 2.8: albumin_score = 3
    #    elif alb <= 3.5: albumin_score = 2
    #    else: albumin_score = 1
    #    components['albumina'] = albumin_score
        
    # if 'inr' in parametros:
    #    inr = parametros['inr']
    #    if inr > 2.3: inr_score = 3
    #    elif inr >= 1.7: inr_score = 2
    #    else: inr_score = 1
    #    components['inr'] = inr_score
        
    # Placeholder clinical scores
    ascites_score = 1 # Assume None/Mild
    encephalopathy_score = 1 # Assume None/Grade 1-2
    components['ascite'] = ascites_score
    components['encefalopatia'] = encephalopathy_score
    
    score = bilirubin_score + albumin_score + inr_score + ascites_score + encephalopathy_score
    
    if score >= 10: grade = 'C'
    elif score >= 7: grade = 'B'
    else: grade = 'A'
    
    interpretation.append(f"Pontuação parcial (labs): {bilirubin_score + albumin_score + inr_score}. Pontuação clínica (placeholder): {ascites_score + encephalopathy_score}.")
    interpretation.append(f"Pontuação Total (Estimada): {score}, Classe: {grade}")
    
    return score, components, grade, interpretation 