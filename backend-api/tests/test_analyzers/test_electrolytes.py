"""
Tests for the electrolytes analyzer module.
"""

import pytest
import sys
import os

# Add parent directory to sys.path if not already there
if os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) not in sys.path:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import using absolute imports
from analyzers.electrolytes import analisar_eletrolitos

def test_electrolytes_analyzer_empty_data():
    """Test that the analyzer returns expected dictionary structure when no relevant data is provided."""
    # Empty data
    result = analisar_eletrolitos({})
    assert isinstance(result, dict)
    assert 'interpretation' in result
    assert 'insufficient' in result['interpretation'].lower() or 'insuficientes' in result['interpretation'].lower()
    
    # Irrelevant data only
    result = analisar_eletrolitos({"Creat": 1.2, "Ur": 35})
    assert isinstance(result, dict)
    assert 'insufficient' in result['interpretation'].lower() or 'insuficientes' in result['interpretation'].lower()

def test_electrolytes_analyzer_normal_values():
    """Test interpretation of normal electrolyte values."""
    # All normal values
    data = {
        "Na+": 140,
        "K+": 4.2,
        "Ca+": 9.5,
        "Mg+": 2.0,
        "P": 3.2
    }
    
    result = analisar_eletrolitos(data)
    
    assert isinstance(result, dict)
    assert 'interpretation' in result
    assert 'abnormalities' in result
    assert 'is_critical' in result
    assert 'recommendations' in result
    assert 'details' in result
    assert result['is_critical'] is False
    assert "sódio normal" in result['interpretation'].lower() or "na+ normal" in result['interpretation'].lower()
    assert "potássio normal" in result['interpretation'].lower() or "k+ normal" in result['interpretation'].lower()
    assert "cálcio total normal" in result['interpretation'].lower() or "ca+ normal" in result['interpretation'].lower()
    assert "magnésio normal" in result['interpretation'].lower() or "mg+ normal" in result['interpretation'].lower()
    assert "fósforo normal" in result['interpretation'].lower() or "p normal" in result['interpretation'].lower()

def test_electrolytes_analyzer_hyponatremia():
    """Test interpretation of hyponatremia."""
    # Mild hyponatremia
    data = {
        "Na+": 130
    }
    
    result = analisar_eletrolitos(data)
    
    assert isinstance(result, dict)
    assert len(result['interpretation']) > 0
    assert "hiponatremia" in result['interpretation'].lower()
    assert "130" in result['interpretation'] or "130" in str(result['details'])
    
    # Severe hyponatremia
    data = {
        "Na+": 118
    }
    
    result = analisar_eletrolitos(data)
    
    assert "hiponatremia" in result['interpretation'].lower()
    assert "118" in result['interpretation'] or "118" in str(result['details'])
    assert "grave" in result['interpretation'].lower() or result['is_critical'] is True
    assert "convulsões" in result['interpretation'].lower() or len(result['recommendations']) > 0

def test_electrolytes_analyzer_hypernatremia():
    """Test interpretation of hypernatremia."""
    # Mild hypernatremia
    data = {
        "Na+": 148
    }
    
    result = analisar_eletrolitos(data)
    
    assert len(result) > 0
    assert any("Hipernatremia" in r for r in result)
    assert any("148" in r for r in result)
    
    # Severe hypernatremia
    data = {
        "Na+": 165
    }
    
    result = analisar_eletrolitos(data)
    
    assert any("Hipernatremia" in r for r in result)
    assert any("165" in r for r in result)
    assert any("grave" in r.lower() for r in result)
    assert any("neurológicas" in r.lower() for r in result)

def test_electrolytes_analyzer_hypokalemia():
    """Test interpretation of hypokalemia."""
    # Mild hypokalemia
    data = {
        "K+": 3.2
    }
    
    result = analisar_eletrolitos(data)
    
    assert len(result) > 0
    assert any("Hipocalemia" in r for r in result)
    assert any("3.2" in r for r in result)
    
    # Severe hypokalemia
    data = {
        "K+": 2.3
    }
    
    result = analisar_eletrolitos(data)
    
    assert any("Hipocalemia" in r for r in result)
    assert any("2.3" in r for r in result)
    assert any("grave" in r.lower() for r in result)
    assert any("reposição imediata" in r.lower() for r in result)

def test_electrolytes_analyzer_hyperkalemia():
    """Test interpretation of hyperkalemia."""
    # Mild hyperkalemia
    data = {
        "K+": 5.5
    }
    
    result = analisar_eletrolitos(data)
    
    assert len(result) > 0
    assert any("Hipercalemia" in r for r in result)
    assert any("5.5" in r for r in result)
    
    # Severe hyperkalemia
    data = {
        "K+": 6.8
    }
    
    result = analisar_eletrolitos(data)
    
    assert any("Hipercalemia" in r for r in result)
    assert any("6.8" in r for r in result)
    assert any("grave" in r.lower() for r in result)
    assert any("parada cardíaca" in r.lower() for r in result)

def test_electrolytes_analyzer_hypocalcemia():
    """Test interpretation of hypocalcemia."""
    # Mild hypocalcemia
    data = {
        "Ca+": 8.0
    }
    
    result = analisar_eletrolitos(data)
    
    assert len(result) > 0
    assert any("Hipocalcemia" in r for r in result)
    assert any("8.0" in r for r in result)
    
    # Severe hypocalcemia
    data = {
        "Ca+": 6.5
    }
    
    result = analisar_eletrolitos(data)
    
    assert any("Hipocalcemia" in r for r in result)
    assert any("6.5" in r for r in result)
    assert any("significativa" in r.lower() for r in result)
    assert any("tetania" in r.lower() for r in result)

def test_electrolytes_analyzer_hypercalcemia():
    """Test interpretation of hypercalcemia."""
    # Mild hypercalcemia
    data = {
        "Ca+": 10.8
    }
    
    result = analisar_eletrolitos(data)
    
    assert len(result) > 0
    assert any("Hipercalcemia" in r for r in result)
    assert any("10.8" in r for r in result)
    
    # Severe hypercalcemia
    data = {
        "Ca+": 13.2
    }
    
    result = analisar_eletrolitos(data)
    
    assert any("Hipercalcemia" in r for r in result)
    assert any("13.2" in r for r in result)
    assert any("significativa" in r.lower() for r in result)

def test_electrolytes_analyzer_ionized_calcium():
    """Test interpretation of ionized calcium."""
    # Low ionized calcium
    data = {
        "iCa": 1.0
    }
    
    result = analisar_eletrolitos(data)
    
    assert len(result) > 0
    assert any("Cálcio iônico reduzido" in r for r in result)
    assert any("1.0" in r for r in result)
    
    # High ionized calcium
    data = {
        "iCa": 1.4
    }
    
    result = analisar_eletrolitos(data)
    
    assert any("Cálcio iônico elevado" in r for r in result)
    assert any("1.4" in r for r in result)

def test_electrolytes_analyzer_hypomagnesemia():
    """Test interpretation of hypomagnesemia."""
    data = {
        "Mg+": 1.4
    }
    
    result = analisar_eletrolitos(data)
    
    assert len(result) > 0
    assert any("Hipomagnesemia" in r for r in result)
    assert any("1.4" in r for r in result)
    assert any("arritmias" in r.lower() for r in result)

def test_electrolytes_analyzer_hypermagnesemia():
    """Test interpretation of hypermagnesemia."""
    # Mild hypermagnesemia
    data = {
        "Mg+": 2.8
    }
    
    result = analisar_eletrolitos(data)
    
    assert len(result) > 0
    assert any("Hipermagnesemia" in r for r in result)
    assert any("2.8" in r for r in result)
    
    # Severe hypermagnesemia
    data = {
        "Mg+": 4.5
    }
    
    result = analisar_eletrolitos(data)
    
    assert any("Hipermagnesemia" in r for r in result)
    assert any("4.5" in r for r in result)
    assert any("significativa" in r.lower() for r in result)
    assert any("depressão do sistema nervoso" in r.lower() for r in result)

def test_electrolytes_analyzer_hypophosphatemia():
    """Test interpretation of hypophosphatemia."""
    # Mild hypophosphatemia
    data = {
        "P": 2.2
    }
    
    result = analisar_eletrolitos(data)
    
    assert len(result) > 0
    assert any("Hipofosfatemia" in r for r in result)
    assert any("2.2" in r for r in result)
    
    # Severe hypophosphatemia
    data = {
        "P": 1.2
    }
    
    result = analisar_eletrolitos(data)
    
    assert any("Hipofosfatemia" in r for r in result)
    assert any("1.2" in r for r in result)
    assert any("significativa" in r.lower() for r in result)

def test_electrolytes_analyzer_hyperphosphatemia():
    """Test interpretation of hyperphosphatemia."""
    data = {
        "P": 5.5
    }
    
    result = analisar_eletrolitos(data)
    
    assert len(result) > 0
    assert any("Hiperfosfatemia" in r for r in result)
    assert any("5.5" in r for r in result)
    assert any("disfunção renal" in r.lower() for r in result)

def test_electrolytes_analyzer_combined_disturbances():
    """Test interpretation of combined electrolyte disturbances."""
    # Hyponatremia with hyperkalemia
    data = {
        "Na+": 128,
        "K+": 5.8
    }
    
    result = analisar_eletrolitos(data)
    
    assert len(result) > 0
    assert any("Hiponatremia" in r for r in result)
    assert any("Hipercalemia" in r for r in result)
    assert any("insuficiência adrenal" in r.lower() for r in result)
    
    # Hypernatremia with hypokalemia
    data = {
        "Na+": 152,
        "K+": 2.8
    }
    
    result = analisar_eletrolitos(data)
    
    assert any("Hipernatremia" in r for r in result)
    assert any("Hipocalemia" in r for r in result)
    assert any("hiperaldosteronismo" in r.lower() for r in result)
    
    # Hypercalcemia with hypophosphatemia
    data = {
        "Ca+": 11.5,
        "P": 1.8
    }
    
    result = analisar_eletrolitos(data)
    
    assert any("Hipercalcemia" in r for r in result)
    assert any("Hipofosfatemia" in r for r in result)
    assert any("hiperparatireoidismo" in r.lower() for r in result)
    
    # Hypocalcemia with hyperphosphatemia
    data = {
        "Ca+": 7.5,
        "P": 5.2
    }
    
    result = analisar_eletrolitos(data)
    
    assert any("Hipocalcemia" in r for r in result)
    assert any("Hiperfosfatemia" in r for r in result)
    assert any("insuficiência renal" in r.lower() for r in result)

def test_electrolytes_analyzer_caching():
    """Test that the cache works correctly for repeated calls."""
    # First call with certain parameters
    data1 = {
        "Na+": 132,
        "K+": 5.2
    }
    
    result1 = analisar_eletrolitos(data1)
    
    # Second call with same parameters (should use cache)
    data2 = {
        "Na+": 132,
        "K+": 5.2
    }
    
    result2 = analisar_eletrolitos(data2)
    
    # Results should be identical
    assert result1 == result2
    
    # Different parameters should yield different results
    data3 = {
        "Na+": 135,
        "K+": 5.2
    }
    
    result3 = analisar_eletrolitos(data3)
    assert result1 != result3

def test_electrolytes_analyzer_nonconvertible_values():
    """Test handling of values that can't be converted to float."""
    # String values should be skipped
    data = {
        "Na+": "Hemolisado",
        "K+": 4.2
    }
    
    result = analisar_eletrolitos(data)
    
    # Should still process valid values
    assert any("Potássio normal" in r for r in result)
    
    # But not try to interpret non-numeric values
    assert not any("Hemolisado" in r for r in result)

def test_electrolytes_analyzer_comprehensive_case():
    """Test comprehensive electrolyte assessment with multiple parameters."""
    # Multiple electrolyte abnormalities
    data = {
        "Na+": 126,
        "K+": 2.9,
        "Ca+": 7.8,
        "Mg+": 1.6,
        "P": 4.8
    }
    
    result = analisar_eletrolitos(data)
    
    # Results should include multiple findings
    assert len(result) >= 5
    assert any("Hiponatremia" in r for r in result)
    assert any("Hipocalemia" in r for r in result)
    assert any("Hipocalcemia" in r for r in result)
    assert any("Hipomagnesemia" in r for r in result)
    assert any("Hiperfosfatemia" in r for r in result) 