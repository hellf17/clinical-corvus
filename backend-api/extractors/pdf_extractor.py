"""
Functions for extracting data from PDF lab reports.
"""

import PyPDF2
import re
from concurrent.futures import ThreadPoolExecutor
from .regex_patterns import CAMPOS_DESEJADOS

# Importar pdfplumber como alternativa para PDFs problemáticos
try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False
    print("pdfplumber não está disponível. Instale com 'pip install pdfplumber' para melhor suporte a PDFs problemáticos.")

# Pré-compilar expressões regulares para melhor performance
COMPILED_PATTERNS = {campo: re.compile(padrao, re.IGNORECASE) 
                    for campo, padrao in CAMPOS_DESEJADOS.items()}

def extrair_texto_com_pdfplumber(pdf_path, pagina=0):
    """
    Extract text from PDF using pdfplumber as alternative when PyPDF2 fails.
    
    Args:
        pdf_path: Path to the PDF file
        pagina: Page number (0-indexed)
        
    Returns:
        str: Extracted text or empty string if failed
    """
    if not PDFPLUMBER_AVAILABLE:
        return ""
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            if pagina < len(pdf.pages):
                return pdf.pages[pagina].extract_text() or ""
            return ""
    except Exception as e:
        print(f"Erro ao extrair texto com pdfplumber: {e}")
        return ""

def extrair_id(pdf_path):
    """
    Extract patient identification information from PDF.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        tuple: (patient_name, date, time)
    """
    try:
        with open(pdf_path, 'rb') as arquivo_pdf:
            try:
                # Configurar PyPDF2 para ser mais robusto com PDFs malformados
                leitor = PyPDF2.PdfReader(arquivo_pdf, strict=False)
                
                if len(leitor.pages) == 0:
                    print("PDF sem páginas válidas")
                    return "Paciente não identificado", "Data não encontrada", "Hora não encontrada"
                
                # Get first page
                try:
                    pagina = leitor.pages[0]
                    # Tratar o erro 'DictionaryObject' has no attribute 'get_data'
                    try:
                        texto = pagina.extract_text()
                    except AttributeError:
                        print("Erro ao extrair texto da primeira página com PyPDF2. Tentando com pdfplumber...")
                        texto = extrair_texto_com_pdfplumber(pdf_path, 0)
                        if not texto:
                            return "Paciente não identificado", "Data não encontrada", "Hora não encontrada"
                except Exception as e:
                    print(f"Erro ao acessar a primeira página: {e}. Tentando com pdfplumber...")
                    texto = extrair_texto_com_pdfplumber(pdf_path, 0)
                    if not texto:
                        return "Paciente não identificado", "Data não encontrada", "Hora não encontrada"
                
                # Try to extract patient name
                try:
                    padrao_nome = r'Nome:?\s+([^\n]+)'
                    correspondencia = re.search(padrao_nome, texto, re.IGNORECASE)
                    nome = correspondencia.group(1).strip() if correspondencia else "Paciente não identificado"
                except Exception:
                    nome = "Paciente não identificado"
                
                # Try to extract date
                try:
                    padrao_data = r'Data:?\s+(\d{2}/\d{2}/\d{4})'
                    correspondencia = re.search(padrao_data, texto, re.IGNORECASE)
                    data = correspondencia.group(1) if correspondencia else "Data não encontrada"
                except Exception:
                    data = "Data não encontrada"
                
                # Try to extract time
                try:
                    padrao_hora = r'Hora:?\s+(\d{2}:\d{2})'
                    correspondencia = re.search(padrao_hora, texto, re.IGNORECASE)
                    hora = correspondencia.group(1) if correspondencia else "Hora não encontrada"
                except Exception:
                    hora = "Hora não encontrada"
                
                # Tentar padrões alternativos se o padrão principal falhar
                if nome == "Paciente não identificado":
                    try:
                        # Corrigir o padrão para extrair corretamente o nome no formato alternativo
                        padrao_nome_alt = r'Paciente\.+:\s*\d*-?([^\n]+)'
                        correspondencia = re.search(padrao_nome_alt, texto, re.IGNORECASE)
                        if correspondencia:
                            nome = correspondencia.group(1).strip()
                    except Exception:
                        pass
                
                if data == "Data não encontrada":
                    try:
                        padrao_data_alt = r"Coletado em: (\d{2}/\d{2}/\d{4})"
                        correspondencia = re.search(padrao_data_alt, texto, re.IGNORECASE)
                        if correspondencia:
                            data = correspondencia.group(1).strip()
                    except Exception:
                        pass
                
                if hora == "Hora não encontrada":
                    try:
                        padrao_hora_alt = r"Coletado em: \d{2}/\d{2}/\d{4} (\d{2}:\d{2})"
                        correspondencia = re.search(padrao_hora_alt, texto, re.IGNORECASE)
                        if correspondencia:
                            hora = correspondencia.group(1).strip()
                    except Exception:
                        pass
                
                return nome, data, hora
            except Exception as e:
                print(f"Erro ao processar PDF para extração de ID: {e}")
                return "Paciente não identificado", "Data não encontrada", "Hora não encontrada"
    except Exception as e:
        print(f"Erro ao abrir arquivo PDF para extração de ID: {e}")
        return "Paciente não identificado", "Data não encontrada", "Hora não encontrada"

def extrair_campos_pagina(pdf_path, numero_pagina=None):
    """
    Extract fields from a specific page or all pages of a PDF.
    
    Args:
        pdf_path: Path to the PDF file
        numero_pagina: Specific page number (starting from 1) or None to process all pages
        
    Returns:
        If numero_pagina is specified: dictionary with extracted fields from that page
        If numero_pagina is None: list of dictionaries, one for each page
    """
    try:
        with open(pdf_path, 'rb') as arquivo_pdf:
            # Configurar PyPDF2 para ser mais robusto com PDFs malformados
            leitor = PyPDF2.PdfReader(arquivo_pdf, strict=False)
            
            # If page number is not provided, process all pages (with parallel processing)
            if numero_pagina is None:
                # Função para processar uma página individual
                def processar_pagina(i):
                    try:
                        pagina = leitor.pages[i]
                        # Tratar o erro 'DictionaryObject' has no attribute 'get_data'
                        try:
                            texto = pagina.extract_text()
                        except AttributeError:
                            print(f"Erro ao extrair texto da página {i+1} com PyPDF2. Tentando com pdfplumber...")
                            texto = extrair_texto_com_pdfplumber(pdf_path, i)
                            if not texto:
                                return {}
                        return extrair_campos_do_texto(texto)
                    except Exception as e:
                        print(f"Erro ao processar página {i+1}: {e}. Tentando com pdfplumber...")
                        texto = extrair_texto_com_pdfplumber(pdf_path, i)
                        if texto:
                            return extrair_campos_do_texto(texto)
                        return {}
                
                # Use multithreading to process pages in parallel
                # This improves performance for multi-page PDFs
                with ThreadPoolExecutor() as executor:
                    resultados = list(executor.map(processar_pagina, range(len(leitor.pages))))
                
                # Filter out empty results
                return [r for r in resultados if r]
            else:
                # Process only the specified page
                if numero_pagina > len(leitor.pages):
                    return {}
                
                try:
                    pagina = leitor.pages[numero_pagina - 1]
                    # Tratar o erro 'DictionaryObject' has no attribute 'get_data'
                    try:
                        texto = pagina.extract_text()
                    except AttributeError:
                        print(f"Erro ao extrair texto da página {numero_pagina} com PyPDF2. Tentando com pdfplumber...")
                        texto = extrair_texto_com_pdfplumber(pdf_path, numero_pagina - 1)
                        if not texto:
                            return {}
                    
                    # Extract fields from this page
                    return extrair_campos_do_texto(texto)
                except Exception as e:
                    print(f"Erro ao processar página {numero_pagina}: {e}. Tentando com pdfplumber...")
                    texto = extrair_texto_com_pdfplumber(pdf_path, numero_pagina - 1)
                    if texto:
                        return extrair_campos_do_texto(texto)
                    return {}
    except Exception as e:
        print(f"Erro ao processar PDF {pdf_path}: {e}")
        if numero_pagina is None:
            return []
        else:
            return {}

def extrair_campos_do_texto(texto):
    """
    Extract fields from text using pre-compiled patterns.
    
    Args:
        texto: Text content to parse
        
    Returns:
        dict: Dictionary with extracted data
    """
    dados_extraidos = {}
    
    # Use pre-compiled patterns for better performance
    for campo, padrao_compilado in COMPILED_PATTERNS.items():
        try:
            correspondencia = padrao_compilado.search(texto)
            if correspondencia:
                # Handle patterns with multiple capturing groups
                grupos = correspondencia.groups()
                valor = next((g for g in grupos if g is not None), None)
                if valor:
                    dados_extraidos[campo] = valor.strip()
        except (AttributeError, IndexError) as e:
            # Skip if there's an error with the pattern or group
            continue

    # Preservar os valores originais em formato string
    # Não converter para numérico para manter consistência com os testes
    return dados_extraidos 