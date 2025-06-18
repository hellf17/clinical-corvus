"""
Tests for the hematology analyzer module.
"""

import pytest
import sys
import os

# Add parent directory to sys.path if not already there
if os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) not in sys.path:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import using absolute imports
from analyzers.hematology import analisar_hemograma

def test_hematology_analyzer_empty_data():
    """Test that the analyzer returns an empty list when no relevant data is provided."""
    # Empty data
    result = analisar_hemograma({})
    assert result == []
    
    # Irrelevant data only
    result = analisar_hemograma({"Na+": 140, "K+": 4.5})
    assert result == []

def test_hematology_analyzer_normal_cbc():
    """Test interpretation of normal CBC values."""
    # Normal CBC values
    data = {
        "Hb": 14.5,
        "Ht": 44,
        "Leuco": 8000,
        "Plaq": 250000,
        "Segm": 5000,
        "VCM": 90,
        "HCM": 30,
        "RDW": 13.5
    }
    
    result = analisar_hemograma(data)
    
    assert len(result) > 0
    assert any("Hemoglobina normal" in r for r in result)
    assert any("Leucócitos normais" in r for r in result)
    assert any("Plaquetas normais" in r for r in result)

def test_hematology_analyzer_gender_specific_ranges():
    """Test that gender-specific reference ranges are applied correctly."""
    # Borderline hemoglobin for females (normal)
    data = {
        "Hb": 12.2,
        "Ht": 37
    }
    
    result = analisar_hemograma(data, sexo='F')
    
    assert any("Hemoglobina normal" in r for r in result)
    
    # Borderline hemoglobin for males (anemia)
    result = analisar_hemograma(data, sexo='M')
    
    assert any("Anemia" in r for r in result)
    
    # Borderline hematocrit
    data = {
        "Ht": 38
    }
    
    result = analisar_hemograma(data, sexo='F')
    assert any("normal" in r.lower() for r in result) or not any("reduzido" in r for r in result)
    
    result = analisar_hemograma(data, sexo='M')
    assert any("reduzido" in r for r in result)

def test_hematology_analyzer_anemia():
    """Test interpretation of anemia."""
    # Mild anemia
    data = {
        "Hb": 11.0
    }
    
    result = analisar_hemograma(data)
    
    assert len(result) > 0
    assert any("Anemia" in r for r in result)
    
    # Moderate anemia
    data = {
        "Hb": 9.0
    }
    
    result = analisar_hemograma(data)
    
    assert any("Anemia" in r for r in result)
    assert any("moderada" in r.lower() for r in result)
    
    # Severe anemia
    data = {
        "Hb": 6.5
    }
    
    result = analisar_hemograma(data)
    
    assert any("Anemia" in r for r in result)
    assert any("grave" in r.lower() for r in result)
    assert any("transfusão" in r.lower() for r in result)

def test_hematology_analyzer_polycythemia():
    """Test interpretation of polycythemia."""
    # Polycythemia
    data = {
        "Hb": 18.0,
        "Ht": 54
    }
    
    result = analisar_hemograma(data)
    
    assert len(result) > 0
    assert any("Policitemia" in r for r in result)
    assert any("Hematócrito elevado" in r for r in result)
    assert any("desidratação" in r.lower() for r in result or "policitemia vera" in r.lower() for r in result)

def test_hematology_analyzer_leukocytosis():
    """Test interpretation of leukocytosis."""
    # Mild leukocytosis
    data = {
        "Leuco": 13000
    }
    
    result = analisar_hemograma(data)
    
    assert len(result) > 0
    assert any("Leucocitose" in r for r in result)
    assert any("moderada" in r.lower() for r in result)
    assert any("infecções bacterianas" in r.lower() for r in result)
    
    # Severe leukocytosis
    data = {
        "Leuco": 25000
    }
    
    result = analisar_hemograma(data)
    
    assert any("Leucocitose" in r for r in result)
    assert any("importante" in r.lower() for r in result)
    assert any("infecção grave" in r.lower() for r in result)

def test_hematology_analyzer_leukopenia():
    """Test interpretation of leukopenia."""
    # Mild leukopenia
    data = {
        "Leuco": 3500
    }
    
    result = analisar_hemograma(data)
    
    assert len(result) > 0
    assert any("Leucopenia" in r for r in result)
    
    # Severe leukopenia
    data = {
        "Leuco": 800
    }
    
    result = analisar_hemograma(data)
    
    assert any("Leucopenia" in r for r in result)
    assert any("grave" in r.lower() for r in result)
    assert any("oportunistas" in r.lower() for r in result)

def test_hematology_analyzer_neutrophilia():
    """Test interpretation of neutrophilia."""
    data = {
        "Segm": 8500
    }
    
    result = analisar_hemograma(data)
    
    assert len(result) > 0
    assert any("Neutrofilia" in r for r in result)
    assert any("infecção bacteriana" in r.lower() for r in result or "inflamação" in r.lower() for r in result)

def test_hematology_analyzer_neutropenia():
    """Test interpretation of neutropenia."""
    data = {
        "Segm": 1200
    }
    
    result = analisar_hemograma(data)
    
    assert len(result) > 0
    assert any("Neutropenia" in r for r in result)
    assert any("infecções bacterianas" in r.lower() for r in result)

def test_hematology_analyzer_left_shift():
    """Test interpretation of left shift."""
    data = {
        "Bastões": 800
    }
    
    result = analisar_hemograma(data)
    
    assert len(result) > 0
    assert any("Desvio à esquerda" in r for r in result)
    assert any("infeccioso" in r.lower() for r in result or "inflamatório" in r.lower() for r in result)

def test_hematology_analyzer_thrombocytopenia():
    """Test interpretation of thrombocytopenia."""
    # Mild thrombocytopenia
    data = {
        "Plaq": 90000
    }
    
    result = analisar_hemograma(data)
    
    assert len(result) > 0
    assert any("Trombocitopenia" in r for r in result)
    assert any("leve" in r.lower() for r in result)
    assert any("sem risco" in r.lower() for r in result)
    
    # Moderate thrombocytopenia
    data = {
        "Plaq": 40000
    }
    
    result = analisar_hemograma(data)
    
    assert any("Trombocitopenia" in r for r in result)
    assert any("moderada" in r.lower() for r in result)
    assert any("procedimentos invasivos" in r.lower() for r in result)
    
    # Severe thrombocytopenia
    data = {
        "Plaq": 15000
    }
    
    result = analisar_hemograma(data)
    
    assert any("Trombocitopenia" in r for r in result)
    assert any("grave" in r.lower() for r in result)
    assert any("sangramento espontâneo" in r.lower() for r in result)

def test_hematology_analyzer_thrombocytosis():
    """Test interpretation of thrombocytosis."""
    # Moderate thrombocytosis
    data = {
        "Plaq": 500000
    }
    
    result = analisar_hemograma(data)
    
    assert len(result) > 0
    assert any("Trombocitose" in r for r in result)
    
    # Severe thrombocytosis
    data = {
        "Plaq": 750000
    }
    
    result = analisar_hemograma(data)
    
    assert any("Trombocitose" in r for r in result)
    assert any("importante" in r.lower() for r in result)
    assert any("risco trombótico" in r.lower() for r in result)
    
    # Extreme thrombocytosis
    data = {
        "Plaq": 1200000
    }
    
    result = analisar_hemograma(data)
    
    assert any("Trombocitose" in r for r in result)
    assert any("extrema" in r.lower() for r in result)
    assert any("mieloproliferativa" in r.lower() for r in result)

def test_hematology_analyzer_reticulocytes():
    """Test interpretation of reticulocytes."""
    # Low reticulocytes
    data = {
        "Retic": 0.3
    }
    
    result = analisar_hemograma(data)
    
    assert len(result) > 0
    assert any("Reticulócitos reduzidos" in r for r in result)
    assert any("deficiência na produção" in r.lower() for r in result)
    
    # High reticulocytes
    data = {
        "Retic": 3.5
    }
    
    result = analisar_hemograma(data)
    
    assert any("Reticulócitos aumentados" in r for r in result)
    assert any("resposta medular" in r.lower() for r in result or "hemólise" in r.lower() for r in result)

def test_hematology_analyzer_rbc_indices():
    """Test interpretation of red blood cell indices."""
    # Microcytosis
    data = {
        "VCM": 72
    }
    
    result = analisar_hemograma(data)
    
    assert len(result) > 0
    assert any("Microcitose" in r for r in result)
    assert any("deficiência de ferro" in r.lower() for r in result or "talassemia" in r.lower() for r in result)
    
    # Macrocytosis
    data = {
        "VCM": 105
    }
    
    result = analisar_hemograma(data)
    
    assert any("Macrocitose" in r for r in result)
    assert any("B12" in r for r in result or "folato" in r.lower() for r in result)
    
    # Hypochromia
    data = {
        "HCM": 25
    }
    
    result = analisar_hemograma(data)
    
    assert any("Hipocromia" in r for r in result)
    
    # Anisocytosis
    data = {
        "RDW": 16.5
    }
    
    result = analisar_hemograma(data)
    
    assert any("Anisocitose" in r for r in result)
    assert any("variabilidade" in r.lower() for r in result)

def test_hematology_analyzer_anemia_classification():
    """Test classification of anemia based on indices."""
    # Microcytic hypochromic anemia
    data = {
        "Hb": 10.5,
        "VCM": 75,
        "HCM": 24
    }
    
    result = analisar_hemograma(data)
    
    assert len(result) > 0
    assert any("Anemia" in r for r in result)
    assert any("microcítica hipocrômica" in r.lower() for r in result)
    assert any("deficiência de ferro" in r.lower() for r in result)
    
    # Macrocytic anemia
    data = {
        "Hb": 10.5,
        "VCM": 106,
        "HCM": 32
    }
    
    result = analisar_hemograma(data)
    
    assert any("Anemia" in r for r in result)
    assert any("macrocítica" in r.lower() for r in result)
    assert any("B12" in r for r in result or "folato" in r.lower() for r in result)
    
    # Normocytic normochromic anemia
    data = {
        "Hb": 10.5,
        "VCM": 88,
        "HCM": 30
    }
    
    result = analisar_hemograma(data)
    
    assert any("Anemia" in r for r in result)
    assert any("normocítica normocrômica" in r.lower() for r in result)
    assert any("anemia de doença crônica" in r.lower() for r in result or "insuficiência renal" in r.lower() for r in result)

def test_hematology_analyzer_comprehensive_case():
    """Test comprehensive CBC assessment with multiple parameters."""
    # Case 1: Iron deficiency anemia
    data = {
        "Hb": 8.5,
        "Ht": 28,
        "Leuco": 7000,
        "Plaq": 350000,
        "VCM": 72,
        "HCM": 24,
        "RDW": 17.5
    }
    
    result = analisar_hemograma(data)
    
    # Results should include multiple findings
    assert len(result) >= 5
    assert any("Anemia" in r for r in result)
    assert any("moderada" in r.lower() for r in result)
    assert any("Microcitose" in r for r in result)
    assert any("Hipocromia" in r for r in result)
    assert any("Anisocitose" in r for r in result)
    assert any("microcítica hipocrômica" in r.lower() for r in result)
    assert any("deficiência de ferro" in r.lower() for r in result)
    
    # Case 2: Infection with neutrophilia and thrombocytosis
    data = {
        "Hb": 13.0,
        "Ht": 39,
        "Leuco": 16000,
        "Segm": 12000,
        "Bastões": 1200,
        "Plaq": 550000
    }
    
    result = analisar_hemograma(data)
    
    assert any("Leucocitose" in r for r in result)
    assert any("Neutrofilia" in r for r in result)
    assert any("Desvio à esquerda" in r for r in result)
    assert any("Trombocitose" in r for r in result)
    assert any("infecção" in r.lower() for r in result or "inflamatório" in r.lower() for r in result) 