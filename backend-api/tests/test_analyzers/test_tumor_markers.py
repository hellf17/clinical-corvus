import pytest
from analyzers.tumor_markers import analisar_marcadores_tumorais

class TestTumorMarkersAnalyzer:
    """Test suite for the tumor markers analyzer."""

    def test_tumor_markers_analyzer_empty_data(self):
        """Test that the analyzer returns an appropriate response for empty data."""
        result = analisar_marcadores_tumorais({})
        assert result["interpretation"] == "Dados insuficientes para análise de marcadores tumorais."
        assert not result["abnormalities"]
        assert not result["is_critical"]

    def test_normal_tumor_markers(self):
        """Test a case of normal tumor markers."""
        data = {"PSA": 2.5, "CEA": 1.0, "AFP": 5.0, "CA125": 10, "CA19-9": 20, "BetaHCG": 2}
        result = analisar_marcadores_tumorais(data)
        assert not result["abnormalities"]
        assert not result["is_critical"]
        assert "Não foi possível gerar interpretação detalhada dos marcadores tumorais." in result["interpretation"] # Expected due to lack of specific logic for normal values

    def test_prostate_cancer_screening(self):
        """Test a case of elevated PSA."""
        data = {"PSA": 15.0, "idade": 65}
        result = analisar_marcadores_tumorais(data, idade=65)
        assert "PSA Elevado" in result["abnormalities"]
        assert "PSA > 10 ng/mL" in " ".join(result["recommendations"])
        assert not result["is_critical"] # Not critical based on value alone

    def test_ovarian_cancer_monitoring(self):
        """Test a case of elevated CA 125."""
        data = {"CA125": 200}
        result = analisar_marcadores_tumorais(data)
        assert "CA 125 Elevado" in result["abnormalities"]
        assert "Avaliação ginecológica" in " ".join(result["recommendations"])
        assert not result["is_critical"]

    def test_colorectal_cancer_follow_up(self):
        """Test a case of elevated CEA."""
        data = {"CEA": 50}
        result = analisar_marcadores_tumorais(data)
        assert "CEA Elevado" in result["abnormalities"]
        assert "Investigação para neoplasia colorretal" in " ".join(result["recommendations"])
        assert "CEA elevado" in result["interpretation"]

    def test_hepatocellular_carcinoma(self):
        """Test a case of elevated AFP."""
        data = {"AFP": 500}
        result = analisar_marcadores_tumorais(data)
        assert "AFP Elevado" in result["abnormalities"]
        assert "Sugere carcinoma hepatocelular" in result["interpretation"]

    def test_pancreatic_cancer(self):
        """Test a case of elevated CA 19-9."""
        data = {"CA19-9": 150}
        result = analisar_marcadores_tumorais(data)
        assert "CA 19-9 Elevado" in result["abnormalities"]
        assert "Associado a câncer de pâncreas" in result["interpretation"]

    def test_germ_cell_tumors(self):
        """Test a case of elevated Beta-HCG."""
        data = {"BetaHCG": 100}
        result = analisar_marcadores_tumorais(data)
        assert "Beta-HCG Elevado" in result["abnormalities"]
        assert "Considerar gravidez, tumores de células germinativas" in result["interpretation"]

    def test_markedly_elevated_psa_critical(self):
        """Test a case of markedly elevated PSA which is critical."""
        data = {"PSA": 150}
        result = analisar_marcadores_tumorais(data)
        assert "PSA Elevado" in result["abnormalities"]
        assert result["is_critical"]

    def test_markedly_elevated_ca125_critical(self):
        """Test a case of markedly elevated CA 125 which is critical."""
        data = {"CA125": 1500}
        result = analisar_marcadores_tumorais(data)
        assert "CA 125 Elevado" in result["abnormalities"]
        assert result["is_critical"]

    def test_markedly_elevated_afp_critical(self):
        """Test a case of markedly elevated AFP which is critical."""
        data = {"AFP": 1500}
        result = analisar_marcadores_tumorais(data)
        assert "AFP Elevado" in result["abnormalities"]
        assert result["is_critical"]

    def test_false_positive_tumor_marker(self):
        """Test a case where a tumor marker might be elevated due to benign conditions (e.g. LDH)."""
        data = {"LDH": 500}
        result = analisar_marcadores_tumorais(data)
        assert "LDH Elevado" in result["abnormalities"]
        assert "Não foi possível gerar interpretação detalhada dos marcadores tumorais." in result["interpretation"] # LDH interpretation is general, not specific to tumor markers in this analyzer.

if __name__ == "__main__":
    pytest.main()