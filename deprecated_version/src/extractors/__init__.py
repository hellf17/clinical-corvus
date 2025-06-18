"""
Data extraction modules for lab test results from PDF files.
"""

from .pdf_extractor import extrair_id, extrair_campos_pagina, extrair_campos_do_texto
from .regex_patterns import CAMPOS_DESEJADOS

__all__ = ['extrair_id', 'extrair_campos_pagina', 'extrair_campos_do_texto', 'CAMPOS_DESEJADOS'] 