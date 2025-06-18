"""
Tests for the microbiology analyzer module.
"""

import pytest
import sys
import os

# Add parent directory to sys.path if not already there
if os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) not in sys.path:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import using absolute imports
from analyzers.microbiology import analisar_microbiologia

def test_microbiology_analyzer_empty_data():
    """Test that the analyzer returns an empty list when no relevant data is provided."""
    # Empty data
    result = analisar_microbiologia({})
    assert result == []
    
    # Irrelevant data only
    result = analisar_microbiologia({"Hb": 14.5, "Leuco": 9000})
    assert result == []

def test_microbiology_analyzer_blood_culture_negative():
    """Test interpretation of negative blood cultures."""
    # Negative blood culture
    result = analisar_microbiologia({"Hemocult": "Negativo após 72h de incubação"})
    
    assert len(result) > 0
    assert any("hemocultura" in r.lower() for r in result)
    assert any("negativo" in r.lower() for r in result)
    assert any("ausência de crescimento" in r.lower() for r in result)
    assert any("período de incubação adequado" in r.lower() for r in result)

def test_microbiology_analyzer_blood_culture_positive_gram_positive():
    """Test interpretation of positive blood cultures with Gram-positive organisms."""
    # Positive blood culture with Gram-positive cocci
    result = analisar_microbiologia({"Hemocult": "Positivo: Cocos Gram-positivos em cachos, sugestivo de Staphylococcus spp."})
    
    assert len(result) > 0
    assert any("hemocultura" in r.lower() for r in result)
    assert any("positivo" in r.lower() for r in result)
    assert any("organismo isolado" in r.lower() for r in result)
    assert any("gram-positiva" in r.lower() for r in result)
    assert any("staphylococcus" in r.lower() for r in result)
    
    # S. aureus
    result = analisar_microbiologia({"Hemocult": "Positivo: Staphylococcus aureus"})
    
    assert len(result) > 0
    assert any("aureus" in r.lower() for r in result)
    assert any("patógeno virulento" in r.lower() for r in result)
    assert any("endocardite" in r.lower() for r in result)

def test_microbiology_analyzer_blood_culture_positive_gram_negative():
    """Test interpretation of positive blood cultures with Gram-negative organisms."""
    # Positive blood culture with Gram-negative rods
    result = analisar_microbiologia({"Hemocult": "Positivo: Bacilos Gram-negativos, sugestivo de Enterobacteriaceae"})
    
    assert len(result) > 0
    assert any("hemocultura" in r.lower() for r in result)
    assert any("positivo" in r.lower() for r in result)
    assert any("gram-negativa" in r.lower() for r in result)
    assert any("choque séptico" in r.lower() for r in result)
    
    # E. coli
    result = analisar_microbiologia({"Hemocult": "Positivo: Escherichia coli"})
    
    assert len(result) > 0
    assert any("escherichia" in r.lower() for r in result)
    assert any("comumente associada" in r.lower() for r in result)
    assert any("infecções" in r.lower() for r in result)

def test_microbiology_analyzer_blood_culture_antibiogram():
    """Test interpretation of antibiogram results with blood culture."""
    # MRSA antibiogram
    result = analisar_microbiologia({
        "Hemocult": "Positivo: Staphylococcus aureus",
        "HemocultAntibiograma": """Oxacilina: Resistente
                                 Vancomicina: Sensível
                                 Clindamicina: Sensível
                                 Sulfametoxazol-trimetoprim: Sensível"""
    })
    
    assert len(result) > 0
    assert any("antibiograma" in r.lower() for r in result)
    assert any("resistente" in r.lower() for r in result)
    assert any("sensível" in r.lower() for r in result)
    assert any("oxacilina" in r.lower() and "resistente" in r.lower() for r in result)
    assert any("vancomicina" in r.lower() and "sensível" in r.lower() for r in result)
    assert any("mrsa" in r.lower() for r in result)
    
    # Enterobacteriaceae with ESBL
    result = analisar_microbiologia({
        "Hemocult": "Positivo: Klebsiella pneumoniae",
        "HemocultAntibiograma": """Ampicilina: Resistente
                                 Ceftriaxona: Resistente
                                 Ceftazidima: Resistente
                                 Imipenem: Sensível
                                 Ciprofloxacino: Sensível
                                 Amicacina: Sensível"""
    })
    
    assert len(result) > 0
    assert any("resistente" in r.lower() and "ceftriaxona" in r.lower() for r in result)
    assert any("esbl" in r.lower() or "beta-lactamase" in r.lower() for r in result)

def test_microbiology_analyzer_urine_culture():
    """Test interpretation of urine culture results."""
    # Positive urine culture with significant growth
    result = analisar_microbiologia({"Urocult": "Positivo: >10^5 UFC/mL de Escherichia coli"})
    
    assert len(result) > 0
    assert any("urocultura" in r.lower() for r in result)
    assert any("positivo" in r.lower() for r in result)
    assert any("escherichia coli" in r.lower() for r in result)
    assert any("crescimento significativo" in r.lower() for r in result)
    assert any("≥10^5" in r or ">10^5" in r for r in result)
    
    # Intermediate growth
    result = analisar_microbiologia({"Urocult": "Positivo: 5 x 10^4 UFC/mL de Klebsiella pneumoniae"})
    
    assert len(result) > 0
    assert any("urocultura" in r.lower() for r in result)
    assert any("klebsiella" in r.lower() for r in result)
    assert any("crescimento intermediário" in r.lower() for r in result)
    assert any("situações clínicas" in r.lower() for r in result)
    
    # Negative urine culture
    result = analisar_microbiologia({"Urocult": "Negativo: ausência de crescimento bacteriano"})
    
    assert len(result) > 0
    assert any("urocultura" in r.lower() for r in result)
    assert any("negativo" in r.lower() for r in result)
    assert any("ausência de crescimento" in r.lower() for r in result)

def test_microbiology_analyzer_surveillance_cultures():
    """Test interpretation of surveillance cultures."""
    # MRSA nasal colonization
    result = analisar_microbiologia({"CultVigilNasal": "Positivo para MRSA"})
    
    assert len(result) > 0
    assert any("vigilância nasal" in r.lower() for r in result)
    assert any("mrsa" in r.lower() for r in result)
    assert any("colonização" in r.lower() for r in result)
    assert any("precaução de contato" in r.lower() for r in result)
    
    # VRE rectal colonization
    result = analisar_microbiologia({"CultVigilRetal": "Positivo para Enterococcus resistente à Vancomicina (VRE)"})
    
    assert len(result) > 0
    assert any("vigilância retal" in r.lower() for r in result)
    assert any("vre" in r.lower() for r in result)
    assert any("colonização" in r.lower() for r in result)
    assert any("precaução de contato" in r.lower() for r in result)
    
    # KPC rectal colonization
    result = analisar_microbiologia({"CultVigilRetal": "Positivo para Enterobacteriaceae produtora de carbapenemase (KPC)"})
    
    assert len(result) > 0
    assert any("vigilância retal" in r.lower() for r in result)
    assert any("kpc" in r.lower() or "carbapenemase" in r.lower() for r in result)
    assert any("colonização" in r.lower() for r in result)
    assert any("precaução de contato" in r.lower() for r in result)

def test_microbiology_analyzer_hiv_serology():
    """Test interpretation of HIV serology results."""
    # Positive HIV
    result = analisar_microbiologia({"HIV": "Reagente"})
    
    assert len(result) > 0
    assert any("sorologia hiv" in r.lower() for r in result)
    assert any("reagente" in r.lower() for r in result)
    assert any("confirmar" in r.lower() for r in result)
    
    # Negative HIV
    result = analisar_microbiologia({"HIV": "Não Reagente"})
    
    assert len(result) > 0
    assert any("sorologia hiv" in r.lower() for r in result)
    assert any("não reagente" in r.lower() for r in result)

def test_microbiology_analyzer_hepatitis_b_profile():
    """Test interpretation of Hepatitis B serologic profiles."""
    # Acute hepatitis B
    result = analisar_microbiologia({
        "HBsAg": "Reagente",
        "AntiHBs": "Não Reagente",
        "AntiHBcTotal": "Reagente"
    })
    
    assert len(result) > 0
    assert any("perfil sorológico para hepatites" in r.lower() for r in result)
    assert any("hbsag positivo" in r.lower() for r in result)
    assert any("anti-hbs negativo" in r.lower() for r in result)
    assert any("anti-hbc total positivo" in r.lower() for r in result)
    assert any("hepatite b aguda ou crônica" in r.lower() for r in result)
    
    # Resolved hepatitis B with immunity
    result = analisar_microbiologia({
        "HBsAg": "Não Reagente",
        "AntiHBs": "Reagente",
        "AntiHBcTotal": "Reagente"
    })
    
    assert len(result) > 0
    assert any("hbsag negativo" in r.lower() for r in result)
    assert any("anti-hbs positivo" in r.lower() for r in result)
    assert any("anti-hbc total positivo" in r.lower() for r in result)
    assert any("infecção prévia" in r.lower() for r in result)
    assert any("imunidade" in r.lower() for r in result)
    
    # Vaccine-induced immunity
    result = analisar_microbiologia({
        "HBsAg": "Não Reagente",
        "AntiHBs": "Reagente",
        "AntiHBcTotal": "Não Reagente"
    })
    
    assert len(result) > 0
    assert any("hbsag negativo" in r.lower() for r in result)
    assert any("anti-hbs positivo" in r.lower() for r in result)
    assert any("anti-hbc total negativo" in r.lower() for r in result)
    assert any("imunidade vacinal" in r.lower() for r in result)
    
    # Susceptible to HBV infection
    result = analisar_microbiologia({
        "HBsAg": "Não Reagente",
        "AntiHBs": "Não Reagente",
        "AntiHBcTotal": "Não Reagente"
    })
    
    assert len(result) > 0
    assert any("hbsag negativo" in r.lower() for r in result)
    assert any("anti-hbs negativo" in r.lower() for r in result)
    assert any("anti-hbc total negativo" in r.lower() for r in result)
    assert any("suscetível" in r.lower() for r in result)

def test_microbiology_analyzer_hepatitis_c_serology():
    """Test interpretation of Hepatitis C serology."""
    # Positive HCV
    result = analisar_microbiologia({"HCV": "Reagente"})
    
    assert len(result) > 0
    assert any("anti-hcv positivo" in r.lower() for r in result)
    assert any("hepatite c" in r.lower() for r in result)
    assert any("confirmar" in r.lower() and "pcr" in r.lower() for r in result)
    
    # Negative HCV
    result = analisar_microbiologia({"HCV": "Não Reagente"})
    
    assert len(result) > 0
    assert any("anti-hcv negativo" in r.lower() for r in result)

def test_microbiology_analyzer_vdrl():
    """Test interpretation of VDRL results."""
    # Positive VDRL with titer
    result = analisar_microbiologia({"VDRL": "Reagente, título 1:64"})
    
    assert len(result) > 0
    assert any("vdrl" in r.lower() for r in result)
    assert any("reagente" in r.lower() for r in result)
    assert any("título" in r.lower() for r in result)
    assert any("1:64" in r for r in result)
    assert any("título elevado" in r.lower() for r in result)
    assert any("sífilis recente" in r.lower() for r in result)
    
    # Positive VDRL with low titer
    result = analisar_microbiologia({"VDRL": "Reagente, título 1:4"})
    
    assert len(result) > 0
    assert any("vdrl" in r.lower() for r in result)
    assert any("reagente" in r.lower() for r in result)
    assert any("título" in r.lower() for r in result)
    assert any("1:4" in r for r in result)
    assert any("confirmar" in r.lower() for r in result)
    assert any("treponêmico" in r.lower() for r in result)
    
    # Negative VDRL
    result = analisar_microbiologia({"VDRL": "Não Reagente"})
    
    assert len(result) > 0
    assert any("vdrl" in r.lower() for r in result)
    assert any("não reagente" in r.lower() for r in result)

def test_microbiology_analyzer_contaminated_sample():
    """Test interpretation of contaminated samples."""
    # Contaminated blood culture
    result = analisar_microbiologia({"Hemocult": "Contaminação provável com flora da pele"})
    
    assert len(result) > 0
    assert any("hemocultura" in r.lower() for r in result)
    assert any("contamin" in r.lower() for r in result)
    assert any("repetir" in r.lower() for r in result)

def test_microbiology_analyzer_multiple_serologies():
    """Test interpretation of multiple serologies together."""
    # Multiple negative serologies
    result = analisar_microbiologia({
        "HIV": "Não Reagente",
        "HBsAg": "Não Reagente",
        "HCV": "Não Reagente",
        "VDRL": "Não Reagente"
    })
    
    assert len(result) > 0
    assert any("sorologia hiv" in r.lower() for r in result)
    assert any("não reagente" in r.lower() for r in result)
    assert any("perfil sorológico para hepatites" in r.lower() for r in result)
    assert any("hbsag negativo" in r.lower() for r in result)
    assert any("anti-hcv negativo" in r.lower() for r in result)
    assert any("vdrl" in r.lower() for r in result)

def test_microbiology_analyzer_comprehensive_case():
    """Test a comprehensive microbiology assessment with multiple results."""
    # Complete dataset with positive cultures and serology
    data = {
        "Hemocult": "Positivo: Escherichia coli",
        "HemocultAntibiograma": """Ampicilina: Resistente
                                  Ceftriaxona: Sensível
                                  Ciprofloxacino: Sensível
                                  Gentamicina: Sensível
                                  Imipenem: Sensível""",
        "Urocult": "Positivo: >10^5 UFC/mL de Escherichia coli",
        "HIV": "Não Reagente",
        "HBsAg": "Não Reagente",
        "AntiHBs": "Reagente",
        "AntiHBcTotal": "Não Reagente",
        "HCV": "Não Reagente",
        "VDRL": "Não Reagente",
        "CultVigilNasal": "Negativo para MRSA"
    }
    
    result = analisar_microbiologia(data)
    
    # Results should include findings for each test
    assert len(result) >= 10
    
    # Blood culture findings
    assert any("hemocultura" in r.lower() for r in result)
    assert any("escherichia coli" in r.lower() for r in result)
    
    # Antibiogram findings
    assert any("antibiograma" in r.lower() for r in result)
    assert any("ampicilina" in r.lower() and "resistente" in r.lower() for r in result)
    assert any("ceftriaxona" in r.lower() and "sensível" in r.lower() for r in result)
    
    # Urine culture findings
    assert any("urocultura" in r.lower() for r in result)
    assert any("escherichia coli" in r.lower() for r in result)
    assert any("crescimento significativo" in r.lower() for r in result)
    
    # Serology findings
    assert any("sorologia hiv" in r.lower() for r in result)
    assert any("não reagente" in r.lower() for r in result)
    
    # Hepatitis profile findings
    assert any("perfil sorológico para hepatites" in r.lower() for r in result)
    assert any("imunidade vacinal" in r.lower() for r in result)
    
    # Surveillance culture findings
    assert any("vigilância nasal" in r.lower() for r in result)
    assert any("negativo para mrsa" in r.lower() for r in result)

def test_microbiology_analyzer_hepatitis_b_igm_igg_differentiation():
    """Test differentiation between AntiHBc IgM (acute) and IgG (past exposure) markers."""
    
    # Acute hepatitis B with positive IgM
    result = analisar_microbiologia({
        "HBsAg": "Reagente",
        "AntiHBs": "Não Reagente",
        "AntiHBcIgM": "Reagente",
        "AntiHBcIgG": "Não Reagente"
    })
    
    assert len(result) > 0
    assert any("perfil sorológico para hepatites" in r.lower() for r in result)
    assert any("hbsag positivo" in r.lower() for r in result)
    assert any("anti-hbs negativo" in r.lower() for r in result)
    assert any("anti-hbc igm positivo" in r.lower() for r in result)
    assert any("infecção aguda" in r.lower() for r in result)
    assert any("hepatite b aguda" in r.lower() for r in result)
    
    # Chronic hepatitis B with negative IgM, positive IgG
    result = analisar_microbiologia({
        "HBsAg": "Reagente",
        "AntiHBs": "Não Reagente",
        "AntiHBcIgM": "Não Reagente",
        "AntiHBcIgG": "Reagente"
    })
    
    assert len(result) > 0
    assert any("perfil sorológico para hepatites" in r.lower() for r in result)
    assert any("hbsag positivo" in r.lower() for r in result)
    assert any("anti-hbs negativo" in r.lower() for r in result)
    assert any("anti-hbc igm negativo" in r.lower() for r in result)
    assert any("anti-hbc igg positivo" in r.lower() for r in result)
    assert any("hepatite b crônica" in r.lower() for r in result)
    
    # Past resolved infection (with immunity)
    result = analisar_microbiologia({
        "HBsAg": "Não Reagente",
        "AntiHBs": "Reagente",
        "AntiHBcIgM": "Não Reagente",
        "AntiHBcIgG": "Reagente"
    })
    
    assert len(result) > 0
    assert any("perfil sorológico para hepatites" in r.lower() for r in result)
    assert any("hbsag negativo" in r.lower() for r in result)
    assert any("anti-hbs positivo" in r.lower() for r in result)
    assert any("anti-hbc igm negativo" in r.lower() for r in result)
    assert any("anti-hbc igg positivo" in r.lower() for r in result)
    assert any("infecção prévia" in r.lower() for r in result)
    assert any("imunidade" in r.lower() for r in result) 