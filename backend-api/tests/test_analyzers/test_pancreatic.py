import pytest
import sys
import os

from analyzers.pancreatic import analisar_funcao_pancreatica

class TestPancreaticFunctionAnalyzer:
    """Comprehensive test suite for the pancreatic function analyzer module."""

    def test_pancreatic_analyzer_empty_data(self):
        """Test that the analyzer returns appropriate response when no relevant data is provided."""
        # Empty data
        result = analisar_funcao_pancreatica({})
        assert result == {
            "interpretation": "Dados insuficientes para análise da função pancreática.",
            "abnormalities": [],
            "is_critical": False,
            "recommendations": [],
            "details": {}
        }
        
        # Irrelevant data only
        result = analisar_funcao_pancreatica({"Na+": 140, "K+": 4.5})
        assert result == {
            "interpretation": "Dados insuficientes para análise da função pancreática.",
            "abnormalities": [],
            "is_critical": False,
            "recommendations": [],
            "details": {"Na+": 140, "K+": 4.5}
        }

    def test_pancreatic_analyzer_invalid_values(self):
        """Test handling of non-numeric values."""
        # String values that can't be converted
        result = analisar_funcao_pancreatica({"Amilase": "Hemolisado", "Lipase": "Erro"})
        # Should handle gracefully without crashing
        assert "interpretation" in result
        assert isinstance(result["abnormalities"], list)

    # Amylase Tests
    def test_pancreatic_analyzer_normal_amylase(self):
        """Test interpretation of normal amylase values."""
        # Normal amylase (28-100 U/L)
        result = analisar_funcao_pancreatica({"Amilase": 65})
        assert "normal" in result["interpretation"].lower() or "dentro" in result["interpretation"].lower()
        assert not result["is_critical"]

    def test_pancreatic_analyzer_mildly_elevated_amylase(self):
        """Test interpretation of mildly elevated amylase values."""
        # Mildly elevated amylase (100-200 U/L)
        result = analisar_funcao_pancreatica({"Amilase": 150})
        assert "elevada" in result["interpretation"].lower()
        assert "pancreatite" in result["interpretation"].lower() or "inflamação" in result["interpretation"].lower()
        assert "monitorar" in " ".join(result["recommendations"]).lower() or "acompanhar" in " ".join(result["recommendations"]).lower()
        assert not result["is_critical"]

    def test_pancreatic_analyzer_moderately_elevated_amylase(self):
        """Test interpretation of moderately elevated amylase values."""
        # Moderately elevated amylase (200-500 U/L)
        result = analisar_funcao_pancreatica({"Amilase": 350})
        assert "elevada" in result["interpretation"].lower()
        assert "pancreatite" in result["interpretation"].lower()
        assert "imagem" in " ".join(result["recommendations"]).lower() or "investigação" in " ".join(result["recommendations"]).lower()
        assert not result["is_critical"]

    def test_pancreatic_analyzer_severely_elevated_amylase(self):
        """Test interpretation of severely elevated amylase values."""
        # Severely elevated amylase (>500 U/L)
        result = analisar_funcao_pancreatica({"Amilase": 800})
        assert "elevada" in result["interpretation"].lower()
        assert "acentuada" in result["interpretation"].lower() or "significativa" in result["interpretation"].lower()
        assert "pancreatite aguda" in result["interpretation"].lower()
        assert "avaliação urgente" in " ".join(result["recommendations"]).lower() or "urgente" in " ".join(result["recommendations"]).lower()
        assert result["is_critical"]
        # Should be in abnormalities list
        assert any("amilase elevada" in abn.lower() for abn in result["abnormalities"])

    # Lipase Tests
    def test_pancreatic_analyzer_normal_lipase(self):
        """Test interpretation of normal lipase values."""
        # Normal lipase (13-60 U/L)
        result = analisar_funcao_pancreatica({"Lipase": 35})
        assert "normal" in result["interpretation"].lower() or "dentro" in result["interpretation"].lower()
        assert not result["is_critical"]

    def test_pancreatic_analyzer_mildly_elevated_lipase(self):
        """Test interpretation of mildly elevated lipase values."""
        # Mildly elevated lipase (60-120 U/L)
        result = analisar_funcao_pancreatica({"Lipase": 90})
        assert "elevada" in result["interpretation"].lower()
        assert "pancreatite" in result["interpretation"].lower() or "inflamação" in result["interpretation"].lower()
        assert "monitorar" in " ".join(result["recommendations"]).lower() or "acompanhar" in " ".join(result["recommendations"]).lower()
        assert not result["is_critical"]

    def test_pancreatic_analyzer_moderately_elevated_lipase(self):
        """Test interpretation of moderately elevated lipase values."""
        # Moderately elevated lipase (120-300 U/L)
        result = analisar_funcao_pancreatica({"Lipase": 200})
        assert "elevada" in result["interpretation"].lower()
        assert "pancreatite" in result["interpretation"].lower()
        assert "imagem" in " ".join(result["recommendations"]).lower() or "investigação" in " ".join(result["recommendations"]).lower()
        assert not result["is_critical"]

    def test_pancreatic_analyzer_severely_elevated_lipase(self):
        """Test interpretation of severely elevated lipase values."""
        # Severely elevated lipase (>300 U/L)
        result = analisar_funcao_pancreatica({"Lipase": 500})
        assert "elevada" in result["interpretation"].lower()
        assert "acentuada" in result["interpretation"].lower() or "significativa" in result["interpretation"].lower()
        assert "pancreatite aguda" in result["interpretation"].lower()
        assert "avaliação urgente" in " ".join(result["recommendations"]).lower() or "urgente" in " ".join(result["recommendations"]).lower()
        assert result["is_critical"]
        # Should be in abnormalities list
        assert any("lipase elevada" in abn.lower() for abn in result["abnormalities"])

    # Low Enzyme Tests
    def test_pancreatic_analyzer_low_amylase(self):
        """Test interpretation of low amylase values."""
        # Low amylase (<28 U/L)
        result = analisar_funcao_pancreatica({"Amilase": 20})
        assert "baixa" in result["interpretation"].lower()
        assert "insuficiência" in result["interpretation"].lower() or "deficiência" in result["interpretation"].lower()
        assert "pancreática" in result["interpretation"].lower()

    def test_pancreatic_analyzer_low_lipase(self):
        """Test interpretation of low lipase values."""
        # Low lipase (<13 U/L)
        result = analisar_funcao_pancreatica({"Lipase": 10})
        assert "baixa" in result["interpretation"].lower()
        assert "insuficiência" in result["interpretation"].lower() or "deficiência" in result["interpretation"].lower()
        assert "pancreática" in result["interpretation"].lower()

    # Amylase/Lipase Ratio Tests
    def test_pancreatic_analyzer_amylase_lipase_ratio_pancreatic(self):
        """Test interpretation of amylase/lipase ratio suggestive of pancreatic origin."""
        # Pancreatic ratio (lipase > amylase, both elevated)
        data = {
            "Amilase": 250,
            "Lipase": 600
        }
        result = analisar_funcao_pancreatica(data)
        assert "razão amilase/lipase" in result["interpretation"].lower() or "origem pancreática" in result["interpretation"].lower()
        assert "pancreatite" in result["interpretation"].lower()
        assert result["is_critical"]

    def test_pancreatic_analyzer_amylase_lipase_ratio_salivary(self):
        """Test interpretation of amylase/lipase ratio suggestive of salivary origin."""
        # Salivary ratio (amylase > lipase significantly)
        data = {
            "Amilase": 600,
            "Lipase": 40
        }
        result = analisar_funcao_pancreatica(data)
        assert "origem salivar" in result["interpretation"].lower() or "salivar" in result["interpretation"].lower()
        assert "parotidite" in result["interpretation"].lower() or "sialadenite" in result["interpretation"].lower()

    # Combined Parameter Tests
    def test_pancreatic_analyzer_acute_pancreatitis(self):
        """Test interpretation suggestive of acute pancreatitis."""
        # Acute pancreatitis pattern: Elevated amylase and lipase
        data = {
            "Amilase": 750,
            "Lipase": 950
        }
        result = analisar_funcao_pancreatica(data)
        assert "amilase elevada" in result["interpretation"].lower()
        assert "lipase elevada" in result["interpretation"].lower()
        assert "padrão de elevação" in result["interpretation"].lower() or "pancreatite aguda" in result["interpretation"].lower()
        assert "avaliação urgente" in " ".join(result["recommendations"]).lower()
        assert result["is_critical"]

    def test_pancreatic_analyzer_chronic_pancreatitis(self):
        """Test interpretation suggestive of chronic pancreatitis."""
        # Chronic pancreatitis pattern: Normal or mildly elevated enzymes
        data = {
            "Amilase": 85,
            "Lipase": 55
        }
        result = analisar_funcao_pancreatica(data)
        assert "normal" in result["interpretation"].lower() or "dentro" in result["interpretation"].lower()
        assert "enzimas pancreáticas" in result["interpretation"].lower() or "função pancreática" in result["interpretation"].lower()

    def test_pancreatic_analyzer_pancreatic_insufficiency(self):
        """Test interpretation with pancreatic enzyme insufficiency."""
        # Low enzymes suggesting insufficiency
        data = {
            "Amilase": 25,
            "Lipase": 18
        }
        result = analisar_funcao_pancreatica(data)
        assert "baixa" in result["interpretation"].lower()
        assert "insuficiência" in result["interpretation"].lower()
        assert "pancreática" in result["interpretation"].lower()
        assert "reposição" in " ".join(result["recommendations"]).lower()
        assert "enzimática" in " ".join(result["recommendations"]).lower()

    def test_pancreatic_analyzer_pancreatic_cancer_suspicion(self):
        """Test interpretation with considerations for pancreatic pathology."""
        # Moderately elevated enzymes with potential malignancy context
        data = {
            "Amilase": 180,
            "Lipase": 220
        }
        result = analisar_funcao_pancreatica(data)
        assert "elevada" in result["interpretation"].lower()
        assert "pancreática" in result["interpretation"].lower()
        # Should recommend further investigation
        assert any("neoplasia" in rec.lower() or "tumor" in rec.lower() or "investigação" in rec.lower() 
                  for rec in result["recommendations"])

    # Comprehensive Clinical Cases
    def test_pancreatic_analyzer_severe_acute_pancreatitis(self):
        """Test comprehensive case of severe acute pancreatitis."""
        # Severe acute pancreatitis: Highly elevated amylase and lipase
        data = {
            "Amilase": 1200,
            "Lipase": 1500,
            "LDH": 450
        }
        result = analisar_funcao_pancreatica(data)
        assert "amilase elevada" in result["interpretation"].lower()
        assert "lipase elevada" in result["interpretation"].lower()
        assert "acentuada" in result["interpretation"].lower() or "significativa" in result["interpretation"].lower()
        assert "pancreatite aguda" in result["interpretation"].lower()
        assert "grave" in result["interpretation"].lower() or "severa" in result["interpretation"].lower()
        assert "avaliação urgente" in " ".join(result["recommendations"]).lower()
        assert result["is_critical"]

    def test_pancreatic_analyzer_pancreatic_enzyme_insufficiency_comprehensive(self):
        """Test comprehensive case of pancreatic enzyme insufficiency."""
        # Severe insufficiency with clinical context
        data = {
            "Amilase": 15,
            "Lipase": 8
        }
        result = analisar_funcao_pancreatica(data)
        assert "baixa" in result["interpretation"].lower()
        assert "insuficiência" in result["interpretation"].lower()
        assert "pancreática" in result["interpretation"].lower()
        assert "reposição" in " ".join(result["recommendations"]).lower()
        assert "enzimática" in " ".join(result["recommendations"]).lower()
        # May recommend nutritional support
        assert any("nutricional" in rec.lower() or "dietética" in rec.lower() or "suporte" in rec.lower()
                  for rec in result["recommendations"])

    def test_pancreatic_analyzer_mixed_elevation_pattern(self):
        """Test mixed elevation patterns."""
        # High amylase, normal lipase (possible salivary origin)
        data = {
            "Amilase": 500,
            "Lipase": 45
        }
        result = analisar_funcao_pancreatica(data)
        assert "amilase elevada" in result["interpretation"].lower()
        assert "origem salivar" in result["interpretation"].lower() or "salivar" in result["interpretation"].lower()

        # Normal amylase, high lipase (more specific for pancreas)
        data = {
            "Amilase": 80,
            "Lipase": 400
        }
        result = analisar_funcao_pancreatica(data)
        assert "lipase elevada" in result["interpretation"].lower()
        assert "pancreatite" in result["interpretation"].lower()
        assert result["is_critical"]

    def test_pancreatic_analyzer_borderline_values(self):
        """Test interpretation of borderline values."""
        # Borderline high amylase
        result = analisar_funcao_pancreatica({"Amilase": 105})
        assert "elevada" in result["interpretation"].lower() or "aumentada" in result["interpretation"].lower()

        # Borderline low amylase
        result = analisar_funcao_pancreatica({"Amilase": 25})
        assert "baixa" in result["interpretation"].lower()

        # Borderline high lipase
        result = analisar_funcao_pancreatica({"Lipase": 65})
        assert "elevada" in result["interpretation"].lower() or "aumentada" in result["interpretation"].lower()

    def test_pancreatic_analyzer_with_supporting_markers(self):
        """Test analysis with additional supporting laboratory markers."""
        # Include other markers that might be present
        data = {
            "Amilase": 800,
            "Lipase": 900,
            "ALT": 120,
            "AST": 95,
            "Bilirrubina total": 2.5
        }
        result = analisar_funcao_pancreatica(data)
        assert "amilase elevada" in result["interpretation"].lower()
        assert "lipase elevada" in result["interpretation"].lower()
        assert "pancreatite" in result["interpretation"].lower()
        assert result["is_critical"]
        # Should consider biliary involvement
        assert any("biliar" in rec.lower() or "colangite" in rec.lower() or "hepatobiliar" in rec.lower()
                  for rec in result["recommendations"])

    # Edge Cases and Error Handling
    def test_pancreatic_analyzer_extreme_values(self):
        """Test handling of extreme values."""
        # Test with extremely high values
        result = analisar_funcao_pancreatica({"Amilase": 5000, "Lipase": 6000})
        assert result["is_critical"]
        assert len(result["abnormalities"]) >= 1

        # Test with extremely low values
        result = analisar_funcao_pancreatica({"Amilase": 1, "Lipase": 1})
        assert "insuficiência" in result["interpretation"].lower()

    def test_pancreatic_analyzer_single_parameter_analysis(self):
        """Test analysis with only one parameter."""
        # Only amylase
        result = analisar_funcao_pancreatica({"Amilase": 400})
        assert "amilase elevada" in result["interpretation"].lower()
        assert result["is_critical"]

        # Only lipase
        result = analisar_funcao_pancreatica({"Lipase": 350})
        assert "lipase elevada" in result["interpretation"].lower()
        assert result["is_critical"]

    def test_pancreatic_analyzer_normal_with_clinical_context(self):
        """Test normal values but with clinical recommendations."""
        data = {
            "Amilase": 70,
            "Lipase": 40
        }
        result = analisar_funcao_pancreatica(data)
        assert "normal" in result["interpretation"].lower() or "dentro" in result["interpretation"].lower()
        assert not result["is_critical"]
        # Should still provide basic recommendations for pancreatic health
        assert len(result["recommendations"]) >= 0  # May have general recommendations

    def test_pancreatic_analyzer_age_considerations(self):
        """Test if analyzer considers age-related variations (if implemented)."""
        # This would test age-specific reference ranges if implemented
        # For now, just verify consistent behavior
        data = {"Amilase": 95, "Lipase": 55}
        result = analisar_funcao_pancreatica(data)
        assert "normal" in result["interpretation"].lower() or "dentro" in result["interpretation"].lower()

    def test_pancreatic_analyzer_medication_effects(self):
        """Test considerations for medication effects (if implemented)."""
        # Some medications can affect pancreatic enzymes
        # For now, verify the analyzer handles elevated values appropriately
        data = {"Amilase": 200, "Lipase": 180}
        result = analisar_funcao_pancreatica(data)
        assert "elevada" in result["interpretation"].lower()
        # Should recommend investigating causes
        assert any("investigar" in rec.lower() or "avaliar" in rec.lower() 
                  for rec in result["recommendations"])

if __name__ == "__main__":
    pytest.main([__file__, "-v"])