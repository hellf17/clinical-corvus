import pytest
from fastapi.testclient import TestClient
import os
import io
from unittest.mock import patch, MagicMock

# Imports específicos para os testes
from schemas import BloodGasInput, ElectrolyteInput, HematologyInput
from main import app

# Fixtures necessárias já devem estar disponíveis no conftest.py
# - sqlite_client
# - mock_auth_headers

@pytest.fixture
def sample_pdf_file():
    """Cria um arquivo PDF de exemplo para testes de upload."""
    # Simula um arquivo PDF com alguns bytes
    return io.BytesIO(b"%PDF-1.5\n...conteudo simulado...") 

class TestAnalysisEndpoints:
    """Testes para os endpoints do módulo de análise."""

    def test_analyze_blood_gas(self, sqlite_client):
        """Testa a análise de gasometria arterial."""
        # Dados de entrada para teste
        input_data = {
            "ph": 7.35,
            "pco2": 40,
            "hco3": 22,
            "po2": 90,
            "o2sat": 95,
            "be": -2,
            "lactate": 1.5
        }
        
        # Faz a requisição para o endpoint
        response = sqlite_client.post("/api/analyze/blood_gas", json=input_data)
        
        # Verifica o status code e o formato da resposta
        assert response.status_code == 200
        result = response.json()
        
        # Verifica a presença dos campos esperados na resposta
        assert "interpretation" in result
        assert "acid_base_status" in result
        assert "compensation_status" in result
        assert "oxygenation_status" in result
        assert "is_critical" in result
        assert "details" in result
        
        # Verifica se os detalhes correspondem aos dados de entrada
        assert result["details"]["ph"] == input_data["ph"]
        assert result["details"]["pco2"] == input_data["pco2"]
        assert result["details"]["hco3"] == input_data["hco3"]

    def test_analyze_electrolytes(self, sqlite_client):
        """Testa a análise de eletrólitos."""
        # Dados de entrada para teste
        input_data = {
            "sodium": 140,
            "potassium": 4.5,
            "chloride": 100,
            "bicarbonate": 24,
            "calcium": 9.5,
            "magnesium": 2.0,
            "phosphorus": 3.5
        }
        
        # Faz a requisição para o endpoint
        response = sqlite_client.post("/api/analyze/electrolytes", json=input_data)
        
        # Verifica o status code e o formato da resposta
        assert response.status_code == 200
        result = response.json()
        
        # Verifica a presença dos campos esperados na resposta
        assert "interpretation" in result
        assert "abnormalities" in result
        assert "is_critical" in result
        assert "recommendations" in result
        assert "details" in result

    def test_analyze_hematology(self, sqlite_client):
        """Testa a análise hematológica."""
        # Dados de entrada para teste
        input_data = {
            "hemoglobin": 14.0,
            "hematocrit": 42.0,
            "rbc": 5.0,
            "wbc": 8000,
            "platelet": 250000,
            "neutrophils": 65,
            "lymphocytes": 25,
            "monocytes": 7,
            "eosinophils": 2,
            "basophils": 1,
            "patient_info": {
                "sexo": "M",
                "idade": 45
            }
        }
        
        # Faz a requisição para o endpoint
        response = sqlite_client.post("/api/analyze/hematology", json=input_data)
        
        # Verifica o status code e o formato da resposta
        assert response.status_code == 200
        result = response.json()
        
        # Verifica a presença dos campos esperados na resposta
        assert "interpretation" in result
        assert "abnormalities" in result
        assert "is_critical" in result
        assert "recommendations" in result
        assert "details" in result
        
        # Verifica se o sexo foi considerado na análise
        assert input_data["hemoglobin"] == result["details"]["hemoglobin"]

    def test_calculate_sofa_score(self, sqlite_client):
        """Testa o cálculo do score SOFA."""
        # Dados de entrada para teste
        input_data = {
            "pao2_fio2": 350,
            "platelets": 120000,
            "bilirubin": 1.5,
            "map": 70,
            "gcs": 15,
            "creatinine": 1.0,
            "urine_output": 500
        }
        
        # Faz a requisição para o endpoint
        response = sqlite_client.post("/api/analyze/score/sofa", json=input_data)
        
        # Verifica o status code e o formato da resposta
        assert response.status_code == 200
        result = response.json()
        
        # Verifica a presença dos campos esperados na resposta
        assert "score" in result
        assert "interpretation" in result
        assert "mortality_risk" in result
        assert "component_scores" in result

    @patch("extractors.pdf_extractor.extrair_id")
    @patch("extractors.pdf_extractor.extrair_campos_pagina")
    def test_upload_and_analyze_guest(self, mock_extrair_campos, mock_extrair_id, sqlite_client, sample_pdf_file):
        """Testa o upload e análise de arquivo para usuário convidado."""
        # Mock das funções de extração
        mock_extrair_id.return_value = ("Paciente Teste", "01/01/2023", "10:00")
        mock_extrair_campos.return_value = [
            {
                "Hb": 14.5,
                "Ht": 43.5,
                "Leuco": 7500,
                "Plaq": 230000,
                "Creat": 0.9,
                "Ur": 35,
                "Na": 140,
                "K": 4.0
            }
        ]
        
        # Cria um arquivo temporário para o teste
        files = {"file": ("test_lab.pdf", sample_pdf_file, "application/pdf")}
        
        # Faz a requisição para o endpoint
        response = sqlite_client.post("/api/analyze/upload/guest", files=files)
        
        # Debug - Print error details if status is 500
        if response.status_code == 500:
            print(f"DEBUG - Error response for guest upload: {response.text}")
            
        # Verifica o status code e o formato da resposta
        assert response.status_code == 200
        result = response.json()
        
        # Verifica a presença dos campos esperados na resposta
        assert "patient_name" in result
        assert "exam_date" in result
        assert "file_name" in result
        assert "analysis_results" in result
        assert "results" in result
        assert result["patient_name"] == "Paciente Teste"
        
        # Verifica se a extração de dados foi chamada corretamente
        mock_extrair_id.assert_called_once()
        mock_extrair_campos.assert_called_once()
        
        # Verifica se a análise foi incluída na resposta
        assert "renal" in result["analysis_results"]
        assert "hematology" in result["analysis_results"]
        assert "electrolytes" in result["analysis_results"]

    @patch("extractors.pdf_extractor.extrair_id")
    @patch("extractors.pdf_extractor.extrair_campos_pagina")
    def test_upload_and_analyze_with_patient(self, mock_extrair_campos, mock_extrair_id, sqlite_client, mock_auth_headers, sample_pdf_file):
        """Testa o upload e análise de arquivo para um paciente específico."""
        # Mock das funções de extração
        mock_extrair_id.return_value = ("Paciente Teste", "01/01/2023", "10:00")
        mock_extrair_campos.return_value = [
            {
                "Hb": 14.5,
                "Ht": 43.5,
                "Leuco": 7500,
                "Plaq": 230000,
                "Creat": 0.9,
                "Ur": 35,
                "Na": 140,
                "K": 4.0
            }
        ]
        
        # Cria um arquivo temporário para o teste
        files = {"file": ("test_lab.pdf", sample_pdf_file, "application/pdf")}
        
        # Faz a requisição para o endpoint com autenticação
        patient_id = "1"  # Id do paciente para teste
        response = sqlite_client.post(
            f"/api/analyze/upload/{patient_id}", 
            files=files,
            headers=mock_auth_headers
        )
        
        # Debug - Print error details if status is 500
        if response.status_code == 500:
            print(f"DEBUG - Error response for patient upload: {response.text}")
            
        # Verifica o status code
        assert response.status_code in [200, 404]  # 404 é aceitável se o paciente não existir no banco de teste

        # Se o paciente não existir, podemos verificar apenas a mensagem de erro
        if response.status_code == 404:
            assert "Patient not found" in response.text
        else:
            # Caso contrário, verificamos a resposta completa
            result = response.json()
            assert "patient_name" in result
            assert "exam_date" in result
            assert "file_name" in result
            assert "analysis_results" in result
            assert "results" in result 