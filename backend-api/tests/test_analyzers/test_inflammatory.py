import pytest
from unittest.mock import patch, MagicMock
import sys
import os

# Add the backend-api directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from analyzers.inflammatory import analisar_marcadores_inflamatorios

class TestInflammatoryAnalyzer:
    """Test suite for inflammatory markers analyzer - PCR, VHS, Procalcitonina, Ferritina"""
    
    def setup_method(self):
        """Setup method run before each test"""
        self.mock_ranges = {
            'PCR': (0, 0.5),  # mg/dL
            'VHS_Male': (0, 15),  # mm/h
            'VHS_Female': (0, 20),  # mm/h
            'Procalcitonina': (0, 0.05),  # ng/mL
            'Ferritina_Male': (15, 300),  # ng/mL
            'Ferritina_Female': (10, 200)  # ng/mL
        }
    
    @patch('analyzers.inflammatory.REFERENCE_RANGES')
    def test_pcr_normal_values(self, mock_ranges):
        """Test PCR within normal range"""
        mock_ranges.__getitem__.side_effect = lambda key: self.mock_ranges[key]
        
        data = {'PCR': '0.3'}
        result = analisar_marcadores_inflamatorios(data)
        
        assert result['is_critical'] is False
        assert len(result['abnormalities']) == 0
        assert 'dentro dos valores de referência' in result['interpretation']
        assert 'PCR' in result['details']
        assert result['details']['PCR'] == 0.3

    @patch('analyzers.inflammatory.REFERENCE_RANGES')
    def test_pcr_elevated_not_critical(self, mock_ranges):
        """Test PCR elevated but not critical"""
        mock_ranges.__getitem__.side_effect = lambda key: self.mock_ranges[key]
        
        data = {'PCR': '2.0'}
        result = analisar_marcadores_inflamatorios(data)
        
        assert result['is_critical'] is False
        assert len(result['abnormalities']) == 1
        assert 'PCR elevada' in result['abnormalities'][0]
        assert 'processo inflamatório/infeccioso' in result['recommendations'][0]
        assert 'elevada: 2.0 mg/dL' in result['interpretation']

    @patch('analyzers.inflammatory.REFERENCE_RANGES')
    def test_pcr_critically_elevated(self, mock_ranges):
        """Test PCR critically elevated"""
        mock_ranges.__getitem__.side_effect = lambda key: self.mock_ranges[key]
        
        data = {'PCR': '8.0'}
        result = analisar_marcadores_inflamatorios(data)
        
        assert result['is_critical'] is True
        assert len(result['abnormalities']) == 1
        assert 'acentuadamente elevada' in result['abnormalities'][0]
        assert 'Investigar processo inflamatório' in result['recommendations'][0]
        assert 'acentuadamente elevada: 8.0 mg/dL' in result['interpretation']

    @patch('analyzers.inflammatory.REFERENCE_RANGES')
    def test_vhs_normal_male(self, mock_ranges):
        """Test VHS normal for male patient"""
        mock_ranges.get.side_effect = lambda key, default=None: self.mock_ranges.get(key, default)
        
        data = {'VHS': '10'}
        kwargs = {'sexo': 'male'}
        result = analisar_marcadores_inflamatorios(data, **kwargs)
        
        assert result['is_critical'] is False
        assert len(result['abnormalities']) == 0
        assert 'dentro dos valores de referência' in result['interpretation']
        assert '10 mm/h' in result['interpretation']

    @patch('analyzers.inflammatory.REFERENCE_RANGES')
    def test_vhs_elevated_female(self, mock_ranges):
        """Test VHS elevated for female patient"""
        mock_ranges.get.side_effect = lambda key, default=None: self.mock_ranges.get(key, default)
        
        data = {'VHS': '25'}
        kwargs = {'sexo': 'female'}
        result = analisar_marcadores_inflamatorios(data, **kwargs)
        
        assert result['is_critical'] is False
        assert len(result['abnormalities']) == 1
        assert 'VHS elevada' in result['abnormalities'][0]
        assert 'Correlacionar com quadro clínico' in result['recommendations'][0]
        assert 'elevada: 25 mm/h' in result['interpretation']

    def test_procalcitonina_normal(self):
        """Test procalcitonina within normal range"""
        data = {'Procalcitonina': '0.03'}
        result = analisar_marcadores_inflamatorios(data)
        
        assert result['is_critical'] is False
        assert len(result['abnormalities']) == 0
        assert 'Baixa probabilidade de infecção bacteriana' in result['interpretation']

    def test_procalcitonina_slightly_elevated(self):
        """Test procalcitonina slightly elevated"""
        data = {'PCT': '0.2'}
        result = analisar_marcadores_inflamatorios(data)
        
        assert result['is_critical'] is False
        assert len(result['abnormalities']) == 1
        assert 'discretamente elevada' in result['abnormalities'][0]
        assert 'discretamente elevado' in result['interpretation']

    def test_procalcitonina_moderately_elevated(self):
        """Test procalcitonina moderately elevated"""
        data = {'pct': '1.2'}
        result = analisar_marcadores_inflamatorios(data)
        
        assert result['is_critical'] is False
        assert len(result['abnormalities']) == 1
        assert 'moderadamente elevada' in result['abnormalities'][0]
        assert 'possível infecção bacteriana sistêmica' in result['interpretation']
        assert 'Monitorar clinicamente' in result['recommendations'][0]

    def test_procalcitonina_high_sepsis_risk(self):
        """Test procalcitonina indicating high sepsis risk"""
        data = {'Procalcitonina': '5.0'}
        result = analisar_marcadores_inflamatorios(data)
        
        assert result['is_critical'] is True
        assert len(result['abnormalities']) == 1
        assert 'Risco de sepse grave' in result['abnormalities'][0]
        assert 'sepse bacteriana grave' in result['interpretation']
        assert 'infecção bacteriana sistêmica' in result['recommendations'][0]

    def test_procalcitonina_septic_shock_risk(self):
        """Test procalcitonina indicating septic shock risk"""
        data = {'PCT': '15.0'}
        result = analisar_marcadores_inflamatorios(data)
        
        assert result['is_critical'] is True
        assert len(result['abnormalities']) == 1
        assert 'Risco de choque séptico' in result['abnormalities'][0]
        assert 'choque séptico' in result['interpretation']
        assert 'antibioticoterapia empírica' in result['recommendations'][0]

    @patch('analyzers.inflammatory.REFERENCE_RANGES')
    def test_ferritina_normal_male(self, mock_ranges):
        """Test ferritina normal for male patient"""
        mock_ranges.__getitem__.side_effect = lambda key: self.mock_ranges[key]
        mock_ranges.__contains__.side_effect = lambda key: key in self.mock_ranges
        
        data = {'Ferritina': '150'}
        kwargs = {'sexo': 'male'}
        result = analisar_marcadores_inflamatorios(data, **kwargs)
        
        assert result['is_critical'] is False
        assert len(result['abnormalities']) == 0
        assert 'Dentro dos valores de referência' in result['interpretation']

    @patch('analyzers.inflammatory.REFERENCE_RANGES')
    def test_ferritina_low_female(self, mock_ranges):
        """Test ferritina low for female patient"""
        mock_ranges.__getitem__.side_effect = lambda key: self.mock_ranges[key]
        mock_ranges.__contains__.side_effect = lambda key: key in self.mock_ranges
        
        data = {'ferritina': '5'}
        kwargs = {'sexo': 'female'}
        result = analisar_marcadores_inflamatorios(data, **kwargs)
        
        assert result['is_critical'] is False
        assert len(result['abnormalities']) == 1
        assert 'Deficiência de Ferro' in result['abnormalities'][0]
        assert 'deficiência de ferro' in result['interpretation']
        assert 'Investigar e tratar deficiência de ferro' in result['recommendations'][0]

    @patch('analyzers.inflammatory.REFERENCE_RANGES')
    def test_ferritina_elevated(self, mock_ranges):
        """Test ferritina elevated"""
        mock_ranges.__getitem__.side_effect = lambda key: self.mock_ranges[key]
        mock_ranges.__contains__.side_effect = lambda key: key in self.mock_ranges
        
        data = {'Ferritina': '500'}
        kwargs = {'sexo': 'male'}
        result = analisar_marcadores_inflamatorios(data, **kwargs)
        
        assert result['is_critical'] is False
        assert len(result['abnormalities']) == 1
        assert 'Fase Aguda?/Sobrecarga Ferro?' in result['abnormalities'][0]
        assert 'reagente de fase aguda' in result['interpretation']
        assert 'saturação de transferrina' in result['recommendations'][0]

    @patch('analyzers.inflammatory.REFERENCE_RANGES')
    def test_ferritina_very_high(self, mock_ranges):
        """Test ferritina very high"""
        mock_ranges.__getitem__.side_effect = lambda key: self.mock_ranges[key]
        mock_ranges.__contains__.side_effect = lambda key: key in self.mock_ranges
        
        data = {'Ferritina': '1500'}
        kwargs = {'sexo': 'female'}
        result = analisar_marcadores_inflamatorios(data, **kwargs)
        
        assert result['is_critical'] is False
        assert len(result['abnormalities']) == 1
        assert 'Sobrecarga de Ferro?/Inflamação Grave?' in result['abnormalities'][0]
        assert 'inflamação/infecção severa' in result['interpretation']
        assert 'hemocromatose' in result['recommendations'][0]

    def test_multiple_markers_combined(self):
        """Test analysis with multiple inflammatory markers"""
        data = {
            'PCR': '3.0',
            'VHS': '30',
            'PCT': '0.8',
            'Ferritina': '800'
        }
        kwargs = {'sexo': 'male'}
        
        with patch('analyzers.inflammatory.REFERENCE_RANGES') as mock_ranges:
            mock_ranges.__getitem__.side_effect = lambda key: self.mock_ranges[key]
            mock_ranges.__contains__.side_effect = lambda key: key in self.mock_ranges
            mock_ranges.get.side_effect = lambda key, default=None: self.mock_ranges.get(key, default)
            
            result = analisar_marcadores_inflamatorios(data, **kwargs)
        
        assert result['is_critical'] is False  # PCT not high enough for critical
        assert len(result['abnormalities']) >= 3  # PCR, VHS, PCT, Ferritina
        assert len(result['recommendations']) > 0
        assert 'PCR' in result['interpretation']
        assert 'VHS' in result['interpretation']
        assert 'Procalcitonina' in result['interpretation']

    def test_critical_combination(self):
        """Test critical inflammatory state with multiple markers"""
        data = {
            'PCR': '12.0',
            'PCT': '8.0',
            'VHS': '80'
        }
        kwargs = {'sexo': 'female'}
        
        with patch('analyzers.inflammatory.REFERENCE_RANGES') as mock_ranges:
            mock_ranges.__getitem__.side_effect = lambda key: self.mock_ranges[key]
            mock_ranges.get.side_effect = lambda key, default=None: self.mock_ranges.get(key, default)
            
            result = analisar_marcadores_inflamatorios(data, **kwargs)
        
        assert result['is_critical'] is True
        assert len(result['abnormalities']) >= 2
        assert any('acentuadamente elevada' in ab for ab in result['abnormalities'])
        assert any('sepse' in rec for rec in result['recommendations'])

    def test_invalid_numeric_values(self):
        """Test handling of invalid numeric values"""
        data = {
            'PCR': 'invalid',
            'VHS': 'N/A',
            'PCT': '',
            'Ferritina': 'não detectado'
        }
        
        result = analisar_marcadores_inflamatorios(data)
        
        assert result['is_critical'] is False
        assert 'não numérico' in result['interpretation']

    def test_no_markers_provided(self):
        """Test when no inflammatory markers are provided"""
        data = {'hemoglobina': '14.0'}  # Different type of marker
        result = analisar_marcadores_inflamatorios(data)
        
        assert result['is_critical'] is False
        assert len(result['abnormalities']) == 0
        assert 'Nenhum marcador inflamatório comum' in result['interpretation']

    def test_edge_case_values(self):
        """Test edge case values at thresholds"""
        # Test exact threshold values
        test_cases = [
            ({'PCR': '0.5'}, False, 'PCR elevada'),  # Exactly at upper limit
            ({'PCR': '5.0'}, True, 'acentuadamente elevada'),  # Exactly at critical threshold
            ({'PCT': '0.05'}, False, 'discretamente elevada'),  # Just above normal
            ({'PCT': '0.5'}, False, 'moderadamente elevada'),  # Exactly at moderate threshold
            ({'PCT': '2.0'}, True, 'sepse grave'),  # Exactly at critical threshold
        ]
        
        for data, should_be_critical, expected_text in test_cases:
            with patch('analyzers.inflammatory.REFERENCE_RANGES') as mock_ranges:
                mock_ranges.__getitem__.side_effect = lambda key: self.mock_ranges[key]
                
                result = analisar_marcadores_inflamatorios(data)
                assert result['is_critical'] == should_be_critical
                assert expected_text in result['interpretation'] or any(expected_text in ab for ab in result['abnormalities'])

    def test_safe_convert_to_float_function(self):
        """Test the _safe_convert_to_float utility function"""
        from analyzers.inflammatory import _safe_convert_to_float
        
        # Test normal conversions
        assert _safe_convert_to_float('3.5') == 3.5
        assert _safe_convert_to_float('3,5') == 3.5  # European format
        assert _safe_convert_to_float('1.234,56') == 1234.56  # European thousands
        
        # Test special cases
        assert _safe_convert_to_float('<0.1') == 0.1
        assert _safe_convert_to_float('>100') == 100.0
        
        # Test invalid values
        assert _safe_convert_to_float('invalid') is None
        assert _safe_convert_to_float('') is None
        assert _safe_convert_to_float(None) is None

    def test_alternative_key_names(self):
        """Test that different key variations are recognized"""
        # Test different case variations and synonyms
        test_data = [
            ({'pcr': '2.0'}, 'PCR'),
            ({'proteína c reativa': '2.0'}, 'PCR'),
            ({'vhs': '25'}, 'VHS'),
            ({'velocidade de hemossedimentação': '25'}, 'VHS'),
            ({'pct': '1.0'}, 'Procalcitonina'),
            ({'procalcitonina': '1.0'}, 'Procalcitonina'),
            ({'ferritina': '400'}, 'Ferritina'),
        ]
        
        for data, expected_marker in test_data:
            result = analisar_marcadores_inflamatorios(data)
            assert expected_marker in result['interpretation']
            assert len(result['abnormalities']) > 0  # Should detect abnormality with these values

    def test_recommendations_uniqueness(self):
        """Test that recommendations are unique when multiple markers trigger same recommendation"""
        data = {
            'PCR': '3.0',
            'VHS': '50'
        }
        
        result = analisar_marcadores_inflamatorios(data)
        
        # Should not have duplicate recommendations
        assert len(result['recommendations']) == len(set(result['recommendations']))
        assert len(result['abnormalities']) == len(set(result['abnormalities']))

    def test_empty_interpretation_fallback(self):
        """Test fallback interpretation when processing succeeds but no specific interpretation generated"""
        # This tests the edge case handling in the final interpretation logic
        data = {'PCR': '0.1'}  # Normal value
        
        with patch('analyzers.inflammatory.REFERENCE_RANGES') as mock_ranges:
            mock_ranges.__getitem__.side_effect = lambda key: self.mock_ranges[key]
            
            result = analisar_marcadores_inflamatorios(data)
            
            assert result['interpretation'] != ""
            assert result['interpretation'] is not None

    def test_sex_parameter_handling(self):
        """Test proper handling of sex parameter for sex-specific reference ranges"""
        data = {'VHS': '18', 'Ferritina': '250'}
        
        # Test with male
        with patch('analyzers.inflammatory.REFERENCE_RANGES') as mock_ranges:
            mock_ranges.get.side_effect = lambda key, default=None: self.mock_ranges.get(key, default)
            mock_ranges.__getitem__.side_effect = lambda key: self.mock_ranges[key]
            mock_ranges.__contains__.side_effect = lambda key: key in self.mock_ranges
            
            result_male = analisar_marcadores_inflamatorios(data, sexo='male')
            result_female = analisar_marcadores_inflamatorios(data, sexo='female')
            
            # VHS should be abnormal for male (>15) but normal for female (<20)
            # Ferritina should be normal for male (<300) but abnormal for female (>200)
            male_vhs_abnormal = any('VHS' in ab for ab in result_male['abnormalities'])
            female_vhs_abnormal = any('VHS' in ab for ab in result_female['abnormalities'])
            
            assert male_vhs_abnormal and not female_vhs_abnormal

if __name__ == '__main__':
    pytest.main([__file__])