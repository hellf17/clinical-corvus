import pytest
from analyzers.bone_metabolism import analisar_metabolismo_osseo

class TestBoneMetabolismAnalyzer:
    """Test suite for the bone metabolism analyzer."""

    def test_bone_metabolism_analyzer_empty_data(self):
        """Test that the analyzer returns an appropriate response for empty data."""
        result = analisar_metabolismo_osseo({})
        assert result["interpretation"] == "Dados insuficientes para análise do metabolismo ósseo."
        assert not result["abnormalities"]
        assert not result["is_critical"]

    def test_normal_bone_metabolism(self):
        """Test a case of normal bone metabolism."""
        data = {"Ca": 9.5, "P": 3.5, "PTH": 40, "VitD": 50, "FosfAlc": 80, "IonizedCalcium": 5.0}
        result = analisar_metabolismo_osseo(data)
        assert not result["abnormalities"]
        assert not result["is_critical"]
        assert "Não foi possível gerar interpretação detalhada do metabolismo ósseo." in result["interpretation"] # Expected due to lack of specific logic for normal values

    def test_primary_hyperparathyroidism(self):
        """Test a case of primary hyperparathyroidism."""
        data = {"Ca": 11.5, "P": 2.0, "PTH": 100, "IonizedCalcium": 5.8}
        result = analisar_metabolismo_osseo(data)
        assert "Hiperparatireoidismo Primário" in result["abnormalities"]
        assert "Hipercalcemia com PTH elevado" in result["interpretation"]
        assert result["is_critical"] # Critical due to high ionized calcium

    def test_vitamin_d_deficiency(self):
        """Test a case of vitamin D deficiency."""
        data = {"Ca": 8.0, "P": 2.2, "PTH": 80, "VitD": 15}
        result = analisar_metabolismo_osseo(data)
        assert "Deficiência de Vitamina D" in result["abnormalities"]
        assert "Hipocalcemia" in result["abnormalities"]
        assert "Reposição de vitamina D é recomendada" in " ".join(result["recommendations"])
        assert not result["is_critical"]

    def test_hypoparathyroidism(self):
        """Test a case of hypoparathyroidism."""
        data = {"Ca": 7.5, "P": 5.0, "PTH": 10, "IonizedCalcium": 3.8}
        result = analisar_metabolismo_osseo(data)
        assert "Hipoparatireoidismo" in result["abnormalities"]
        assert "Hipocalcemia com PTH baixo" in result["interpretation"]
        assert result["is_critical"] # Critical due to low ionized calcium

    def test_chronic_kidney_disease_mbd(self):
        """Test a case suggestive of Chronic Kidney Disease-Mineral Bone Disorder (CKD-MBD)."""
        data = {"Ca": 8.0, "P": 5.5, "PTH": 150, "VitD": 25, "FosfAlc": 200}
        result = analisar_metabolismo_osseo(data)
        assert "Hipocalcemia" in result["abnormalities"]
        assert "Hiperfosfatemia" in result["abnormalities"]
        assert "PTH Elevado" in result["abnormalities"]
        assert "Deficiência de Vitamina D" in result["abnormalities"]
        assert "Fosfatase Alcalina Elevada" in result["abnormalities"]
        assert "Doença Renal Crônica-Distúrbio Mineral Ósseo" in result["interpretation"] # Assuming logic for this

    def test_critical_hypercalcemia(self):
        """Test a case of critical hypercalcemia."""
        data = {"Ca": 13.0, "IonizedCalcium": 6.0}
        result = analisar_metabolismo_osseo(data)
        assert "Hipercalcemia" in result["abnormalities"]
        assert result["is_critical"]

    def test_critical_hypocalcemia(self):
        """Test a case of critical hypocalcemia."""
        data = {"Ca": 6.5, "IonizedCalcium": 3.5}
        result = analisar_metabolismo_osseo(data)
        assert "Hipocalcemia" in result["abnormalities"]
        assert result["is_critical"]

    def test_severe_vitamin_d_deficiency(self):
        """Test a case of severe vitamin D deficiency leading to critical state."""
        data = {"VitD": 5, "Ca": 7.0, "PTH": 250}
        result = analisar_metabolismo_osseo(data)
        assert "Deficiência de Vitamina D" in result["abnormalities"]
        assert "Hipocalcemia" in result["abnormalities"]
        assert "PTH Elevado" in result["abnormalities"]
        assert result["is_critical"] # Critical due to very low VitD leading to severe Ca/PTH issues

if __name__ == "__main__":
    pytest.main()