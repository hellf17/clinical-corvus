import pytest
from analyzers.autoimmune import analisar_marcadores_autoimunes

class TestAutoimmuneMarkersAnalyzer:
    """Test suite for the autoimmune markers analyzer."""

    def test_autoimmune_analyzer_empty_data(self):
        """Test that the analyzer returns an appropriate response for empty data."""
        result = analisar_marcadores_autoimunes({})
        assert result["interpretation"] == "Dados insuficientes para análise de marcadores autoimunes."
        assert not result["abnormalities"]
        assert not result["is_critical"]

    def test_normal_autoimmune_markers(self):
        """Test a case of normal autoimmune markers."""
        data = {"ANA": 80, "AntiDsDNA": 4, "C3": 100, "C4": 20, "RF": 10, "AntiCCP": 15, "ANCA": 10}
        result = analisar_marcadores_autoimunes(data)
        assert not result["abnormalities"]
        assert not result["is_critical"]
        assert "Não foi possível gerar interpretação detalhada dos marcadores autoimunes." in result["interpretation"] # Expected due to lack of specific logic for normal values

    def test_systemic_lupus_erythematosus(self):
        """Test a case suggestive of Systemic Lupus Erythematosus (SLE)."""
        data = {"ANA": 320, "AntiDsDNA": 10, "C3": 50, "C4": 5}
        result = analisar_marcadores_autoimunes(data)
        assert "AntiDsDNA Elevado" in result["abnormalities"]
        assert "C3 Baixo" in result["abnormalities"]
        assert "C4 Baixo" in result["abnormalities"]
        assert result["is_critical"] # Critical due to low complements
        assert "Lúpus Eritematoso Sistêmico" in result["interpretation"] # Assuming logic for this

    def test_rheumatoid_arthritis(self):
        """Test a case suggestive of Rheumatoid Arthritis (RA)."""
        data = {"RF": 50, "AntiCCP": 30}
        result = analisar_marcadores_autoimunes(data)
        assert "RF Elevado" in result["abnormalities"]
        assert "AntiCCP Elevado" in result["abnormalities"]
        assert "Artrite Reumatoide" in result["interpretation"] # Assuming logic for this

    def test_sjogrens_syndrome(self):
        """Test a case suggestive of Sjögren's Syndrome."""
        data = {"ANA": 640, "AntiSSA": 1.5, "AntiSSB": 1.8}
        result = analisar_marcadores_autoimunes(data)
        assert "AntiSSA Elevado" in result["abnormalities"]
        assert "AntiSSB Elevado" in result["abnormalities"]
        assert "Síndrome de Sjögren" in result["interpretation"] # Assuming logic for this

    def test_vasculitis_anca_positive(self):
        """Test a case suggestive of ANCA-associated vasculitis."""
        data = {"ANCA": 30}
        result = analisar_marcadores_autoimunes(data)
        assert "ANCA Elevado" in result["abnormalities"]
        assert "Vasculite" in result["interpretation"] # Assuming logic for this

    def test_complement_deficiencies_critical(self):
        """Test critical complement levels."""
        data = {"C3": 25, "C4": 3}
        result = analisar_marcadores_autoimunes(data)
        assert "C3 Baixo" in result["abnormalities"]
        assert "C4 Baixo" in result["abnormalities"]
        assert result["is_critical"]
        assert "Deficiência de Complemento" in result["interpretation"] # Assuming logic for this

if __name__ == "__main__":
    pytest.main()