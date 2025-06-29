import os
import logging
from typing import Optional, Dict, Any
import asyncio
from pathlib import Path
import tempfile

logger = logging.getLogger(__name__)

class PDFExtractionService:
    """
    Serviço para extração de texto de PDFs usando LlamaParse como opção principal
    e PyPDF2 como fallback.
    """
    
    def __init__(self):
        self.llama_cloud_api_key = os.getenv('LLAMA_CLOUD_API_KEY')
        self.use_llamaparse = bool(self.llama_cloud_api_key)
        
        if self.use_llamaparse:
            logger.info("✅ LlamaParse configurado - usando extração avançada de PDFs")
        else:
            logger.warning("⚠️ LLAMA_CLOUD_API_KEY não encontrada - usando PyPDF2 como fallback")
    
    async def extract_text_from_pdf(
        self, 
        file_content: bytes, 
        filename: str,
        extraction_mode: str = "balanced"
    ) -> Dict[str, Any]:
        """
        Extrai texto de um PDF usando LlamaParse ou PyPDF2 como fallback.
        
        Args:
            file_content: Conteúdo do arquivo PDF em bytes
            filename: Nome do arquivo
            extraction_mode: Modo de extração ("fast", "balanced", "premium")
            
        Returns:
            Dict com texto extraído e metadados
        """
        
        if self.use_llamaparse:
            try:
                return await self._extract_with_llamaparse(file_content, filename, extraction_mode)
            except Exception as e:
                logger.error(f"Erro no LlamaParse: {e}. Usando PyPDF2 como fallback.")
                return await self._extract_with_pypdf2(file_content, filename)
        else:
            return await self._extract_with_pypdf2(file_content, filename)
    
    async def _extract_with_llamaparse(
        self, 
        file_content: bytes, 
        filename: str,
        extraction_mode: str = "balanced"
    ) -> Dict[str, Any]:
        """Extração usando LlamaParse"""
        try:
            from llama_cloud_services import LlamaParse
            
            # Criar arquivo temporário
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name
            
            try:
                # Configurar LlamaParse baseado no modo
                parser_config = {
                    "api_key": self.llama_cloud_api_key,
                    "result_type": "markdown",
                    "verbose": True,
                    "language": "pt",  # Português para documentos brasileiros
                }
                
                # Ajustar configurações baseado no modo
                if extraction_mode == "fast":
                    parser_config.update({
                        "parsing_instruction": "Extract text quickly, focus on main content",
                        "premium_mode": False
                    })
                elif extraction_mode == "premium":
                    parser_config.update({
                        "parsing_instruction": "Extract with maximum fidelity, preserve all structure, tables, and formatting",
                        "premium_mode": True
                    })
                else:  # balanced
                    parser_config.update({
                        "parsing_instruction": "Extract text preserving structure and key formatting"
                    })
                
                parser = LlamaParse(**parser_config)
                
                # Executar parsing
                result = await parser.aparse(temp_file_path)
                
                # Extrair texto e metadados
                if hasattr(result, 'get_markdown_documents'):
                    documents = result.get_markdown_documents(split_by_page=False)
                    text = "\n\n".join([doc.text for doc in documents])
                else:
                    # Fallback para formato mais simples
                    text = str(result)
                
                # Tentar extrair metadados adicionais
                metadata = {
                    "extraction_method": "llamaparse",
                    "extraction_mode": extraction_mode,
                    "filename": filename,
                    "pages_processed": getattr(result, 'num_pages', None),
                    "has_images": False,
                    "has_tables": False
                }
                
                # Verificar se há imagens ou tabelas no resultado
                if hasattr(result, 'pages'):
                    for page in result.pages:
                        if hasattr(page, 'images') and page.images:
                            metadata["has_images"] = True
                        if 'table' in text.lower() or '|' in text:
                            metadata["has_tables"] = True
                
                logger.info(f"✅ LlamaParse extraiu {len(text)} caracteres de {filename}")
                
                return {
                    "text": text,
                    "metadata": metadata,
                    "success": True
                }
                
            finally:
                # Limpar arquivo temporário
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
                    
        except ImportError:
            logger.error("llama-cloud-services não está instalado")
            raise Exception("LlamaParse não disponível - dependência não instalada")
        except Exception as e:
            logger.error(f"Erro no LlamaParse: {e}")
            raise
    
    async def _extract_with_pypdf2(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """Extração usando PyPDF2 como fallback"""
        try:
            import PyPDF2
            import io
            
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text = ""
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text += page.extract_text() + "\n"
            
            metadata = {
                "extraction_method": "pypdf2",
                "filename": filename,
                "pages_processed": len(pdf_reader.pages),
                "has_images": False,
                "has_tables": False
            }
            
            logger.info(f"✅ PyPDF2 extraiu {len(text)} caracteres de {filename}")
            
            return {
                "text": text.strip(),
                "metadata": metadata,
                "success": True
            }
            
        except ImportError:
            raise Exception("PyPDF2 não está instalado")
        except Exception as e:
            logger.error(f"Erro no PyPDF2: {e}")
            raise Exception(f"Erro ao processar PDF: {str(e)}")

# Instância global do serviço
pdf_service = PDFExtractionService() 