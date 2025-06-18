"""
Tests for the PDF data extractors.
"""

import pytest
import os
import io
from unittest.mock import patch, MagicMock

from extractors.pdf_extractor import extrair_id, extrair_campos_pagina, extrair_campos_do_texto
from extractors.regex_patterns import CAMPOS_DESEJADOS

# Fixture para prover um arquivo PDF de teste
@pytest.fixture
def sample_pdf_bytes():
    """Retorna um objeto BytesIO simulando um PDF."""
    return io.BytesIO(b"%PDF-1.5\n...conteudo simulado...")

# Fixture para criar um caminho para arquivo temporário
@pytest.fixture
def sample_pdf_path(tmp_path):
    """Cria um arquivo PDF de teste temporário e retorna seu caminho."""
    pdf_path = tmp_path / "test_lab.pdf"
    with open(pdf_path, 'wb') as f:
        f.write(b"%PDF-1.5\n...conteudo simulado...")
    return str(pdf_path)

class TestPdfExtractor:
    """Testes para o extrator de PDF."""

    def test_extrair_campos_do_texto(self):
        """Testa a extração de campos a partir de texto."""
        # Texto de exemplo simulando um relatório de laboratório
        texto = """
        HEMOGLOBINA.............: 14.5 g/dL
        HEMATÓCRITO............: 43.5 %
        LEUCÓCITOS.............: 7500 /mm³
        SEGMENTADOS...........: 65 %
        PLAQUETAS..............: 230000 /mm³
        UREIA..................: 35 mg/dL
        CREATININA.............: 0.9 mg/dL
        SÓDIO..................: 140 mEq/L
        POTÁSSIO...............: 4.0 mEq/L
        GASOMETRIA ARTERIAL
        pH.....................: 7.38
        pCO2...................: 40 mmHg
        pO2....................: 95 mmHg
        HCO3...................: 24 mEq/L
        SATURAÇÃO DE O2........: 98 %
        """
        
        # Extrai campos do texto
        dados = extrair_campos_do_texto(texto)
        
        # Verifica se os campos foram extraídos corretamente
        assert dados["Hb"] == "14.5"
        assert dados["Ht"] == "43.5"
        assert dados["Leuco"] == "7500"
        assert dados["Segm"] == "65"
        assert dados["Plaq"] == "230000"
        assert dados["Ur"] == "35"
        assert dados["Creat"] == "0.9"
        assert dados["Na+"] == "140"
        assert dados["K+"] == "4.0"
        assert dados["pH"] == "7.38"
        assert dados["pCO2"] == "40"
        assert dados["pO2"] == "95"
        assert dados["HCO3-"] == "24"
        assert dados["SpO2"] == "98"

    def test_extrair_campos_do_texto_vazio(self):
        """Testa comportamento com texto vazio."""
        dados = extrair_campos_do_texto("")
        assert dados == {}

    def test_regex_patterns_compilados(self):
        """Verifica se os padrões regex estão definidos e corretos."""
        # Verifica que temos ao menos alguns padrões definidos
        assert len(CAMPOS_DESEJADOS) > 0
        
        # Verifica que padrões essenciais estão presentes
        campos_essenciais = ["Hb", "Ht", "Leuco", "Plaq", "pH", "Na+", "K+", "Creat", "Ur"]
        for campo in campos_essenciais:
            assert campo in CAMPOS_DESEJADOS
    
    @patch("PyPDF2.PdfReader")
    def test_extrair_id(self, mock_pdf_reader, sample_pdf_path):
        """Testa extração de identificação do paciente."""
        # Configura o mock para simular texto extraído do PDF
        mock_page = MagicMock()
        mock_page.extract_text.return_value = """
        Nome: João da Silva
        Data: 10/05/2023
        Hora: 15:30
        """
        mock_pdf_reader.return_value.pages = [mock_page]
        
        # Executa a função de extração
        nome, data, hora = extrair_id(sample_pdf_path)
        
        # Verifica os resultados
        assert nome == "João da Silva"
        assert data == "10/05/2023"
        assert hora == "15:30"
    
    @patch("PyPDF2.PdfReader")
    def test_extrair_id_com_formato_alternativo(self, mock_pdf_reader, sample_pdf_path):
        """Testa extração de ID com formato alternativo."""
        # Configura o mock para simular texto extraído do PDF com formato diferente
        mock_page = MagicMock()
        mock_page.extract_text.return_value = """
        Paciente......: 123456-Maria dos Santos
        Requisição: 987654
        Coletado em: 10/05/2023 14:45
        """
        mock_pdf_reader.return_value.pages = [mock_page]
        
        # Executa a função de extração
        nome, data, hora = extrair_id(sample_pdf_path)
        
        # Verifica os resultados
        assert nome == "Maria dos Santos"
        assert data == "10/05/2023"
        assert hora == "14:45"
    
    @patch("PyPDF2.PdfReader")
    def test_extrair_id_sem_dados(self, mock_pdf_reader, sample_pdf_path):
        """Testa comportamento quando não há dados de identificação."""
        # Configura o mock para simular texto sem dados de identificação
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Texto sem dados de identificação"
        mock_pdf_reader.return_value.pages = [mock_page]
        
        # Executa a função de extração
        nome, data, hora = extrair_id(sample_pdf_path)
        
        # Verifica que valores padrão são retornados
        assert nome == "Paciente não identificado"
        assert data == "Data não encontrada"
        assert hora == "Hora não encontrada"
    
    @patch("PyPDF2.PdfReader")
    def test_extrair_campos_pagina_especifica(self, mock_pdf_reader, sample_pdf_path):
        """Testa extração de campos de uma página específica."""
        # Configura o mock para simular texto extraído do PDF
        mock_page = MagicMock()
        mock_page.extract_text.return_value = """
        HEMOGLOBINA.............: 14.5 g/dL
        HEMATÓCRITO............: 43.5 %
        LEUCÓCITOS.............: 7500 /mm³
        """
        mock_pdf_reader.return_value.pages = [mock_page]
        
        # Executa a função de extração para a página 1
        dados = extrair_campos_pagina(sample_pdf_path, 1)
        
        # Verifica os resultados
        assert dados["Hb"] == "14.5"
        assert dados["Ht"] == "43.5"
        assert dados["Leuco"] == "7500"
    
    @patch("PyPDF2.PdfReader")
    def test_extrair_campos_todas_paginas(self, mock_pdf_reader, sample_pdf_path):
        """Testa extração de campos de todas as páginas."""
        # Configura o mock para simular texto extraído do PDF com várias páginas
        mock_page1 = MagicMock()
        mock_page1.extract_text.return_value = """
        HEMOGLOBINA.............: 14.5 g/dL
        HEMATÓCRITO............: 43.5 %
        """
        
        mock_page2 = MagicMock()
        mock_page2.extract_text.return_value = """
        SÓDIO..................: 140 mEq/L
        POTÁSSIO...............: 4.0 mEq/L
        """
        
        mock_pdf_reader.return_value.pages = [mock_page1, mock_page2]
        
        # Executa a função de extração para todas as páginas
        dados_paginas = extrair_campos_pagina(sample_pdf_path)
        
        # Verifica os resultados
        assert len(dados_paginas) == 2
        assert dados_paginas[0]["Hb"] == "14.5"
        assert dados_paginas[0]["Ht"] == "43.5"
        assert dados_paginas[1]["Na+"] == "140"
        assert dados_paginas[1]["K+"] == "4.0"
    
    @patch("PyPDF2.PdfReader")
    @patch("pdfplumber.open")
    def test_fallback_para_pdfplumber(self, mock_pdfplumber, mock_pdf_reader, sample_pdf_path):
        """Testa o fallback para pdfplumber quando PyPDF2 falha."""
        # Configura o mock do PyPDF2 para falhar
        mock_page = MagicMock()
        mock_page.extract_text.side_effect = AttributeError("Simulando erro do PyPDF2")
        mock_pdf_reader.return_value.pages = [mock_page]
        
        # Configura o mock do pdfplumber
        mock_plumber_page = MagicMock()
        mock_plumber_page.extract_text.return_value = """
        HEMOGLOBINA.............: 14.5 g/dL
        HEMATÓCRITO............: 43.5 %
        """
        mock_pdfplumber.return_value.__enter__.return_value.pages = [mock_plumber_page]
        
        # Executa a função de extração
        dados = extrair_campos_pagina(sample_pdf_path, 1)
        
        # Verifica os resultados
        assert dados["Hb"] == "14.5"
        assert dados["Ht"] == "43.5"

    @patch("PyPDF2.PdfReader")
    def test_pdf_sem_paginas(self, mock_pdf_reader, sample_pdf_path):
        """Testa comportamento com PDF sem páginas."""
        # Configura o mock para simular PDF sem páginas
        mock_pdf_reader.return_value.pages = []
        
        # Executa a função de extração
        resultado = extrair_campos_pagina(sample_pdf_path)
        
        # Verifica que retorna lista vazia
        assert resultado == []
        
        # Testa com número de página específico
        resultado_pagina = extrair_campos_pagina(sample_pdf_path, 1)
        assert resultado_pagina == {} 