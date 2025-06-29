"""
Tests for the hepatic function analyzer module.
"""

import pytest
import sys
import os

# Add parent directory to sys.path if not already there
if os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) not in sys.path:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import using absolute imports
from analyzers.hepatic import analisar_funcao_hepatica

def test_hepatic_analyzer_empty_data():
    """Test that the analyzer returns an empty list when no relevant data is provided."""
    # Empty data
    result = analisar_funcao_hepatica({})
    assert result == []
    
    # Irrelevant data only
    result = analisar_funcao_hepatica({"Na+": 140, "K+": 4.5})
    assert result == []

def test_hepatic_analyzer_normal_enzymes():
    """Test interpretation of normal liver enzyme values."""
    # Test with normal values for liver enzymes
    data = {
        "TGO": 30,
        "TGP": 35,
        "GamaGT": 40,
        "FosfAlc": 80,
        "BT": 0.8,
        "BD": 0.2,
        "Albumina": 4.2
    }
    
    result = analisar_funcao_hepatica(data)
    
    # Should include AST/ALT ratio
    assert any("Relação AST/ALT" in r for r in result)
    
    # Should include normal albumin
    assert any("Albumina normal" in r for r in result)

def test_hepatic_analyzer_elevated_transaminases():
    """Test interpretation of elevated transaminases."""
    # Test with elevated transaminases
    data = {
        "TGO": 120,
        "TGP": 150
    }
    
    result = analisar_funcao_hepatica(data)
    
    assert len(result) > 0
    assert any("TGO/AST elevada" in r for r in result)
    assert any("TGP/ALT elevada" in r for r in result)
    assert any("Elevação moderada de TGO" in r for r in result)
    assert any("Elevação moderada de TGP" in r for r in result)
    assert any("Relação AST/ALT" in r for r in result)

def test_hepatic_analyzer_severe_transaminases():
    """Test interpretation of severely elevated transaminases."""
    # Test with severely elevated transaminases
    data = {
        "TGO": 1200,
        "TGP": 1500
    }
    
    result = analisar_funcao_hepatica(data)
    
    assert len(result) > 0
    assert any("TGO/AST elevada" in r for r in result)
    assert any("TGP/ALT elevada" in r for r in result)
    assert any("Elevação muito acentuada de TGO" in r for r in result)
    assert any("Elevação muito acentuada de TGP" in r for r in result)
    assert any("hepatite" in r.lower() for r in result)

def test_hepatic_analyzer_ast_alt_ratio():
    """Test interpretation of AST/ALT ratio."""
    # Test with different AST/ALT ratios
    
    # AST/ALT > 2.0 (alcoholic pattern)
    data = {
        "TGO": 120,
        "TGP": 50
    }
    
    result = analisar_funcao_hepatica(data)
    assert any("Relação AST/ALT > 2.0" in r for r in result)
    assert any("alcoólica" in r for r in result)
    
    # AST/ALT < 1.0 (viral pattern)
    data = {
        "TGO": 50,
        "TGP": 120
    }
    
    result = analisar_funcao_hepatica(data)
    assert any("Relação AST/ALT < 1.0" in r for r in result)
    assert any("virais" in r for r in result)

def test_hepatic_analyzer_cholestasis():
    """Test interpretation of cholestasis markers."""
    # Test with elevated cholestasis markers
    data = {
        "GamaGT": 250,
        "FosfAlc": 350
    }
    
    result = analisar_funcao_hepatica(data)
    
    assert len(result) > 0
    assert any("Gama-GT elevada" in r for r in result)
    assert any("Fosfatase Alcalina elevada" in r for r in result)
    assert any("Padrão colestático" in r for r in result)
    assert any("obstrução biliar" in r.lower() for r in result)

def test_hepatic_analyzer_bilirubin():
    """Test interpretation of elevated bilirubin."""
    # Test with elevated total bilirubin
    data = {
        "BT": 3.5,
        "BD": 2.8,
        "BI": 0.7
    }
    
    result = analisar_funcao_hepatica(data)
    
    assert len(result) > 0
    assert any("Bilirrubina Total elevada" in r for r in result)
    assert any("Bilirrubina Direta elevada" in r for r in result)
    assert any("Padrão de hiperbilirrubinemia predominantemente direta" in r for r in result)
    
    # Test with indirect hyperbilirubinemia
    data = {
        "BT": 3.5,
        "BD": 0.3,
        "BI": 3.2
    }
    
    result = analisar_funcao_hepatica(data)
    
    assert any("Bilirrubina Total elevada" in r for r in result)
    assert any("Bilirrubina Indireta elevada" in r for r in result)
    assert any("Padrão de hiperbilirrubinemia predominantemente indireta" in r for r in result)
    assert any("hemólise" in r.lower() for r in result)

def test_hepatic_analyzer_albumin():
    """Test interpretation of albumin levels."""
    # Test with low albumin
    data = {
        "Albumina": 2.8
    }
    
    result = analisar_funcao_hepatica(data)
    
    assert len(result) > 0
    assert any("Albumina reduzida" in r for r in result)
    assert any("Hipoalbuminemia moderada" in r for r in result)
    
    # Test with very low albumin
    data = {
        "Albumina": 1.9
    }
    
    result = analisar_funcao_hepatica(data)
    
    assert any("Albumina reduzida" in r for r in result)
    assert any("Hipoalbuminemia grave" in r for r in result)
    assert any("doença hepática avançada" in r.lower() for r in result)

def test_hepatic_analyzer_coagulation():
    """Test interpretation of coagulation parameters."""
    # Test with elevated RNI/INR
    data = {
        "RNI": 1.8
    }
    
    result = analisar_funcao_hepatica(data)
    
    assert len(result) > 0
    assert any("RNI/INR elevado" in r for r in result)
    assert any("Coagulopatia" in r for r in result)
    
    # Test with severely elevated RNI/INR
    data = {
        "RNI": 2.5
    }
    
    result = analisar_funcao_hepatica(data)
    
    assert any("RNI/INR elevado" in r for r in result)
    assert any("Coagulopatia importante" in r for r in result)
    assert any("insuficiência hepática grave" in r.lower() for r in result)

def test_hepatic_analyzer_pattern_recognition():
    """Test recognition of hepatocellular vs cholestatic patterns."""
    # Test with hepatocellular pattern (R > 5)
    data = {
        "TGO": 300,
        "TGP": 350,
        "GamaGT": 100,
        "FosfAlc": 110
    }
    
    result = analisar_funcao_hepatica(data)
    
    assert any("Padrão predominantemente hepatocelular" in r for r in result)
    assert any("hepatite" in r.lower() for r in result)
    
    # Test with cholestatic pattern (R < 2)
    data = {
        "TGO": 60,
        "TGP": 70,
        "GamaGT": 300,
        "FosfAlc": 350
    }
    
    result = analisar_funcao_hepatica(data)
    
    assert any("Padrão predominantemente colestático" in r for r in result)
    assert any("obstrução biliar" in r.lower() for r in result)
    
    # Test with mixed pattern (2 < R < 5)
    data = {
        "TGO": 120,
        "TGP": 140,
        "GamaGT": 150,
        "FosfAlc": 180
    }
    
    result = analisar_funcao_hepatica(data)
    
    assert any("Padrão misto" in r for r in result)

def test_hepatic_analyzer_cirrhosis_markers():
    """Test recognition of markers suggestive of cirrhosis."""
    # Test with markers suggestive of cirrhosis
    data = {
        "Albumina": 2.9,
        "RNI": 1.6,
        "Plaq": 90000
    }
    
    result = analisar_funcao_hepatica(data)
    
    assert any("Achados sugestivos de cirrose hepática" in r for r in result)
    assert any("trombocitopenia" in r.lower() for r in result)
    assert any("hipoalbuminemia" in r.lower() for r in result)

def test_hepatic_analyzer_pancreatic_enzymes():
    """Test interpretation of pancreatic enzymes."""
    # Test with elevated amylase and lipase
    data = {
        "Amilase": 300,
        "Lipase": 400
    }
    
    result = analisar_funcao_hepatica(data)
    
    assert any("Amilase elevada" in r for r in result)
    assert any("Lipase elevada" in r for r in result)
    assert any("pancreatite" in r.lower() for r in result)

def test_hepatic_analyzer_comprehensive_case():
    """Test comprehensive hepatic assessment with multiple parameters."""
    # Test comprehensive case with multiple abnormal parameters
    data = {
        "TGO": 180,
        "TGP": 220,
        "GamaGT": 350,
        "FosfAlc": 280,
        "BT": 2.8,
        "BD": 1.9,
        "Albumina": 3.1,
        "RNI": 1.4,
        "Plaq": 120000
    }
    
    result = analisar_funcao_hepatica(data)
    
    # Results should include multiple findings
    assert len(result) >= 8
    assert any("TGO/AST elevada" in r for r in result)
    assert any("TGP/ALT elevada" in r for r in result)
    assert any("Gama-GT elevada" in r for r in result)
    assert any("Fosfatase Alcalina elevada" in r for r in result)
    assert any("Bilirrubina Total elevada" in r for r in result)
    assert any("Albumina reduzida" in r for r in result)
    assert any("RNI/INR elevado" in r for r in result) 