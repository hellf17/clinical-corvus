"""
Tests for the renal function analyzer module.
"""

import pytest
import sys
import os

# Add parent directory to sys.path if not already there
if os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) not in sys.path:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import using absolute imports
from analyzers.renal import analisar_funcao_renal

def test_renal_analyzer_empty_data():
    """Test that the analyzer returns an empty list when no relevant data is provided."""
    # Empty data
    result = analisar_funcao_renal({})
    assert result == []
    
    # Irrelevant data only
    result = analisar_funcao_renal({"Na+": 140, "K+": 4.5})
    assert result == []

def test_renal_analyzer_normal_creatinine():
    """Test that normal creatinine values are correctly interpreted."""
    # Normal creatinine (reference range typically 0.7-1.2 mg/dL for men)
    result = analisar_funcao_renal({"Creat": 0.9})
    
    assert len(result) > 0
    assert any("normal" in r.lower() for r in result)
    assert any("0.9" in r for r in result)

def test_renal_analyzer_elevated_creatinine():
    """Test that elevated creatinine values are correctly interpreted."""
    # Elevated creatinine
    result = analisar_funcao_renal({"Creat": 2.5})
    
    assert len(result) > 0
    assert any("elevada" in r.lower() for r in result)
    assert any("2.5" in r for r in result)
    assert any("moderada" in r.lower() for r in result)

def test_renal_analyzer_critical_creatinine():
    """Test that critically elevated creatinine values are identified."""
    # Critically elevated creatinine
    result = analisar_funcao_renal({"Creat": 4.0})
    
    assert len(result) > 0
    assert any("elevada" in r.lower() for r in result)
    assert any("4.0" in r for r in result)
    assert any("significativa" in r.lower() for r in result)
    assert any("importante" in r.lower() for r in result)

def test_renal_analyzer_urea():
    """Test interpretation of urea (BUN) values."""
    # Elevated urea
    result = analisar_funcao_renal({"Ur": 80})
    
    assert len(result) > 0
    assert any("ureia" in r.lower() for r in result)
    assert any("elevada" in r.lower() for r in result)
    assert any("80" in r for r in result)

def test_renal_analyzer_bun_creatinine_ratio():
    """Test calculation and interpretation of BUN/Creatinine ratio."""
    # Normal ratio
    result = analisar_funcao_renal({"Ur": 30, "Creat": 1.0})
    
    assert len(result) > 0
    assert any("relação bun/creatinina" in r.lower() for r in result)
    
    # Elevated ratio suggesting pre-renal azotemia
    result = analisar_funcao_renal({"Ur": 60, "Creat": 1.0})
    
    assert len(result) > 0
    assert any("relação bun/creatinina" in r.lower() for r in result)
    assert any("elevada" in r.lower() for r in result)
    assert any("pré-renal" in r.lower() or "pre-renal" in r.lower() or "desidratação" in r.lower() for r in result)

def test_renal_analyzer_egfr_calculation():
    """Test estimated GFR calculation with different patient demographics."""
    # Male, 45 years old
    result = analisar_funcao_renal({"Creat": 1.5}, idade=45, sexo="M")
    
    assert len(result) > 0
    assert any("tfg estimada" in r.lower() for r in result)
    
    # Female, 70 years old
    result = analisar_funcao_renal({"Creat": 1.2}, idade=70, sexo="F")
    
    assert len(result) > 0
    assert any("tfg estimada" in r.lower() for r in result)
    
    # With ethnicity adjustment
    result = analisar_funcao_renal({"Creat": 1.0}, idade=50, sexo="M", etnia="negro")
    
    assert len(result) > 0
    assert any("tfg estimada" in r.lower() for r in result)

def test_renal_analyzer_ckd_staging():
    """Test correct CKD staging based on eGFR values."""
    # Normal or increased (G1)
    result = analisar_funcao_renal({"Creat": 0.8}, idade=40, sexo="M")
    
    assert len(result) > 0
    assert any("função renal normal" in r.lower() for r in result)
    
    # Mildly decreased (G2)
    result = analisar_funcao_renal({"Creat": 1.2}, idade=60, sexo="M")
    
    assert len(result) > 0
    assert any(("g2" in r.lower() or "estágio 2" in r.lower() or "redução leve" in r.lower()) for r in result)
    
    # Moderately to severely decreased (G4)
    result = analisar_funcao_renal({"Creat": 3.5}, idade=70, sexo="M")
    
    assert len(result) > 0
    assert any(("g4" in r.lower() or "estágio 4" in r.lower() or "grave" in r.lower()) for r in result)

def test_renal_analyzer_electrolyte_context():
    """Test interpretation of electrolytes in the context of renal function."""
    # Hyperkalemia with renal failure
    result = analisar_funcao_renal({"K+": 6.0, "Creat": 2.5})
    
    assert len(result) > 0
    assert any("hipercalemia" in r.lower() for r in result)
    assert any("disfunção renal" in r.lower() for r in result)

def test_renal_analyzer_proteinuria():
    """Test interpretation of proteinuria."""
    # Significant proteinuria
    result = analisar_funcao_renal({"ProtCreatRatio": 2.0})
    
    assert len(result) > 0
    assert any("proteína" in r.lower() for r in result)
    assert any("elevada" in r.lower() for r in result)
    assert any("significativa" in r.lower() for r in result)
    
    # Nephrotic range proteinuria
    result = analisar_funcao_renal({"ProteinuriaVol": 4000})
    
    assert len(result) > 0
    assert any("proteinúria" in r.lower() for r in result)
    assert any("nefrótico" in r.lower() for r in result)

def test_renal_analyzer_urinalysis_abnormalities():
    """Test interpretation of urinalysis abnormalities."""
    # Hematuria
    result = analisar_funcao_renal({"UrineHem": 20})
    
    assert len(result) > 0
    assert any("hematúria" in r.lower() for r in result)
    
    # Leukocyturia
    result = analisar_funcao_renal({"UrineLeuco": 30})
    
    assert len(result) > 0
    assert any("leucocitúria" in r.lower() for r in result)
    assert any("infecção" in r.lower() for r in result)

def test_renal_analyzer_metabolic_acidosis():
    """Test detection of metabolic acidosis in renal failure context."""
    # Metabolic acidosis in renal failure
    result = analisar_funcao_renal({"pH": 7.28, "HCO3-": 16, "Creat": 3.0})
    
    assert len(result) > 0
    assert any("acidose" in r.lower() for r in result)
    assert any("renal" in r.lower() for r in result)

def test_renal_analyzer_comprehensive_case():
    """Test a comprehensive renal assessment with multiple parameters."""
    # Complete dataset for advanced renal failure
    data = {
        "Creat": 3.8,
        "Ur": 120,
        "K+": 5.8,
        "pH": 7.30,
        "HCO3-": 18,
        "ProtCreatRatio": 2.5,
        "UrineHem": 15,
        "UrineLeuco": 5
    }
    
    result = analisar_funcao_renal(data, idade=75, sexo="F", peso=65, altura=1.55)
    
    # Results should include multiple findings
    assert len(result) >= 5
    assert any("creatinina elevada" in r.lower() for r in result)
    assert any("ureia elevada" in r.lower() for r in result)
    assert any("hipercalemia" in r.lower() for r in result)
    assert any("acidose" in r.lower() for r in result)
    assert any("proteína" in r.lower() and "elevada" in r.lower() for r in result)
    assert any("hematúria" in r.lower() for r in result) 