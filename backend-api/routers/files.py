from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import os
import shutil
import uuid
from datetime import datetime
import tempfile
import logging

from database import get_db
from database.models import User, Patient, LabResult, TestCategory
import schemas.patient as patient_schemas
import schemas.lab_result as lab_result_schemas
from security import get_current_user, get_current_user_required

# Add the src directory to the path so we can import the original project modules
# sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

# Import the extractors from the original project
from extractors.pdf_extractor import extrair_campos_pagina, extrair_id
from extractors.regex_patterns import CAMPOS_DESEJADOS
from utils.rate_limit import limiter

router = APIRouter()

# Configurar logging
logger = logging.getLogger(__name__)

# Diretório para armazenar PDFs temporariamente (em produção, use um serviço de armazenamento adequado)
TEMP_UPLOAD_DIR = os.path.join(tempfile.gettempdir(), "clinical_helper_uploads")
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)

# --- Processamento de PDFs ---

@router.post("/upload/{patient_id}", response_model=Dict[str, Any])
async def upload_pdf(
    patient_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Faz upload de um arquivo PDF com resultados de exames para um paciente.
    Requer autenticação. O arquivo é processado em segundo plano.
    """
    # Verificar se o paciente existe e pertence ao usuário
    patient = db.query(Patient).filter(
        Patient.patient_id == patient_id,
        Patient.user_id == current_user.user_id
    ).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente não encontrado"
        )
    
    # Verificar se o arquivo é um PDF
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Somente arquivos PDF são aceitos"
        )
    
    # Gerar um nome único para o arquivo
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(TEMP_UPLOAD_DIR, unique_filename)
    
    # Verificar tamanho do arquivo
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Arquivo muito grande. O tamanho máximo é 10MB."
        )
        
    # Reposicionar o cursor para o início após leitura
    await file.seek(0)
    
    # Salvar o arquivo temporariamente
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(content)  # Usar o conteúdo já lido
    except Exception as e:
        logger.error(f"Erro ao salvar arquivo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar arquivo: {str(e)}"
        )
    
    # Iniciar processamento em segundo plano
    background_tasks.add_task(
        process_pdf_file,
        file_path=file_path,
        patient_id=patient_id,
        user_id=current_user.user_id,
        db=db
    )
    
    return {
        "status": "success",
        "message": "Arquivo enviado e sendo processado",
        "filename": file.filename,
        "patient_id": patient_id
    }

# --- Rotas públicas sem autenticação ---

# Endpoint de upload para convidados que não requer autenticação
# Movido para um caminho raiz para garantir que não seja interceptado por middlewares de autenticação
@router.post("/guest-upload", response_model=Dict[str, Any])
@limiter.limit("5/minute")
async def upload_pdf_guest(
    request: Request,
    file: UploadFile = File(...),
):
    """
    Faz upload de um arquivo PDF com resultados de exames no modo convidado.
    Não requer autenticação. Retorna os resultados extraídos sem salvá-los no banco de dados.
    """
    # Verificar se o arquivo é um PDF
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Somente arquivos PDF são aceitos"
        )
    
    # Verificar tamanho do arquivo
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Arquivo muito grande. O tamanho máximo é 10MB."
        )
        
    # Reposicionar o cursor para o início após leitura
    await file.seek(0)
    
    # Gerar um nome único para o arquivo
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(TEMP_UPLOAD_DIR, unique_filename)
    
    # Salvar o arquivo temporariamente
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(content)  # Usar o conteúdo já lido
    except Exception as e:
        logger.error(f"Erro ao salvar arquivo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar arquivo: {str(e)}"
        )
    
    # Processar o PDF e extrair resultados (mas não salvar no banco)
    try:
        # Usar os extratores do projeto original
        nome_paciente, data_coleta, hora_coleta = extrair_id(file_path)
        
        # Extrair resultados de todas as páginas
        resultados_paginas = extrair_campos_pagina(file_path)
        
        # Debug: Log extracted pages
        logger.debug(f"Extracted pages results: {resultados_paginas}")

        results_list = []
        for pagina_result in resultados_paginas:
            for campo, valor in pagina_result.items():
                if valor and valor.strip():
                    # Determinar a categoria com base no nome do campo
                    categoria_nome = determinar_categoria(campo)
                    categoria = db.query(TestCategory).filter(TestCategory.name == categoria_nome).first()
                    if not categoria:
                        categoria = TestCategory(name=categoria_nome)
                        db.add(categoria)
                        db.flush() # Get the ID

                    # Tentar converter para valor numérico
                    try:
                        # Replace comma with dot for decimal conversion
                        valor_numerico = float(valor.replace(',', '.'))
                    except (ValueError, TypeError):
                        valor_numerico = None

                    # Encontrar valor de referência e unidade
                    ref_min, ref_max = obter_valores_referencia(campo)
                    unidade = obter_unidade(campo)
                    
                    # Create schema for DB operation
                    lab_result_data = lab_result_schemas.LabResultCreate(
                        test_name=campo,
                        value_string=valor,
                        value_numeric=valor_numerico,
                        unit=unidade,
                        reference_range_low=ref_min,
                        reference_range_high=ref_max,
                        timestamp=f"{data_coleta} {hora_coleta}" if data_coleta != "Data não encontrada" else datetime.now().strftime("%Y-%m-%d %H:%M:%S"), # Use standard ISO format
                        patient_id=patient_id,
                        user_id=current_user.user_id,
                        category_id=categoria.category_id # Link to category
                    )
                    
                    # Adicionar ao banco de dados
                    db_lab_result = LabResult(**lab_result_data.model_dump())
                    db.add(db_lab_result)
                    results_list.append(lab_result_data) # Append schema for potential return
        
        # Excluir o arquivo após o processamento
        os.remove(file_path)
        
        # Commit changes
        try:
            db.commit()
            logger.info(f"Successfully processed and saved lab results for patient {patient_id} from file {file_path}")
        except Exception as e:
            db.rollback()
            logger.error(f"Error committing lab results for patient {patient_id}: {str(e)}")
        
        return {
            "status": "success",
            "message": "Arquivo processado com sucesso",
            "filename": file.filename,
            "patient_name": nome_paciente,
            "collection_date": data_coleta,
            "collection_time": hora_coleta,
            "results": results_list
        }
    except Exception as e:
        # Tentar excluir o arquivo em caso de erro
        try:
            os.remove(file_path)
        except:
            pass
        
        logger.error(f"Erro ao processar PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao extrair dados do PDF: {str(e)}"
        )

# Manter o endpoint antigo para compatibilidade, mas com redirecionamento
@router.post("/upload/guest", response_model=Dict[str, Any])
@limiter.limit("5/minute")
async def upload_pdf_guest_legacy(
    request: Request, # Add request as the first argument
    file: UploadFile = File(...),
):
    """
    Endpoint legado para compatibilidade.
    Redireciona para o novo endpoint /guest-upload.
    """
    # Simplesmente chama o novo endpoint
    return await upload_pdf_guest(request, file) # Pass request to the new endpoint

@router.get("/status/{task_id}", response_model=Dict[str, Any])
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user_required)
):
    """
    Verifica o status de uma tarefa de processamento de PDF.
    Requer autenticação.
    """
    # Numa implementação real, você verificaria o status da tarefa no Celery
    # Por enquanto, retorna um status fictício
    return {
        "task_id": task_id,
        "status": "completed",  # ou "processing", "failed"
        "message": "Processamento concluído"
    }

# --- Funções auxiliares ---

def determinar_categoria(nome_campo: str) -> str:
    """
    Determina a categoria de um exame com base no nome do campo.
    """
    categorias = {
        "hemograma": ["Hemoglobina", "Hematócrito", "Leucócitos", "Plaquetas", "Eritrócitos", "VCM", "HCM", "CHCM", "RDW", "Leucocitos", "Hematocrito"],
        "bioquimica": ["Ureia", "Creatinina", "Sódio", "Potássio", "Cloro", "Cálcio", "Fósforo", "Magnésio", "Bilirrubina", "AST", "ALT", "Fosfatase Alcalina", "GGT", "Proteínas Totais", "Albumina", "Glicose", "Colesterol", "Triglicerídeos", "HDL", "LDL", "TGO", "TGP", "Sodio"],
        "gasometria": ["pH", "pCO2", "pO2", "HCO3", "BE", "Lactato", "SatO2", "FiO2"],
        "coagulacao": ["TP", "INR", "TTPA", "Fibrinogênio", "D-dímero"],
        "urina": ["pH Urinário", "Densidade", "Proteinuria", "Glicosúria", "Cetonuria", "Nitrito", "Leucocituria", "Hematuria", "pH Urinario"]
    }
    
    # Check for "pH Urinario" or "pH Urinário" specifically first
    nome_campo_lower = nome_campo.lower()
    if "ph urinario" in nome_campo_lower or "ph urinário" in nome_campo_lower:
        return "urina"
    
    # Primeiro procurar uma correspondência exata
    for categoria, campos in categorias.items():
        for campo in campos:
            if campo.lower() == nome_campo_lower:
                return categoria
    
    # Se não encontrar correspondência exata, procurar por correspondência parcial
    for categoria, campos in categorias.items():
        if any(campo.lower() in nome_campo_lower for campo in campos):
            return categoria
            
    return "outros"

def obter_unidade(nome_campo: str) -> str:
    """
    Retorna a unidade de medida comum para o campo especificado.
    """
    unidades = {
        "Hemoglobina": "g/dL",
        "Hematócrito": "%",
        "Hematocrito": "%",
        "Leucócitos": "/mm³",
        "Leucocitos": "/mm³",
        "Plaquetas": "/mm³",
        "Eritrócitos": "milhões/mm³",
        "VCM": "fL",
        "HCM": "pg",
        "CHCM": "g/dL",
        "Ureia": "mg/dL",
        "Creatinina": "mg/dL",
        "Sódio": "mEq/L",
        "Sodio": "mEq/L",
        "Potássio": "mEq/L",
        "Potassio": "mEq/L",
        "Cloro": "mEq/L",
        "Cálcio": "mg/dL",
        "Magnésio": "mg/dL",
        "pH": "",
        "pH Urinário": "",
        "pH Urinario": "",
        "pCO2": "mmHg",
        "pO2": "mmHg",
        "HCO3": "mEq/L",
        "BE": "mEq/L",
        "Lactato": "mmol/L",
        "SatO2": "%",
        "Glicose": "mg/dL",
        "PCR": "mg/dL",
        "TGO/AST": "U/L",
        "TGP/ALT": "U/L"
    }
    
    # Primeiro procurar uma correspondência exata
    nome_campo_lower = nome_campo.lower()
    for campo, unidade in unidades.items():
        if campo.lower() == nome_campo_lower:
            return unidade
    
    # Se não encontrar correspondência exata, procurar por correspondência parcial
    for campo, unidade in unidades.items():
        if campo.lower() in nome_campo_lower:
            return unidade
            
    return ""

def obter_valores_referencia(nome_campo: str) -> tuple:
    """
    Retorna os valores de referência para o campo especificado.
    """
    valores_ref = {
        "Hemoglobina": (12.0, 16.0),
        "Hematócrito": (36.0, 47.0),
        "Leucócitos": (4000, 10000),
        "Plaquetas": (150000, 450000),
        "Eritrócitos": (4.0, 5.5),
        "Ureia": (10, 50),
        "Creatinina": (0.6, 1.2),
        "Sódio": (135, 145),
        "Potássio": (3.5, 5.0),
        "Cloro": (98, 107),
        "Cálcio": (8.5, 10.5),
        "Magnésio": (1.6, 2.6),
        "pH": (7.35, 7.45),
        "pH Urinário": (5.0, 7.0),
        "pCO2": (35, 45),
        "pO2": (80, 100),
        "HCO3": (22, 26),
        "BE": (-2, 2),
        "Lactato": (0.5, 1.5),
        "SatO2": (95, 100),
        "Glicose": (70, 100),
        "PCR": (0, 0.5),
        "TGO/AST": (10, 40),
        "TGP/ALT": (7, 56)
    }
    
    # Primeiro procurar uma correspondência exata
    nome_campo_lower = nome_campo.lower()
    for campo, valores in valores_ref.items():
        if campo.lower() == nome_campo_lower:
            return valores
    
    # Se não encontrar correspondência exata, procurar por correspondência parcial
    for campo, valores in valores_ref.items():
        if campo.lower() in nome_campo_lower:
            return valores
            
    return None, None

# --- Função para processamento em segundo plano ---

async def process_pdf_file(file_path: str, patient_id: int, user_id: int, db: Session):
    """
    Processa um arquivo PDF, extrai os resultados de exames e salva no banco de dados.
    Esta função é executada em segundo plano.
    """
    try:
        logger.info(f"Processando arquivo: {file_path}")
        
        # Usar os extratores do projeto original
        nome_paciente, data_coleta, hora_coleta = extrair_id(file_path)
        
        # Extrair resultados de todas as páginas
        resultados_paginas = extrair_campos_pagina(file_path)
        
        # Debug: Log extracted pages
        logger.debug(f"Extracted pages results: {resultados_paginas}")

        results_list = []
        for pagina_result in resultados_paginas:
            for campo, valor in pagina_result.items():
                if valor and valor.strip():
                    # Determinar a categoria com base no nome do campo
                    categoria_nome = determinar_categoria(campo)
                    categoria = db.query(TestCategory).filter(TestCategory.name == categoria_nome).first()
                    if not categoria:
                        categoria = TestCategory(name=categoria_nome)
                        db.add(categoria)
                        db.flush() # Get the ID

                    # Tentar converter para valor numérico
                    try:
                        # Replace comma with dot for decimal conversion
                        valor_numerico = float(valor.replace(',', '.'))
                    except (ValueError, TypeError):
                        valor_numerico = None

                    # Encontrar valor de referência e unidade
                    ref_min, ref_max = obter_valores_referencia(campo)
                    unidade = obter_unidade(campo)
                    
                    # Create schema for DB operation
                    lab_result_data = lab_result_schemas.LabResultCreate(
                        test_name=campo,
                        value_string=valor,
                        value_numeric=valor_numerico,
                        unit=unidade,
                        reference_range_low=ref_min,
                        reference_range_high=ref_max,
                        timestamp=f"{data_coleta} {hora_coleta}" if data_coleta != "Data não encontrada" else datetime.now().strftime("%Y-%m-%d %H:%M:%S"), # Use standard ISO format
                        patient_id=patient_id,
                        user_id=user_id,
                        category_id=categoria.category_id # Link to category
                    )
                    
                    # Adicionar ao banco de dados
                    db_lab_result = LabResult(**lab_result_data.model_dump())
                    db.add(db_lab_result)
                    results_list.append(lab_result_data) # Append schema for potential return
        
        # Commit changes
        try:
            db.commit()
            logger.info(f"Successfully processed and saved lab results for patient {patient_id} from file {file_path}")
        except Exception as e:
            db.rollback()
            logger.error(f"Error committing lab results for patient {patient_id}: {str(e)}")
        finally:
            # Excluir o arquivo após o processamento
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Removed temporary file: {file_path}")

        # Optionally, notify the user or update a task status
        # (Implementation depends on how task status is tracked)
        
    except Exception as e:
        logger.error(f"Erro ao processar arquivo PDF: {str(e)}")
        # Não propagar a exceção para não interromper a tarefa em segundo plano
        # Em uma implementação mais robusta, poderia atualizar o status da tarefa no banco
        
        # Tentar excluir o arquivo em caso de erro
        try:
            os.remove(file_path)
        except:
            pass 
