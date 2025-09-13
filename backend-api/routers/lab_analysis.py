from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
import tempfile
import os
import json
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
from analyzers.inflammatory import analisar_marcadores_inflamatorios
from analyzers.coagulation import analisar_coagulacao
from analyzers.thyroid import analisar_funcao_tireoidiana
from analyzers.bone_metabolism import analisar_metabolismo_osseo
from analyzers.tumor_markers import analisar_marcadores_tumorais
from analyzers.autoimmune import analisar_marcadores_autoimunes
from analyzers.infectious_disease import analisar_marcadores_doencas_infecciosas
from analyzers.hormones import analisar_hormonios
from analyzers.drug_monitoring import analisar_monitoramento_medicamentos

from utils.severity_scores import calcular_sofa, calcular_qsofa, calcular_apache2
from utils.alert_system import AlertSystem
from utils.reference_ranges import REFERENCE_RANGES

# Import the BAML client and its types
from baml_client import b
from baml_client.types import (
    LabAnalysisInput as BamLabAnalysisInput,
    LabTestResult as BamLabTestResult,
    UserRole as BamUserRole,
    LabInsightsOutput as BamLabInsightsOutput
)

# Import PDF extractor
from extractors.pdf_extractor import extrair_campos_pagina, extrair_id
from extractors.fuzzy_matching import normalize_number

# Pydantic models for Dr. Corvus Insights (mirroring frontend types)
from enum import Enum
from pydantic import BaseModel, Field

class LabTestResultForAPI(BaseModel):
    test_name: str
    value: str
    unit: Optional[str] = None
    reference_range_low: Optional[str] = None
    reference_range_high: Optional[str] = None
    interpretation_flag: Optional[str] = None
    notes: Optional[str] = None

class UserRoleForAPI(str, Enum):
    PATIENT = "PATIENT"
    DOCTOR_STUDENT = "DOCTOR_STUDENT"

class LabAnalysisInputForAPI(BaseModel):
    lab_results: List[LabTestResultForAPI]
    user_role: UserRoleForAPI
    patient_context: Optional[str] = None
    specific_user_query: Optional[str] = None

class LabInsightsOutputFromAPI(BaseModel):
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

# Lab Analysis Endpoints

# Define specific routes first to avoid path conflicts
@router.post("/manual_guest") # New endpoint for manual JSON submission
async def analyze_manual_data_guest(
    manual_data_payload: LabAnalysisInputForAPI, # Expects a JSON body
    current_user: Optional[UserModel] = Depends(get_current_user)
):
    """
    Guest endpoint for manual lab data analysis via JSON body.
    """
    try:
        # Process manual data directly from the Pydantic model
        result = process_manual_data_transient(manual_data_payload.dict(), current_user)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing manual lab data: {str(e)}"
        )

@router.post("/guest")
async def analyze_lab_data_guest(
    analysis_type: str = Form(...),
    manualLabDataJSON: str = Form(None), # Keep this for form-data submission, for file uploads
    file: UploadFile = File(None),
    current_user: Optional[UserModel] = Depends(get_current_user)
):
    """
    Guest endpoint for lab analysis - supports both file upload and manual data.
    """
    try:
        if analysis_type == "manual_submission" and manualLabDataJSON:
            # Parse manual data
            manual_data = json.loads(manualLabDataJSON)

            # Process manual data
            result = process_manual_data_transient(manual_data, current_user)

            return result

        elif file:
            # Process uploaded file
            result = await process_uploaded_file_transient(file)

            return result

        else:
            raise HTTPException(
                status_code=400,
                detail="Either file upload or manual data is required"
            )

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Invalid JSON format in manualLabDataJSON"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error in lab analysis: {str(e)}"
        )

@router.post("/")
async def analyze_lab_file(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Analyze uploaded lab file (PDF/image) and return structured results.
    This endpoint processes files transiently without saving to database.
    """
    try:
        # Process the uploaded file using the transient function
        result = await process_uploaded_file_transient(file)

        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing lab file: {str(e)}"
        )

@router.post("/{patient_id}")
async def analyze_lab_file_for_patient(
    patient_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user_required)
):
    """
    Analyze uploaded lab file (PDF/image) for a specific patient.
    """
    # First, check if the patient exists and the user has access
    patient_in_db = db.query(UserModel).filter(UserModel.user_id == patient_id).first()
    if not patient_in_db:
        raise HTTPException(status_code=404, detail="Patient not found")

    # You might want to add more robust access control here,
    # e.g., current_user must be the patient themselves or a doctor with access.

    try:
        # Process the uploaded file using the transient function
        result = await process_uploaded_file_transient(file, patient_info={"patient_id": patient_id})
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing lab file for patient {patient_id}: {str(e)}"
        )


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
        'cálcio': 'electrolytes', 'cálcio ionizado': 'electrolytes',
        'magnésio': 'electrolytes', 'fósforo': 'electrolytes',
        # Blood Gas
        'ph': 'bloodGas', 'pco2': 'bloodGas', 'po2': 'bloodGas', 'hco3': 'bloodGas',
        'be': 'bloodGas', 'lactato': 'bloodGas', 'sato2': 'bloodGas', 'fio2': 'bloodGas',
        # Cardiac Markers
        'troponina': 'cardiac', 'ck': 'cardiac', 'ck-mb': 'cardiac', 'bnp': 'cardiac',
        'nt-probnp': 'cardiac', 'desidrogenase láctica': 'cardiac',
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
        # Pancreatic
        'amilase': 'pancreatic',
        'lipase': 'pancreatic',
        # New categories
        'tireoide': 'thyroid',
        'metabolismo_osseo': 'bone_metabolism',
        'marcadores_tumorais': 'tumor_markers',
        'autoimunes': 'autoimmune',
        'doencas_infecciosas': 'infectious_disease',
        'hormonios': 'hormones',
        'monitoramento_medicamentos': 'drug_monitoring',
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
        "vhs": "mm/h", "velocidade de hemossedimentação": "mm/h",
        "ttpa": "Segundos", "tempo de tromboplastina parcial ativada": "Segundos",

        # Urine
        "ph urinário": "", "ph urinario": "",
        "densidade": "", "densidade urinária": "",
        # New units from new analyzers
        "antitpo": "IU/mL", "anti-tpo": "IU/mL",
        "antitg": "IU/mL", "anti-tg": "IU/mL",
        "trab": "IU/L",
        "pth": "pg/mL",
        "vitd": "ng/mL", "vitamina d": "ng/mL",
        "psa": "ng/mL",
        "ca125": "U/mL",
        "cea": "ng/mL",
        "afp": "ng/mL",
        "ca19-9": "U/mL",
        "betahcg": "mIU/mL", "beta-hcg": "mIU/mL",
        "antidsdna": "IU/mL", "anti-dsdna": "IU/mL",
        "antism": "Index", "anti-sm": "Index",
        "antirnp": "Index", "anti-rnp": "Index",
        "antissa": "Index", "anti-ssa": "Index",
        "antissb": "Index", "anti-ssb": "Index",
        "anca": "AU/mL",
        "c3": "mg/dL",
        "c4": "mg/dL",
        "hiv": "Index",
        "hbsag": "Index",
        "antihbs": "mIU/mL", "anti-hbs": "mIU/mL",
        "antihbc": "Index", "anti-hbc": "Index",
        "hcv": "Index",
        "sifilis": "Index",
        "ebv": "Index",
        "cmv": "Index",
        "toxo": "Index", "toxoplasma": "Index",
        "cortisol": "µg/dL", "cortisol_am": "µg/dL", "cortisol_pm": "µg/dL",
        "prolactina": "ng/mL",
        "testosterona": "ng/dL",
        "estradiol": "pg/mL",
        "progesterona": "ng/mL",
        "lh": "mIU/mL",
        "fsh": "mIU/mL",
        "dheas": "µg/dL", "dhea-s": "µg/dL",
        "digoxina": "ng/mL",
        "fenitoina": "µg/mL",
        "carbamazepina": "µg/mL",
        "acido valproico": "µg/mL", "valproic acid": "µg/mL",
        "litio": "mEq/L",
        "gentamicina": "µg/mL",
        "vancomicina": "µg/mL",
        "teofilina": "µg/mL",
    }
    
    nome_campo_lower = nome_campo.lower().strip()
    
    # Prioritize direct match
    if nome_campo_lower in unidades:
        return unidades[nome_campo_lower]
    
    # Fallback: check if any key is part of nome_campo_lower (longest keys first to avoid "p" in "tgp")
    sorted_keys = sorted(unidades.keys(), key=len, reverse=True)
    for campo_key in sorted_keys:
        if len(campo_key) == 1 and campo_key != nome_campo_lower:
            continue
        if campo_key in nome_campo_lower:
            return unidades[campo_key]
            
    return ""

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
        "vhs": REFERENCE_RANGES.get('VHS_Male'), "velocidade de hemossedimentação": REFERENCE_RANGES.get('VHS_Male'),
        "ttpa": REFERENCE_RANGES.get('TTPA'), "tempo de tromboplastina parcial ativada": REFERENCE_RANGES.get('TTPA'),

        # New categories
        'tsh': REFERENCE_RANGES.get('TSH'), 'hormônio tireoestimulante': REFERENCE_RANGES.get('TSH'),
        't4l': REFERENCE_RANGES.get('T4L'), 't4 livre': REFERENCE_RANGES.get('T4L'),
        't3l': REFERENCE_RANGES.get('T3L'), 't3 livre': REFERENCE_RANGES.get('T3L'),
        'antitpo': REFERENCE_RANGES.get('AntiTPO'), 'anti-tpo': REFERENCE_RANGES.get('AntiTPO'),
        'antitg': REFERENCE_RANGES.get('AntiTG'), 'anti-tg': REFERENCE_RANGES.get('AntiTG'),
        'trab': REFERENCE_RANGES.get('TRAb'),

        'pth': REFERENCE_RANGES.get('PTH'),
        'vitd': REFERENCE_RANGES.get('VitD'), 'vitamina d': REFERENCE_RANGES.get('VitD'),
        'ionisedcalcium': REFERENCE_RANGES.get('IonizedCalcium'), 'cálcio ionizado': REFERENCE_RANGES.get('IonizedCalcium'),

        'psa': REFERENCE_RANGES.get('PSA'),
        'ca125': REFERENCE_RANGES.get('CA125'),
        'cea': REFERENCE_RANGES.get('CEA'),
        'afp': REFERENCE_RANGES.get('AFP'),
        'ca19-9': REFERENCE_RANGES.get('CA19-9'),
        'betahcg': REFERENCE_RANGES.get('BetaHCG'), 'beta-hcg': REFERENCE_RANGES.get('BetaHCG'),

        'antidsdna': REFERENCE_RANGES.get('AntiDsDNA'), 'anti-dsdna': REFERENCE_RANGES.get('AntiDsDNA'),
        'antism': REFERENCE_RANGES.get('AntiSm'), 'anti-sm': REFERENCE_RANGES.get('AntiSm'),
        'antirnp': REFERENCE_RANGES.get('AntiRNP'), 'anti-rnp': REFERENCE_RANGES.get('AntiRNP'),
        'antissa': REFERENCE_RANGES.get('AntiSSA'), 'anti-ssa': REFERENCE_RANGES.get('AntiSSA'),
        'antissb': REFERENCE_RANGES.get('AntiSSB'), 'anti-ssb': REFERENCE_RANGES.get('AntiSSB'),
        'anca': REFERENCE_RANGES.get('ANCA'),
        'c3': REFERENCE_RANGES.get('C3'),
        'c4': REFERENCE_RANGES.get('C4'),

        'hiv': REFERENCE_RANGES.get('HIV'),
        'hbsag': REFERENCE_RANGES.get('HBsAg'),
        'antihbs': REFERENCE_RANGES.get('AntiHBs'), 'anti-hbs': REFERENCE_RANGES.get('AntiHBs'),
        'antihbc': REFERENCE_RANGES.get('AntiHBc'), 'anti-hbc': REFERENCE_RANGES.get('AntiHBc'),
        'hcv': REFERENCE_RANGES.get('HCV'),
        'sifilis': REFERENCE_RANGES.get('Syphilis'),
        'ebv': REFERENCE_RANGES.get('EBV'),
        'cmv': REFERENCE_RANGES.get('CMV'),
        'toxo': REFERENCE_RANGES.get('Toxo'), 'toxoplasma': REFERENCE_RANGES.get('Toxo'),

        'cortisol': REFERENCE_RANGES.get('Cortisol_AM'), 'cortisol_am': REFERENCE_RANGES.get('Cortisol_AM'),
        'cortisol_pm': REFERENCE_RANGES.get('Cortisol_PM'),
        'prolactina': REFERENCE_RANGES.get('Prolactin'),
        'testosterona': REFERENCE_RANGES.get('Testosterone'),
        'estradiol': REFERENCE_RANGES.get('Estradiol'),
        'progesterona': REFERENCE_RANGES.get('Progesterone'),
        'lh': REFERENCE_RANGES.get('LH'),
        'fsh': REFERENCE_RANGES.get('FSH'),
        'dheas': REFERENCE_RANGES.get('DHEAS'), 'dhea-s': REFERENCE_RANGES.get('DHEAS'),

        'digoxin': REFERENCE_RANGES.get('Digoxin'),
        'phenytoin': REFERENCE_RANGES.get('Phenytoin'),
        'carbamazepine': REFERENCE_RANGES.get('Carbamazepine'),
        'valproicacid': REFERENCE_RANGES.get('ValproicAcid'), 'acido valproico': REFERENCE_RANGES.get('ValproicAcid'),
        'lithium': REFERENCE_RANGES.get('Lithium'),
        'gentamicin': REFERENCE_RANGES.get('Gentamicin'),
        'vancomycin': REFERENCE_RANGES.get('Vancomycin'),
        'theophylline': REFERENCE_RANGES.get('Theophylline'),
    }
    
    nome_campo_lower = nome_campo.lower().strip()
    
    # Prioritize direct match in our map
    ref_tuple = map_to_std_ranges.get(nome_campo_lower)
    if ref_tuple is not None:
        return ref_tuple

    # Fallback: check if any key from map_to_std_ranges is IN nome_campo_lower
    sorted_map_keys = sorted(map_to_std_ranges.keys(), key=len, reverse=True)
    for key_map in sorted_map_keys:
        val_map = map_to_std_ranges[key_map]
        if len(key_map) == 1 and key_map != nome_campo_lower:
            continue
        if key_map in nome_campo_lower and val_map is not None:
            return val_map
            
    return None, None

def _is_critically_low(test_key: str, value: float, ref_min: float) -> bool:
    """
    Determine if a low value is critically dangerous based on clinical thresholds.
    """
    test_key_lower = test_key.lower()
    
    # Critical low thresholds for key lab values
    critical_thresholds = {
        'k+': 2.5,           # Severe hypokalemia - risk of arrhythmias
        'potássio': 2.5,
        'na+': 120,          # Severe hyponatremia - risk of cerebral edema
        'sódio': 120,
        'ph': 7.20,          # Severe acidosis - life-threatening
        'hb': 6.0,           # Severe anemia
        'hemoglobina': 6.0,
        'plaq': 20000,       # Severe thrombocytopenia - bleeding risk
        'plaquetas': 20000,
        'glicose': 40,       # Severe hypoglycemia
        'creat': 5.0,        # Severe renal failure
        'creatinina': 5.0,
        'ca+': 7.0,          # Severe hypocalcemia - tetany risk
        'cálcio': 7.0,
        'ica': 0.8,          # Severe ionized hypocalcemia
        'mg+': 1.0,          # Severe hypomagnesemia - arrhythmia risk
        'magnésio': 1.0,
    }
    
    # Check if the value is below critical threshold
    for key_pattern, critical_val in critical_thresholds.items():
        if key_pattern in test_key_lower:
            return value < critical_val
    
    # For other tests, consider critically low if < 50% of reference minimum
    return value < (ref_min * 0.5)

def _is_critically_high(test_key: str, value: float, ref_max: float) -> bool:
    """
    Determine if a high value is critically dangerous based on clinical thresholds.
    """
    test_key_lower = test_key.lower()
    
    # Critical high thresholds for key lab values
    critical_thresholds = {
        'k+': 6.5,           # Severe hyperkalemia - cardiac arrest risk
        'potássio': 6.5,
        'na+': 160,          # Severe hypernatremia - neurological risk
        'sódio': 160,
        'ph': 7.60,          # Severe alkalosis - life-threatening
        'lactato': 4.0,      # Severe hyperlactatemia - tissue hypoperfusion
        'creat': 5.0,        # Severe renal failure
        'creatinina': 5.0,
        'ur': 200,           # Severe uremia
        'ureia': 200,
        'pcr': 20.0,         # Severe inflammation/sepsis
        'bt': 20.0,          # Severe hyperbilirubinemia
        'bilirrubina': 20.0,
        'leuco': 50000,      # Severe leukocytosis - possible leukemia
        'leucócitos': 50000,
        'troponina': 10.0,   # Massive myocardial infarction
        'ca+': 13.0,         # Severe hypercalcemia - hypercalcemic crisis
        'cálcio': 13.0,
    }
    
    # Check if the value is above critical threshold
    for key_pattern, critical_val in critical_thresholds.items():
        if key_pattern in test_key_lower:
            return value > critical_val
    
    # For other tests, consider critically high if > 300% of reference maximum
    return value > (ref_max * 3.0)

def _determine_qualitative_flag(test_key: str, value_text: str) -> str:
    """
    Determine interpretation flag for qualitative/text results.
    """
    if not value_text:
        return "Normal"
    
    value_lower = value_text.lower().strip()
    
    # Positive/abnormal indicators
    if any(indicator in value_lower for indicator in [
        'positivo', 'positive', 'reagente', 'presente', 'detectado',
        'elevado', 'alto', 'aumentado', 'anormal'
    ]):
        # Check if critically positive
        if any(critical in value_lower for critical in [
            'muito alto', 'extremamente', 'crítico', 'severo', 'grave'
        ]):
            return "Crítico"
        else:
            return "Alto"
    
    # Negative/normal indicators
    elif any(indicator in value_lower for indicator in [
        'negativo', 'negative', 'não reagente', 'ausente', 'não detectado',
        'normal', 'dentro dos limites'
    ]):
        return "Normal"
    
    # Default for unclear qualitative results
    return "Normal"

# --- END COPIED HELPER FUNCTIONS ---

# --- TRANSIENT PROCESSING FUNCTIONS ---

import locale

async def process_uploaded_file_transient(file: UploadFile, patient_info: Optional[Dict[str, Any]] = None, general_notes: Optional[str] = None) -> Dict[str, Any]:
    """
    Processes an uploaded file for transient analysis without DB saving.
    Extracts data, runs analyzers, generates (but does not save) alerts.
    """
    temp_pdf_path = None
    original_locale = locale.getlocale(locale.LC_NUMERIC) # Store original locale
    try:
        # Set locale to 'C' for numeric conversions to ensure dot is always decimal separator
        locale.setlocale(locale.LC_NUMERIC, 'C')

        # Validate file type (more robustly perhaps)
        if not file.filename.lower().endswith(('.pdf', '.jpg', '.jpeg', '.png')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Apenas arquivos PDF, JPG, JPEG, ou PNG são aceitos para análise de arquivo."
            )
        
        content = await file.read()
        if len(content) > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Arquivo muito grande. O tamanho máximo é 25MB."
            )
        
        fd, temp_file_path = tempfile.mkstemp(suffix=os.path.splitext(file.filename)[1])
        with open(temp_file_path, 'wb') as f:
            f.write(content)
        os.close(fd)

        print(f"Attempting to extract data from transient file: {temp_file_path}")

        # Extract patient information first
        patient_info_extracted = extrair_id(temp_file_path)
        print(f"DEBUG: Extracted patient info: {patient_info_extracted}")

        resultados_extraidos_lista = extrair_campos_pagina(temp_file_path)
        print(f"DEBUG TTPA/VHS: Raw extraction results (resultados_extraidos_lista): {json.dumps(resultados_extraidos_lista, indent=2)}")

        dados_consolidados = {}
        for pagina_dict in resultados_extraidos_lista:
            dados_consolidados.update(pagina_dict)
        
        dados_numericos = {}
        extracted_lab_results_for_response: List[LabResult] = []

        for test_key, valor_str in dados_consolidados.items():
            val_num = None
            val_txt = str(valor_str)
            try:
                # Use the already robust normalize_number function
                # This function handles different decimal separators and thousands separators
                normalized_val_str = normalize_number(str(valor_str))
                val_num = float(normalized_val_str) # This float conversion is now locale-agnostic
            except (ValueError, AttributeError):
                val_num = None # Ensure val_num is None if conversion fails

            unit = obter_unidade(test_key)
            ref_min, ref_max = obter_valores_referencia(test_key)
            is_abnormal = False
            interpretation_flag = "Normal"  # Default value
            
            if val_num is not None and ref_min is not None and ref_max is not None:
                is_abnormal = val_num < ref_min or val_num > ref_max
                
                # CRITICAL FIX: Set proper interpretation flags based on abnormality
                if is_abnormal:
                    if val_num < ref_min:
                        # Determine if critically low
                        if _is_critically_low(test_key, val_num, ref_min):
                            interpretation_flag = "Crítico"
                        else:
                            interpretation_flag = "Baixo"
                    elif val_num > ref_max:
                        # Determine if critically high
                        if _is_critically_high(test_key, val_num, ref_max):
                            interpretation_flag = "Crítico"
                        else:
                            interpretation_flag = "Alto"
                else:
                    interpretation_flag = "Normal"
            elif val_num is None and val_txt is not None:
                # Handle qualitative results
                interpretation_flag = _determine_qualitative_flag(test_key, val_txt)
            
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
        print("DEBUG: Extracted test names and their determined categories:")
        for lr in extracted_lab_results_for_response:
            cat_key = determinar_categoria(lr.test_name)
            print(f"  - Test Name: '{lr.test_name}', Determined Category: '{cat_key}'")
            test_to_category_map[lr.test_name] = cat_key
            all_category_keys_found.add(cat_key)
        print("DEBUG: End of test name categorization.")

        grouped_data_for_analyzers: Dict[str, Dict[str, Any]] = {}
        # Populate grouped_data_for_analyzers using the definitive map
        for lr in extracted_lab_results_for_response:
            category_key = test_to_category_map.get(lr.test_name)
            if category_key:
                if category_key not in grouped_data_for_analyzers:
                    grouped_data_for_analyzers[category_key] = {}
                # Store the value that the analyzer expects (numeric or text)
                # Use the numeric value if available, otherwise the text value
                value_for_analyzer = lr.value_numeric if lr.value_numeric is not None else lr.value_text
                grouped_data_for_analyzers[category_key][lr.test_name] = value_for_analyzer


        analysis_results_from_backend: Dict[str, Any] = {}
        ANALYZER_FUNCTIONS = {
            "bloodGas": analisar_gasometria, "electrolytes": analisar_eletrolitos,
            "hematology": analisar_hemograma, "renal": analisar_funcao_renal,
            "hepatic": analisar_funcao_hepatica, "cardiac": analisar_marcadores_cardiacos,
            "metabolic": analisar_metabolismo, "microbiology": analisar_microbiologia,
            "pancreatic": analisar_funcao_pancreatica,
            "inflammation": analisar_marcadores_inflamatorios,
            "coagulation": analisar_coagulacao,
            "thyroid": analisar_funcao_tireoidiana,
            "bone_metabolism": analisar_metabolismo_osseo,
            "tumor_markers": analisar_marcadores_tumorais,
            "autoimmune": analisar_marcadores_autoimunes,
            "infectious_disease": analisar_marcadores_doencas_infecciosas,
            "hormones": analisar_hormonios,
            "drug_monitoring": analisar_monitoramento_medicamentos
        }
        
        effective_patient_info = patient_info.copy() if patient_info else {}
        if general_notes:
            effective_patient_info['general_notes'] = general_notes

        for category_key, data_for_analyzer in grouped_data_for_analyzers.items():
            analyzer_function = ANALYZER_FUNCTIONS.get(category_key)
            if analyzer_function:
                try:
                    analyzer_payload = data_for_analyzer.copy()
                    
                    # Prepare specific context arguments for analyzers
                    analyzer_context_args = {}
                    if analyzer_function.__name__ == 'analisar_hemograma':
                        if 'sexo' in effective_patient_info:
                            analyzer_context_args['sexo'] = effective_patient_info['sexo']
                    # Add elif blocks for other analyzers if they accept specific known context keys
                    # e.g., elif analyzer_function.__name__ == 'analisar_funcao_renal':
                    #     if 'idade' in effective_patient_info:
                    #         analyzer_context_args['idade'] = effective_patient_info['idade']

                    print(f"Calling analyzer {analyzer_function.__name__} for {category_key} with data: {analyzer_payload} and specific context: {analyzer_context_args}")
                    
                    # Call analyzer: only pass **analyzer_context_args if it's not empty
                    if analyzer_context_args:
                        result = analyzer_function(analyzer_payload, **analyzer_context_args)
                    else:
                        result = analyzer_function(analyzer_payload)
                        
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
        all_categories_to_process.update(all_category_keys_found)

        for category_key in all_categories_to_process:
            # Get analyzer output for this category, if any
            backend_result_data = analysis_results_from_backend.get(category_key, {})

            # Collect lab results for THIS category using the definitive map
            labs_for_this_category = []
            for lr in extracted_lab_results_for_response:
                if test_to_category_map.get(lr.test_name) == category_key:
                    labs_for_this_category.append(lr)
            
            if category_key == "pancreatic":
                print(f"DEBUG PANCREATIC: category_key = {category_key}")
                print(f"DEBUG PANCREATIC: backend_result_data = {backend_result_data}")
                print(f"DEBUG PANCREATIC: labs_for_this_category ({len(labs_for_this_category)} items) = {labs_for_this_category}")

            has_analyzer_interpretation = category_key in analysis_results_from_backend and \
                                         any(analysis_results_from_backend[category_key].get(k) 
                                             for k in ["interpretation", "abnormalities", "recommendations"] 
                                             if analysis_results_from_backend[category_key].get(k) not in [None, []])


            if not labs_for_this_category and not has_analyzer_interpretation and category_key != "outros":
                continue

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
                del final_analysis_results_for_api["outros"]
            elif outros_labs_exist and (not outros_data.get("interpretation") or outros_data.get("interpretation") in ["Interpretação não disponível.", "Nenhum resultado ou análise nesta categoria."]):
                outros_data["interpretation"] = "Resultados não categorizados ou diversos."
        
        # Extract patient information from the tuple returned by extrair_id
        patient_name = None
        exam_date = None
        exam_time = None
        if patient_info_extracted and len(patient_info_extracted) >= 3:
            patient_name, exam_date, exam_time = patient_info_extracted[:3]

        return {
            "message": "Arquivo processado e analisado transitoriamente.",
            "filename": file.filename,
            "patient_name": patient_name,
            "exam_date": exam_date,
            "exam_time": exam_time,
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
        # Restore original locale
        locale.setlocale(locale.LC_NUMERIC, original_locale)

def process_manual_data_transient(manual_data_payload: Dict[str, Any], current_user: Optional[UserModel] = None, patient_info_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Processes manual lab data for transient analysis without DB saving.
    The payload is expected to be the parsed JSON from frontend's manualLabData.
    It includes 'lab_results_grouped' which is client-side structured analysis.
    Backend analyzers are re-run on this data after mapping keys.
    """
    original_locale = locale.getlocale(locale.LC_NUMERIC) # Store original locale
    try:
        # Set locale to 'C' for numeric conversions to ensure dot is always decimal separator
        locale.setlocale(locale.LC_NUMERIC, 'C')

        client_lab_results_grouped = manual_data_payload.get("lab_results_grouped", {})
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
        for lr_manual in manual_lab_results_input:
            test_name_frontend = lr_manual.get("test_name")
            # Value can be numeric or text, analyzers should handle this
            # Check for "value" field first (as sent by frontend), then fallback to value_numeric/value_text
            val_input = lr_manual.get("value")
            if val_input is None:
                val_input = lr_manual.get("value_numeric") if lr_manual.get("value_numeric") is not None else lr_manual.get("value_text")
            
            unit = lr_manual.get("unit")
            ref_low_str = lr_manual.get("reference_range_low")
            ref_high_str = lr_manual.get("reference_range_high")
            
            val_num_for_schema = None
            val_txt_for_schema = None
            if isinstance(val_input, (int, float)):
                val_num_for_schema = float(val_input) # This float conversion is now locale-agnostic
            elif isinstance(val_input, str):
                # Ensure string values are normalized before converting to float
                try:
                    normalized_val_str = normalize_number(val_input)
                    val_num_for_schema = float(normalized_val_str)
                except (ValueError, AttributeError):
                    val_num_for_schema = None
                    val_txt_for_schema = str(val_input) if val_input is not None else None
            else:
                val_txt_for_schema = str(val_input) if val_input is not None else None


            if test_name_frontend:
                backend_key = FRONTEND_TO_BACKEND_KEY_MAP.get(test_name_frontend, test_name_frontend)
                mapped_dados_for_backend[backend_key] = val_input
                
                # CRITICAL FIX: Set proper interpretation flags for manual data processing
                interpretation_flag = "Normal"  # Default value
                ref_low = float(ref_low_str) if ref_low_str is not None else None
                ref_high = float(ref_high_str) if ref_high_str is not None else None
                
                if val_num_for_schema is not None and ref_low is not None and ref_high is not None:
                    is_abnormal = val_num_for_schema < ref_low or val_num_for_schema > ref_high
                    
                    if is_abnormal:
                        if val_num_for_schema < ref_low:
                            # Determine if critically low
                            if _is_critically_low(backend_key, val_num_for_schema, ref_low):
                                interpretation_flag = "Crítico"
                            else:
                                interpretation_flag = "Baixo"
                        elif val_num_for_schema > ref_high:
                            # Determine if critically high
                            if _is_critically_high(backend_key, val_num_for_schema, ref_high):
                                interpretation_flag = "Crítico"
                            else:
                                interpretation_flag = "Alto"
                    else:
                        interpretation_flag = "Normal"
                elif val_num_for_schema is None and val_txt_for_schema is not None:
                    # Handle qualitative results
                    interpretation_flag = _determine_qualitative_flag(backend_key, val_txt_for_schema)
                
                lab_result_obj = LabResult(
                    result_id=-1, patient_id=-1, exam_id=None, user_id=None,
                    test_name=test_name_frontend,
                    timestamp=exam_datetime,
                    value_numeric=val_num_for_schema,
                    value_text=val_txt_for_schema,
                    unit=unit,
                    reference_range_low=ref_low,
                    reference_range_high=ref_high,
                    created_at=datetime.utcnow()
                )
                processed_lab_results_for_response.append(lab_result_obj)
        
        backend_analysis_results_temp = {}
        ANALYZERS_MAP = {
            "gasometria": analisar_gasometria, "eletrolitos": analisar_eletrolitos, 
            "hemograma": analisar_hemograma, "funcao_renal": analisar_funcao_renal, 
            "funcao_hepatica": analisar_funcao_hepatica, "marcadores_cardiacos": analisar_marcadores_cardiacos, 
            "metabolismo": analisar_metabolismo, "microbiologia": analisar_microbiologia, 
            "funcao_pancreatica": analisar_funcao_pancreatica, 
            "marcadores_inflamatorios": analisar_marcadores_inflamatorios, 
            "coagulacao": analisar_coagulacao,
            "thyroid": analisar_funcao_tireoidiana,
            "metabolismo_osseo": analisar_metabolismo_osseo,
            "marcadores_tumorais": analisar_marcadores_tumorais,
            "autoimunes": analisar_marcadores_autoimunes,
            "doencas_infecciosas": analisar_marcadores_doencas_infecciosas,
            "hormonios": analisar_hormonios,
            "monitoramento_medicamentos": analisar_monitoramento_medicamentos
        }

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
            "coagulacao": "coagulation",
            "thyroid": "thyroid",
            "metabolismo_osseo": "bone_metabolism",
            "marcadores_tumorais": "tumor_markers",
            "autoimunes": "autoimmune",
            "doencas_infecciosas": "infectious_disease",
            "hormonios": "hormones",
            "monitoramento_medicamentos": "drug_monitoring"
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
            # Correctly use the internal_key from ANALYZERS_MAP to look up the API key
            api_key = ANALYZER_INTERNAL_KEY_TO_API_KEY.get(internal_key, internal_key)

            try:
                analyzer_context_args = {}
                if analyzer_function.__name__ == 'analisar_hemograma':
                    if 'sexo' in effective_patient_context_for_analyzers:
                        analyzer_context_args['sexo'] = effective_patient_context_for_analyzers['sexo']
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
                elif analyzer_function.__name__ == 'analisar_gasometria' and isinstance(analysis_output, dict) and not analysis_output:
                    is_placeholder_result = True
                elif isinstance(analysis_output, dict):
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
                        "não foi possível gerar uma interpretação para os marcadores inflamatórios.",
                        "nenhum marcador inflamatório comum (pcr, vhs) fornecido ou reconhecido para análise."
                        # Add more specific phrases from your analyzers if they return unique "no data" messages.
                    ]
                    if interpretation in placeholder_phrases:
                        is_placeholder_result = True
                
                if not is_placeholder_result:
                    backend_analysis_results_temp[api_key] = analysis_output
            except Exception as e:
                error_message = f"Error running analyzer for {api_key} with function {analyzer_function.__name__}: {e}"
                print(error_message)
                backend_analysis_results_temp[api_key] = {
                    "error": str(e),
                    "interpretation": f"Erro ao analisar {api_key}: {str(e)}",
                    "abnormalities": [], "is_critical": False,
                    "recommendations": ["Contactar suporte."],
                    "details": { "error_details": str(e) }
                }
                
        return {
            "message": "Dados manuais processados e analisados transitoriamente.",
            "lab_results": processed_lab_results_for_response,
            "analysis_results": backend_analysis_results_temp,
            "generated_alerts": [],
            "exam_timestamp": exam_date_str
        }
    except Exception as e:
        print(f"Error in process_manual_data_transient: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao processar dados manualmente: {str(e)}")
    finally:
        # Restore original locale
        locale.setlocale(locale.LC_NUMERIC, original_locale)