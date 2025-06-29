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
    """Test that the analyzer returns an empty list when no relevant data is provided."""
    # Empty data
    result = analisar_marcadores_cardiacos({})
    assert result == []
    
    # Irrelevant data only
    result = analisar_marcadores_cardiacos({"Hb": 14.5, "Leuco": 9000})
    assert result == []

def test_cardiac_analyzer_troponin():
    """Test interpretation of troponin values."""
    # Normal troponin
    result = analisar_marcadores_cardiacos({"Tropo": 0.02})
    
    assert len(result) > 0
    assert any("troponina normal" in r.lower() for r in result)
    assert any("0.02" in r for r in result)
    
    # Slightly elevated troponin
    result = analisar_marcadores_cardiacos({"Tropo": 0.06})
    
    assert len(result) > 0
    assert any("troponina elevada" in r.lower() for r in result)
    assert any("0.06" in r for r in result)
    assert any("elevação discreta" in r.lower() for r in result)
    
    # Moderately elevated troponin
    result = analisar_marcadores_cardiacos({"Tropo": 0.2})
    
    assert len(result) > 0
    assert any("troponina elevada" in r.lower() for r in result)
    assert any("0.2" in r for r in result)
    assert any("elevação moderada" in r.lower() for r in result)
    
    # Markedly elevated troponin
    result = analisar_marcadores_cardiacos({"Tropo": 2.5})
    
    assert len(result) > 0
    assert any("troponina elevada" in r.lower() for r in result)
    assert any("2.5" in r for r in result)
    assert any("elevação acentuada" in r.lower() for r in result)
    assert any("dano miocárdico significativo" in r.lower() for r in result)

def test_cardiac_analyzer_troponin_with_timing():
    """Test troponin interpretation with timing information from chest pain onset."""
    # Normal troponin but early after chest pain (< 3 hours)
    result = analisar_marcadores_cardiacos({"Tropo": 0.03}, hora_dor=2)
    
    assert len(result) > 0
    assert any("troponina normal" in r.lower() for r in result)
    assert any("não exclui" in r.lower() for r in result)
    assert any("repetir" in r.lower() for r in result)
    
    # Elevated troponin early after chest pain onset (< 6 hours)
    result = analisar_marcadores_cardiacos({"Tropo": 2.0}, hora_dor=4)
    
    assert len(result) > 0
    assert any("troponina elevada" in r.lower() for r in result)
    assert any("dor" in r.lower() and "<6h" in r for r in result)
    assert any("infarto agudo" in r.lower() for r in result)

def test_cardiac_analyzer_ckmb():
    """Test interpretation of CK-MB values."""
    # Normal CK-MB
    result = analisar_marcadores_cardiacos({"CK-MB": 3.5})
    
    assert len(result) > 0
    assert any("ck-mb normal" in r.lower() for r in result)
    assert any("3.5" in r for r in result)
    
    # Slightly elevated CK-MB
    result = analisar_marcadores_cardiacos({"CK-MB": 8.0})
    
    assert len(result) > 0
    assert any("ck-mb elevada" in r.lower() for r in result)
    assert any("8.0" in r for r in result)
    assert any("elevação discreta" in r.lower() for r in result)
    
    # Moderately elevated CK-MB
    result = analisar_marcadores_cardiacos({"CK-MB": 15.0})
    
    assert len(result) > 0
    assert any("ck-mb elevada" in r.lower() for r in result)
    assert any("15.0" in r for r in result)
    assert any("elevação moderada" in r.lower() for r in result)
    
    # Markedly elevated CK-MB
    result = analisar_marcadores_cardiacos({"CK-MB": 30.0})
    
    assert len(result) > 0
    assert any("ck-mb elevada" in r.lower() for r in result)
    assert any("30.0" in r for r in result)
    assert any("elevação acentuada" in r.lower() for r in result)
    assert any("lesão miocárdica extensa" in r.lower() for r in result)

def test_cardiac_analyzer_ckmb_cpk_ratio():
    """Test calculation and interpretation of CK-MB/CPK ratio."""
    # Normal total CPK with normal CK-MB
    result = analisar_marcadores_cardiacos({"CK-MB": 3.0, "CPK": 100})
    
    assert len(result) > 0
    assert any("relação ck-mb/cpk" in r.lower() for r in result)
    
    # Elevated CPK with relatively low CK-MB (skeletal muscle origin)
    result = analisar_marcadores_cardiacos({"CK-MB": 15.0, "CPK": 2000})
    
    assert len(result) > 0
    assert any("relação ck-mb/cpk" in r.lower() for r in result)
    ratio = (15.0 / 2000) * 100  # Should be 0.75%
    assert any("0.8%" in r or "0.7%" in r for r in result)
    assert any("origem musculoesquelética" in r.lower() for r in result)
    assert any("rabdomiólise" in r.lower() for r in result)
    
    # Elevated CK-MB with cardiac pattern ratio (> 5%)
    result = analisar_marcadores_cardiacos({"CK-MB": 25.0, "CPK": 300})
    
    assert len(result) > 0
    assert any("relação ck-mb/cpk" in r.lower() for r in result)
    ratio = (25.0 / 300) * 100  # Should be 8.33%
    assert any("8" in r and "%" in r for r in result)
    assert any("origem cardíaca" in r.lower() for r in result)

def test_cardiac_analyzer_cpk():
    """Test interpretation of total CPK values."""
    # Normal CPK
    result = analisar_marcadores_cardiacos({"CPK": 150})
    
    assert len(result) > 0
    assert any("cpk normal" in r.lower() for r in result)
    assert any("150" in r for r in result)
    
    # Moderately elevated CPK
    result = analisar_marcadores_cardiacos({"CPK": 500})
    
    assert len(result) > 0
    assert any("cpk elevada" in r.lower() for r in result)
    assert any("500" in r for r in result)
    assert any("elevação discreta a moderada" in r.lower() for r in result)
    
    # Markedly elevated CPK
    result = analisar_marcadores_cardiacos({"CPK": 2500})
    
    assert len(result) > 0
    assert any("cpk elevada" in r.lower() for r in result)
    assert any("2500" in r for r in result)
    assert any("elevação acentuada" in r.lower() for r in result)
    assert any("rabdomiólise" in r.lower() or "infarto extenso" in r.lower() for r in result)
    
    # Very high CPK
    result = analisar_marcadores_cardiacos({"CPK": 8000})
    
    assert len(result) > 0
    assert any("cpk elevada" in r.lower() for r in result)
    assert any("8000" in r for r in result)
    assert any("elevação muito acentuada" in r.lower() for r in result)
    assert any("rabdomiólise grave" in r.lower() for r in result)

def test_cardiac_analyzer_bnp():
    """Test interpretation of BNP values."""
    # Normal BNP
    result = analisar_marcadores_cardiacos({"BNP": 45})
    
    assert len(result) > 0
    assert any("bnp normal" in r.lower() for r in result)
    assert any("45" in r for r in result)
    assert any("valor preditivo negativo" in r.lower() for r in result)
    
    # Slightly elevated BNP
    result = analisar_marcadores_cardiacos({"BNP": 80})
    
    assert len(result) > 0
    assert any("bnp levemente elevado" in r.lower() for r in result)
    assert any("80" in r for r in result)
    
    # Moderately elevated BNP
    result = analisar_marcadores_cardiacos({"BNP": 250})
    
    assert len(result) > 0
    assert any("bnp elevado" in r.lower() for r in result)
    assert any("250" in r for r in result)
    assert any("elevação discreta a moderada" in r.lower() for r in result)
    
    # High BNP
    result = analisar_marcadores_cardiacos({"BNP": 750})
    
    assert len(result) > 0
    assert any("bnp elevado" in r.lower() for r in result)
    assert any("750" in r for r in result)
    assert any("elevação moderada a acentuada" in r.lower() for r in result)
    assert any("insuficiência cardíaca" in r.lower() for r in result)
    
    # Very high BNP
    result = analisar_marcadores_cardiacos({"BNP": 1500})
    
    assert len(result) > 0
    assert any("bnp elevado" in r.lower() for r in result)
    assert any("1500" in r for r in result)
    assert any("elevação acentuada" in r.lower() for r in result)
    assert any("insuficiência cardíaca descompensada" in r.lower() for r in result)

def test_cardiac_analyzer_ldh():
    """Test interpretation of LDH values."""
    # Elevated LDH
    result = analisar_marcadores_cardiacos({"LDH": 300})
    
    assert len(result) > 0
    assert any("ldh elevada" in r.lower() for r in result)
    assert any("300" in r for r in result)
    
    # Markedly elevated LDH
    result = analisar_marcadores_cardiacos({"LDH": 1200})
    
    assert len(result) > 0
    assert any("ldh elevada" in r.lower() for r in result)
    assert any("1200" in r for r in result)
    assert any("elevação acentuada" in r.lower() for r in result)

def test_cardiac_analyzer_combined_markers():
    """Test interpretation of multiple cardiac markers together."""
    # Troponin and CK-MB both elevated (acute myocardial injury)
    result = analisar_marcadores_cardiacos({
        "Tropo": 0.5,
        "CK-MB": 15
    })
    
    assert len(result) > 0
    assert any("troponina elevada" in r.lower() for r in result)
    assert any("ck-mb elevada" in r.lower() for r in result)
    assert any("padrão de elevação de troponina e ck-mb" in r.lower() for r in result)
    assert any("injúria miocárdica aguda" in r.lower() for r in result)
    
    # Troponin and BNP both elevated (MI with heart failure)
    result = analisar_marcadores_cardiacos({
        "Tropo": 0.8,
        "BNP": 800
    })
    
    assert len(result) > 0
    assert any("troponina elevada" in r.lower() for r in result)
    assert any("bnp elevado" in r.lower() for r in result)
    assert any("elevação concomitante de troponina e bnp" in r.lower() for r in result)
    assert any("infarto com disfunção ventricular" in r.lower() or "ic descompensada" in r.lower() for r in result)

def test_cardiac_analyzer_renal_context():
    """Test interpretation of cardiac markers in the context of renal failure."""
    # Troponin elevation in renal failure context
    result = analisar_marcadores_cardiacos({
        "Tropo": 0.3,
        "Creat": 3.5
    })
    
    assert len(result) > 0
    assert any("troponina elevada" in r.lower() for r in result)
    assert any("insuficiência renal" in r.lower() for r in result)
    assert any("redução da depuração renal" in r.lower() for r in result)

def test_cardiac_analyzer_recommendations():
    """Test that appropriate recommendations are provided based on findings."""
    # Recommendation for elevated troponin
    result = analisar_marcadores_cardiacos({"Tropo": 0.15})
    
    assert len(result) > 0
    assert any("recomendação" in r.lower() for r in result)
    assert any("ecg" in r.lower() for r in result)
    assert any("monitorização cardíaca" in r.lower() for r in result)
    
    # Recommendation for elevated BNP
    result = analisar_marcadores_cardiacos({"BNP": 600})
    
    assert len(result) > 0
    assert any("recomendação" in r.lower() for r in result)
    assert any("ecocardiograma" in r.lower() for r in result)
    assert any("insuficiência cardíaca" in r.lower() for r in result)

def test_cardiac_analyzer_comprehensive_case():
    """Test a comprehensive case with multiple cardiac markers."""
    # Complete dataset for significant cardiac injury
    data = {
        "Tropo": 1.2,
        "CK-MB": 28,
        "CPK": 450,
        "BNP": 650,
        "LDH": 380
    }
    
    result = analisar_marcadores_cardiacos(data, hora_dor=3)
    
    # Results should include findings for each marker
    assert len(result) >= 10
    
    # Troponin findings
    assert any("troponina elevada" in r.lower() for r in result)
    assert any("1.2" in r for r in result)
    assert any("dano miocárdico significativo" in r.lower() for r in result)
    
    # CK-MB findings
    assert any("ck-mb elevada" in r.lower() for r in result)
    assert any("28" in r for r in result)
    
    # CK-MB/CPK ratio findings
    assert any("relação ck-mb/cpk" in r.lower() for r in result)
    assert any("origem cardíaca" in r.lower() for r in result)
    
    # CPK findings
    assert any("cpk elevada" in r.lower() for r in result)
    
    # BNP findings
    assert any("bnp elevado" in r.lower() for r in result)
    assert any("insuficiência cardíaca" in r.lower() for r in result)
    
    # LDH findings
    assert any("ldh elevada" in r.lower() for r in result)
    
    # Combined interpretation
    assert any("padrão de elevação de troponina e ck-mb" in r.lower() for r in result)
    assert any("injúria miocárdica aguda" in r.lower() for r in result)
    
    # Recommendations
    assert any("recomendação" in r.lower() for r in result)
    assert any("ecg" in r.lower() for r in result)
    assert any("ecocardiograma" in r.lower() for r in result) 