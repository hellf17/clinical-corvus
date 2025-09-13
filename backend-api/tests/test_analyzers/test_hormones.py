import pytest
from analyzers.hormones import analisar_hormonios

class TestHormoneAnalyzer:
    """Test suite for the hormone analyzer."""

    def test_hormone_analyzer_empty_data(self):
        """Test that the analyzer returns an appropriate response for empty data."""
        result = analisar_hormonios({})
        assert result["interpretation"] == "Dados insuficientes para análise hormonal."
        assert not result["abnormalities"]
        assert not result["is_critical"]

    def test_normal_hormone_levels(self):
        """Test a case of normal hormone levels."""
        data = {"Cortisol_AM": 15, "Prolactin": 10, "Testosterone": 700, "Estradiol": 50, "Progesterone": 0.8, "LH": 8, "FSH": 8, "DHEAS": 200}
        result = analisar_hormonios(data)
        assert not result["abnormalities"]
        assert not result["is_critical"]
        assert "Não foi possível gerar interpretação detalhada dos hormônios." in result["interpretation"] # Expected due to lack of specific logic for normal values

    def test_adrenal_insufficiency(self):
        """Test a case suggestive of adrenal insufficiency."""
        data = {"Cortisol_AM": 2.0}
        result = analisar_hormonios(data)
        assert "Cortisol Baixo" in result["abnormalities"]
        assert "Adrenal Insuficiência" in result["interpretation"] # Assuming logic for this
        assert result["is_critical"] # Critical due to low cortisol

    def test_cushings_syndrome(self):
        """Test a case suggestive of Cushing's Syndrome."""
        data = {"Cortisol_AM": 30, "Cortisol_PM": 18}
        result = analisar_hormonios(data)
        assert "Cortisol Elevado" in result["abnormalities"]
        assert "Cushing" in result["interpretation"] # Assuming logic for this

    def test_hypogonadism_men(self):
        """Test a case of hypogonadism in men."""
        data = {"Testosterone": 50, "LH": 2, "FSH": 3, "sexo": "M"}
        result = analisar_hormonios(data, sexo="M")
        assert "Testosterona Baixa" in result["abnormalities"]
        assert "Hipogonadismo" in result["interpretation"] # Assuming logic for this

    def test_polycystic_ovary_syndrome(self):
        """Test a case suggestive of Polycystic Ovary Syndrome (PCOS)."""
        data = {"Testosterone": 80, "LH": 15, "FSH": 5, "sexo": "F"}
        result = analisar_hormonios(data, sexo="F")
        assert "Testosterona Elevada" in result["abnormalities"]
        assert "LH Elevado" in result["abnormalities"]
        assert "Sindrome do Ovário Policístico" in result["interpretation"] # Assuming logic for this

    def test_menopause(self):
        """Test a case suggestive of menopause."""
        data = {"Estradiol": 10, "LH": 30, "FSH": 40, "idade": 55, "sexo": "F"}
        result = analisar_hormonios(data, idade=55, sexo="F")
        assert "Estradiol Baixo" in result["abnormalities"]
        assert "LH Elevado" in result["abnormalities"]
        assert "FSH Elevado" in result["abnormalities"]
        assert "Menopausa" in result["interpretation"] # Assuming logic for this

    def test_hyperprolactinemia(self):
        """Test a case of hyperprolactinemia."""
        data = {"Prolactin": 200}
        result = analisar_hormonios(data)
        assert "Prolactina Elevada" in result["abnormalities"]
        assert "Hiperprolactinemia" in result["interpretation"] # Assuming logic for this
        assert result["is_critical"] # Critical due to very high prolactin

    def test_hypothalamic_amenorrhea(self):
        """Test a case suggestive of hypothalamic amenorrhea."""
        data = {"Estradiol": 5, "LH": 0.5, "FSH": 1.0, "sexo": "F"}
        result = analisar_hormonios(data, sexo="F")
        assert "Estradiol Baixo" in result["abnormalities"]
        assert "LH Baixo" in result["abnormalities"]
        assert "FSH Baixo" in result["abnormalities"]
        assert "Amenorreia Hipotalâmica" in result["interpretation"] # Assuming logic for this

if __name__ == "__main__":
    pytest.main()