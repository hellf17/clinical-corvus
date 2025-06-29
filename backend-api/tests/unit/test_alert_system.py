"""
Tests for the alert system functionality.
This file tests the AlertSystem class from utils/alert_system.py
"""

import pytest
import sys
import os
from unittest.mock import patch, MagicMock

# Add the root directory to the Python path
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import the AlertSystem
from utils.alert_system import AlertSystem

class TestAlertSystem:
    """Test case for the AlertSystem class."""

    def test_severity_to_number(self):
        """Test the _severity_to_number method for correct mapping."""
        # Test all severity levels
        assert AlertSystem._severity_to_number("critical") == 5
        assert AlertSystem._severity_to_number("severe") == 4
        assert AlertSystem._severity_to_number("moderate") == 3
        assert AlertSystem._severity_to_number("warning") == 2
        assert AlertSystem._severity_to_number("info") == 1
        assert AlertSystem._severity_to_number("normal") == 0
        
        # Test case insensitivity
        assert AlertSystem._severity_to_number("CRITICAL") == 5
        assert AlertSystem._severity_to_number("Severe") == 4
        
        # Test invalid severity (should default to 0)
        assert AlertSystem._severity_to_number("unknown") == 0
        assert AlertSystem._severity_to_number("") == 0

    def test_organize_exams_by_type(self):
        """Test the _organize_exams_by_type method for correct categorization."""
        # Create a list of test exams
        exams = [
            {"test": "TGO", "value": 45, "unit": "U/L"},
            {"test": "ALT", "value": 50, "unit": "U/L"},
            {"test": "Creatinina", "value": 1.2, "unit": "mg/dL"},
            {"test": "Ureia", "value": 40, "unit": "mg/dL"},
            {"test": "Hemoglobina", "value": 13.5, "unit": "g/dL"},
            {"test": "Plaquetas", "value": 250, "unit": "10^3/μL"},
            {"test": "pH", "value": 7.35, "unit": ""},
            {"test": "pO2", "value": 92, "unit": "mmHg"},
            {"test": "Sódio", "value": 140, "unit": "mEq/L"},
            {"test": "Potássio", "value": 4.0, "unit": "mEq/L"},
            {"test": "Troponina", "value": 0.01, "unit": "ng/mL"},
            {"test": "Glicose", "value": 100, "unit": "mg/dL"},
            {"test": "Cultura de Urina", "value": "Negativa", "unit": ""},
            {"test": "Unknown Test", "value": 123, "unit": "unknown", "type": "hepatic"}
        ]
        
        # Organize exams by type
        organized = AlertSystem._organize_exams_by_type(exams)
        
        # Verify correct categorization
        assert len(organized["hepatic"]) == 3  # TGO, ALT, Unknown Test (by type)
        assert len(organized["renal"]) == 2    # Creatinina, Ureia
        assert len(organized["hematology"]) == 2  # Hemoglobina, Plaquetas
        assert len(organized["blood_gases"]) == 2  # pH, pO2
        assert len(organized["electrolytes"]) == 2  # Sódio, Potássio
        assert len(organized["cardiac"]) == 1  # Troponina
        assert len(organized["metabolic"]) == 1  # Glicose
        assert len(organized["microbiology"]) == 1  # Cultura de Urina
        
        # No 'other' category should be present as all tests were categorized
        assert "other" not in organized

    def test_organize_exams_by_type_with_explicit_type(self):
        """Test organizing exams by explicit type field."""
        exams = [
            {"test": "Some Test", "value": 100, "unit": "mg/dL", "type": "renal"},
            {"test": "Another Test", "value": 200, "unit": "mg/dL", "type": "hepatic"},
            {"test": "Blood Test", "value": 10, "unit": "g/dL", "type": "hematology"},
            {"test": "Gas Test", "value": 7.4, "unit": "", "type": "blood gas"},
            {"test": "Salt Test", "value": 145, "unit": "mEq/L", "type": "electrolytes"},
            {"test": "Heart Test", "value": 0.02, "unit": "ng/mL", "type": "cardiac"},
            {"test": "Culture Test", "value": "Positive", "unit": "", "type": "microbiology"},
            {"test": "Sugar Test", "value": 120, "unit": "mg/dL", "type": "metabolism"},
            {"test": "Misc Test", "value": 999, "unit": "unknown", "type": "other"}
        ]
        
        organized = AlertSystem._organize_exams_by_type(exams)
        
        # Verify categorization by type
        assert len(organized["renal"]) == 1
        assert len(organized["hepatic"]) == 1
        assert len(organized["hematology"]) == 1
        assert len(organized["blood_gases"]) == 1
        assert len(organized["electrolytes"]) == 1
        assert len(organized["cardiac"]) == 1
        assert len(organized["microbiology"]) == 1
        assert len(organized["metabolic"]) == 1
        assert len(organized["other"]) == 1

    def test_organize_exams_empty_input(self):
        """Test organizing exams with empty input."""
        organized = AlertSystem._organize_exams_by_type([])
        # Should return an empty dictionary
        assert organized == {}

    def test_convert_analysis_to_alerts(self):
        """Test the _convert_analysis_to_alerts method for correct alert generation."""
        # Test with abnormalities
        analysis_results = {
            'abnormalities': [
                {
                    'parameter': 'Creatinina',
                    'message': 'Creatinina elevada',
                    'value': 2.5,
                    'reference': '0.6-1.2 mg/dL',
                    'severity': 'moderate',
                    'interpretation': 'Possível disfunção renal',
                    'recommendation': 'Avaliar função renal'
                },
                {
                    'parameter': 'Ureia',
                    'message': 'Ureia elevada',
                    'value': 80,
                    'reference': '15-40 mg/dL',
                    'severity': 'warning',
                    'interpretation': 'Alteração em ureia',
                    'recommendation': 'Monitorar'
                }
            ],
            'interpretation': 'Alterações compatíveis com disfunção renal',
            'severity': 'moderate',
            'recommendation': 'Avaliar função renal e hidratação',
            'critical_conditions': [
                {
                    'parameter': 'Potássio',
                    'description': 'Hipercalemia severa',
                    'action': 'Tratamento imediato necessário'
                }
            ]
        }
        
        # Convert to alerts
        alerts = AlertSystem._convert_analysis_to_alerts(analysis_results, 'Função Renal')
        
        # Should generate 4 alerts (2 abnormalities + 1 general interpretation + 1 critical condition)
        assert len(alerts) == 4
        
        # Verify abnormality alerts
        abnormality_alerts = [a for a in alerts if a['parameter'] in ['Creatinina', 'Ureia']]
        assert len(abnormality_alerts) == 2
        assert any(a['parameter'] == 'Creatinina' and a['severity'] == 'moderate' for a in abnormality_alerts)
        assert any(a['parameter'] == 'Ureia' and a['severity'] == 'warning' for a in abnormality_alerts)
        
        # Verify general interpretation alert
        general_alert = next((a for a in alerts if a['parameter'] == 'Geral'), None)
        assert general_alert is not None
        assert general_alert['message'] == 'Alterações compatíveis com disfunção renal'
        assert general_alert['severity'] == 'moderate'
        
        # Verify critical condition alert
        critical_alert = next((a for a in alerts if a['severity'] == 'critical'), None)
        assert critical_alert is not None
        assert critical_alert['parameter'] == 'Potássio'
        assert critical_alert['message'] == 'Hipercalemia severa'

    def test_convert_analysis_empty_results(self):
        """Test converting empty analysis results."""
        empty_results = {}
        alerts = AlertSystem._convert_analysis_to_alerts(empty_results, 'Test Category')
        assert len(alerts) == 0
        
        # Only interpretation, no abnormalities
        interp_only = {
            'interpretation': 'Normal results',
            'severity': 'normal'
        }
        alerts = AlertSystem._convert_analysis_to_alerts(interp_only, 'Test Category')
        assert len(alerts) == 1
        assert alerts[0]['parameter'] == 'Geral'
        assert alerts[0]['severity'] == 'normal'

    @patch('utils.alert_system.analisar_funcao_hepatica')
    @patch('utils.alert_system.analisar_funcao_renal')
    def test_generate_alerts(self, mock_renal, mock_hepatic):
        """Test the generate_alerts method with mocked analyzers."""
        # Setup mock returns
        mock_hepatic.return_value = {
            'abnormalities': [
                {
                    'parameter': 'TGO',
                    'message': 'TGO elevado',
                    'value': 100,
                    'reference': '5-40 U/L',
                    'severity': 'moderate',
                    'interpretation': 'Alteração hepática'
                }
            ],
            'severity': 'moderate'
        }
        
        mock_renal.return_value = {
            'abnormalities': [
                {
                    'parameter': 'Creatinina',
                    'message': 'Creatinina elevada',
                    'value': 3.0,
                    'reference': '0.6-1.2 mg/dL',
                    'severity': 'severe',
                    'interpretation': 'Disfunção renal importante'
                }
            ],
            'severity': 'severe',
            'critical_conditions': [
                {
                    'parameter': 'Insuficiência Renal',
                    'description': 'Insuficiência renal aguda',
                    'action': 'Necessário diálise'
                }
            ]
        }
        
        # Create test exams
        exams = [
            {"test": "TGO", "value": 100, "unit": "U/L"},
            {"test": "Creatinina", "value": 3.0, "unit": "mg/dL"}
        ]
        
        # Generate alerts
        alerts = AlertSystem.generate_alerts(exams)
        
        # Verify alerts
        assert len(alerts) == 3  # 1 hepatic abnormality + 1 renal abnormality + 1 renal critical condition
        
        # Check that alerts are sorted by severity (critical > severe > moderate)
        assert alerts[0]['severity'] == 'critical'
        assert alerts[1]['severity'] == 'severe'
        assert alerts[2]['severity'] == 'moderate'
        
        # Verify mocks were called with correct data
        mock_hepatic.assert_called_once()
        mock_renal.assert_called_once()

    def test_generate_alerts_empty_input(self):
        """Test generating alerts with empty input."""
        alerts = AlertSystem.generate_alerts([])
        assert len(alerts) == 0

    def test_generate_alerts_with_only_uncategorized_exams(self):
        """Test generating alerts with only exams that don't fall into any category."""
        exams = [
            {"test": "Unknown Test 1", "value": 100, "unit": "units"},
            {"test": "Unknown Test 2", "value": 200, "unit": "units"}
        ]
        
        alerts = AlertSystem.generate_alerts(exams)
        # Should not generate any alerts since no analyzers would be called
        assert len(alerts) == 0

    def test_organize_exams_by_type_partial_categorization(self):
        """Test organizing exams with some uncategorized exams."""
        exams = [
            {"test": "TGO", "value": 45, "unit": "U/L"},
            {"test": "Unknown Test", "value": 123, "unit": "unknown"},
            {"test": "Glicose", "value": 100, "unit": "mg/dL"}
        ]
        
        organized = AlertSystem._organize_exams_by_type(exams)
        
        # Verify correct categorization
        assert len(organized["hepatic"]) == 1  # TGO
        assert len(organized["metabolic"]) == 1  # Glicose
        assert len(organized["other"]) == 1  # Unknown Test
        
        # Make sure the unknown test is properly placed in "other"
        assert organized["other"][0]["test"] == "Unknown Test"

    def test_convert_analysis_to_alerts_missing_fields(self):
        """Test converting analysis results with missing fields in abnormalities."""
        analysis_results = {
            'abnormalities': [
                {
                    'parameter': 'Test Parameter',
                    # Missing message, value, reference, etc.
                    'severity': 'warning'
                },
                {
                    # Missing parameter
                    'message': 'Test Message',
                    'value': 100,
                    'severity': 'info'
                }
            ]
        }
        
        alerts = AlertSystem._convert_analysis_to_alerts(analysis_results, 'Test Category')
        
        # Should still generate 2 alerts with default values for missing fields
        assert len(alerts) == 2
        
        # First alert should have the parameter but default message
        assert alerts[0]['parameter'] == 'Test Parameter'
        assert alerts[0]['message'] == ''
        assert alerts[0]['value'] == ''
        assert alerts[0]['severity'] == 'warning'
        
        # Second alert should have default parameter name
        assert alerts[1]['parameter'] == 'Não especificado'
        assert alerts[1]['message'] == 'Test Message'
        assert alerts[1]['value'] == 100
        assert alerts[1]['severity'] == 'info' 