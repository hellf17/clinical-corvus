"""
Unit tests for the coagulation analyzer module.
"""

import pytest
from analyzers.coagulation import analisar_coagulacao


def test_coagulation_normal_values():
    """Test coagulation analyzer with normal values."""
    data = {
        'INR': 1.0,
        'TTPA': 30,
        'Fibrinogeno': 300,
        'D-dimer': 250,
        'Plaquetas': 250000
    }
    
    result = analisar_coagulacao(data)
    
    assert result['interpretation'] is not None
    assert not result['is_critical']
    assert len(result['abnormalities']) == 0
    assert len(result['recommendations']) >= 0
    assert 'details' in result


def test_coagulation_critical_inr():
    """Test coagulation analyzer with critical INR value."""
    data = {
        'INR': 6.0,
        'TTPA': 30,
        'Fibrinogeno': 300,
        'D-dimer': 250,
        'Plaquetas': 250000
    }
    
    result = analisar_coagulacao(data)
    
    assert result['interpretation'] is not None
    assert result['is_critical']
    assert len(result['abnormalities']) > 0
    assert any('INR acentuadamente elevado' in abn for abn in result['abnormalities'])
    assert len(result['recommendations']) > 0


def test_coagulation_elevated_inr():
    """Test coagulation analyzer with elevated INR value."""
    data = {
        'INR': 2.5,
        'TTPA': 30,
        'Fibrinogeno': 300,
        'D-dimer': 250,
        'Plaquetas': 25000
    }
    
    result = analisar_coagulacao(data)
    
    assert result['interpretation'] is not None
    assert not result['is_critical']
    assert any('INR em faixa terapêutica' in interp for interp in result['interpretation'].split('\n'))


def test_coagulation_critical_ttpa():
    """Test coagulation analyzer with critical TTPA value."""
    data = {
        'INR': 1.0,
        'TTPA': 80,  # Significantly prolonged
        'Fibrinogeno': 300,
        'D-dimer': 250,
        'Plaquetas': 250000
    }
    
    result = analisar_coagulacao(data)
    
    assert result['interpretation'] is not None
    assert result['is_critical']
    assert len(result['abnormalities']) > 0
    assert any('TTPA severamente prolongado' in abn for abn in result['abnormalities'])
    assert len(result['recommendations']) > 0


def test_coagulation_low_fibrinogen():
    """Test coagulation analyzer with low fibrinogen value."""
    data = {
        'INR': 1.0,
        'TTPA': 30,
        'Fibrinogeno': 50,  # Severely low
        'D-dimer': 250,
        'Plaquetas': 250000
    }
    
    result = analisar_coagulacao(data)
    
    assert result['interpretation'] is not None
    assert result['is_critical']
    assert len(result['abnormalities']) > 0
    assert any('Fibrinogênio severamente Baixo' in abn for abn in result['abnormalities'])
    assert len(result['recommendations']) > 0


def test_coagulation_elevated_ddimer():
    """Test coagulation analyzer with elevated D-dimer value."""
    data = {
        'INR': 1.0,
        'TTPA': 30,
        'Fibrinogeno': 300,
        'D-dimer': 1500, # Severely elevated
        'Plaquetas': 250000
    }
    
    result = analisar_coagulacao(data)
    
    assert result['interpretation'] is not None
    assert not result['is_critical']  # D-dimer alone is not usually critical
    assert len(result['abnormalities']) > 0
    assert any('D-dímero severamente Elevado' in abn for abn in result['abnormalities'])
    assert len(result['recommendations']) > 0


def test_coagulation_low_platelets():
    """Test coagulation analyzer with low platelet count."""
    data = {
        'INR': 1.0,
        'TTPA': 30,
        'Fibrinogeno': 300,
        'D-dimer': 250,
        'Plaquetas': 15000  # Severely low
    }
    
    result = analisar_coagulacao(data)
    
    assert result['interpretation'] is not None
    assert result['is_critical']
    assert len(result['abnormalities']) > 0
    assert any('Trombocitopenia severa' in abn for abn in result['abnormalities'])
    assert len(result['recommendations']) > 0


def test_coagulation_high_platelets():
    """Test coagulation analyzer with high platelet count."""
    data = {
        'INR': 1.0,
        'TTPA': 30,
        'Fibrinogeno': 300,
        'D-dimer': 250,
        'Plaquetas': 1500000  # Severely elevated
    }
    
    result = analisar_coagulacao(data)
    
    assert result['interpretation'] is not None
    assert not result['is_critical']
    assert len(result['abnormalities']) > 0
    assert any('Trombocitose severa' in abn for abn in result['abnormalities'])
    assert len(result['recommendations']) > 0


def test_coagulation_no_data():
    """Test coagulation analyzer with no data."""
    data = {}
    
    result = analisar_coagulacao(data)
    
    assert result['interpretation'] is not None
    assert not result['is_critical']
    assert len(result['abnormalities']) == 0
    assert len(result['recommendations']) == 0
    assert result['interpretation'] == "Dados insuficientes para análise de coagulação."


def test_coagulation_non_numeric_values():
    """Test coagulation analyzer with non-numeric values."""
    data = {
        'INR': 'invalid',
        'TPA': 'invalid',
        'Fibrinogeno': 'invalid',
        'D-dimer': 'invalid',
        'Plaquetas': 'invalid'
    }
    
    result = analisar_coagulacao(data)
    
    assert result['interpretation'] is not None
    assert not result['is_critical']
    assert len(result['abnormalities']) == 0
    assert len(result['recommendations']) == 0
    assert 'não numérico' in result['interpretation']


if __name__ == '__main__':
    pytest.main([__file__])