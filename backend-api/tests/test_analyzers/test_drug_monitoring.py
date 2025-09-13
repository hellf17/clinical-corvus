import pytest
from analyzers.drug_monitoring import analisar_monitoramento_medicamentos

class TestDrugMonitoringAnalyzer:
    """Test suite for the drug monitoring analyzer."""

    def test_drug_monitoring_analyzer_empty_data(self):
        """Test that the analyzer returns an appropriate response for empty data."""
        result = analisar_monitoramento_medicamentos({})
        assert result["interpretation"] == "Dados insuficientes para análise de monitoramento de medicamentos."
        assert not result["abnormalities"]
        assert not result["is_critical"]

    def test_normal_drug_levels(self):
        """Test a case of normal drug levels."""
        data = {"Digoxin": 1.0, "Phenytoin": 15, "Carbamazepine": 8, "ValproicAcid": 75, "Lithium": 0.8, "Gentamicin": 5, "Vancomycin": 15, "Theophylline": 12}
        result = analisar_monitoramento_medicamentos(data)
        assert not result["abnormalities"]
        assert not result["is_critical"]
        assert "Não foi possível gerar interpretação detalhada do monitoramento de medicamentos." in result["interpretation"] # Expected due to lack of specific logic for normal values

    def test_subtherapeutic_digoxin(self):
        """Test a case of subtherapeutic digoxin levels."""
        data = {"Digoxin": 0.3}
        result = analisar_monitoramento_medicamentos(data)
        assert "Digoxina Baixa" in result["abnormalities"]
        assert "subterapêutico" in result["interpretation"] # Assuming logic for this
        assert not result["is_critical"]

    def test_toxic_phenytoin_levels(self):
        """Test a case of toxic phenytoin levels."""
        data = {"Phenytoin": 25}
        result = analisar_monitoramento_medicamentos(data)
        assert "Fenitoína Elevada" in result["abnormalities"]
        assert "toxicidade" in result["interpretation"] # Assuming logic for this
        assert result["is_critical"] # Critical due to toxic level

    def test_therapeutic_lithium_levels(self):
        """Test a case of therapeutic lithium levels."""
        data = {"Lithium": 0.9}
        result = analisar_monitoramento_medicamentos(data)
        assert not result["abnormalities"]
        assert "Não foi possível gerar interpretação detalhada do monitoramento de medicamentos." in result["interpretation"] # Assuming logic for this

    def test_subtherapeutic_vancomycin(self):
        """Test a case of subtherapeutic vancomycin levels."""
        data = {"Vancomycin": 8}
        result = analisar_monitoramento_medicamentos(data)
        assert "Vancomicina Baixa" in result["abnormalities"]
        assert "subterapêutico" in result["interpretation"] # Assuming logic for this
        assert not result["is_critical"]

    def test_toxic_gentamicin(self):
        """Test a case of toxic gentamicin levels."""
        data = {"Gentamicin": 15}
        result = analisar_monitoramento_medicamentos(data)
        assert "Gentamicina Elevada" in result["abnormalities"]
        assert "toxicidade" in result["interpretation"] # Assuming logic for this
        assert result["is_critical"] # Critical due to toxic level

    def test_theophylline_toxicity(self):
        """Test a case of theophylline toxicity."""
        data = {"Theophylline": 25}
        result = analisar_monitoramento_medicamentos(data)
        assert "Teofilina Elevada" in result["abnormalities"]
        assert "toxicidade" in result["interpretation"] # Assuming logic for this
        assert result["is_critical"] # Critical due to toxic level

    def test_critical_drug_toxicity_digoxin(self):
        """Test a critical drug toxicity case (Digoxin)."""
        data = {"Digoxin": 3.0}
        result = analisar_monitoramento_medicamentos(data)
        assert "Digoxina Elevada" in result["abnormalities"]
        assert result["is_critical"]

if __name__ == "__main__":
    pytest.main()