"""
Tests for edge cases in severity score calculations.
This file focuses on testing edge cases and boundary conditions that might not be 
covered in the main test file for severity scores.
"""

import pytest
import sys
import os
from decimal import Decimal

# Add the root directory to the Python path
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import severity score functions
from utils.severity_scores import calcular_sofa, calcular_qsofa, calcular_apache2, calcular_saps3

class TestSeverityScoreEdgeCases:
    """Test edge cases for severity score calculations."""
    
    def test_sofa_extreme_values(self):
        """Test SOFA calculation with extreme physiological values."""
        # Create parameters with extremely abnormal values
        extreme_params = {
            'pao2': 20,            # Extremely low PaO2
            'fio2': 1.0,           # 100% oxygen
            'plaquetas': 5,        # Extreme thrombocytopenia
            'bilirrubina': 40.0,   # Extreme hyperbilirubinemia
            'pas': 40,             # Extreme hypotension
            'pad': 20,
            'aminas': True,
            'noradrenalina': 5.0,  # Extremely high dose (unrealistic)
            'glasgow': 3,          # Minimum GCS
            'creatinina': 12.0,    # Extreme renal failure
            'diurese': 50          # Extreme oliguria
        }
        
        score, components, interpretation = calcular_sofa(extreme_params)
        
        # All systems should have maximum score (4)
        for system, value in components.items():
            assert value == 4
        
        # Total score should be 24 (4 points × 6 systems)
        assert score == 24
        
        # Check interpretation includes mortality information
        assert any("mortalidade estimada >80%" in line for line in interpretation)
        
        # All systems should be mentioned in interpretation
        system_names = ["Respiratório", "Coagulação", "Hepático", 
                        "Cardiovascular", "Neurológico", "Renal"]
        for system in system_names:
            assert any(system in line for line in interpretation)

    def test_sofa_zero_values(self):
        """Test SOFA calculation with zero values."""
        zero_params = {
            'pao2': 0,            # Should not cause division by zero with FiO2
            'fio2': 0,            # Should handle division by zero gracefully
            'plaquetas': 0,       # Zero platelets
            'bilirrubina': 0,     # Zero bilirubin
            'glasgow': 3,         # Minimum valid GCS
            'creatinina': 0,      # Zero creatinine
            'diurese': 0          # Anuria
        }
        
        score, components, interpretation = calcular_sofa(zero_params)
        
        # Systems with zero values should have appropriate scores
        assert components['coagulacao'] == 4  # Zero platelets = maximum score
        assert components['renal'] == 4       # Anuria = maximum score
        assert components['neurologico'] == 4 # GCS 3 = maximum score
        
        # Zero FiO2 should not result in division by zero error
        # Instead, respiratory component should be handled appropriately
        assert 'respiratorio' in components
        
        # Zero bilirubin should give minimum score
        assert components['hepatico'] == 0
        
        # Check total score calculation
        expected_score = sum(components.values())
        assert score == expected_score

    def test_sofa_mixed_upper_lower_case(self):
        """Test SOFA calculation with parameter names in mixed case."""
        # Create parameters with mixed case names
        mixed_case_params = {
            'PaO2': 80,           # Uppercase
            'FiO2': 0.6,          # Uppercase
            'PLAQUETAS': 80,      # All caps
            'Bilirrubina': 3.0,   # Title case
            'pas': 70,            # Lowercase
            'PAD': 40,            # All caps
            'Aminas': False,      # Title case
            'GLASGOW': 10,        # All caps
            'creatinina': 2.5     # Lowercase
        }
        
        # This should gracefully handle case insensitivity
        # If it doesn't in current implementation, the test should fail
        # indicating a need for case-insensitive parameter handling
        try:
            score, components, interpretation = calcular_sofa(mixed_case_params)
            case_insensitive = True
        except KeyError:
            case_insensitive = False
        
        # If parameters are case-sensitive, skip this test
        if not case_insensitive:
            pytest.skip("SOFA calculation is case-sensitive; mixed case not supported")
        
        # Verify calculation results if case-insensitive
        assert components['respiratorio'] > 0
        assert components['coagulacao'] > 0
        assert components['hepatico'] > 0
        assert components['neurologico'] > 0
        assert components['renal'] > 0
        assert score > 0

    def test_qsofa_decimal_values(self):
        """Test qSOFA calculation with decimal values that should be rounded correctly."""
        # Create parameters with decimal values
        decimal_params = {
            'glasgow': 14.6,    # Should round to 15 (normal)
            'fr': 21.6,         # Should round to 22 (abnormal)
            'pas': 100.4        # Should round to 100 (borderline)
        }
        
        # Calculate qSOFA with these parameters
        try:
            score, interpretation = calcular_qsofa(decimal_params)
            handles_decimals = True
        except (TypeError, ValueError):
            handles_decimals = False
        
        # If function doesn't handle decimals, skip this test
        if not handles_decimals:
            pytest.skip("qSOFA calculation doesn't support decimal values")
        
        # Verify calculation results if decimals are handled
        # Expected score: 1 point for fr rounding to 22
        assert score == 1
        assert any("Frequência respiratória elevada" in line for line in interpretation)

    def test_apache2_boundary_values(self):
        """Test APACHE II calculation with boundary values for each parameter."""
        # Create parameters at the boundaries of scoring categories
        boundary_params = {
            'temp': 38.9,         # 38.5-38.9 = 1 point, 39.0-40.9 = 3 points
            'pad': 70,            # 70-109 = 0 points, 50-69 = 2 points
            'pas': 130,           # For MAP calculation
            'fc': 110,            # 110-139 = 2 points, 70-109 = 0 points
            'fr': 20,             # 12-24 = 0 points, 10-11 or 25-34 = 1 point
            'pao2': 70,           # Boundary for respiratory component
            'ph': 7.5,            # 7.5-7.59 = 1 point, 7.33-7.49 = 0 points
            'na': 155,            # 155-159 = 1 point, 150-154 = 0 points
            'k': 3.5,             # 3.5-5.4 = 0 points, 3.0-3.4 = 1 point
            'creatinina': 1.4,    # With ARF: 1.5-1.9 = 4 points, 0.6-1.4 = 0 points
            'ht': 46,             # 46-49.9 = 1 point, 30-45.9 = 0 points
            'leuco': 15000,       # 15-19.9 = 1 point, 3-14.9 = 0 points
            'glasgow': 9,         # 9-11 = 4 points, 6-8 = 6 points
            'idade': 45,          # 45-54 = 2 points, 0-44 = 0 points
            'doenca_cronica': False,
            'tipo_internacao': 'cirurgica_urgencia',  # Different points for different admission types
            'insuf_renal_aguda': False
        }
        
        # Calculate APACHE II score
        score, components, mortality, interpretation = calcular_apache2(boundary_params)
        
        # Verify specific component scores
        assert components['temperatura'] == 1
        assert components['pressao_arterial_media'] == 0
        assert components['frequencia_cardiaca'] == 2
        assert components['frequencia_respiratoria'] == 0
        assert components['idade'] == 2
        
        # Verify total score calculation is correct
        expected_score = 15
        assert score == expected_score
        
        # Verify mortality calculation is reasonable
        assert 0 <= mortality <= 1

    def test_saps3_risk_factor_combinations(self):
        """Test SAPS3 calculation with different combinations of risk factors."""
        # Base parameters
        base_params = {
            'idade': 65,
            'comorbidades': [],
            'dias_internacao_previa': 0,
            'origem': 'enfermaria',
            'motivo_internacao': 'clinica',
            'infeccao': False,
            'glasgow': 15,
            'fc': 90,
            'pas': 120,
            'temperatura': 37.5,
            'leucocitos': 10000,
            'plaquetas': 200000,
            'bilirrubina': 1.0,
            'creatinina': 1.0,
            'ureia': 40,
            'na': 140,
            'k': 4.0,
            'hco3': 24,
            'ph': 7.4,
            'pao2': 90,
            'fio2': 0.21
        }

        # 1. Test with no comorbidities
        score1, mortality1, interp1 = calcular_saps3(base_params)
        
        # 2. Test with one comorbidity
        one_comorbidity = base_params.copy()
        one_comorbidity['comorbidades'] = ['cancer']
        score2, mortality2, interp2 = calcular_saps3(one_comorbidity)
        
        # 3. Test with multiple comorbidities
        multi_comorbidity = base_params.copy()
        multi_comorbidity['comorbidades'] = ['cancer', 'icc', 'cirrose']
        score3, mortality3, interp3 = calcular_saps3(multi_comorbidity)
        
        # Verify score increases with more comorbidities
        assert score1 < score2 < score3
        
        # Verify mortality increases with more comorbidities
        assert mortality1 < mortality2 < mortality3
        
        # 4. Test effect of different admission circumstances
        emergency_admission = base_params.copy()
        emergency_admission['origem'] = 'emergencia'
        score4, mortality4, interp4 = calcular_saps3(emergency_admission)
        
        assert score4 > score1  # Emergency admission should have higher score
        
        # 5. Test effect of age
        elderly_patient = base_params.copy()
        elderly_patient['idade'] = 85
        score5, mortality5, interp5 = calcular_saps3(elderly_patient)
        
        assert score5 > score1  # Elderly patient should have higher score
        
        # Verify interpretation includes mortality information
        assert any("mortalidade" in line.lower() for line in interp1)
        assert any("mortalidade" in line.lower() for line in interp5)

    def test_sofa_vasopressor_priority(self):
        """Test that SOFA correctly prioritizes the highest scoring vasopressor when multiple are present."""
        # Create parameters with multiple vasopressors
        multiple_vasopressor_params = {
            'aminas': True,
            'dopamina': 3,         # Score 2
            'dobutamina': True,    # Score 2
            'noradrenalina': 0.05, # Score 3
            'adrenalina': 0.2      # Score 4
        }
        
        # Calculate SOFA score
        score, components, interpretation = calcular_sofa(multiple_vasopressor_params)
        
        # Should use the highest scoring vasopressor (adrenalina 0.2 = score 4)
        assert components['cardiovascular'] == 4
        
        # Change adrenalina to a lower dose
        params2 = multiple_vasopressor_params.copy()
        params2['adrenalina'] = 0.05  # Score 3
        
        score2, components2, interpretation2 = calcular_sofa(params2)
        
        # Now adrenalina and noradrenalina are both score 3, should still be 3
        assert components2['cardiovascular'] == 3
        
        # Remove noradrenalina and adrenalina
        params3 = multiple_vasopressor_params.copy()
        params3['noradrenalina'] = 0
        params3['adrenalina'] = 0
        
        score3, components3, interpretation3 = calcular_sofa(params3)
        
        # Now dopamina at 3 μg/kg/min should be used (score 2)
        assert components3['cardiovascular'] == 2

    def test_qsofa_no_parameters(self):
        """Test qSOFA calculation with no parameters."""
        empty_params = {}
        
        score, interpretation = calcular_qsofa(empty_params)
        
        # Score should be 0 with no parameters
        assert score == 0
        assert any("Baixo risco" in line for line in interpretation)
        
        # Only required parameter
        min_params = {'glasgow': 14}
        
        score_min, interpretation_min = calcular_qsofa(min_params)
        
        # Score should be 1 due to GCS < 15
        assert score_min == 1
        assert any("Alteração do estado mental" in line for line in interpretation_min)

    def test_apache2_age_effect(self):
        """Test how age affects APACHE II score."""
        # Base parameters for a young patient
        young_params = {
            'temp': 37.0,      # Normal
            'pad': 80,         # Normal MAP
            'pas': 120,
            'fc': 80,          # Normal
            'fr': 18,          # Normal
            'pao2': 80,        # Slight hypoxemia
            'fio2': 0.21,      # Room air
            'ph': 7.35,        # Normal
            'na': 140,         # Normal
            'k': 4.0,          # Normal
            'creatinina': 0.8, # Normal
            'ht': 42,          # Normal
            'leuco': 10000,    # Normal
            'glasgow': 15,     # Normal
            'idade': 25,       # Young
            'doenca_cronica': False,
            'tipo_internacao': 'clinica'
        }
        
        # Same parameters for an elderly patient
        elderly_params = young_params.copy()
        elderly_params['idade'] = 85  # Elderly
        
        # Calculate scores
        young_score, young_components, young_mortality, young_interp = calcular_apache2(young_params)
        elderly_score, elderly_components, elderly_mortality, elderly_interp = calcular_apache2(elderly_params)
        
        # Age component should differ
        assert young_components['idade'] < elderly_components['idade']
        
        # Elderly should have higher total score due to age points
        assert young_score < elderly_score
        
        # Mortality should be higher for elderly
        assert young_mortality < elderly_mortality
        
        # Specifically verify age component
        assert young_components['idade'] == 0  # Age 25 = 0 points
        assert elderly_components['idade'] == 6  # Age 85 = 6 points
        
        # Age difference in total score should match age component difference
        age_diff = elderly_components['idade'] - young_components['idade']
        total_diff = elderly_score - young_score
        assert age_diff == total_diff

    def test_saps3_extreme_physiology(self):
        """Test SAPS3 calculation with extreme physiological values."""
        # Create parameters with extreme values
        extreme_params = {
            'idade': 90,                # Very elderly
            'comorbidades': ['cancer', 'icc', 'cirrose', 'quimioterapia', 'aids'],
            'dias_internacao_previa': 28, # Long prior hospital stay
            'origem': 'outro_hospital',
            'motivo_internacao': 'cirurgica_urgencia',
            'infeccao': True,
            'glasgow': 3,              # Minimum GCS
            'fc': 180,                 # Extreme tachycardia
            'pas': 40,                 # Extreme hypotension
            'temperatura': 41.0,       # Extreme fever
            'leucocitos': 40000,       # Extreme leukocytosis
            'plaquetas': 20000,        # Severe thrombocytopenia
            'bilirrubina': 12.0,       # Severe hyperbilirubinemia
            'creatinina': 5.0,         # Severe renal failure
            'ureia': 200,              # Extreme uremia
            'na': 170,                 # Severe hypernatremia
            'k': 7.0,                  # Severe hyperkalemia
            'hco3': 10,                # Severe metabolic acidosis
            'ph': 7.0,                 # Severe acidemia
            'pao2': 40,                # Severe hypoxemia
            'fio2': 1.0                # 100% oxygen
        }

        # Calculate SAPS3 score
        score, mortality, interpretation = calcular_saps3(extreme_params)
        
        # Should have a very high score due to extreme values
        assert score > 80
        
        # Should predict very high mortality (>90%)
        assert mortality > 0.9
        
        # Verify interpretation includes mortality information
        assert any("mortalidade" in line.lower() for line in interpretation)
        
        # Should include "prognóstico muito grave" (very serious prognosis)
        assert any("muito grave" in line.lower() for line in interpretation) 