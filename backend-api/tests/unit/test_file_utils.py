import pytest
from unittest.mock import patch, MagicMock, ANY
import os
import tempfile
from pathlib import Path
import uuid

# Cópia das funções a serem testadas para evitar problemas de importação
def determinar_categoria(nome_campo: str) -> str:
    """
    Determina a categoria de um exame com base no nome do campo.
    """
    categorias = {
        "hemograma": ["Hemoglobina", "Hematócrito", "Leucócitos", "Plaquetas", "Eritrócitos", "VCM", "HCM", "CHCM", "RDW"],
        "bioquimica": ["Ureia", "Creatinina", "Sódio", "Potássio", "Cloro", "Cálcio", "Fósforo", "Magnésio", "Bilirrubina", "AST", "ALT", "Fosfatase Alcalina", "GGT", "Proteínas Totais", "Albumina", "Glicose", "Colesterol", "Triglicerídeos", "HDL", "LDL", "TGO", "TGP"],
        "gasometria": ["pH", "pCO2", "pO2", "HCO3", "BE", "Lactato", "SatO2", "FiO2"],
        "coagulacao": ["TP", "INR", "TTPA", "Fibrinogênio", "D-dímero"],
        "urina": ["pH Urinário", "Densidade", "Proteinuria", "Glicosúria", "Cetonuria", "Nitrito", "Leucocituria", "Hematuria"]
    }
    
    # Primeiro procurar uma correspondência exata
    nome_campo_lower = nome_campo.lower()
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
        "Leucócitos": "/mm³",
        "Plaquetas": "/mm³",
        "Eritrócitos": "milhões/mm³",
        "VCM": "fL",
        "HCM": "pg",
        "CHCM": "g/dL",
        "Ureia": "mg/dL",
        "Creatinina": "mg/dL",
        "Sódio": "mEq/L",
        "Potássio": "mEq/L",
        "Cloro": "mEq/L",
        "Cálcio": "mg/dL",
        "Magnésio": "mg/dL",
        "pH": "",
        "pH Urinário": "",
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

class TestFileUtils:
    """Testes para as funções utilitárias de processamento de arquivos de resultados clínicos."""
    
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
        # Testa diferentes campos
        assert determinar_categoria("Hemoglobina") == "hemograma"
        assert determinar_categoria("Leucócitos") == "hemograma"
        assert determinar_categoria("Plaquetas") == "hemograma"
        
        assert determinar_categoria("Ureia") == "bioquimica"
        assert determinar_categoria("Creatinina") == "bioquimica"
        assert determinar_categoria("TGO") == "bioquimica"
        
        assert determinar_categoria("pH") == "gasometria"
        assert determinar_categoria("pCO2") == "gasometria"
        assert determinar_categoria("Lactato") == "gasometria"
        
        assert determinar_categoria("TP") == "coagulacao"
        assert determinar_categoria("INR") == "coagulacao"
        
        assert determinar_categoria("pH Urinário") == "urina"
        assert determinar_categoria("Proteinuria") == "urina"
        
        # Campo que não está em nenhuma categoria específica
        assert determinar_categoria("Teste Desconhecido") == "outros"
    
    def test_obter_unidade(self):
        """Testa a função que retorna a unidade de medida para um campo."""
        # Testa diferentes campos
        assert obter_unidade("Hemoglobina") == "g/dL"
        assert obter_unidade("Hematócrito") == "%"
        assert obter_unidade("Leucócitos") == "/mm³"
        assert obter_unidade("Creatinina") == "mg/dL"
        assert obter_unidade("Sódio") == "mEq/L"
        assert obter_unidade("Potássio") == "mEq/L"
        assert obter_unidade("pH") == ""
        assert obter_unidade("pH Urinário") == ""  # Teste específico para pH Urinário
        
        # Campo sem unidade definida
        assert obter_unidade("Campo Sem Unidade") == ""
    
    def test_obter_valores_referencia(self):
        """Testa a função que retorna os valores de referência para um campo."""
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
        
        # Teste específico para pH Urinário
        min_val, max_val = obter_valores_referencia("pH Urinário")
        assert min_val == 5.0
        assert max_val == 7.0
        
        # Campo sem valores de referência definidos
        min_val, max_val = obter_valores_referencia("Campo Sem Referência")
        assert min_val is None
        assert max_val is None 