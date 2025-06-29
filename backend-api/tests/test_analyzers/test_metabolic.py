"""
Tests for the metabolic function analyzer module.
"""

import pytest
import sys
import os

# Add parent directory to sys.path if not already there
if os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) not in sys.path:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import using absolute imports
from analyzers.metabolic import analisar_metabolismo

def test_metabolic_analyzer_empty_data():
    """Test that the analyzer returns an empty list when no relevant data is provided."""
    # Empty data
    result = analisar_metabolismo({})
    assert result == []
    
    # Irrelevant data only
    result = analisar_metabolismo({"Hb": 14.5, "Leuco": 9000})
    assert result == []

def test_metabolic_analyzer_glucose_fasting():
    """Test interpretation of fasting glucose values."""
    # Normal fasting glucose
    result = analisar_metabolismo({"Glicose": 90}, jejum=True)
    
    assert len(result) > 0
    assert any("normal" in r.lower() for r in result)
    assert any("90" in r for r in result)
    
    # Impaired fasting glucose (pre-diabetes)
    result = analisar_metabolismo({"Glicose": 110}, jejum=True)
    
    assert len(result) > 0
    assert any("alterada" in r.lower() for r in result)
    assert any("pré-diabetes" in r.lower() for r in result)
    assert any("110" in r for r in result)
    
    # Diabetic range fasting glucose
    result = analisar_metabolismo({"Glicose": 140}, jejum=True)
    
    assert len(result) > 0
    assert any("diabetes" in r.lower() for r in result)
    assert any("140" in r for r in result)
    
    # Markedly elevated glucose
    result = analisar_metabolismo({"Glicose": 250}, jejum=True)
    
    assert len(result) > 0
    assert any("hiperglicemia acentuada" in r.lower() for r in result)
    assert any("250" in r for r in result)
    assert any("mal controlado" in r.lower() or "descompensado" in r.lower() for r in result)

def test_metabolic_analyzer_glucose_nonfasting():
    """Test interpretation of non-fasting (random) glucose values."""
    # Normal random glucose
    result = analisar_metabolismo({"Glicose": 120}, jejum=False)
    
    assert len(result) > 0
    assert any("normal" in r.lower() for r in result)
    assert any("120" in r for r in result)
    
    # Elevated random glucose
    result = analisar_metabolismo({"Glicose": 180}, jejum=False)
    
    assert len(result) > 0
    assert any("pós-prandial alterada" in r.lower() for r in result)
    assert any("180" in r for r in result)
    
    # Diabetic range random glucose
    result = analisar_metabolismo({"Glicose": 220}, jejum=False)
    
    assert len(result) > 0
    assert any("diabetes" in r.lower() for r in result)
    assert any("220" in r for r in result)

def test_metabolic_analyzer_HbA1c():
    """Test interpretation of HbA1c values."""
    # Normal HbA1c
    result = analisar_metabolismo({"HbA1c": 5.4})
    
    assert len(result) > 0
    assert any("hba1c normal" in r.lower() for r in result)
    assert any("5.4" in r for r in result)
    
    # Pre-diabetic HbA1c
    result = analisar_metabolismo({"HbA1c": 6.0})
    
    assert len(result) > 0
    assert any("hba1c intermediária" in r.lower() for r in result)
    assert any("pré-diabetes" in r.lower() for r in result)
    assert any("6.0" in r for r in result)
    
    # Diabetic HbA1c
    result = analisar_metabolismo({"HbA1c": 6.7})
    
    assert len(result) > 0
    assert any("hba1c elevada" in r.lower() for r in result)
    assert any("6.7" in r for r in result)
    assert any("diabetes" in r.lower() for r in result)
    
    # Poorly controlled diabetes
    result = analisar_metabolismo({"HbA1c": 8.5})
    
    assert len(result) > 0
    assert any("hba1c elevada" in r.lower() for r in result)
    assert any("8.5" in r for r in result)
    assert any("controle glicêmico ruim" in r.lower() for r in result)

def test_metabolic_analyzer_combined_glucose_HbA1c():
    """Test that combined glucose and HbA1c values give appropriate diagnosis."""
    # Both in diabetic range
    result = analisar_metabolismo({"Glicose": 145, "HbA1c": 7.2}, jejum=True)
    
    assert len(result) > 0
    assert any("padrão compatível com diabetes mellitus" in r.lower() for r in result)
    
    # Pre-diabetic values
    result = analisar_metabolismo({"Glicose": 115, "HbA1c": 6.2}, jejum=True)
    
    assert len(result) > 0
    assert any("padrão compatível com pré-diabetes" in r.lower() for r in result)

def test_metabolic_analyzer_uric_acid():
    """Test interpretation of uric acid values."""
    # Normal uric acid (male)
    result = analisar_metabolismo({"AcidoUrico": 5.0}, sexo="M")
    
    assert len(result) > 0
    assert any("ácido úrico normal" in r.lower() for r in result)
    assert any("5.0" in r for r in result)
    
    # Elevated uric acid (male)
    result = analisar_metabolismo({"AcidoUrico": 7.5}, sexo="M")
    
    assert len(result) > 0
    assert any("ácido úrico elevado" in r.lower() for r in result)
    assert any("7.5" in r for r in result)
    
    # Severely elevated uric acid (male)
    result = analisar_metabolismo({"AcidoUrico": 9.0}, sexo="M")
    
    assert len(result) > 0
    assert any("ácido úrico elevado" in r.lower() for r in result)
    assert any("9.0" in r for r in result)
    assert any("hiperuricemia acentuada" in r.lower() for r in result)
    
    # Normal uric acid (female) - should adapt reference ranges
    result = analisar_metabolismo({"AcidoUrico": 5.5}, sexo="F")
    
    assert len(result) > 0
    # Women have lower threshold for high uric acid
    assert any("ácido úrico elevado" in r.lower() for r in result)
    assert any("5.5" in r for r in result)

def test_metabolic_analyzer_lipid_profile():
    """Test interpretation of lipid profile parameters."""
    # Normal lipid profile
    result = analisar_metabolismo({
        "CT": 180,
        "LDL": 90,
        "HDL": 55,
        "TG": 120
    })
    
    assert len(result) > 0
    assert any("== perfil lipídico ==" in r.lower() for r in result)
    assert any("colesterol total" in r.lower() and "desejável" in r.lower() for r in result)
    assert any("ldl-colesterol ótimo" in r.lower() for r in result)
    assert any("hdl-colesterol normal" in r.lower() for r in result)
    assert any("triglicerídeos normais" in r.lower() for r in result)
    
    # Elevated total cholesterol
    result = analisar_metabolismo({"CT": 245})
    
    assert len(result) > 0
    assert any("colesterol total elevado" in r.lower() for r in result)
    assert any("245" in r for r in result)
    assert any("hipercolesterolemia significativa" in r.lower() for r in result)
    
    # Elevated LDL
    result = analisar_metabolismo({"LDL": 175})
    
    assert len(result) > 0
    assert any("ldl-colesterol elevado" in r.lower() for r in result)
    assert any("175" in r for r in result)
    
    # Low HDL (male)
    result = analisar_metabolismo({"HDL": 30}, sexo="M")
    
    assert len(result) > 0
    assert any("hdl-colesterol reduzido" in r.lower() for r in result)
    assert any("30" in r for r in result)
    assert any("fator de risco cardiovascular" in r.lower() for r in result)
    
    # Low HDL (female) - different threshold
    result = analisar_metabolismo({"HDL": 45}, sexo="F")
    
    assert len(result) > 0
    assert any("hdl-colesterol reduzido" in r.lower() for r in result)
    assert any("45" in r for r in result)
    
    # Elevated triglycerides
    result = analisar_metabolismo({"TG": 230})
    
    assert len(result) > 0
    assert any("hipertrigliceridemia" in r.lower() for r in result)
    assert any("230" in r for r in result)
    
    # Very high triglycerides
    result = analisar_metabolismo({"TG": 550})
    
    assert len(result) > 0
    assert any("triglicerídeos muito elevados" in r.lower() for r in result)
    assert any("550" in r for r in result)
    assert any("risco de pancreatite" in r.lower() for r in result)
    
    # Calculate non-HDL cholesterol
    result = analisar_metabolismo({"CT": 220, "HDL": 40})
    
    assert len(result) > 0
    assert any("colesterol não-hdl" in r.lower() for r in result)
    # Non-HDL should be 180
    assert any("180" in r for r in result)

def test_metabolic_analyzer_thyroid():
    """Test interpretation of thyroid function tests."""
    # Normal thyroid function
    result = analisar_metabolismo({
        "TSH": 2.5,
        "T4L": 1.2
    })
    
    assert len(result) > 0
    assert any("== função tireoidiana ==" in r.lower() for r in result)
    assert any("tsh normal" in r.lower() for r in result)
    assert any("t4 livre normal" in r.lower() for r in result)
    
    # Primary hypothyroidism
    result = analisar_metabolismo({
        "TSH": 15.0,
        "T4L": 0.6
    })
    
    assert len(result) > 0
    assert any("tsh elevado" in r.lower() for r in result)
    assert any("t4 livre reduzido" in r.lower() for r in result)
    assert any("hipotireoidismo primário" in r.lower() for r in result)
    
    # Subclinical hypothyroidism
    result = analisar_metabolismo({
        "TSH": 6.5,
        "T4L": 1.1
    })
    
    assert len(result) > 0
    assert any("tsh elevado" in r.lower() for r in result)
    assert any("t4 livre normal" in r.lower() for r in result)
    assert any("hipotireoidismo subclínico" in r.lower() for r in result)
    
    # Primary hyperthyroidism
    result = analisar_metabolismo({
        "TSH": 0.05,
        "T4L": 2.5
    })
    
    assert len(result) > 0
    assert any("tsh reduzido" in r.lower() for r in result)
    assert any("t4 livre elevado" in r.lower() for r in result)
    assert any("hipertireoidismo primário" in r.lower() for r in result)
    
    # Subclinical hyperthyroidism
    result = analisar_metabolismo({
        "TSH": 0.2,
        "T4L": 1.3
    })
    
    assert len(result) > 0
    assert any("tsh reduzido" in r.lower() for r in result)
    assert any("t4 livre normal" in r.lower() for r in result)
    assert any("hipertireoidismo subclínico" in r.lower() for r in result)

def test_metabolic_analyzer_metabolic_syndrome():
    """Test detection of metabolic syndrome components."""
    # Multiple metabolic syndrome components
    result = analisar_metabolismo({
        "Glicose": 115,
        "HDL": 35,
        "TG": 180
    }, sexo="M", jejum=True)
    
    assert len(result) > 0
    assert any("múltiplas alterações metabólicas" in r.lower() for r in result)
    assert any("síndrome metabólica" in r.lower() for r in result)
    
    # Female-specific HDL threshold
    result = analisar_metabolismo({
        "Glicose": 112,
        "HDL": 45,
        "TG": 170
    }, sexo="F", jejum=True)
    
    assert len(result) > 0
    assert any("múltiplas alterações metabólicas" in r.lower() for r in result)
    assert any("síndrome metabólica" in r.lower() for r in result)

def test_metabolic_analyzer_comprehensive_case():
    """Test a comprehensive metabolic assessment with multiple parameters."""
    # Complete dataset with diabetes, dyslipidemia and metabolic syndrome
    data = {
        "Glicose": 162,
        "HbA1c": 7.8,
        "CT": 230,
        "LDL": 145,
        "HDL": 38,
        "TG": 210,
        "AcidoUrico": 7.2,
        "TSH": 2.1,
        "T4L": 1.1
    }
    
    result = analisar_metabolismo(data, idade=55, sexo="M", jejum=True)
    
    assert len(result) >= 10
    
    # Diabetes findings
    assert any("glicemia de jejum elevada" in r.lower() for r in result)
    assert any("hba1c elevada" in r.lower() for r in result)
    assert any("diabetes mellitus" in r.lower() for r in result)
    
    # Lipid findings
    assert any("colesterol total elevado" in r.lower() for r in result)
    assert any("ldl-colesterol elevado" in r.lower() for r in result)
    assert any("hdl-colesterol reduzido" in r.lower() for r in result)
    assert any("hipertrigliceridemia" in r.lower() for r in result)
    
    # Uric acid
    assert any("ácido úrico elevado" in r.lower() for r in result)
    
    # Thyroid normal
    assert any("tsh normal" in r.lower() for r in result)
    assert any("t4 livre normal" in r.lower() for r in result)
    
    # Metabolic syndrome
    assert any("síndrome metabólica" in r.lower() for r in result) 