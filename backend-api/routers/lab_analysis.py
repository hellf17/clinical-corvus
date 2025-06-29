from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
import tempfile
import os
import json # Added for parsing manualLabDataJSON
from datetime import datetime

from database import get_db
from database.models import User as UserModel
from schemas.lab_analysis import (
    BloodGasResult, ElectrolyteResult, HematologyResult, ScoreResult, 
    BloodGasInput, ElectrolyteInput, HematologyInput, SofaInput, 
    QSofaInput, ApacheIIInput, FileAnalysisResult, MetabolicInput, 
    RenalInput, HepaticInput
)
from schemas.lab_result import LabResult
from schemas.alert import AlertBase

from security import get_current_user, get_current_user_required
# Importar os módulos de análise
from analyzers.blood_gases import analisar_gasometria
from analyzers.electrolytes import analisar_eletrolitos
from analyzers.renal import analisar_funcao_renal
from analyzers.hepatic import analisar_funcao_hepatica
from analyzers.hematology import analisar_hemograma
from analyzers.cardiac import analisar_marcadores_cardiacos
from analyzers.microbiology import analisar_microbiologia
from analyzers.metabolic import analisar_metabolismo
from analyzers.pancreatic import analisar_funcao_pancreatica
from analyzers.inflammatory import analisar_marcadores_inflamatorios # New import
from analyzers.coagulation import analisar_coagulacao # New import

from utils.severity_scores import calcular_sofa, calcular_qsofa, calcular_apache2
from utils.alert_system import AlertSystem
from utils.reference_ranges import REFERENCE_RANGES # <<< ADDED THIS IMPORT
# from utils.llm_client import OpenRouterClient # NO LONGER NEEDED for this endpoint
# from utils.prompts import get_dr_corvus_prompt # NO LONGER NEEDED for this endpoint

# Import the BAML client and its types
from baml_client import b # Or just 'b', depends on generated client structure
from baml_client.types import (
    LabAnalysisInput as BamLabAnalysisInput,
    LabTestResult as BamLabTestResult, # Assuming BAML generates this for list items
    UserRole as BamUserRole, # Assuming BAML generates this enum
    LabInsightsOutput as BamLabInsightsOutput # BAML's output type
)

# Import PDF extractor
from extractors.pdf_extractor import extrair_campos_pagina
# CRUD imports are NOT needed for transient analysis, only for future "save" endpoint
# from ..crud import crud_lab_result, crud_alert, crud_exam
# from ..schemas.exam import ExamCreate, ExamStatus

# Pydantic models for Dr. Corvus Insights (mirroring frontend types)
from enum import Enum
from pydantic import BaseModel, Field # Field imported for potential future use

class LabTestResultForAPI(BaseModel): # Renamed from LabTestResultForLLM
    test_name: str
    value: str
    unit: Optional[str] = None
    reference_range_low: Optional[str] = None
    reference_range_high: Optional[str] = None
    interpretation_flag: Optional[str] = None # "Normal", "Alto", "Baixo", "Crítico", "Positivo", "Negativo"
    notes: Optional[str] = None

class UserRoleForAPI(str, Enum): # Renamed from UserRoleForLLM
    PATIENT = "PATIENT"
    DOCTOR_STUDENT = "DOCTOR_STUDENT"

class LabAnalysisInputForAPI(BaseModel): # Renamed from LabAnalysisInputForLLM
    lab_results: List[LabTestResultForAPI]
    user_role: UserRoleForAPI
    patient_context: Optional[str] = None
    specific_user_query: Optional[str] = None

class LabInsightsOutputFromAPI(BaseModel): # Renamed from LabInsightsOutputFromLLM
    patient_friendly_summary: Optional[str] = None
    potential_health_implications_patient: Optional[List[str]] = None
    lifestyle_tips_patient: Optional[List[str]] = None
    questions_to_ask_doctor_patient: Optional[List[str]] = None
    key_abnormalities_professional: Optional[List[str]] = None
    potential_patterns_and_correlations: Optional[List[str]] = None
    differential_considerations_professional: Optional[List[str]] = None
    suggested_next_steps_professional: Optional[List[str]] = None
    important_results_to_discuss_with_doctor: Optional[List[str]] = None
    general_disclaimer: str
    error: Optional[str] = None

router = APIRouter()

# --- START COPIED HELPER FUNCTIONS (from backend-api/routers/files.py) --- 
# TODO: Refactor these into a shared utility module (e.g., backend-api/extractors/utils.py)

def determinar_categoria(nome_campo: str) -> str:
    """
    Determina a categoria de um exame com base no nome do campo,
    usando um mapeamento de abreviações e palavras-chave para categorias mais específicas.
    As chaves de categoria devem alinhar-se com os analisadores do backend e categorias do frontend.
    """
    nome_campo_lower = nome_campo.lower().strip()
    base_nome_campo = nome_campo_lower

    # Handle _perc and _abs suffixes for differential counts
    if base_nome_campo.endswith("_perc"):
        base_nome_campo = base_nome_campo[:-5] # Remove "_perc"
    elif base_nome_campo.endswith("_abs"):
        base_nome_campo = base_nome_campo[:-4] # Remove "_abs"

    # Mapeamento direto de abreviações comuns para nomes completos padronizados (minúsculo)
    ABBREVIATION_TO_FULL_NAME = {
        'hb': 'hemoglobina', 'hgb': 'hemoglobina',
        'ht': 'hematócrito', 'hct': 'hematócrito',
        'leuco': 'leucócitos', 'wbc': 'leucócitos',
        'plaq': 'plaquetas', 'plt': 'plaquetas',
        'segm': 'segmentados', # Parte do diferencial de leucócitos
        'bastões': 'bastonetes', # Parte do diferencial de leucócitos
        'linfocitos': 'linfócitos', # Add mapping for unaccented
        'monocitos': 'monócitos',   # Add mapping for unaccented
        'eosinofilos': 'eosinófilos',# Add mapping for unaccented
        'basofilos': 'basófilos',  # Add mapping for unaccented
        'mielocitos': 'mielócitos', # Add
        'metamielocitos': 'metamielócitos', # Add
        'ur': 'ureia',
        'creat': 'creatinina',
        'rni': 'inr',
        'bt': 'bilirrubina total',
        'bd': 'bilirrubina direta',
        'bi': 'bilirrubina indireta',
        'tgo': 'ast', 'ast/tgo': 'ast',
        'tgp': 'alt', 'alt/tgp': 'alt',
        'gamagt': 'gama gt',      # Add
        'fosfalc': 'fosfatase alcalina', # Add
        'na+': 'sódio', 'na': 'sódio',
        'k+': 'potássio', 'k': 'potássio',
        'ca++': 'cálcio', 'ca': 'cálcio',
        'ica': 'cálcio ionizado', 'cai': 'cálcio ionizado', # Added for ionized calcium
        'mg++': 'magnésio', 'mg': 'magnésio', 'mg+': 'magnésio',
        'pcr': 'proteína c reativa',
        'vhs': 'velocidade de hemossedimentação',
        'tsh': 'hormônio tireoestimulante',
        't4l': 't4 livre',
        'ckmb': 'ck-mb',
        'hba1c': 'hemoglobina glicada',
        'hco3-': 'hco3', 'bicarbonato': 'hco3',
        'pco2': 'pco2', 'paco2': 'pco2',
        'po2': 'po2', 'pao2': 'po2',
        'sao2': 'sato2', 'spo2': 'sato2', # Added spo2 mapping
        'be': 'be', # Base Excess
        'tp': 'tempo de protrombina',
        'ttpa': 'tempo de tromboplastina parcial ativada',
        'ttp': 'tempo de tromboplastina parcial ativada', # Added TTP mapping
        'dd': 'd-dímero',
        'ldh': 'desidrogenase láctica',
        # Adicionar mais conforme necessário
    }

    # Mapeamento de nomes de teste (ou palavras-chave neles) para categorias do backend/frontend
    # Usar chaves de categoria consistentes (ex: 'hematology', 'renal', etc.)
    TEST_KEYWORDS_TO_CATEGORY = {
        # Hematology
        'hemoglobina': 'hematology', 'hematócrito': 'hematology', 'leucócitos': 'hematology',
        'plaquetas': 'hematology', 'eritrócitos': 'hematology', 'vcm': 'hematology',
        'hcm': 'hematology', 'chcm': 'hematology', 'rdw': 'hematology', 'hemácias': 'hematology',
        'segmentados': 'hematology', 'bastonetes': 'hematology',
        'linfócitos': 'hematology', 'monócitos': 'hematology', 'eosinófilos': 'hematology', 'basófilos': 'hematology',
        'mielócitos': 'hematology', 'metamielócitos': 'hematology', 'mielocitos_perc': 'hematology', 'mielocitos_abs': 'hematology',
        'metamielocitos_perc': 'hematology', 'metamielocitos_abs': 'hematology',
        # Renal
        'ureia': 'renal', 'creatinina': 'renal', 'tfg': 'renal', 'ácido úrico': 'renal',
        # Hepatic
        'ast': 'hepatic', 'alt': 'hepatic', 'gama gt': 'hepatic', 'fosfatase alcalina': 'hepatic',
        'bilirrubina total': 'hepatic', 'bilirrubina direta': 'hepatic', 'bilirrubina indireta': 'hepatic',
        'albumina': 'hepatic', 'proteínas totais': 'hepatic',
        # Electrolytes
        'sódio': 'electrolytes', 'potássio': 'electrolytes', 'cloro': 'electrolytes',
        'cálcio': 'electrolytes', 'cálcio ionizado': 'electrolytes', # Added for clarity
        'magnésio': 'electrolytes', 'fósforo': 'electrolytes',
        # Blood Gas
        'ph': 'bloodGas', 'pco2': 'bloodGas', 'po2': 'bloodGas', 'hco3': 'bloodGas',
        'be': 'bloodGas', 'lactato': 'bloodGas', 'sato2': 'bloodGas', 'fio2': 'bloodGas',
        # Cardiac Markers
        'troponina': 'cardiac', 'ck': 'cardiac', 'ck-mb': 'cardiac', 'bnp': 'cardiac',
        'nt-probnp': 'cardiac', 'desidrogenase láctica': 'cardiac', # LDH also general, but strong cardiac marker
        # Metabolic
        'glicose': 'metabolic', 'hemoglobina glicada': 'metabolic', 'triglicerídeos': 'metabolic',
        'colesterol total': 'metabolic', 'hdl': 'metabolic', 'ldl': 'metabolic',
        'hormônio tireoestimulante': 'metabolic', 't4 livre': 'metabolic',
        # Inflammation
        'proteína c reativa': 'inflammation', 'procalcitonina': 'inflammation',
        'velocidade de hemossedimentação': 'inflammation', 'ferritina': 'inflammation',
        # Coagulation
        'inr': 'coagulation', 'tempo de protrombina': 'coagulation',
        'tempo de tromboplastina parcial ativada': 'coagulation', 'fibrinogênio': 'coagulation',
        'd-dímero': 'coagulation',
        # Urinalysis (distinto de renal para testes de fita/microscopia)
        'densidade': 'urinalysis', 'glicosúria': 'urinalysis', 'cetonuria': 'urinalysis',
        'nitrito': 'urinalysis', 'leucocituria': 'urinalysis', 'hematuria': 'urinalysis',
        'ph urinário': 'urinalysis',
        # Microbiology (geralmente identificados pelo nome do teste/cultura)
        'hemocultura': 'microbiology', 'urocultura': 'microbiology',
        'cultura de escarro': 'microbiology', 'cultura de secreção': 'microbiology',
        'antibiograma': 'microbiology',
        # Outros específicos
        'amilase': 'pancreatic', # Pode ser categoria própria ou dentro de 'hepatic'/'outros'
        'lipase': 'pancreatic',
    }

    # 1. Normalizar e tentar mapear abreviação para nome completo
    # Prioritize the original nome_campo_lower for ABBREVIATION_TO_FULL_NAME if it's more specific (e.g. "mielocitos_perc")
    # The base_nome_campo (suffix stripped) is useful for general keywords.
    
    # Try direct mapping with original name first (covers specific suffixed names)
    if nome_campo_lower in ABBREVIATION_TO_FULL_NAME:
        normalized_test_name = ABBREVIATION_TO_FULL_NAME[nome_campo_lower]
    else: # Fallback to base_nome_campo for broader abbreviation mapping
        normalized_test_name = ABBREVIATION_TO_FULL_NAME.get(base_nome_campo, base_nome_campo)


    # 2. Tentativa de correspondência direta com o nome normalizado ou original na lista de categorias
    if normalized_test_name in TEST_KEYWORDS_TO_CATEGORY:
        return TEST_KEYWORDS_TO_CATEGORY[normalized_test_name]
    if nome_campo_lower in TEST_KEYWORDS_TO_CATEGORY: # Check original lowercased name too
        return TEST_KEYWORDS_TO_CATEGORY[nome_campo_lower]


    # 3. Tentativa de correspondência por palavra-chave (iterar e verificar se alguma palavra-chave está no nome_campo_lower)
    #    This is more useful if the nome_campo_lower is algo como "dosagem de hemoglobina sérica"
    #    Sorted to check for longer keywords first
    for keyword in sorted(TEST_KEYWORDS_TO_CATEGORY.keys(), key=len, reverse=True):
        if keyword in nome_campo_lower: 
            return TEST_KEYWORDS_TO_CATEGORY[keyword]
    
    # Casos especiais (exemplo) - some might be redundant if covered by keyword mapping
    if "ph urinario" in nome_campo_lower or "ph urinário" in nome_campo_lower:
        return "urinalysis"
    if "cultura" in nome_campo_lower: # Captura geral para culturas não listadas
        return "microbiology"

    return "outros" # Categoria padrão

def obter_unidade(nome_campo: str) -> str:
    """
    Retorna a unidade de medida comum para o campo especificado.
    Prioritizes direct match with nome_campo_lower, then checks for inclusion (longest keys first).
    """
    unidades = {
        # Hematology - Lowercase and common abbrev
        "hb": "g/dL", "hemoglobina": "g/dL",
        "ht": "%", "hematocrito": "%", "hematócrito": "%",
        "leuco": "/mm³", "leucocitos": "/mm³", "leucócitos": "/mm³", "wbc": "/mm³",
        "plaq": "/mm³", "plaquetas": "/mm³", "plt": "/mm³",
        "eritrócitos": "milhões/µL", "rbc": "milhões/µL", "hemacias": "milhões/µL", "hemácias": "milhões/µL",
        "vcm": "fL",
        "hcm": "pg",
        "chcm": "g/dL",
        "rdw": "%",
        "retic": "%", "reticulocitos": "%", "reticulócitos": "%",
        "retic_abs": "/µL",
        # Differentials (usually %, abs might not have explicit unit in simple lists)
        "neutrophils_perc": "%", "segmentados_perc": "%", "segm": "%",
        "lymphocytes_perc": "%", "linfocitos_perc": "%", "linf": "%",
        "monocytes_perc": "%", "monocitos_perc": "%", "mono": "%",
        "eosinophils_perc": "%", "eosinofilos_perc": "%", "eosi": "%",
        "basophils_perc": "%", "basofilos_perc": "%", "baso": "%",
        "bands_perc": "%", "bastonetes_perc": "%", "bastões": "%",
        "mielocitos_perc": "%", "mielócitos_perc": "%",
        "metamielocitos_perc": "%", "metamielócitos_perc": "%",
        "neutrophils_abs": "/mm³", "segmentados_abs": "/mm³",
        "lymphocytes_abs": "/mm³", "linfocitos_abs": "/mm³",
        "monocytes_abs": "/mm³", "monocitos_abs": "/mm³",
        "eosinophils_abs": "/mm³", "eosinofilos_abs": "/mm³",
        "basophils_abs": "/mm³", "basofilos_abs": "/mm³",
        "bands_abs": "/mm³", "bastonetes_abs": "/mm³",
        "mielocitos_abs": "/mm³", "mielócitos_abs": "/mm³",
        "metamielocitos_abs": "/mm³", "metamielócitos_abs": "/mm³",

        # Renal / Electrolytes - Lowercase and common abbrev
        "ur": "mg/dL", "ureia": "mg/dL",
        "creat": "mg/dL", "creatinina": "mg/dL",
        "na": "mEq/L", "sódio": "mEq/L", "na+": "mEq/L",
        "k": "mEq/L", "potássio": "mEq/L", "k+": "mEq/L",
        "cl": "mEq/L", "cloro": "mEq/L",
        "ca": "mg/dL", "cálcio": "mg/dL", "ca++": "mg/dL",
        "ica": "mmol/L", "cálcio ionizado": "mmol/L", "cai": "mmol/L",
        "mg": "mg/dL", "magnésio": "mg/dL", "mg++": "mg/dL",
        "p": "mg/dL", "fósforo": "mg/dL",
        "egfr": "mL/min/1.73m²", "tfg": "mL/min/1.73m²",

        # Blood Gas - Lowercase and common abbrev
        "ph": "",
        "pco2": "mmHg", "paco2": "mmHg",
        "po2": "mmHg", "pao2": "mmHg",
        "hco3": "mEq/L", "hco3-": "mEq/L", "bicarbonato": "mEq/L",
        "be": "mEq/L",
        "lactato": "mmol/L", # or mg/dL depending on lab
        "sao2": "%", "sato2": "%", "spo2": "%",

        # Hepatic / Pancreatic / Coagulation / Cardiac / Metabolic / Inflammation - Lowercase and common abbrev
        "tgo": "U/L", "ast": "U/L",
        "tgp": "U/L", "alt": "U/L",
        "ggt": "U/L", "gamagt": "U/L", "gama-gt": "U/L",
        "fosfalc": "U/L", "fa": "U/L", "fosfatase alcalina": "U/L",
        "bt": "mg/dL", "bilirrubina total": "mg/dL",
        "bd": "mg/dL", "bilirrubina direta": "mg/dL",
        "bi": "mg/dL", "bilirrubina indireta": "mg/dL",
        "albumina": "g/dL",
        "rni": "", "inr": "",
        "amilase": "U/L",
        "lipase": "U/L",
        "pcr": "mg/dL", "proteína c reativa": "mg/dL",
        "glicose": "mg/dL",
        "hba1c": "%", "hemoglobina glicada": "%",
        "troponina": "ng/mL", # or pg/mL, specify type if possible (Trop I, Trop T)
        "ckmb": "U/L", "ck-mb": "U/L",
        "ck": "U/L", "cpk": "U/L",
        "ldh": "U/L",
        "tsh": "µUI/mL", "hormônio tireoestimulante": "µUI/mL",
        "t4l": "ng/dL", "t4 livre": "ng/dL",
        "vhs": "mm/h", "velocidade de hemossedimentação": "mm/h", # Added VHS unit
        "ttpa": "Segundos", "tempo de tromboplastina parcial ativada": "Segundos", # Added TTPA unit

        # Urine
        "ph urinário": "", "ph urinario": "",
        "densidade": "", "densidade urinária": "",
        # Add more as needed based on common PDF extraction keys
    }
    
    nome_campo_lower = nome_campo.lower().strip()
    
    # Prioritize direct match
    if nome_campo_lower in unidades:
        return unidades[nome_campo_lower]
    
    # Fallback: check if any key is part of nome_campo_lower (longest keys first to avoid "p" in "tgp")
    sorted_keys = sorted(unidades.keys(), key=len, reverse=True)
    for campo_key in sorted_keys:
        if len(campo_key) == 1 and campo_key != nome_campo_lower: # single letter keys must be exact match (already handled above)
            continue
        if campo_key in nome_campo_lower: # e.g. "hemoglobina" in "hemoglobina sérica"
            return unidades[campo_key]
            
    return "" # Default to empty if no unit found

def obter_valores_referencia(nome_campo: str) -> tuple:
    """
    Retorna os valores de referência para o campo especificado.
    Prioritizes direct match with nome_campo_lower, then checks for inclusion (longest keys first).
    Uses REFERENCE_RANGES from utils.reference_ranges for consistency where possible,
    but maintains its own mapping for direct PDF extraction keys if they differ.
    This function is a helper specifically for data coming raw from PDF extraction
    before it's standardized for analyzers.
    Analyzers should use utils.reference_ranges directly.
    """
    map_to_std_ranges = {
        "hb": REFERENCE_RANGES.get('Hb'), "hemoglobina": REFERENCE_RANGES.get('Hb'),
        "ht": REFERENCE_RANGES.get('Ht'), "hematocrito": REFERENCE_RANGES.get('Ht'), "hematócrito": REFERENCE_RANGES.get('Ht'),
        "leuco": REFERENCE_RANGES.get('Leuco'), "leucocitos": REFERENCE_RANGES.get('Leuco'), "leucócitos": REFERENCE_RANGES.get('Leuco'), "wbc": REFERENCE_RANGES.get('Leuco'),
        "plaq": REFERENCE_RANGES.get('Plaq'), "plaquetas": REFERENCE_RANGES.get('Plaq'), "plt": REFERENCE_RANGES.get('Plaq'),
        "rbc": REFERENCE_RANGES.get('RBC'), "eritrócitos": REFERENCE_RANGES.get('RBC'), "hemacias": REFERENCE_RANGES.get('RBC'), "hemácias": REFERENCE_RANGES.get('RBC'),
        
        "ur": REFERENCE_RANGES.get('Ur'), "ureia": REFERENCE_RANGES.get('Ur'),
        "creat": REFERENCE_RANGES.get('Creat'), "creatinina": REFERENCE_RANGES.get('Creat'),
        
        "na": REFERENCE_RANGES.get('Na+'), "sódio": REFERENCE_RANGES.get('Na+'), "na+": REFERENCE_RANGES.get('Na+'),
        "k": REFERENCE_RANGES.get('K+'), "potássio": REFERENCE_RANGES.get('K+'), "k+": REFERENCE_RANGES.get('K+'),
        "cl": REFERENCE_RANGES.get('Cloro', (98, 107)), 
        "ca": REFERENCE_RANGES.get('Ca+'), "cálcio": REFERENCE_RANGES.get('Ca+'), "ca++": REFERENCE_RANGES.get('Ca+'),
        "ica": REFERENCE_RANGES.get('iCa'), "cálcio ionizado": REFERENCE_RANGES.get('iCa'),
        "mg": REFERENCE_RANGES.get('Mg+'), "magnésio": REFERENCE_RANGES.get('Mg+'), "mg++": REFERENCE_RANGES.get('Mg+'),
        "p": REFERENCE_RANGES.get('P'), "fósforo": REFERENCE_RANGES.get('P'),

        "ph": REFERENCE_RANGES.get('pH'),
        "pco2": REFERENCE_RANGES.get('pCO2'), "paco2": REFERENCE_RANGES.get('pCO2'),
        "po2": REFERENCE_RANGES.get('pO2'), "pao2": REFERENCE_RANGES.get('pO2'),
        "hco3": REFERENCE_RANGES.get('HCO3-'), "hco3-": REFERENCE_RANGES.get('HCO3-'), "bicarbonato": REFERENCE_RANGES.get('HCO3-'),
        "be": REFERENCE_RANGES.get('BE'),
        "lactato": REFERENCE_RANGES.get('Lactato'), 
        "sao2": REFERENCE_RANGES.get('SpO2'), "sato2": REFERENCE_RANGES.get('SpO2'), "spo2": REFERENCE_RANGES.get('SpO2'),

        "tgo": REFERENCE_RANGES.get('TGO'), "ast": REFERENCE_RANGES.get('TGO'),
        "tgp": REFERENCE_RANGES.get('TGP'), "alt": REFERENCE_RANGES.get('TGP'),
        "ggt": REFERENCE_RANGES.get('GamaGT'), "gamagt": REFERENCE_RANGES.get('GamaGT'), "gama-gt": REFERENCE_RANGES.get('GamaGT'),
        "fosfalc": REFERENCE_RANGES.get('FosfAlc'), "fa": REFERENCE_RANGES.get('FosfAlc'), "fosfatase alcalina": REFERENCE_RANGES.get('FosfAlc'),
        "bt": REFERENCE_RANGES.get('BT'), "bilirrubina total": REFERENCE_RANGES.get('BT'),
        "bd": REFERENCE_RANGES.get('BD'), "bilirrubina direta": REFERENCE_RANGES.get('BD'),
        "bi": None, 
        
        "albumina": REFERENCE_RANGES.get('Albumina'),
        "rni": REFERENCE_RANGES.get('RNI'), "inr": REFERENCE_RANGES.get('RNI'),
        
        "amilase": REFERENCE_RANGES.get('Amilase'),
        "lipase": REFERENCE_RANGES.get('Lipase'),
        
        "pcr": REFERENCE_RANGES.get('PCR'), "proteína c reativa": REFERENCE_RANGES.get('PCR'),
        "glicose": REFERENCE_RANGES.get('Glicose'),
        "hba1c": REFERENCE_RANGES.get('HbA1c'), "hemoglobina glicada": REFERENCE_RANGES.get('HbA1c'),

        # Differential counts - map to REFERENCE_RANGES keys
        "neutrophils_perc": REFERENCE_RANGES.get('Neutrophils_perc'), "segmentados_perc": REFERENCE_RANGES.get('Neutrophils_perc'), "segm": REFERENCE_RANGES.get('Neutrophils_perc'),
        "lymphocytes_perc": REFERENCE_RANGES.get('Lymphocytes_perc'), "linfocitos_perc": REFERENCE_RANGES.get('Lymphocytes_perc'), "linf": REFERENCE_RANGES.get('Lymphocytes_perc'),
        "monocytes_perc": REFERENCE_RANGES.get('Monocytes_perc'), "monocitos_perc": REFERENCE_RANGES.get('Monocytes_perc'), "mono": REFERENCE_RANGES.get('Monocytes_perc'),
        "eosinophils_perc": REFERENCE_RANGES.get('Eosinophils_perc'), "eosinofilos_perc": REFERENCE_RANGES.get('Eosinophils_perc'), "eosi": REFERENCE_RANGES.get('Eosinophils_perc'),
        "basophils_perc": REFERENCE_RANGES.get('Basophils_perc'), "basofilos_perc": REFERENCE_RANGES.get('Basophils_perc'), "baso": REFERENCE_RANGES.get('Basophils_perc'),
        "bands_perc": REFERENCE_RANGES.get('Bands_perc'), "bastonetes_perc": REFERENCE_RANGES.get('Bands_perc'), "bastões": REFERENCE_RANGES.get('Bands_perc'),
        "mielocitos_perc": REFERENCE_RANGES.get('Mielocytes_perc'), "mielócitos_perc": REFERENCE_RANGES.get('Mielocytes_perc'),
        "metamielocitos_perc": REFERENCE_RANGES.get('Metamyelocytes_perc'), "metamielócitos_perc": REFERENCE_RANGES.get('Metamyelocytes_perc'),

        "neutrophils_abs": REFERENCE_RANGES.get('Neutrophils_abs'), "segmentados_abs": REFERENCE_RANGES.get('Neutrophils_abs'),
        "lymphocytes_abs": REFERENCE_RANGES.get('Lymphocytes_abs'), "linfocitos_abs": REFERENCE_RANGES.get('Lymphocytes_abs'),
        "monocytes_abs": REFERENCE_RANGES.get('Monocytes_abs'), "monocitos_abs": REFERENCE_RANGES.get('Monocytes_abs'),
        "eosinophils_abs": REFERENCE_RANGES.get('Eosinophils_abs'), "eosinofilos_abs": REFERENCE_RANGES.get('Eosinophils_abs'),
        "basophils_abs": REFERENCE_RANGES.get('Basophils_abs'), "basofilos_abs": REFERENCE_RANGES.get('Basophils_abs'),
        "bands_abs": REFERENCE_RANGES.get('Bands_abs'), "bastonetes_abs": REFERENCE_RANGES.get('Bands_abs'),
        "mielocitos_abs": REFERENCE_RANGES.get('Mielocytes_abs'), "mielócitos_abs": REFERENCE_RANGES.get('Mielocytes_abs'),
        "metamielocitos_abs": REFERENCE_RANGES.get('Metamyelocytes_abs'), "metamielócitos_abs": REFERENCE_RANGES.get('Metamyelocytes_abs'),
        "vhs": REFERENCE_RANGES.get('VHS_Male'), "velocidade de hemossedimentação": REFERENCE_RANGES.get('VHS_Male'), # Default to Male for now, analyzer can refine
        "ttpa": REFERENCE_RANGES.get('TTPA'), "tempo de tromboplastina parcial ativada": REFERENCE_RANGES.get('TTPA'), # Added TTPA mapping
    }
    
    nome_campo_lower = nome_campo.lower().strip()
    
    # Prioritize direct match in our map
    ref_tuple = map_to_std_ranges.get(nome_campo_lower)
    if ref_tuple is not None: # Check for None because (None, None) is a valid return for BI
        return ref_tuple

    # Fallback: if no direct map, check if any key from map_to_std_ranges is IN nome_campo_lower
    # Sorted to check for longer keys first.
    sorted_map_keys = sorted(map_to_std_ranges.keys(), key=len, reverse=True)
    for key_map in sorted_map_keys:
        val_map = map_to_std_ranges[key_map]
        if len(key_map) == 1 and key_map != nome_campo_lower: # single letter keys must be exact match (already handled)
            continue
        if key_map in nome_campo_lower and val_map is not None:
            return val_map
            
    return None, None # Default if no reference range found

# --- END COPIED HELPER FUNCTIONS --- 

# --- TRANSIENT PROCESSING FUNCTIONS ---

async def process_uploaded_file_transient(file: UploadFile, patient_info: Optional[Dict[str, Any]] = None, general_notes: Optional[str] = None) -> Dict[str, Any]:
    """
    Processes an uploaded file for transient analysis without DB saving.
    Extracts data, runs analyzers, generates (but does not save) alerts.
    """
    temp_pdf_path = None
    try:
        # Validate file type (more robustly perhaps)
        if not file.filename.lower().endswith(('.pdf', '.jpg', '.jpeg', '.png')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Apenas arquivos PDF, JPG, JPEG, ou PNG são aceitos para análise de arquivo."
            )
        
        content = await file.read()
        if len(content) > 25 * 1024 * 1024:  # 25MB limit from frontend
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Arquivo muito grande. O tamanho máximo é 25MB."
            )
        
        fd, temp_file_path = tempfile.mkstemp(suffix=os.path.splitext(file.filename)[1])
        with open(temp_file_path, 'wb') as f:
            f.write(content)
        os.close(fd)

        print(f"Attempting to extract data from transient file: {temp_file_path}")
        resultados_extraidos_lista = extrair_campos_pagina(temp_file_path)
        print(f"DEBUG TTPA/VHS: Raw extraction results (resultados_extraidos_lista): {json.dumps(resultados_extraidos_lista, indent=2)}") # ADDED DETAILED LOG
        
        dados_consolidados = {}
        for pagina_dict in resultados_extraidos_lista:
            dados_consolidados.update(pagina_dict)
        
        dados_numericos = {}
        extracted_lab_results_for_response: List[LabResult] = []

        for test_key, valor_str in dados_consolidados.items():
            val_num = None
            val_txt = str(valor_str)
            try:
                # Corrected number parsing for PDF extraction
                # Remove dots (thousand separators), then replace comma (decimal) with dot
                cleaned_valor_str = str(valor_str).replace(".", "")
                cleaned_valor_str = cleaned_valor_str.replace(",", ".")
                val_num = float(cleaned_valor_str)
            except (ValueError, AttributeError):
                pass

            unit = obter_unidade(test_key)
            ref_min, ref_max = obter_valores_referencia(test_key)
            is_abnormal = False
            if val_num is not None and ref_min is not None and ref_max is not None:
                is_abnormal = val_num < ref_min or val_num > ref_max
            
            lab_result_obj = LabResult(
                result_id=-1, patient_id=-1, exam_id=None, user_id=None, 
                test_name=test_key, timestamp=datetime.utcnow(), 
                value_numeric=val_num, value_text=val_txt if val_num is None else None,
                unit=unit, reference_range_low=ref_min, reference_range_high=ref_max,
                created_at=datetime.utcnow()
            )
            extracted_lab_results_for_response.append(lab_result_obj)
            dados_numericos[test_key] = val_num if val_num is not None else val_txt

        # DEBUG TTPA/VHS: Check content of dados_numericos for TTPA/VHS keys
        print("DEBUG TTPA/VHS: Contents of dados_numericos after parsing:")
        for key, value in dados_numericos.items():
            if "ttpa" in key.lower() or "tempo de tromboplastina" in key.lower() or "ttp" in key.lower():
                print(f"  - Found potential TTPA key \'{key}\': {value}")
            if "vhs" in key.lower() or "velocidade de hemossedimentação" in key.lower():
                print(f"  - Found potential VHS key \'{key}\': {value}")
        print("DEBUG TTPA/VHS: End of dados_numericos check.")

        # 1. EARLY AND DEFINITIVE CATEGORIZATION
        test_to_category_map: Dict[str, str] = {}
        all_category_keys_found = set()
        print("DEBUG: Extracted test names and their determined categories:") # DEBUG LINE
        for lr in extracted_lab_results_for_response:
            cat_key = determinar_categoria(lr.test_name)
            print(f"  - Test Name: '{lr.test_name}', Determined Category: '{cat_key}'") # DEBUG LINE
            test_to_category_map[lr.test_name] = cat_key
            all_category_keys_found.add(cat_key)
        print("DEBUG: End of test name categorization.") # DEBUG LINE

        grouped_data_for_analyzers: Dict[str, Dict[str, Any]] = {}
        # Populate grouped_data_for_analyzers using the definitive map
        for lr in extracted_lab_results_for_response:
            category_key = test_to_category_map.get(lr.test_name)
            if category_key: # Should always be true if map is populated correctly
                if category_key not in grouped_data_for_analyzers:
                    grouped_data_for_analyzers[category_key] = {}
                # Store the value that the analyzer expects (numeric or text)
                # Assuming dados_numericos contains the appropriate value format for analyzers
                grouped_data_for_analyzers[category_key][lr.test_name] = dados_numericos.get(lr.test_name)


        analysis_results_from_backend: Dict[str, Any] = {}
        ANALYZER_FUNCTIONS = {
            "bloodGas": analisar_gasometria, "electrolytes": analisar_eletrolitos,
            "hematology": analisar_hemograma, "renal": analisar_funcao_renal,
            "hepatic": analisar_funcao_hepatica, "cardiac": analisar_marcadores_cardiacos,
            "metabolic": analisar_metabolismo, "microbiology": analisar_microbiologia,
            "pancreatic": analisar_funcao_pancreatica,
            "inflammation": analisar_marcadores_inflamatorios,
            "coagulation": analisar_coagulacao
        }
        
        effective_patient_info = patient_info.copy() if patient_info else {}
        if general_notes: # general_notes from the frontend might be passed here
            effective_patient_info['general_notes'] = general_notes

        for category_key, data_for_analyzer in grouped_data_for_analyzers.items():
            analyzer_function = ANALYZER_FUNCTIONS.get(category_key)
            if analyzer_function:
                try:
                    analyzer_payload = data_for_analyzer.copy()
                    
                    # Prepare specific context arguments for analyzers
                    analyzer_context_args = {}
                    if analyzer_function.__name__ == 'analisar_hemograma':
                        if 'sexo' in effective_patient_info: # Standardized key
                            analyzer_context_args['sexo'] = effective_patient_info['sexo']
                        # Example: if 'idade' was also a known param for hemograma
                        # if 'idade' in effective_patient_info:
                        #     analyzer_context_args['idade'] = effective_patient_info['idade']
                    # Add elif blocks for other analyzers if they accept specific known context keys
                    # e.g., elif analyzer_function.__name__ == 'analisar_funcao_renal':
                    #     if 'idade' in effective_patient_info:
                    #         analyzer_context_args['idade'] = effective_patient_info['idade']

                    print(f"Calling analyzer {analyzer_function.__name__} for {category_key} with data: {analyzer_payload} and specific context: {analyzer_context_args}")
                    
                    # Call analyzer: only pass **analyzer_context_args if it's not empty
                    if analyzer_context_args:
                        result = analyzer_function(analyzer_payload, **analyzer_context_args)
                    else:
                        result = analyzer_function(analyzer_payload) # Call with only data if no specific context args
                        
                    analysis_results_from_backend[category_key] = result
                except Exception as e:
                    error_message = f"Error running analyzer for {category_key} with function {analyzer_function.__name__}: {e}"
                    print(error_message)
                    analysis_results_from_backend[category_key] = {
                        "error": str(e), 
                        "interpretation": f"Erro ao analisar {category_key}: {str(e)}",
                        "abnormalities": [], "is_critical": False,
                        "recommendations": ["Contactar suporte."],
                        "details": { "error_details": str(e) }
                    }
            elif category_key != "outros":
                print(f"No specific analyzer function for category {category_key}. Data will be in 'outros' or handled generally.")

        final_analysis_results_for_api: Dict[str, Dict[str, Any]] = {}
        
        # Ensure all categories that have analyzer results are included
        all_categories_to_process = set(analysis_results_from_backend.keys())
        all_categories_to_process.update(all_category_keys_found) # Add all categories found from lab tests

        for category_key in all_categories_to_process:
            # Get analyzer output for this category, if any
            backend_result_data = analysis_results_from_backend.get(category_key, {})

            # Collect lab results for THIS category using the definitive map
            labs_for_this_category = []
            for lr in extracted_lab_results_for_response:
                if test_to_category_map.get(lr.test_name) == category_key:
                    labs_for_this_category.append(lr)
            
            if category_key == "pancreatic": # DEBUG FOR PANCREATIC
                print(f"DEBUG PANCREATIC: category_key = {category_key}")
                print(f"DEBUG PANCREATIC: backend_result_data = {backend_result_data}")
                print(f"DEBUG PANCREATIC: labs_for_this_category ({len(labs_for_this_category)} items) = {labs_for_this_category}")

            has_analyzer_interpretation = category_key in analysis_results_from_backend and \
                                         any(analysis_results_from_backend[category_key].get(k) 
                                             for k in ["interpretation", "abnormalities", "recommendations"] 
                                             if analysis_results_from_backend[category_key].get(k) not in [None, []])


            if not labs_for_this_category and not has_analyzer_interpretation and category_key != "outros":
                continue # Skip empty categories unless it's 'outros' or has some analyzer text

            final_analysis_results_for_api[category_key] = {
                "interpretation": backend_result_data.get("interpretation", "Interpretação não disponível." if labs_for_this_category else "Nenhum resultado ou análise nesta categoria."),
                "abnormalities": backend_result_data.get("abnormalities", []),
                "is_critical": backend_result_data.get("is_critical", False),
                "recommendations": backend_result_data.get("recommendations", []),
                "details": {
                    "lab_results": labs_for_this_category,
                    "score_results": backend_result_data.get("score_results", []),
                }
            }
            for k, v in backend_result_data.items():
                if k not in ["interpretation", "abnormalities", "is_critical", "recommendations", "details", "score_results"]:
                    final_analysis_results_for_api[category_key][k] = v
        
        # DEBUG: Print the pancreatic entry from the final map before returning
        if "pancreatic" in final_analysis_results_for_api:
            print(f"DEBUG FINAL PANCREATIC in API response: {final_analysis_results_for_api['pancreatic']}")
        else:
            print("DEBUG FINAL PANCREATIC: 'pancreatic' key NOT FOUND in final_analysis_results_for_api")

        # Refined 'outros' handling
        if "outros" in final_analysis_results_for_api:
            outros_data = final_analysis_results_for_api["outros"]
            outros_labs_exist = "details" in outros_data and "lab_results" in outros_data["details"] and outros_data["details"]["lab_results"]
            
            if not outros_labs_exist and not (outros_data.get("interpretation") and outros_data.get("interpretation") not in ["Interpretação não disponível.", "Nenhum resultado ou análise nesta categoria."]):
                del final_analysis_results_for_api["outros"] # Remove 'outros' if it's truly empty
            elif outros_labs_exist and (not outros_data.get("interpretation") or outros_data.get("interpretation") in ["Interpretação não disponível.", "Nenhum resultado ou análise nesta categoria."]):
                outros_data["interpretation"] = "Resultados não categorizados ou diversos."
        
        return {
            "message": "Arquivo processado e analisado transitoriamente.",
            "filename": file.filename,
            "lab_results": extracted_lab_results_for_response,
            "analysis_results": final_analysis_results_for_api,
            "generated_alerts": [], 
            "exam_timestamp": datetime.utcnow().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in process_uploaded_file_transient: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao processar arquivo transitoriamente: {str(e)}")
    finally:
        if temp_pdf_path and os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)

def process_manual_data_transient(manual_data_payload: Dict[str, Any], current_user: Optional[UserModel] = None, patient_info_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Processes manual lab data for transient analysis without DB saving.
    The payload is expected to be the parsed JSON from frontend's manualLabData.
    It includes 'lab_results_grouped' which is client-side structured analysis.
    Backend analyzers are re-run on this data after mapping keys.
    """
    try:
        client_lab_results_grouped = manual_data_payload.get("lab_results_grouped", {}) # This was an error in previous logic, should be lab_results from payload
        # Correctly get lab_results from the direct payload
        manual_lab_results_input = manual_data_payload.get("lab_results", [])
        exam_date_str = manual_data_payload.get("exam_date", datetime.utcnow().isoformat())
        
        # general_notes can be part of patient_info_context if passed from frontend's general notes section
        # For manual data, patient_info_context primarily carries 'source' and potentially 'patient_id' from guest manual submission.
        # If actual clinical context like age/sex is needed for manual submission, it should be part of the 'manual_data_payload'
        # or a richer 'patient_info_context' structure.

        FRONTEND_TO_BACKEND_KEY_MAP = {
            # Hematology
            "Hemoglobina": "Hb", "Leucócitos": "Leuco", "Plaquetas": "Plaq", "Hematócrito": "Ht",
            "Eritrócitos": "RBC", "Hemácias": "RBC", "VCM": "VCM", "HCM": "HCM", "CHCM": "CHCM", "RDW": "RDW",
            # Renal
            "Creatinina": "Creat", "Ureia": "Ur", "Ácido Úrico": "AcidoUrico",
            # Hepatic
            "TGO": "TGO", "TGP": "TGP", "GGT": "GamaGT", "Fosfatase Alcalina": "FosfAlc",
            "Bilirrubina": "BT", "Albumina": "Albumina", "Proteínas Totais": "ProteinasTotais",
            # Electrolytes
            "Sódio": "Na+", "Potássio": "K+", "Cloro": "Cl-", "Cálcio": "Ca+", "Magnésio": "Mg+", "Fósforo": "P",
            # Blood Gas
            "pH": "pH", "pCO2": "pCO2", "pO2": "pO2", "HCO3": "HCO3-", "BE": "BE",
            "Lactato": "Lactato", "SatO2": "SpO2", "FiO2": "FiO2",
            # Cardiac
            "Troponina": "Troponina", "CK": "CPK", "CK-MB": "CKMB", "BNP": "BNP", "NT-proBNP": "NT-proBNP", "LDH": "LDH",
            # Metabolic
            "Glicose": "Glicose", "HbA1c": "HbA1c", "Triglicérides": "TG", "Colesterol Total": "CT",
            "HDL": "HDL", "LDL": "LDL", "TSH": "TSH", "T4 Livre": "T4L",
            # Inflammation
            "PCR": "PCR", "Procalcitonina": "Procalcitonina", "VHS": "VHS", "Ferritina": "Ferritina",
            "Fibrinogênio": "Fibrinogeno", "D-dímero": "D-dimer",
            # Pancreatic
            "Amilase": "Amilase", "Lipase": "Lipase",
            # Microbiology
            "Hemocultura": "Hemocult", "Urocultura": "Urocult",
            "Cultura de Escarro": "CultEscarro", "Cultura de Secreção": "CultSecrecao",
            # Explicit ACR keys if frontend sends them with these exact names
            "Relação Albumina/Creatinina (mg/g)": "RAC_mg_g",
            "Relação Albumina/Creatinina (mg/mmol)": "RAC_mg_mmol",
        }

        mapped_dados_for_backend: Dict[str, Any] = {}
        processed_lab_results_for_response: List[LabResult] = []
        exam_datetime = datetime.fromisoformat(exam_date_str) if exam_date_str else datetime.utcnow()

        # Process the flat list of lab_results from the payload
        for lr_manual in manual_lab_results_input: # Iterating over the correct list
            test_name_frontend = lr_manual.get("test_name")
            # Value can be numeric or text, analyzers should handle this
            val_input = lr_manual.get("value_numeric") if lr_manual.get("value_numeric") is not None else lr_manual.get("value_text")
            
            unit = lr_manual.get("unit")
            ref_low_str = lr_manual.get("reference_range_low")
            ref_high_str = lr_manual.get("reference_range_high")
            
            val_num_for_schema = None
            val_txt_for_schema = None
            if isinstance(val_input, (int, float)):
                val_num_for_schema = float(val_input)
            else:
                val_txt_for_schema = str(val_input) if val_input is not None else None


            if test_name_frontend:
                backend_key = FRONTEND_TO_BACKEND_KEY_MAP.get(test_name_frontend, test_name_frontend)
                mapped_dados_for_backend[backend_key] = val_input # Store the direct value for analyzers
                
                lab_result_obj = LabResult( 
                    result_id=-1, patient_id=-1, exam_id=None, user_id=None, 
                    test_name=test_name_frontend, 
                    timestamp=exam_datetime,
                    value_numeric=val_num_for_schema, 
                    value_text=val_txt_for_schema, 
                    unit=unit,
                    reference_range_low=float(ref_low_str) if ref_low_str is not None else None, 
                    reference_range_high=float(ref_high_str) if ref_high_str is not None else None,
                    created_at=datetime.utcnow()
                )
                processed_lab_results_for_response.append(lab_result_obj)
        
        backend_analysis_results_temp = {}
        ANALYZERS_MAP = { # Using a map for easier access
            "gasometria": analisar_gasometria, "eletrolitos": analisar_eletrolitos, 
            "hemograma": analisar_hemograma, "funcao_renal": analisar_funcao_renal, 
            "funcao_hepatica": analisar_funcao_hepatica, "marcadores_cardiacos": analisar_marcadores_cardiacos, 
            "metabolismo": analisar_metabolismo, "microbiologia": analisar_microbiologia, 
            "funcao_pancreatica": analisar_funcao_pancreatica, 
            "marcadores_inflamatorios": analisar_marcadores_inflamatorios, 
            "coagulacao": analisar_coagulacao
        }
        # This map is for func name to internal key, not what's needed for api_key lookup directly
        # API_KEY_TO_ANALYZER_FUNC_NAME = {v.__name__: k for k, v in ANALYZERS_MAP.items()}

        # CORRECT MAPPING: From internal analyzer map keys to API response keys
        ANALYZER_INTERNAL_KEY_TO_API_KEY = {
            "gasometria": "bloodGas",
            "eletrolitos": "electrolytes",
            "hemograma": "hematology",
            "funcao_renal": "renal",
            "funcao_hepatica": "hepatic",
            "marcadores_cardiacos": "cardiac",
            "metabolismo": "metabolic",
            "microbiologia": "microbiology",
            "funcao_pancreatica": "pancreatic",
            "marcadores_inflamatorios": "inflammation",
            "coagulacao": "coagulation"
        }

        # Patient context that might be passed from authenticated calls or richer guest submissions
        # For basic guest manual submission, patient_info_context might just be {'source': '...'}
        # If specific clinical context (age, sex) is needed for analyzers, it must be explicitly
        # provided in the manualLabDataJSON or via patient_id_context for authenticated users.
        # Here, we check patient_info_context for known keys.
        
        effective_patient_context_for_analyzers = patient_info_context if patient_info_context else {}
        # Add age/sex from current_user if available and if analyzers expect them
        # This part is complex and depends on how current_user data is structured and if it's reliable
        # For now, we assume patient_info_context might contain 'sexo' or 'idade' if passed deliberately.

        for internal_key, analyzer_function in ANALYZERS_MAP.items():
            # Resolve API key using the analyzer function's name to find its key in ANALYZER_KEY_TO_API_KEY
            # This requires ANALYZER_KEY_TO_API_KEY to be correctly defined as it was previously
            # analyzer_func_name_as_key = analyzer_function.__name__.replace("analisar_", "") # e.g. "hemograma"
            # Correctly use the internal_key from ANALYZERS_MAP to look up the API key
            api_key = ANALYZER_INTERNAL_KEY_TO_API_KEY.get(internal_key, internal_key) # Fallback to internal_key if no map

            try:
                analyzer_context_args = {}
                if analyzer_function.__name__ == 'analisar_hemograma':
                    if 'sexo' in effective_patient_context_for_analyzers:
                        analyzer_context_args['sexo'] = effective_patient_context_for_analyzers['sexo']
                    # Add other known args for analisar_hemograma if any
                # Add elif for other analyzers needing specific context from effective_patient_context_for_analyzers

                print(f"Calling MANUAL analyzer {analyzer_function.__name__} for {api_key} with data: {mapped_dados_for_backend} and specific context: {analyzer_context_args}")

                if analyzer_context_args:
                    analysis_output = analyzer_function(mapped_dados_for_backend, **analyzer_context_args)
                else:
                    analysis_output = analyzer_function(mapped_dados_for_backend)
                
                # Check if the output is essentially a "no data processed" placeholder
                is_placeholder_result = False
                
                # Specific check for microbiology which returns an empty list if no data
                if analyzer_function.__name__ == 'analisar_microbiologia' and isinstance(analysis_output, list) and not analysis_output:
                    is_placeholder_result = True
                # Specific check for blood gas analyzer which returns an empty dict if no core data (pH and pCO2)
                elif analyzer_function.__name__ == 'analisar_gasometria' and isinstance(analysis_output, dict) and not analysis_output: # Check for empty dict
                    is_placeholder_result = True
                elif isinstance(analysis_output, dict): # General check for other dictionary-based analyzers
                    interpretation = analysis_output.get("interpretation", "").lower()
                    abnormalities = analysis_output.get("abnormalities", [])
                    is_critical = analysis_output.get("is_critical", False)

                    # Common phrases indicating no actual data was processed or data was insufficient
                    # Added phrase from inflammatory analyzer
                    placeholder_phrases = [
                        "dados insuficientes", 
                        "sem dados para analisar",
                        "nenhum dado relevante encontrado",
                        "interpretação não disponível devido à falta de dados",
                        "não foi possível realizar a análise por falta de dados",
                        "não foi possível gerar uma interpretação para os marcadores inflamatórios.", # Added for inflammatory
                        "nenhum marcador inflamatório comum (pcr, vhs) fornecido ou reconhecido para análise." # Added for inflammatory specific message
                        # Add more specific phrases from your analyzers if they return unique "no data" messages.
                    ]
                    
                    # If interpretation contains a placeholder phrase AND there are no abnormalities AND it's not critical
                    if any(phrase in interpretation for phrase in placeholder_phrases) and \
                       not abnormalities and \
                       not is_critical:
                        is_placeholder_result = True
                
                if not is_placeholder_result:
                    backend_analysis_results_temp[api_key] = analysis_output
                else:
                    print(f"Skipping placeholder results for {api_key} ({analyzer_function.__name__}) as it likely indicates no relevant data was input for this analyzer.")

            except Exception as e:
                error_message = f"Erro ao processar análise para {internal_key} (API key: {api_key}): {str(e)}"
                print(error_message)
                backend_analysis_results_temp[api_key] = {
                    "error": str(e), # Ensure error field is present
                    "interpretation": error_message, 
                    "abnormalities": [], 
                    "is_critical": False,
                    "recommendations": ["Verifique os dados de entrada ou contacte o suporte."],
                    "details": { "error_details": str(e) } 
                }

        alert_system = AlertSystem()
        # Pass mapped_dados_for_backend to the alert system as well
        generated_alerts_dicts = alert_system.generate_alerts(mapped_dados_for_backend)
        generated_alerts_models: List[AlertBase] = [AlertBase(**ad) for ad in generated_alerts_dicts]

        return {
            "message": "Dados manuais processados e analisados transitoriamente.",
            "lab_results": processed_lab_results_for_response, # List of LabResult-like objects
            "analysis_results": backend_analysis_results_temp, # Return the mapped results
            "generated_alerts": generated_alerts_models,
            "exam_date": exam_datetime.isoformat()
        }
    except Exception as e:
        print(f"Error in process_manual_data_transient: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao processar dados manuais: {str(e)}")


# --- Modified and New Endpoints ---

@router.post("/guest", response_model=Dict[str, Any]) # Changed from "/analysis/guest"
async def perform_analysis_guest(
    analysis_type: str = Form(...),
    file: Optional[UploadFile] = File(None),
    manualLabDataJSON: Optional[str] = Form(None),
    # db: Session = Depends(get_db) # Not needed if not saving
):
    """
    Endpoint genérico para usuários convidados (não autenticados) realizarem análises,
    seja por upload de arquivo PDF ou por entrada manual de dados.
    Não salva os resultados no banco de dados.
    """
    if file and manualLabDataJSON:
        raise HTTPException(status_code=400, detail="Forneça um arquivo OU dados manuais, não ambos.")

    results = {}
    if file:
        if analysis_type != "pdf_upload": 
            pass 
        patient_context_for_transient = {"source": "guest_pdf_upload", "filename": file.filename}
        results = await process_uploaded_file_transient(file, patient_info=patient_context_for_transient)
    elif manualLabDataJSON:
        if analysis_type != "manual_submission":
            pass 
        try:
            manual_data_payload = json.loads(manualLabDataJSON)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="manualLabDataJSON inválido.")
        
        patient_id_from_manual = manual_data_payload.get('patient_id')
        patient_context_for_transient = {"source": "guest_manual_submission"}
        if patient_id_from_manual:
            patient_context_for_transient['patient_id'] = patient_id_from_manual

        results = process_manual_data_transient(manual_data_payload, patient_info_context=patient_context_for_transient)
    else:
        raise HTTPException(status_code=400, detail="Forneça um arquivo PDF ou dados manuais (manualLabDataJSON).")

    return results

# NEW DEDICATED ENDPOINT FOR MANUAL GUEST SUBMISSIONS
@router.post("/manual-guest", response_model=Dict[str, Any])
async def perform_manual_analysis_guest(
    manualLabDataJSON: str = Form(...)
    # analysis_type: str = Form("manual_submission") # This can be assumed by the endpoint
):
    """
    Endpoint dedicado para submissões manuais de dados por usuários convidados (não autenticados).
    Não salva os resultados no banco de dados.
    """
    try:
        manual_data_payload = json.loads(manualLabDataJSON)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="manualLabDataJSON inválido. Por favor, forneça um JSON válido.")

    patient_id_from_manual = manual_data_payload.get('patient_id')
    patient_context_for_transient = {"source": "guest_manual_submission_dedicated"}
    if patient_id_from_manual:
        patient_context_for_transient['patient_id'] = patient_id_from_manual
    
    results = process_manual_data_transient(manual_data_payload, patient_info_context=patient_context_for_transient)
    
    # Ensure the response structure aligns with FileUploadApiResponse expectations
    if 'filename' not in results: # Frontend might expect a filename
        results['filename'] = "manual_submission" 
    if 'message' not in results or not results['message']:
        results['message'] = "Dados manuais processados com sucesso (endpoint dedicado)."

    return results

@router.post("/perform", response_model=Dict[str, Any]) # Generic response
async def perform_analysis_authenticated(
    analysis_type: str = Form(...),
    patient_id_context: Optional[str] = Form(None), # For context, not saving yet
    file: Optional[UploadFile] = File(None),
    manualLabDataJSON: Optional[str] = Form(None),
    current_user: Optional[UserModel] = Depends(get_current_user),
    # db: Session = Depends(get_db) # Not needed if not saving by default
):
    """
    Endpoint para análise transiente por usuário autenticado (paciente ou médico) OU convidado.
    Processa arquivo OU dados manuais. NÃO SALVA NO BANCO DE DADOS por padrão.
    """
    if current_user:
        print(f"Authenticated analysis. User: {current_user.user_id}, Type: {analysis_type}, PatientContext: {patient_id_context}")
    else:
        print(f"Guest/Unauthenticated analysis via /perform. Type: {analysis_type}, PatientContext: {patient_id_context}")
    
    patient_info_for_analyzers = {}
    if patient_id_context:
        patient_info_for_analyzers['patient_id_context'] = patient_id_context 

    if analysis_type == "file":
        if not file:
            raise HTTPException(status_code=400, detail="Nenhum arquivo fornecido para análise de arquivo.")
        try:
            return await process_uploaded_file_transient(file, patient_info=patient_info_for_analyzers)
        except HTTPException as he:
            raise he
        except Exception as e:
            print(f"Error in authenticated file analysis: {e}")
            raise HTTPException(status_code=500, detail=f"Erro ao processar arquivo autenticado: {str(e)}")
    elif analysis_type == "manual":
        if not manualLabDataJSON:
            raise HTTPException(status_code=400, detail="Nenhum dado manual fornecido para análise manual.")
        try:
            manual_data_payload = json.loads(manualLabDataJSON)
            return process_manual_data_transient(manual_data_payload, current_user=current_user, patient_info_context=patient_info_for_analyzers)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Dados manuais em formato JSON inválido.")
        except HTTPException as he:
            raise he
        except Exception as e:
            print(f"Error in authenticated manual analysis: {e}")
            raise HTTPException(status_code=500, detail=f"Erro ao processar dados manuais autenticados: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Tipo de análise inválido. Use 'file' ou 'manual'.")

    # db: Session = Depends(get_db) # Not needed if not saving by default

@router.post("/generate-dr-corvus-insights", response_model=LabInsightsOutputFromAPI)
async def generate_dr_corvus_insights(
    payload: LabAnalysisInputForAPI, # Use API-specific Pydantic model for request
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Generates clinical insights using Dr. Corvus LLM (via BAML) based on lab results and context.
    """
    print(f"Dr. Corvus BAML insights request for user: {current_user.user_id}, role: {payload.user_role.value}")

    # 1. Convert FastAPI Pydantic input to BAML generated input type
    baml_input_lab_results = [
        BamLabTestResult( # Use BAML's LabTestResult type
            test_name=lr.test_name,
            value=lr.value,
            unit=lr.unit,
            reference_range_low=lr.reference_range_low,
            reference_range_high=lr.reference_range_high,
            interpretation_flag=lr.interpretation_flag,
            notes=lr.notes,
        ) for lr in payload.lab_results
    ]

    # Ensure BamUserRole is correctly instantiated if it's an enum in BAML
    # baml_user_role = BamUserRole(payload.user_role.value) if isinstance(BamUserRole, type(Enum)) else payload.user_role.value
    # Simpler: BAML usually handles string to enum conversion if types match
    
    baml_payload = BamLabAnalysisInput(
        lab_results=baml_input_lab_results,
        user_role=payload.user_role.value, # BAML enum will take the string value
        patient_context=payload.patient_context,
        specific_user_query=payload.specific_user_query
    )
    
    try:
        # 2. Call the BAML function
        # The 'b' client is imported from the generated 'baml_client'
        # Assuming b.GenerateDrCorvusInsights is an async function
        insights_from_baml: BamLabInsightsOutput = await b.GenerateDrCorvusInsights(input=baml_payload)

        # 3. Convert BAML output type to FastAPI Pydantic response model
        # BAML generated classes are often Pydantic-compatible.
        if hasattr(insights_from_baml, 'model_dump'):
             response_data = insights_from_baml.model_dump(exclude_none=True)
        else: # Manual mapping if necessary (should ideally not be needed if BAML types are Pydantic-based)
            response_data = {
                "patient_friendly_summary": insights_from_baml.patient_friendly_summary,
                "potential_health_implications_patient": insights_from_baml.potential_health_implications_patient,
                "lifestyle_tips_patient": insights_from_baml.lifestyle_tips_patient,
                "questions_to_ask_doctor_patient": insights_from_baml.questions_to_ask_doctor_patient,
                "key_abnormalities_professional": insights_from_baml.key_abnormalities_professional,
                "potential_patterns_and_correlations": insights_from_baml.potential_patterns_and_correlations,
                "differential_considerations_professional": insights_from_baml.differential_considerations_professional,
                "suggested_next_steps_professional": insights_from_baml.suggested_next_steps_professional,
                "important_results_to_discuss_with_doctor": insights_from_baml.important_results_to_discuss_with_doctor,
                "general_disclaimer": insights_from_baml.general_disclaimer,
                "error": insights_from_baml.error,
            }
            response_data = {k: v for k, v in response_data.items() if v is not None}

        api_response = LabInsightsOutputFromAPI(**response_data)
        return api_response

    except Exception as e:
        # TODO: Catch specific BAML exceptions if available for more granular error handling
        print(f"Error calling BAML function or processing insights: {str(e)}")
        # Return an error structure consistent with LabInsightsOutputFromAPI
        return LabInsightsOutputFromAPI(
            general_disclaimer="Falha na comunicação com o serviço de insights via BAML.",
            error=f"Erro ao gerar insights com BAML: {str(e)}"
        )

# --- Existing specific analysis endpoints (blood_gas, electrolytes, etc.) ---
# These are assumed to be potentially still in use for direct, specific analyses
# and are not touched by this refactor unless they also need to change
# to "transient by default". For now, they remain as they were.

@router.post("/blood_gas", response_model=BloodGasResult)
async def analyze_blood_gas(
    data: BloodGasInput,
    current_user: Optional[UserModel] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analisa dados de gasometria arterial.
    Endpoint público, não requer autenticação.
    """
    # Chamar a função do analisador correspondente
    analysis_data = {
        'pH': data.ph,
        'PaCO2': data.pco2,
        'HCO3': data.hco3,
        'PaO2': data.po2 if data.po2 else None,
        'SaO2': data.o2sat if data.o2sat else None,
        'BE': data.be if data.be else None,
        'Lactato': data.lactate if data.lactate else None
    }
    
    interpretations = analisar_gasometria(analysis_data)
    
    # Processar os resultados da análise
    acid_base_status = "normal"
    oxygenation_status = None
    recommendations = []
    is_critical = False
    
    for item in interpretations:
        if "acidose" in item.lower() or "alcalose" in item.lower():
            acid_base_status = "alterado"
        if "hipoxemia" in item.lower():
            oxygenation_status = "inadequada"
        if any(keyword in item.lower() for keyword in ["crítico", "grave", "urgente", "emergência"]):
            is_critical = True
        if any(keyword in item.lower() for keyword in ["considerar", "avaliar", "monitorar", "ajustar"]):
            recommendations.append(item)
    
    if data.po2 and not oxygenation_status:
        oxygenation_status = "adequada" if data.po2 > 80 else "inadequada"
    
    result = BloodGasResult(
        interpretation="\n".join(interpretations),
        acid_base_status=acid_base_status,
        compensation_status="compensado" if acid_base_status == "normal" or any("compensad" in item.lower() for item in interpretations) else "não compensado",
        oxygenation_status=oxygenation_status,
        recommendations=recommendations if recommendations else None,
        is_critical=is_critical,
        details={
            "ph": data.ph,
            "pco2": data.pco2,
            "hco3": data.hco3,
            "po2": data.po2,
            "o2sat": data.o2sat,
            "be": data.be,
            "lactate": data.lactate
        }
    )
    
    # Se estiver autenticado, poderia salvar o resultado no banco de dados
    if current_user and hasattr(data, 'patient_id') and data.patient_id > 0:
        # Código para salvar resultado no histórico do paciente
        pass
    
    return result

@router.post("/electrolytes", response_model=ElectrolyteResult)
async def analyze_electrolytes(
    data: ElectrolyteInput,
    current_user: Optional[UserModel] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analisa eletrólitos séricos.
    Endpoint público, não requer autenticação.
    """
    # Preparar dados para análise
    analysis_data = {k: v for k, v in data.model_dump().items() if v is not None and k != 'patient_info'}
    
    # Converter chaves para o formato esperado pelo analisador
    key_mapping = {
        'sodium': 'Na',
        'potassium': 'K',
        'chloride': 'Cl',
        'bicarbonate': 'HCO3',
        'calcium': 'Ca',
        'magnesium': 'Mg',
        'phosphorus': 'P'
    }
    
    converted_data = {}
    for k, v in analysis_data.items():
        if k in key_mapping:
            converted_data[key_mapping[k]] = v
    
    # Chamar o analisador
    interpretations = analisar_eletrolitos(converted_data)
    
    # Processar resultados
    abnormalities = []
    is_critical = False
    
    for item in interpretations:
        if any(keyword in item.lower() for keyword in ["elevado", "baixo", "reduzido", "aumentado", "hiponatremia", "hipernatremia", "hipocalemia", "hipercalemia"]):
            abnormalities.append(item)
            
        if any(keyword in item.lower() for keyword in ["crítico", "grave", "urgente", "severo"]):
            is_critical = True
    
    result = ElectrolyteResult(
        interpretation="\n".join(interpretations),
        abnormalities=abnormalities,
        is_critical=is_critical,
        recommendations=[item for item in interpretations if any(kw in item.lower() for kw in ["considerar", "avaliar", "monitorar", "repor", "corrigir", "tratar"])],
        details=analysis_data
    )
    
    return result

@router.post("/hematology", response_model=HematologyResult)
async def analyze_hematology(
    data: HematologyInput,
    current_user: Optional[UserModel] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analisa resultados hematológicos.
    Endpoint público, não requer autenticação.
    """
    # Preparar dados para análise
    analysis_data = {}
    if data.hemoglobin is not None:
        analysis_data['Hb'] = data.hemoglobin
    if data.hematocrit is not None:
        analysis_data['Ht'] = data.hematocrit
    if data.rbc is not None:
        analysis_data['RBC'] = data.rbc
    if data.wbc is not None:
        analysis_data['Leuco'] = data.wbc
    if data.platelet is not None:
        analysis_data['Plaq'] = data.platelet
    if data.neutrophils is not None:
        analysis_data['Segm'] = data.neutrophils
    if data.lymphocytes is not None:
        analysis_data['Linf'] = data.lymphocytes
    if data.monocytes is not None:
        analysis_data['Mono'] = data.monocytes
    if data.eosinophils is not None:
        analysis_data['Eosi'] = data.eosinophils
    if data.basophils is not None:
        analysis_data['Baso'] = data.basophils
    
    # Obter sexo do paciente se disponível
    sexo = None
    if data.patient_info and 'sexo' in data.patient_info:
        sexo = data.patient_info['sexo']
    
    # Chamar o analisador
    interpretations = analisar_hemograma(analysis_data, sexo)
    
    # Processar resultados
    abnormalities = []
    is_critical = False
    
    for item in interpretations:
        if any(keyword in item.lower() for keyword in [
            "anemia", "leucopenia", "leucocitose", "trombocitopenia", "trombocitose",
            "neutropenia", "neutrofilia", "linfopenia", "linfocitose"
        ]):
            abnormalities.append(item)
        
        if any(keyword in item.lower() for keyword in ["grave", "significativo", "crítico", "urgente"]):
            is_critical = True
    
    result = HematologyResult(
        interpretation="\n".join(interpretations),
        abnormalities=abnormalities,
        is_critical=is_critical,
        recommendations=[item for item in interpretations if any(kw in item.lower() for kw in ["considerar", "avaliar", "monitorar", "transfusão", "isolamento"])],
        details={k: v for k, v in data.model_dump().items() if v is not None and k != 'patient_info'}
    )
    
    return result

@router.post("/cardiac", response_model=ElectrolyteResult)  # Reutilizando ElectrolyteResult como modelo de resposta
async def analyze_cardiac(
    data: Dict[str, Any],
    current_user: Optional[UserModel] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analisa marcadores cardíacos.
    Endpoint público, não requer autenticação.
    """
    # Preparar dados para análise
    analysis_data = {k: v for k, v in data.items() if k != 'patient_info' and v is not None}
    
    # Adicionar hora da dor se disponível
    hora_dor = None
    if 'hora_dor' in data:
        hora_dor = data['hora_dor']
    
    # Chamar o analisador
    interpretations = analisar_marcadores_cardiacos(analysis_data, hora_dor)
    
    # Processar resultados
    abnormalities = []
    is_critical = False
    
    for item in interpretations:
        if any(keyword in item.lower() for keyword in [
            "elevada", "elevação", "aumentada", "aumento", "troponina", "ck-mb", "bnp"
        ]):
            abnormalities.append(item)
        
        if any(keyword in item.lower() for keyword in ["grave", "acentuada", "significativo", "crítico", "urgente"]):
            is_critical = True
    
    result = ElectrolyteResult(  # Reutilizando este modelo 
        interpretation="\n".join(interpretations),
        abnormalities=abnormalities,
        is_critical=is_critical,
        recommendations=[item for item in interpretations if any(kw in item.lower() for kw in ["considerar", "avaliar", "monitorar", "ecocardiograma", "ECG"])],
        details=analysis_data
    )
    
    return result

@router.post("/microbiology", response_model=ElectrolyteResult)  # Reutilizando ElectrolyteResult como modelo de resposta
async def analyze_microbiology(
    data: Dict[str, Any],
    current_user: Optional[UserModel] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analisa resultados microbiológicos.
    Endpoint público, não requer autenticação.
    """
    # Chamar o analisador
    interpretations = analisar_microbiologia(data)
    
    # Processar resultados
    abnormalities = []
    is_critical = False
    
    for item in interpretations:
        if any(keyword in item.lower() for keyword in [
            "positivo", "detectado", "reagente", "resistente", "mrsa", "vre", "kpc"
        ]):
            abnormalities.append(item)
        
        if any(keyword in item.lower() for keyword in ["crítico", "grave", "urgente", "bacteremia", "sepse", "fungemia"]):
            is_critical = True
    
    result = ElectrolyteResult(  # Reutilizando este modelo
        interpretation="\n".join(interpretations),
        abnormalities=abnormalities,
        is_critical=is_critical,
        recommendations=[item for item in interpretations if any(kw in item.lower() for kw in ["considerar", "avaliar", "monitorar", "antibioticoterapia", "precaução"])],
        details=data
    )
    
    return result

@router.post("/score/sofa", response_model= ScoreResult)
async def calculate_sofa(
    data: SofaInput,
    current_user: Optional[UserModel] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calcula o escore SOFA (Sequential Organ Failure Assessment).
    """
    try:
        # Converter dados do request para o formato esperado pela função
        parametros = {
            'pao2': data.respiratory_pao2_fio2,
            'fio2': 100,  # Assumindo FiO2 de 100% se não especificado
            'plaquetas': data.coagulation_platelets,
            'bilirrubina': data.liver_bilirubin,
            'pad': data.cardiovascular_map,  # Simplificado - idealmente usaríamos PAD e PAS
            'pas': data.cardiovascular_map * 3 if data.cardiovascular_map else None,  # Estimado para exemplo
            'glasgow': data.cns_glasgow,
            'creatinina': data.renal_creatinine,
            'diurese': data.renal_urine_output
        }
        
        # Remover valores None
        parametros = {k: v for k, v in parametros.items() if v is not None}
        
        # Calcular SOFA
        score, componentes, interpretacao = calcular_sofa(parametros)
        
        # Preparar resposta
        mortality_risk = 0.0
        if score >= 12:
            mortality_risk = 0.8  # >80%
            category = "risco muito alto"
        elif score >= 8:
            mortality_risk = 0.5  # 50-80%
            category = "alto risco"
        elif score >= 4:
            mortality_risk = 0.25  # 15-50%
            category = "risco moderado"
        else:
            mortality_risk = 0.1  # <15%
            category = "baixo risco"
        
        result = ScoreResult(
            score=score,
            category=category,
            mortality_risk=mortality_risk,
            interpretation="\n".join(interpretacao),
            component_scores=componentes,
            recommendations=[
                "Monitorar continuamente sinais vitais e função orgânica.",
                "Considerar suporte avançado em UTI para scores elevados."
            ],
            abnormalities=interpretacao[1:] if len(interpretacao) > 1 else [],
            is_critical=score >= 8,
            details={k: v for k, v in data.model_dump().items() if v is not None}
        )
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao calcular SOFA: {str(e)}"
        )

@router.post("/score/qsofa", response_model= ScoreResult)
async def calculate_qsofa(
    data: QSofaInput,
    current_user: Optional[UserModel] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calcula o escore qSOFA (Quick SOFA) para triagem rápida de sepse.
    """
    try:
        # Converter dados do request para o formato esperado pela função
        parametros = {
            'glasgow': data.altered_mental_state,
            'fr': data.respiratory_rate,
            'pas': data.systolic_bp
        }
        
        # Remover valores None
        parametros = {k: v for k, v in parametros.items() if v is not None}
        
        # Calcular qSOFA
        score, interpretacao = calcular_qsofa(parametros)
        
        # Preparar componentes
        componentes = {}
        if 'glasgow' in parametros and parametros['glasgow'] < 15:
            componentes['altered_mental_state'] = 1
        else:
            componentes['altered_mental_state'] = 0
            
        if 'fr' in parametros and parametros['fr'] >= 22:
            componentes['respiratory_rate'] = 1
        else:
            componentes['respiratory_rate'] = 0
            
        if 'pas' in parametros and parametros['pas'] <= 100:
            componentes['systolic_bp'] = 1
        else:
            componentes['systolic_bp'] = 0
        
        # Preparar resposta
        mortality_risk = 0.1 if score < 2 else 0.3
        category = "alto risco" if score >= 2 else "baixo risco"
        
        result = ScoreResult(
            score=score,
            category=category,
            mortality_risk=mortality_risk,
            interpretation="\n".join(interpretacao),
            component_scores=componentes,
            recommendations=[
                "qSOFA ≥ 2: Considerar avaliação para sepse e cálculo do SOFA completo.",
                "Monitorar sinais vitais e estado de consciência frequentemente."
            ] if score >= 2 else [
                "qSOFA < 2: Risco baixo. Monitorar evolução clínica."
            ],
            abnormalities=[],
            is_critical=score >= 2,
            details={k: v for k, v in data.model_dump().items() if v is not None}
        )
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao calcular qSOFA: {str(e)}"
        )

@router.post("/score/apache2", response_model=ScoreResult)
async def calculate_apache2(
    data: ApacheIIInput,
    current_user: Optional[UserModel] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calcula o escore APACHE II (Acute Physiology and Chronic Health Evaluation II).
    """
    try:
        # Converter dados do request para o formato esperado pela função
        parametros = {
            'temp': data.temperature,
            'pad': data.diastolic_bp,
            'pas': data.systolic_bp,
            'fc': data.heart_rate,
            'fr': data.respiratory_rate,
            'pao2': data.pao2,
            'fio2': data.fio2,
            'ph': data.arterial_ph,
            'na': data.sodium,
            'k': data.potassium,
            'creatinina': data.creatinine,
            'ht': data.hematocrit,
            'leuco': data.wbc,
            'glasgow': data.glasgow,
            'idade': data.age,
            'doenca_cronica': data.chronic_health_condition,
            'tipo_internacao': data.admission_type
        }
        
        # Remover valores None
        parametros = {k: v for k, v in parametros.items() if v is not None}
        
        # Calcular APACHE II
        score, componentes, mortality_rate, interpretacao = calcular_apache2(parametros)
        
        # Preparar categoria
        if score >= 35:
            category = "risco extremamente alto"
        elif score >= 25:
            category = "risco muito alto"
        elif score >= 15:
            category = "risco alto"
        elif score >= 10:
            category = "risco moderado"
        else:
            category = "risco baixo"
        
        result = ScoreResult(
            score=score,
            category=category,
            mortality_risk=mortality_rate,
            interpretation="\n".join(interpretacao),
            component_scores=componentes,
            recommendations=[
                "APACHE II elevado: Considerar UTI e monitoramento contínuo.",
                "Avaliar diariamente a evolução dos componentes do escore."
            ] if score >= 15 else [
                "APACHE II baixo a moderado: Monitorar evolução clínica."
            ],
            abnormalities=[],
            is_critical=score >= 25,
            details={k: v for k, v in data.model_dump().items() if v is not None}
        )
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao calcular APACHE II: {str(e)}"
        )

@router.post("/metabolic", response_model=ElectrolyteResult)  # Reutilizando ElectrolyteResult como modelo de resposta
async def analyze_metabolic(
    data: MetabolicInput,
    current_user: Optional[UserModel] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analisa dados metabólicos (glicose, lipídios, função tireoidiana).
    """
    # Preparar dados para análise
    analysis_data = {}
    if data.glucose is not None:
        analysis_data['Glicemia'] = data.glucose
    if data.hba1c is not None:
        analysis_data['HbA1c'] = data.hba1c
    if data.cholesterol_total is not None:
        analysis_data['Colesterol'] = data.cholesterol_total
    if data.hdl is not None:
        analysis_data['HDL'] = data.hdl
    if data.ldl is not None:
        analysis_data['LDL'] = data.ldl
    if data.triglycerides is not None:
        analysis_data['Triglicerídeos'] = data.triglycerides
    if data.tsh is not None:
        analysis_data['TSH'] = data.tsh
    if data.t4 is not None:
        analysis_data['T4'] = data.t4
    
    # Chamar o analisador
    interpretations = analisar_metabolismo(analysis_data)
    
    # Processar resultados
    abnormalities = []
    is_critical = False
    
    for item in interpretations:
        if any(keyword in item.lower() for keyword in [
            "elevado", "baixo", "reduzido", "aumentado", "hiperglicemia", "hipoglicemia", 
            "acidemia", "acidose", "cetoacidose", "hiperlactatemia"
        ]):
            abnormalities.append(item)
        
        if any(keyword in item.lower() for keyword in ["crítico", "grave", "urgente", "severo", "emergência"]):
            is_critical = True
    
    result = ElectrolyteResult(  # Reutilizando este modelo
        interpretation="\n".join(interpretations),
        abnormalities=abnormalities,
        is_critical=is_critical,
        recommendations=[item for item in interpretations if any(kw in item.lower() for kw in ["considerar", "avaliar", "monitorar", "iniciar", "ajustar", "administrar"])],
        details=analysis_data
    )
    
    return result

@router.post("/renal", response_model=ElectrolyteResult)
async def analyze_renal(
    data: RenalInput,
    current_user: Optional[UserModel] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analisa função renal.
    Endpoint público, não requer autenticação.
    """
    # Preparar dados para análise
    analysis_data = {k: v for k, v in data.items() if k != 'patient_info' and v is not None}
    
    # Chamar o analisador
    interpretations = analisar_funcao_renal(analysis_data)
    
    # Processar resultados
    abnormalities = []
    is_critical = False
    
    for item in interpretations:
        if any(keyword in item.lower() for keyword in [
            "elevado", "elevação", "baixo", "reduzido", "alterado", "insuficiência",
            "nefropatia", "lesão renal", "uremia"
        ]):
            abnormalities.append(item)
        
        if any(keyword in item.lower() for keyword in ["crítico", "grave", "urgente", "severo"]):
            is_critical = True
    
    result = ElectrolyteResult(
        interpretation="\n".join(interpretations),
        abnormalities=abnormalities,
        is_critical=is_critical,
        recommendations=[item for item in interpretations if any(kw in item.lower() for kw in ["considerar", "avaliar", "monitorar", "ajustar", "diálise"])],
        details=analysis_data
    )
    
    return result

@router.post("/hepatic", response_model=ElectrolyteResult)
async def analyze_hepatic(
    data: HepaticInput,
    current_user: Optional[UserModel] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analisa função hepática.
    Endpoint público, não requer autenticação.
    """
    # Preparar dados para análise
    analysis_data = {k: v for k, v in data.items() if k != 'patient_info' and v is not None}
    
    # Chamar o analisador
    interpretations = analisar_funcao_hepatica(analysis_data)
    
    # Processar resultados
    abnormalities = []
    is_critical = False
    
    for item in interpretations:
        if any(keyword in item.lower() for keyword in [
            "elevado", "elevação", "baixo", "reduzido", "alterado", "hepatite",
            "citólise", "colestase", "insuficiência hepática"
        ]):
            abnormalities.append(item)
        
        if any(keyword in item.lower() for keyword in ["crítico", "grave", "urgente", "severo", "fulminante"]):
            is_critical = True
    
    result = ElectrolyteResult(
        interpretation="\n".join(interpretations),
        abnormalities=abnormalities,
        is_critical=is_critical,
        recommendations=[item for item in interpretations if any(kw in item.lower() for kw in ["considerar", "avaliar", "monitorar", "suspender", "ajustar"])],
        details=analysis_data
    )
    
    return result