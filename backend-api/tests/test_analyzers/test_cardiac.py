"""
Tests for the cardiac markers analyzer module.
"""

import pytest
import sys
import os

# Add parent directory to sys.path if not already there
if os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) not in sys.path:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import using absolute imports
from analyzers.cardiac import analisar_marcadores_cardiacos

def test_cardiac_analyzer_empty_data():
    """Test that the analyzer returns expected dictionary structure when no relevant data is provided."""
    # Empty data
    result = analisar_marcadores_cardiacos({})
    assert isinstance(result, dict)
    assert 'interpretation' in result
    assert 'abnormalities' in result  
    assert 'is_critical' in result
    assert 'recommendations' in result
    assert 'details' in result
    assert result['is_critical'] is False
    
    # Irrelevant data only
    result = analisar_marcadores_cardiacos({"Hb": 14.5, "Leuco": 9000})
    assert isinstance(result, dict)
    assert 'insufficient' in result['interpretation'].lower() or 'insuficientes' in result['interpretation'].lower()

def test_cardiac_analyzer_troponin():
    """Test interpretation of troponin values."""
    # Normal troponin (below 0.04 threshold)
    result = analisar_marcadores_cardiacos({"TropoI": 0.02})
    
    assert isinstance(result, dict)
    assert 'interpretation' in result
    assert isinstance(result['interpretation'], str)
    assert len(result['interpretation']) > 0
    assert result['is_critical'] is False
    
    # Check that troponin value appears in interpretation or details
    assert "0.02" in result['interpretation'] or "0.02" in str(result['details'])
    
    # Slightly elevated troponin (above 0.04 threshold)
    result = analisar_marcadores_cardiacos({"TropoI": 0.06})
    
    assert isinstance(result, dict)
    assert len(result['interpretation']) > 0
    assert "0.06" in result['interpretation'] or "0.06" in str(result['details'])
    assert len(result['abnormalities']) > 0  # Should be abnormal
    assert result['is_critical'] is True     # Should be critical
    
    # Moderately elevated troponin  
    result = analisar_marcadores_cardiacos({"TropoI": 0.2})
    
    assert isinstance(result, dict)
    assert len(result['interpretation']) > 0
    assert "0.2" in result['interpretation'] or "0.2" in str(result['details'])
    assert len(result['abnormalities']) > 0  # Should be abnormal
    assert result['is_critical'] is True     # Should be critical
    
    # Markedly elevated troponin
    result = analisar_marcadores_cardiacos({"TropoI": 2.5})
    
    assert isinstance(result, dict)
    assert len(result['interpretation']) > 0
    assert "2.5" in result['interpretation'] or "2.5" in str(result['details'])
    assert len(result['abnormalities']) > 0  # Should be abnormal
    assert result['is_critical'] is True     # Should be critical
    assert "troponina" in result['interpretation'].lower() and "elevada" in result['interpretation'].lower()
    assert "dano miocárdico significativo" in result['interpretation'].lower()

def test_cardiac_analyzer_troponin_with_timing():
    """Test troponin interpretation with timing information from chest pain onset."""
    # Normal troponin but early after chest pain (< 3 hours)
    result = analisar_marcadores_cardiacos({"TropoI": 0.03}, paciente_info={"hora_dor": 2})
    
    assert isinstance(result, dict)
    assert len(result['interpretation']) > 0
    assert "troponina" in result['interpretation'].lower()
    
    # Elevated troponin early after chest pain onset (< 6 hours)
    result = analisar_marcadores_cardiacos({"TropoI": 2.0}, paciente_info={"hora_dor": 4})
    
    assert isinstance(result, dict)
    assert len(result['interpretation']) > 0
    assert result['is_critical'] is True
    assert "troponina" in result['interpretation'].lower() and "elevada" in result['interpretation'].lower()
    assert "infarto" in result['interpretation'].lower() or "iam" in result['interpretation'].lower()

def test_cardiac_analyzer_ckmb():
    """Test interpretation of CK-MB values."""
    # Normal CK-MB
    result = analisar_marcadores_cardiacos({"CKMB": 3.5})
    
    assert isinstance(result, dict)
    assert "3.5" in result['interpretation'] or "3.5" in str(result['details'])
    assert result['is_critical'] is False
    
    # Slightly elevated CK-MB
    result = analisar_marcadores_cardiacos({"CKMB": 8.0})
    
    assert isinstance(result, dict)
    assert "8.0" in result['interpretation'] or "8.0" in str(result['details'])
    assert any("ck-mb" in interp.lower() and "elevada" in interp.lower() for interp in result['interpretation'].split('.'))
    
    # Moderately elevated CK-MB
    result = analisar_marcadores_cardiacos({"CKMB": 15.0})
    
    assert isinstance(result, dict)
    assert "15.0" in result['interpretation'] or "15.0" in str(result['details'])
    assert any("ck-mb" in interp.lower() and "elevada" in interp.lower() for interp in result['interpretation'].split('.'))
    
    # Markedly elevated CK-MB
    result = analisar_marcadores_cardiacos({"CKMB": 30.0})
    
    assert isinstance(result, dict)
    assert "30.0" in result['interpretation'] or "30.0" in str(result['details'])
    assert any("ck-mb" in interp.lower() and "elevada" in interp.lower() for interp in result['interpretation'].split('.'))
    assert len(result['abnormalities']) > 0

def test_cardiac_analyzer_ckmb_cpk_ratio():
    """Test calculation and interpretation of CK-MB/CPK ratio."""
    # Normal total CPK with normal CK-MB
    result = analisar_marcadores_cardiacos({"CKMB": 3.0, "CPK": 100})
    
    assert isinstance(result, dict)
    assert "relação" in result['interpretation'].lower() and "ck-mb" in result['interpretation'].lower() and "cpk" in result['interpretation'].lower()
    
    # Elevated CPK with relatively low CK-MB (skeletal muscle origin)
    result = analisar_marcadores_cardiacos({"CKMB": 15.0, "CPK": 2000})
    
    assert isinstance(result, dict)
    assert "relação" in result['interpretation'].lower()
    # Check for ratio percentage in interpretation
    ratio = (15.0 / 2000) * 100  # Should be 0.75%
    assert "%" in result['interpretation']
    # Check for muscle-related terms
    assert "origem" in result['interpretation'].lower() or "rabdomiólise" in result['interpretation'].lower() or "muscul" in result['interpretation'].lower()
    
    # Elevated CK-MB with cardiac pattern ratio (> 5%)
    result = analisar_marcadores_cardiacos({"CKMB": 25.0, "CPK": 300})
    
    assert isinstance(result, dict)
    assert "relação" in result['interpretation'].lower()
    ratio = (25.0 / 300) * 100  # Should be 8.33%
    assert "8" in result['interpretation'] and "%" in result['interpretation']
    # Check for cardiac origin terms
    assert "cardíac" in result['interpretation'].lower() or "origem" in result['interpretation'].lower()

def test_cardiac_analyzer_cpk():
    """Test interpretation of total CPK values."""
    # Normal CPK
    result = analisar_marcadores_cardiacos({"CPK": 150})
    
    assert isinstance(result, dict)
    assert "150" in result['interpretation'] or "150" in str(result['details'])
    assert result['is_critical'] is False
    
    # Moderately elevated CPK
    result = analisar_marcadores_cardiacos({"CPK": 500})
    
    assert isinstance(result, dict)
    assert "500" in result['interpretation'] or "500" in str(result['details'])
    assert any("cpk" in interp.lower() and "elevada" in interp.lower() for interp in result['interpretation'].split('.'))
    
    # Markedly elevated CPK
    result = analisar_marcadores_cardiacos({"CPK": 2500})
    
    assert isinstance(result, dict)
    assert "2500" in result['interpretation'] or "2500" in str(result['details'])
    assert any("cpk" in interp.lower() and "elevada" in interp.lower() for interp in result['interpretation'].split('.'))
    assert any("rabdomiólise" in interp.lower() or "infarto" in interp.lower() for interp in result['interpretation'].split('.'))
    
    # Very high CPK
    result = analisar_marcadores_cardiacos({"CPK": 8000})
    
    assert isinstance(result, dict)
    assert "8000" in result['interpretation'] or "8000" in str(result['details'])
    assert any("cpk" in interp.lower() and "elevada" in interp.lower() for interp in result['interpretation'].split('.'))
    assert any("rabdomiólise" in interp.lower() for interp in result['interpretation'].split('.'))

def test_cardiac_analyzer_bnp():
    """Test interpretation of BNP values."""
    # Normal BNP
    result = analisar_marcadores_cardiacos({"BNP": 45})
    
    assert isinstance(result, dict)
    assert "45" in result['interpretation'] or "45" in str(result['details'])
    assert "bnp" in result['interpretation'].lower() and ("não elevado" in result['interpretation'].lower() or "baixa probabilidade" in result['interpretation'].lower())
    assert result['is_critical'] is False
    
    # Slightly elevated BNP
    result = analisar_marcadores_cardiacos({"BNP": 80})
    
    assert isinstance(result, dict)
    assert "80" in result['interpretation'] or "80" in str(result['details'])
    assert "bnp" in result['interpretation'].lower()
    
    # Moderately elevated BNP
    result = analisar_marcadores_cardiacos({"BNP": 250})
    
    assert isinstance(result, dict)
    assert "250" in result['interpretation'] or "250" in str(result['details'])
    assert "bnp" in result['interpretation'].lower()
    
    # High BNP
    result = analisar_marcadores_cardiacos({"BNP": 750})
    
    assert isinstance(result, dict)
    assert "750" in result['interpretation'] or "750" in str(result['details'])
    assert "bnp" in result['interpretation'].lower() and "elevado" in result['interpretation'].lower()
    assert "insuficiência cardíaca" in result['interpretation'].lower()
    
    # Very high BNP
    result = analisar_marcadores_cardiacos({"BNP": 1500})
    
    assert isinstance(result, dict)
    assert "1500" in result['interpretation'] or "1500" in str(result['details'])
    assert "bnp" in result['interpretation'].lower() and "elevado" in result['interpretation'].lower()
    assert "insuficiência cardíaca" in result['interpretation'].lower()

def test_cardiac_analyzer_ldh():
    """Test interpretation of LDH values."""
    # Elevated LDH
    result = analisar_marcadores_cardiacos({"LDH": 300})
    
    assert isinstance(result, dict)
    assert "300" in result['interpretation'] or "300" in str(result['details'])
    assert any("ldh" in interp.lower() and "elevad" in interp.lower() for interp in result['interpretation'].split('.'))
    
    # Markedly elevated LDH
    result = analisar_marcadores_cardiacos({"LDH": 1200})
    
    assert isinstance(result, dict)
    assert "1200" in result['interpretation'] or "1200" in str(result['details'])
    assert any("ldh" in interp.lower() and "elevad" in interp.lower() for interp in result['interpretation'].split('.'))

def test_cardiac_analyzer_combined_markers():
    """Test interpretation of multiple cardiac markers together."""
    # Troponin and CK-MB both elevated (acute myocardial injury)
    result = analisar_marcadores_cardiacos({
        "TropoI": 0.5,
        "CKMB": 15
    })
    
    assert isinstance(result, dict)
    assert result['is_critical'] is True
    assert "troponina" in result['interpretation'].lower() and "elevada" in result['interpretation'].lower()
    assert "ck-mb" in result['interpretation'].lower()
    assert "padrão" in result['interpretation'].lower() or ("troponina" in result['interpretation'].lower() and "ck-mb" in result['interpretation'].lower())
    assert "injúria" in result['interpretation'].lower() or "lesão" in result['interpretation'].lower()
    
    # Troponin and BNP both elevated (MI with heart failure)
    result = analisar_marcadores_cardiacos({
        "TropoI": 0.8,
        "BNP": 800
    })
    
    assert isinstance(result, dict)
    assert result['is_critical'] is True
    assert "troponina" in result['interpretation'].lower() and "elevada" in result['interpretation'].lower()
    assert "bnp" in result['interpretation'].lower() and "elevado" in result['interpretation'].lower()
    assert "troponina" in result['interpretation'].lower() and "bnp" in result['interpretation'].lower()
    assert "infarto" in result['interpretation'].lower() or "disfunção" in result['interpretation'].lower() or "ic" in result['interpretation'].lower()

def test_cardiac_analyzer_renal_context():
    """Test interpretation of cardiac markers in the context of renal failure."""
    # Troponin elevation in renal failure context
    result = analisar_marcadores_cardiacos({
        "TropoI": 0.3,
        "Creat": 3.5
    })
    
    assert isinstance(result, dict)
    assert result['is_critical'] is True
    assert "troponina" in result['interpretation'].lower() and "elevada" in result['interpretation'].lower()
    assert "renal" in result['interpretation'].lower() or "creatinina" in result['interpretation'].lower()
    assert "depuração" in result['interpretation'].lower() or "creatinina" in result['interpretation'].lower()

def test_cardiac_analyzer_recommendations():
    """Test that appropriate recommendations are provided based on findings."""
    # Recommendation for elevated troponin
    result = analisar_marcadores_cardiacos({"TropoI": 0.15})
    
    assert isinstance(result, dict)
    assert len(result['recommendations']) > 0
    assert any("ecg" in rec.lower() for rec in result['recommendations'])
    assert any("monitorização" in rec.lower() or "avaliação" in rec.lower() for rec in result['recommendations'])
    
    # Recommendation for elevated BNP
    result = analisar_marcadores_cardiacos({"BNP": 600})
    
    assert isinstance(result, dict)
    assert len(result['recommendations']) > 0
    assert any("ecocardiograma" in rec.lower() for rec in result['recommendations'])
    assert any("insuficiência cardíaca" in interp.lower() for interp in result['interpretation'].split('.'))

def test_cardiac_analyzer_comprehensive_case():
    """Test a comprehensive case with multiple cardiac markers."""
    # Complete dataset for significant cardiac injury
    data = {
        "TropoI": 1.2,
        "CKMB": 28,
        "CPK": 450,
        "BNP": 650,
        "LDH": 380
    }
    
    result = analisar_marcadores_cardiacos(data, paciente_info={"hora_dor": 3})
    
    # Results should be a dictionary with all required keys
    assert isinstance(result, dict)
    assert 'interpretation' in result
    assert 'abnormalities' in result
    assert 'is_critical' in result
    assert 'recommendations' in result
    assert 'details' in result
    assert result['is_critical'] is True
    
    # Troponin findings
    assert "troponina" in result['interpretation'].lower() and "elevada" in result['interpretation'].lower()
    assert "1.2" in result['interpretation'] or "1.2" in str(result['details'])
    assert "dano" in result['interpretation'].lower() or "lesão" in result['interpretation'].lower()
    
    # CK-MB findings
    assert "ck-mb" in result['interpretation'].lower()
    assert "28" in result['interpretation'] or "28" in str(result['details'])
    
    # CK-MB/CPK ratio findings
    assert "relação" in result['interpretation'].lower()
    assert "cardíac" in result['interpretation'].lower() or "origem" in result['interpretation'].lower()
    
    # CPK findings
    assert "cpk" in result['interpretation'].lower()
    
    # BNP findings
    assert "bnp" in result['interpretation'].lower() and "elevado" in result['interpretation'].lower()
    assert "insuficiência cardíaca" in result['interpretation'].lower()
    
    # LDH findings
    assert "ldh" in result['interpretation'].lower()
    
    # Combined interpretation
    assert "troponina" in result['interpretation'].lower() and "ck-mb" in result['interpretation'].lower()
    assert "injúria" in result['interpretation'].lower() or "lesão" in result['interpretation'].lower()
    
    # Recommendations
    assert len(result['recommendations']) > 0
    assert any("ecg" in rec.lower() for rec in result['recommendations'])
    assert any("ecocardiograma" in rec.lower() for rec in result['recommendations']) 