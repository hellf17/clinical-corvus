import pytest
from analyzers.thyroid import analisar_funcao_tireoidiana

class TestThyroidFunctionAnalyzer:
    """Test suite for the thyroid function analyzer."""

    def test_thyroid_analyzer_empty_data(self):
        """Test that the analyzer returns an appropriate response for empty data."""
        result = analisar_funcao_tireoidiana({})
        assert result["interpretation"] == "Dados insuficientes para análise da função tireoidiana."
        assert not result["abnormalities"]
        assert not result["is_critical"]

    def test_normal_thyroid_function(self):
        """Test a case of normal thyroid function."""
        data = {"TSH": 2.5, "T4L": 1.2, "T3L": 3.0, "AntiTPO": 10, "AntiTG": 50, "TRAb": 0.5}
        result = analisar_funcao_tireoidiana(data)
        assert "TSH dentro da faixa de referência" in result["interpretation"]
        assert not result["abnormalities"]
        assert not result["is_critical"]

    def test_primary_hypothyroidism(self):
        """Test a case of primary hypothyroidism."""
        data = {"TSH": 15.0, "T4L": 0.5, "T3L": 1.5}
        result = analisar_funcao_tireoidiana(data)
        assert "Hipotireoidismo Primário" in result["abnormalities"]
        assert "TSH alto com T4L baixo" in result["interpretation"]
        assert "iniciar reposição com levotiroxina" in " ".join(result["recommendations"])
        assert not result["is_critical"] # Not critical by default unless severe symptoms/values

    def test_subclinical_hypothyroidism(self):
        """Test a case of subclinical hypothyroidism."""
        data = {"TSH": 6.0, "T4L": 1.0, "T3L": 3.0}
        result = analisar_funcao_tireoidiana(data)
        assert "Hipotireoidismo Subclínico" in result["abnormalities"]
        assert "TSH alto com T4L normal" in result["interpretation"]
        assert not result["is_critical"]

    def test_primary_hyperthyroidism(self):
        """Test a case of primary hyperthyroidism."""
        data = {"TSH": 0.1, "T4L": 2.5, "T3L": 5.0}
        result = analisar_funcao_tireoidiana(data)
        assert "Hipertireoidismo Primário" in result["abnormalities"]
        assert "TSH baixo com T4L alto" in result["interpretation"]
        assert "Investigar causa do hipertireoidismo" in " ".join(result["recommendations"])
        assert not result["is_critical"] # Not critical by default unless severe symptoms/values

    def test_subclinical_hyperthyroidism(self):
        """Test a case of subclinical hyperthyroidism."""
        data = {"TSH": 0.2, "T4L": 1.3, "T3L": 3.5}
        result = analisar_funcao_tireoidiana(data)
        assert "Hipertireoidismo Subclínico" in result["abnormalities"]
        assert "TSH baixo com T4L normal" in result["interpretation"]
        assert not result["is_critical"]

    def test_hashimotos_thyroiditis(self):
        """Test a case suggestive of Hashimoto's thyroiditis."""
        data = {"TSH": 8.0, "T4L": 0.8, "AntiTPO": 250, "AntiTG": 300}
        result = analisar_funcao_tireoidiana(data)
        assert "Hipotireoidismo Primário" in result["abnormalities"]
        assert "Anti-TPO Elevado" in result["abnormalities"]
        assert "Anti-TG Elevado" in result["abnormalities"]
        # Interpretation should reflect autoimmune thyroid disease
        assert any("doença tireoidiana autoimune" in interp for interp in result["interpretation"])

    def test_graves_disease(self):
        """Test a case suggestive of Graves' disease."""
        data = {"TSH": 0.05, "T4L": 3.0, "T3L": 6.0, "TRAb": 5.0}
        result = analisar_funcao_tireoidiana(data)
        assert "Hipertireoidismo Primário" in result["abnormalities"]
        assert "TRAb Elevado (Doença de Graves)" in result["abnormalities"]
        assert "Altamente sugestivo de Doença de Graves" in result["interpretation"]

    def test_thyroid_hormone_resistance(self):
        """Test a case suggestive of thyroid hormone resistance."""
        data = {"TSH": 10.0, "T4L": 2.0, "T3L": 4.5}
        result = analisar_funcao_tireoidiana(data)
        assert "Resistência ao Hormônio Tireoidiano/TSHoma" in result["abnormalities"]
        assert "TSH alto com T4L alto" in result["interpretation"]

    def test_critical_hypothyroidism(self):
        """Test a case of critical hypothyroidism."""
        data = {"TSH": 150.0, "T4L": 0.1}
        result = analisar_funcao_tireoidiana(data)
        assert "Hipotireoidismo Primário" in result["abnormalities"]
        assert result["is_critical"] # Critical due to very high TSH and very low T4L

    def test_critical_hyperthyroidism(self):
        """Test a case of critical hyperthyroidism."""
        data = {"TSH": 0.01, "T4L": 5.5}
        result = analisar_funcao_tireoidiana(data)
        assert "Hipertireoidismo Primário" in result["abnormalities"]
        assert result["is_critical"] # Critical due to very low TSH and very high T4L

if __name__ == "__main__":
    pytest.main()