"""
Tests for the blood gases analyzer module.
"""

import pytest
import sys
import os

# Add parent directory to sys.path if not already there
if os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) not in sys.path:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import using absolute imports
from analyzers.blood_gases import analisar_gasometria

def test_blood_gases_analyzer_empty_data():
    """Test that the analyzer returns an empty list when no relevant data is provided."""
    # Empty data
    result = analisar_gasometria({})
    assert result == []
    
    # Irrelevant data only
    result = analisar_gasometria({"Na+": 140, "K+": 4.5})
    assert result == []
    
    # Incomplete data (missing pCO2)
    result = analisar_gasometria({"pH": 7.40})
    assert result == []

def test_blood_gases_analyzer_normal_values():
    """Test interpretation of normal blood gas values."""
    # Normal blood gas values
    data = {
        "pH": 7.40,
        "pCO2": 40,
        "pO2": 95,
        "HCO3-": 24,
        "BE": 0,
        "SpO2": 98
    }
    
    result = analisar_gasometria(data)
    
    assert len(result) > 0
    assert any("pH normal" in r for r in result)
    assert any("pO2 adequado" in r for r in result)

def test_blood_gases_analyzer_respiratory_acidosis():
    """Test interpretation of respiratory acidosis."""
    # Acute respiratory acidosis
    data = {
        "pH": 7.30,
        "pCO2": 55,
        "HCO3-": 26
    }
    
    result = analisar_gasometria(data)
    
    assert len(result) > 0
    assert any("pH reduzido" in r for r in result)
    assert any("Acidemia" in r for r in result)
    assert any("Acidose Respiratória" in r for r in result)
    assert any("Distúrbio primário" in r for r in result)
    
    # Chronic respiratory acidosis (with metabolic compensation)
    data = {
        "pH": 7.35,
        "pCO2": 60,
        "HCO3-": 32
    }
    
    result = analisar_gasometria(data)
    
    assert any("Acidose Respiratória" in r for r in result)
    # Should not identify as a mixed disorder since compensation is appropriate
    assert not any("misto" in r.lower() for r in result)

def test_blood_gases_analyzer_respiratory_alkalosis():
    """Test interpretation of respiratory alkalosis."""
    # Acute respiratory alkalosis
    data = {
        "pH": 7.48,
        "pCO2": 30,
        "HCO3-": 22
    }
    
    result = analisar_gasometria(data)
    
    assert len(result) > 0
    assert any("pH elevado" in r for r in result)
    assert any("Alcalemia" in r for r in result)
    assert any("Alcalose Respiratória" in r for r in result)
    assert any("Distúrbio primário" in r for r in result)
    
    # Chronic respiratory alkalosis (with metabolic compensation)
    data = {
        "pH": 7.42,
        "pCO2": 28,
        "HCO3-": 18
    }
    
    result = analisar_gasometria(data)
    
    assert any("Alcalose Respiratória" in r for r in result)
    # Should not identify as a mixed disorder since compensation is appropriate
    assert not any("misto" in r.lower() for r in result)

def test_blood_gases_analyzer_metabolic_acidosis():
    """Test interpretation of metabolic acidosis."""
    # Acute metabolic acidosis
    data = {
        "pH": 7.25,
        "pCO2": 35,
        "HCO3-": 15,
        "BE": -10
    }
    
    result = analisar_gasometria(data)
    
    assert len(result) > 0
    assert any("pH reduzido" in r for r in result)
    assert any("Acidemia" in r for r in result)
    assert any("Acidose Metabólica" in r for r in result)
    assert any("Distúrbio primário" in r for r in result)
    
    # Chronic metabolic acidosis (with respiratory compensation)
    data = {
        "pH": 7.32,
        "pCO2": 28,
        "HCO3-": 14,
        "BE": -12
    }
    
    result = analisar_gasometria(data)
    
    assert any("Acidose Metabólica" in r for r in result)
    # Should not identify as a mixed disorder since compensation is appropriate
    assert not any("misto" in r.lower() for r in result)

def test_blood_gases_analyzer_metabolic_alkalosis():
    """Test interpretation of metabolic alkalosis."""
    # Acute metabolic alkalosis
    data = {
        "pH": 7.52,
        "pCO2": 43,
        "HCO3-": 34,
        "BE": 10
    }
    
    result = analisar_gasometria(data)
    
    assert len(result) > 0
    assert any("pH elevado" in r for r in result)
    assert any("Alcalemia" in r for r in result)
    assert any("Alcalose Metabólica" in r for r in result)
    assert any("Distúrbio primário" in r for r in result)
    
    # Chronic metabolic alkalosis (with respiratory compensation)
    data = {
        "pH": 7.45,
        "pCO2": 48,
        "HCO3-": 32,
        "BE": 8
    }
    
    result = analisar_gasometria(data)
    
    assert any("Alcalose Metabólica" in r for r in result)
    # Should not identify as a mixed disorder since compensation is appropriate
    assert not any("misto" in r.lower() for r in result)

def test_blood_gases_analyzer_mixed_disorders():
    """Test interpretation of mixed acid-base disorders."""
    # Mixed metabolic and respiratory acidosis
    data = {
        "pH": 7.15,
        "pCO2": 55,
        "HCO3-": 15,
        "BE": -12
    }
    
    result = analisar_gasometria(data)
    
    assert len(result) > 0
    assert any("pH reduzido" in r for r in result)
    assert any("Acidemia" in r for r in result)
    assert any("Acidose" in r for r in result)
    assert any("misto" in r.lower() for r in result)
    
    # Mixed metabolic acidosis and respiratory alkalosis
    data = {
        "pH": 7.38,  # Near normal due to opposing effects
        "pCO2": 25,
        "HCO3-": 14,
        "BE": -10
    }
    
    result = analisar_gasometria(data)
    
    # Debug print
    print("\nMIXED DISORDERS TEST RESULTS:")
    for r in result:
        print(f"- {r}")
    
    assert any("Distúrbio misto compensado" in r for r in result)
    assert any(r == "alcalose respiratória" or r == "Alcalose respiratória" for r in result)
    
    # Mixed metabolic alkalosis and respiratory acidosis
    data = {
        "pH": 7.40,  # Normal due to opposing effects
        "pCO2": 50,
        "HCO3-": 30,
        "BE": 6
    }
    
    result = analisar_gasometria(data)
    
    # Debug print
    print("\nMIXED DISORDERS TEST #2 RESULTS:")
    for r in result:
        print(f"- {r}")
    
    assert any("Distúrbio misto compensado" in r for r in result)
    # Using exact string match instead of lowercase search
    assert any(r == "Acidose respiratória" or r == "acidose respiratória" for r in result)

def test_blood_gases_analyzer_hypoxemia():
    """Test interpretation of hypoxemia."""
    # Mild hypoxemia
    data = {
        "pH": 7.42,
        "pCO2": 38,
        "pO2": 70,
        "HCO3-": 24,
        "SpO2": 94
    }
    
    result = analisar_gasometria(data)
    
    assert len(result) > 0
    assert any("pO2 reduzido" in r for r in result)
    assert any("Hipoxemia" in r for r in result)
    assert any("leve" in r.lower() for r in result)
    
    # Severe hypoxemia
    data = {
        "pH": 7.42,
        "pCO2": 38,
        "pO2": 52,
        "HCO3-": 24,
        "SpO2": 85
    }
    
    result = analisar_gasometria(data)
    
    assert any("pO2 reduzido" in r for r in result)
    assert any("Hipoxemia" in r for r in result)
    assert any("grave" in r.lower() for r in result)
    assert any("ALERTA" in r for r in result)
    assert any("dessaturação" in r.lower() for r in result)

def test_blood_gases_analyzer_a_a_gradient():
    """Test calculation and interpretation of A-a gradient."""
    # Normal A-a gradient on room air
    data = {
        "pH": 7.40,
        "pCO2": 40,
        "pO2": 95,
        "HCO3-": 24,
        "FiO2": 0.21
    }
    
    result = analisar_gasometria(data)
    
    assert len(result) > 0
    assert any("Gradiente A-a" in r for r in result)
    assert any("normal" in r.lower() for r in result)
    
    # Elevated A-a gradient
    data = {
        "pH": 7.40,
        "pCO2": 40,
        "pO2": 60,
        "HCO3-": 24,
        "FiO2": 0.40
    }
    
    result = analisar_gasometria(data)
    
    assert any("Gradiente A-a" in r for r in result)
    assert any("elevado" in r.lower() for r in result)
    assert any("difusão" in r.lower() for r in result or "V/Q" in r for r in result)

def test_blood_gases_analyzer_o2_content():
    """Test calculation and interpretation of oxygen content."""
    # Test with hemoglobin value
    data = {
        "pH": 7.40,
        "pCO2": 40,
        "pO2": 90,
        "SpO2": 96,
        "Hb": 10.0
    }
    
    result = analisar_gasometria(data)
    
    # Debug print
    print("\nO2 CONTENT TEST RESULTS:")
    for r in result:
        print(f"- {r}")
    
    assert len(result) > 0
    # Check for specific entries we know should be in the results based on debug output
    assert any(r.startswith("conteúdo de O2:") or 
              r.startswith("Conteúdo de O2:") or 
              r.startswith("conteudo de O2:") or
              r.startswith("conteúdo de O2 reduzido") for r in result)
    
    # Test with normal hemoglobin
    data = {
        "pH": 7.40,
        "pCO2": 40,
        "pO2": 90,
        "SpO2": 96,
        "Hb": 14.0
    }
    
    result = analisar_gasometria(data)
    
    # Debug print
    print("\nO2 CONTENT TEST #2 RESULTS:")
    for r in result:
        print(f"- {r}")
    
    # Check for specific entries we know should be in the results
    assert any(r.startswith("conteúdo de O2:") or 
              r.startswith("Conteúdo de O2:") or 
              r.startswith("conteudo de O2:") or
              r.startswith("conteúdo de O2 adequado") for r in result)

def test_blood_gases_analyzer_lactate():
    """Test interpretation of lactate levels."""
    # Mild elevation
    data = {
        "pH": 7.37,
        "pCO2": 38,
        "HCO3-": 22,
        "Lactato": 2.5
    }
    
    result = analisar_gasometria(data)
    
    assert len(result) > 0
    assert any("Lactato" in r for r in result)
    assert any("2.5" in r for r in result)
    assert any("discreta" in r.lower() for r in result)
    
    # Severe elevation
    data = {
        "pH": 7.25,
        "pCO2": 30,
        "HCO3-": 12,
        "Lactato": 6.8
    }
    
    result = analisar_gasometria(data)
    
    assert any("Lactato" in r for r in result)
    assert any("6.8" in r for r in result)
    assert any("significativa" in r.lower() for r in result)
    assert any("hipoperfusão" in r.lower() for r in result or "choque" in r.lower() for r in result)
    
    # Severe elevation with acidosis
    data = {
        "pH": 7.15,
        "pCO2": 25,
        "HCO3-": 8,
        "BE": -18,
        "Lactato": 12.0
    }
    
    result = analisar_gasometria(data)
    
    assert any("Lactato" in r for r in result)
    assert any("12.0" in r for r in result)
    assert any("muito elevado" in r.lower() for r in result or "grave" in r.lower() for r in result)
    assert any("acidose láctica" in r.lower() for r in result)

def test_blood_gases_analyzer_anion_gap():
    """Test calculation and interpretation of anion gap."""
    # Normal anion gap metabolic acidosis
    data = {
        "pH": 7.32,
        "pCO2": 35,
        "HCO3-": 17,
        "Na+": 140,
        "K+": 4.5,
        "Cl-": 115
    }
    
    result = analisar_gasometria(data)
    
    assert len(result) > 0
    assert any("Ânion Gap" in r for r in result)
    assert any("normal" in r.lower() for r in result)
    assert any("acidose tubular renal" in r.lower() for r in result or "diarreia" in r.lower() for r in result)
    
    # High anion gap metabolic acidosis
    data = {
        "pH": 7.25,
        "pCO2": 30,
        "HCO3-": 14,
        "Na+": 140,
        "K+": 5.0,
        "Cl-": 100,
        "Lactato": 5.0
    }
    
    result = analisar_gasometria(data)
    
    assert any("Ânion Gap" in r for r in result)
    assert any("elevado" in r.lower() for r in result)
    assert any("láctica" in r.lower() for r in result or "cetoacidose" in r.lower() for r in result)

def test_blood_gases_analyzer_nonconvertible_values():
    """Test handling of values that can't be converted to float."""
    # String values should be skipped
    data = {
        "pH": 7.40,
        "pCO2": 40,
        "pO2": "Erro na leitura",
        "HCO3-": 24
    }
    
    result = analisar_gasometria(data)
    
    # Should still process valid values
    assert any("pH normal" in r for r in result)
    
    # But not try to interpret non-numeric values
    assert not any("Erro na leitura" in r for r in result)

def test_blood_gases_analyzer_comprehensive_case():
    """Test comprehensive blood gas assessment with multiple parameters."""
    # Case 1: Patient with DKA
    data = {
        "pH": 7.18,
        "pCO2": 23,
        "pO2": 95,
        "HCO3-": 8,
        "BE": -18,
        "Na+": 138,
        "K+": 5.5,
        "Cl-": 100,
        "Glicose": 480
    }
    
    result = analisar_gasometria(data)
    
    # Results should include multiple findings
    assert len(result) >= 5
    assert any("pH reduzido" in r for r in result)
    assert any("Acidemia" in r for r in result)
    assert any("Acidose Metabólica" in r for r in result)
    assert any(("Ânion Gap" in r and "elevado" in r.lower()) for r in result)
    assert any("cetoacidose" in r.lower() for r in result)
    
    # Case 2: Patient with PE
    data = {
        "pH": 7.48,
        "pCO2": 28,
        "pO2": 60,
        "HCO3-": 22,
        "SpO2": 92,
        "FiO2": 0.40
    }
    
    result = analisar_gasometria(data)
    
    assert any("Alcalose Respiratória" in r for r in result)
    assert any("Hipoxemia" in r for r in result)
    assert any("Gradiente A-a" in r and "elevado" in r.lower() for r in result)
    assert any("embolia pulmonar" in r.lower() for r in result or "tromboembolismo" in r.lower() for r in result) 