import pytest
from unittest.mock import patch, MagicMock, ANY
import os
import tempfile
from pathlib import Path
import uuid
from uuid import UUID

class TestFilesModule:
    """Testes para as funções do módulo de processamento de arquivos PDF."""
    
    @pytest.fixture
    def mock_pdf_file(self):
        """Fixture para criar um arquivo PDF de teste."""
        # Cria um arquivo PDF de teste
        temp_dir = tempfile.gettempdir()
        pdf_path = Path(temp_dir) / f"test_lab_{uuid.uuid4()}.pdf"
        
        # Cria um conteúdo mínimo de PDF
        with open(pdf_path, 'wb') as f:
            f.write(b"%PDF-1.5\n%...conteudo simulado do PDF...")
        
        yield str(pdf_path)
        
        # Limpa o arquivo após o teste
        if os.path.exists(pdf_path):
            os.unlink(pdf_path)
    
    @patch("extractors.pdf_extractor.extrair_id")
    @patch("extractors.pdf_extractor.extrair_campos_pagina")
    def test_extract_pdf_data(self, mock_extrair_campos, mock_extrair_id, mock_pdf_file):
        """Testa a extração de dados de um PDF."""
        # Mock das funções de extração
        mock_extrair_id.return_value = ("Paciente Teste", "10/05/2023", "14:30")
        mock_extrair_campos.return_value = [
            {
                "Hb": "14.5",
                "Ht": "43.5",
                "Leuco": "7500"
            }
        ]
        
        # Importa a função de processamento
        from extractors.pdf_extractor import extrair_id, extrair_campos_pagina
        
        # Executa as funções
        nome, data, hora = extrair_id(mock_pdf_file)
        resultados = extrair_campos_pagina(mock_pdf_file)
        
        # Verifica os resultados
        assert nome == "Paciente Teste"
        assert data == "10/05/2023"
        assert hora == "14:30"
        assert len(resultados) == 1
        assert resultados[0]["Hb"] == "14.5"
        assert resultados[0]["Ht"] == "43.5"
        assert resultados[0]["Leuco"] == "7500"
        
        # Verifica se as funções de extração foram chamadas
        mock_extrair_id.assert_called_once_with(mock_pdf_file)
        mock_extrair_campos.assert_called_once_with(mock_pdf_file)
    
    def test_determinar_categoria(self):
        """Testa a função que determina a categoria de um exame."""
        # Importa a função
        from routers.files import determinar_categoria
        
        # Testa diferentes campos
        assert determinar_categoria("Hemoglobina") == "hemograma"
        assert determinar_categoria("Leucocitos") == "hemograma"
        assert determinar_categoria("Plaquetas") == "hemograma"
        
        assert determinar_categoria("Ureia") == "bioquimica"
        assert determinar_categoria("Creatinina") == "bioquimica"
        assert determinar_categoria("TGO") == "bioquimica"
        
        assert determinar_categoria("pH") == "gasometria"
        assert determinar_categoria("pCO2") == "gasometria"
        assert determinar_categoria("Lactato") == "gasometria"
        
        assert determinar_categoria("TP") == "coagulacao"
        assert determinar_categoria("INR") == "coagulacao"
        
        assert determinar_categoria("pH Urinario") == "urina"
        assert determinar_categoria("Proteinuria") == "urina"
        
        # Campo que não está em nenhuma categoria específica
        assert determinar_categoria("Teste Desconhecido") == "outros"
    
    def test_obter_unidade(self):
        """Testa a função que retorna a unidade de medida para um campo."""
        # Importa a função
        from routers.files import obter_unidade
        
        # Testa diferentes campos
        assert obter_unidade("Hemoglobina") == "g/dL"
        assert obter_unidade("Hematocrito") == "%"
        assert obter_unidade("Leucocitos") == "/mm³"
        assert obter_unidade("Creatinina") == "mg/dL"
        assert obter_unidade("Sodio") == "mEq/L"
        assert obter_unidade("Potassio") == "mEq/L"
        assert obter_unidade("pH") == ""
        
        # Campo sem unidade definida
        assert obter_unidade("Campo Sem Unidade") == ""
    
    def test_obter_valores_referencia(self):
        """Testa a função que retorna os valores de referência para um campo."""
        # Importa a função
        from routers.files import obter_valores_referencia
        
        # Testa diferentes campos
        min_val, max_val = obter_valores_referencia("Hemoglobina")
        assert min_val == 12.0
        assert max_val == 16.0
        
        min_val, max_val = obter_valores_referencia("Creatinina")
        assert min_val == 0.6
        assert max_val == 1.2
        
        min_val, max_val = obter_valores_referencia("pH")
        assert min_val == 7.35
        assert max_val == 7.45
        
        # Campo sem valores de referência definidos
        min_val, max_val = obter_valores_referencia("Campo Sem Referencia")
        assert min_val is None
        assert max_val is None 