"""
Tests for advanced features of the alert system.
This file focuses on testing advanced alert system functionalities, 
such as complex alert prioritization, integration with severity scores,
and handling of edge cases not covered in the main test files.
"""

import pytest
import sys
import os
from unittest.mock import patch, MagicMock

# Add the root directory to the Python path
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import the AlertSystem and severity scores
from utils.alert_system import AlertSystem
from utils.severity_scores import calcular_sofa, calcular_qsofa

class TestAlertSystemAdvanced:
    """Test advanced features of the alert system."""
    
    def test_mixed_severity_prioritization(self):
        """Test that alerts are properly prioritized by severity across different categories."""
        # Create a mixed set of abnormalities with different severities
        mixed_analysis = {
            'abnormalities': [
                {
                    'parameter': 'Potássio',
                    'message': 'Hipercalemia severa (K=6.8 mEq/L)',
                    'value': 6.8,
                    'reference': '3.5-5.0 mEq/L',
                    'severity': 'critical',
                    'interpretation': 'Risco de arritmias',
                    'recommendation': 'Tratamento imediato'
                },
                {
                    'parameter': 'Creatinina',
                    'message': 'Creatinina elevada (2.8 mg/dL)',
                    'value': 2.8,
                    'reference': '0.6-1.2 mg/dL',
                    'severity': 'severe',
                    'interpretation': 'Disfunção renal importante',
                    'recommendation': 'Monitorar função renal'
                },
                {
                    'parameter': 'Ureia',
                    'message': 'Ureia elevada (85 mg/dL)',
                    'value': 85,
                    'reference': '15-40 mg/dL',
                    'severity': 'moderate',
                    'interpretation': 'Elevação moderada de escórias nitrogenadas',
                    'recommendation': 'Considerar causas de aumento'
                },
                {
                    'parameter': 'Sódio',
                    'message': 'Sódio levemente reduzido (133 mEq/L)',
                    'value': 133,
                    'reference': '135-145 mEq/L',
                    'severity': 'mild',
                    'interpretation': 'Hiponatremia leve',
                    'recommendation': 'Observar'
                }
            ],
            'interpretation': 'Alterações eletrolíticas e função renal alterada',
            'severity': 'severe',
        }
        
        alerts = AlertSystem._convert_analysis_to_alerts(mixed_analysis, 'Função Renal')
        
        # Get the alert severities in order
        severity_order = ['critical', 'severe', 'moderate', 'mild', 'info', 'normal']
        alerts_by_severity = {}
        
        # Group alerts by severity
        for severity in severity_order:
            alerts_by_severity[severity] = [a for a in alerts if a['severity'] == severity]
        
        # Verify that at least one critical alert exists
        assert len(alerts_by_severity['critical']) > 0
        
        # Verify that alerts with different severities exist
        assert len(set(alert['severity'] for alert in alerts)) >= 3
        
        # Verify the first alert is critical
        assert alerts[0]['severity'] == 'critical'
        
        # Verify that severe alerts come before moderate alerts
        if alerts_by_severity['severe'] and alerts_by_severity['moderate']:
            severe_pos = min(i for i, a in enumerate(alerts) if a['severity'] == 'severe')
            moderate_pos = min(i for i, a in enumerate(alerts) if a['severity'] == 'moderate')
            assert severe_pos < moderate_pos
    
    def test_alert_generation_with_empty_analyzers(self):
        """Test alert generation when some analyzers return empty or minimal results."""
        @patch('utils.alert_system.analisar_funcao_hepatica')
        @patch('utils.alert_system.analisar_funcao_renal')
        def test_with_mocks(mock_renal, mock_hepatic):
            # Hepatic analyzer returns empty results
            mock_hepatic.return_value = {}
            
            # Renal analyzer returns minimal results
            mock_renal.return_value = {
                'interpretation': 'Função renal normal',
                'severity': 'normal'
            }
            
            # Create test exams
            exams = [
                {"test": "TGO", "value": 30, "unit": "U/L", "type": "hepatic"},
                {"test": "Creatinina", "value": 0.9, "unit": "mg/dL", "type": "renal"}
            ]
            
            # Generate alerts
            alerts = AlertSystem.generate_alerts(exams)
            
            # Verify only one alert from renal (interpretation) and none from hepatic
            assert len(alerts) == 1
            assert alerts[0]['category'] == 'Função Renal'
            assert alerts[0]['severity'] == 'normal'
            
            # Verify both analyzers were called
            mock_hepatic.assert_called_once()
            mock_renal.assert_called_once()
        
        # Run the test
        test_with_mocks()
    
    def test_alert_system_with_unusual_exams(self):
        """Test alert system with unusual exam formats and edge cases."""
        # Create unusual exam formats
        unusual_exams = [
            # Exam with very long name
            {"test": "Supercalifragilisticexpialidocious Test", "value": 100, "unit": "U/L"},
            
            # Exam with no value
            {"test": "Missing Value Test", "unit": "mg/dL"},
            
            # Exam with no unit
            {"test": "No Unit Test", "value": 50},
            
            # Exam with empty strings
            {"test": "", "value": "", "unit": "", "type": ""},
            
            # Exam with unusual characters
            {"test": "Special@#$%^&*()Test", "value": 123, "unit": "!@#"},
            
            # Exam with extremely large value
            {"test": "Large Value", "value": 9999999999, "unit": "cells/mm³"},
            
            # Exam with unusual type
            {"test": "Unknown Category", "value": 42, "unit": "X", "type": "unknown_category"}
        ]
        
        # The alert system should handle these gracefully without errors
        try:
            alerts = AlertSystem.generate_alerts(unusual_exams)
            # Success if no exceptions
            handled_unusual_exams = True
        except Exception as e:
            handled_unusual_exams = False
            pytest.fail(f"AlertSystem failed to handle unusual exams: {e}")
        
        # Verify function executed without errors
        assert handled_unusual_exams
        
        # The unknown category items should be categorized as "other"
        unusual_exam_types = AlertSystem._organize_exams_by_type(unusual_exams)
        assert "other" in unusual_exam_types
        assert len(unusual_exam_types["other"]) > 0
    
    def test_integration_with_custom_analyzers(self):
        """Test integration with custom analyzers that were not anticipated when alert system was built."""
        def mock_custom_analyzer(exams):
            """Mock a custom analyzer that wasn't initially part of the alert system."""
            return {
                'abnormalities': [
                    {
                        'parameter': 'Custom Parameter',
                        'message': 'Custom message',
                        'value': 42,
                        'reference': '0-10',
                        'severity': 'warning',
                        'interpretation': 'Custom interpretation',
                        'recommendation': 'Custom recommendation'
                    }
                ],
                'interpretation': 'Custom overall interpretation',
                'severity': 'warning'
            }
        
        # Create a patcher for a custom analyzer
        with patch.dict('utils.alert_system.__dict__', {'analisar_custom': mock_custom_analyzer}):
            with patch.object(AlertSystem, '_organize_exams_by_type') as mock_organize:
                # Configure _organize_exams_by_type to return exams for our custom analyzer
                mock_organize.return_value = {
                    'custom': [{"test": "Custom Test", "value": 42, "unit": "X"}]
                }
                
                # Create test exams (content doesn't matter since we're mocking _organize_exams_by_type)
                exams = [{"test": "Custom Test", "value": 42, "unit": "X"}]
                
                # Try to generate alerts
                try:
                    alerts = AlertSystem.generate_alerts(exams)
                    custom_analyzer_handled = True
                except Exception:
                    custom_analyzer_handled = False
                
                # If the alert system doesn't have automatic discovery of analyzers,
                # this test will fail and indicate an improvement area
                assert custom_analyzer_handled, "Alert system should gracefully handle unknown analyzer types"
    
    def test_alert_system_with_conflicting_severity_mappings(self):
        """Test alert system with conflicting severity mappings from different analyzers."""
        # Create analysis results with conflicting severity descriptions
        hepatic_results = {
            'abnormalities': [
                {
                    'parameter': 'TGO',
                    'message': 'TGO elevado (150 U/L)',
                    'value': 150,
                    'reference': '5-40 U/L',
                    'severity': 'high',  # Non-standard severity name
                    'interpretation': 'Elevação significativa de enzimas hepáticas'
                }
            ],
            'interpretation': 'Alterações hepáticas significativas',
            'severity': 'high'  # Non-standard severity name
        }
        
        renal_results = {
            'abnormalities': [
                {
                    'parameter': 'Creatinina',
                    'message': 'Creatinina elevada (2.5 mg/dL)',
                    'value': 2.5,
                    'reference': '0.6-1.2 mg/dL',
                    'severity': 'RED',  # Non-standard severity name
                    'interpretation': 'Disfunção renal importante'
                }
            ],
            'interpretation': 'Alteração importante da função renal',
            'severity': 'RED'  # Non-standard severity name
        }
        
        # Convert to alerts
        hepatic_alerts = AlertSystem._convert_analysis_to_alerts(hepatic_results, 'Função Hepática')
        renal_alerts = AlertSystem._convert_analysis_to_alerts(renal_results, 'Função Renal')
        
        # Combine alerts
        all_alerts = hepatic_alerts + renal_alerts
        
        # Sort alerts by severity
        sorted_alerts = sorted(
            all_alerts,
            key=lambda x: AlertSystem._severity_to_number(x['severity']),
            reverse=True
        )
        
        # With our new mapping, 'high' maps to 'moderate' (3) and 'RED' maps to 'severe' (4)
        # So we should actually see RED alerts before high alerts
        red_alerts = [a for a in sorted_alerts if a['severity'].lower() == 'red']
        high_alerts = [a for a in sorted_alerts if a['severity'].lower() == 'high']
        
        if red_alerts and high_alerts:
            red_position = min(i for i, a in enumerate(sorted_alerts) if a['severity'].lower() == 'red')
            high_position = min(i for i, a in enumerate(sorted_alerts) if a['severity'].lower() == 'high')
            
            # RED should come before high based on our mapping
            assert red_position < high_position, "Mapped severity 'RED' should come before 'high'"
    
    def test_integrate_severity_scores_with_alerts(self):
        """Test integration of severity score calculations with alert generation."""
        # Calculate a SOFA score
        sofa_params = {
            'pao2': 70,
            'fio2': 0.8,
            'plaquetas': 80,
            'bilirrubina': 3.5,
            'pas': 80,
            'pad': 50,
            'aminas': True,
            'dopamina': 6,
            'glasgow': 11,
            'creatinina': 2.8,
        }
        
        sofa_score, sofa_components, sofa_interp = calcular_sofa(sofa_params)
        
        # Calculate a qSOFA score
        qsofa_params = {
            'glasgow': 13,
            'fr': 25,
            'pas': 95
        }
        
        qsofa_score, qsofa_interp = calcular_qsofa(qsofa_params)
        
        # Create exams that include results from these scores
        exams = [
            # Regular lab values
            {"test": "Creatinina", "value": 2.8, "unit": "mg/dL", "type": "renal"},
            {"test": "Bilirrubina", "value": 3.5, "unit": "mg/dL", "type": "hepatic"},
            
            # Add severity scores as exams
            {"test": "SOFA Score", "value": sofa_score, "unit": "points", "type": "score"},
            {"test": "SOFA Renal", "value": sofa_components['renal'], "unit": "points", "type": "score"},
            {"test": "SOFA Respiratory", "value": sofa_components['respiratorio'], "unit": "points", "type": "score"},
            
            {"test": "qSOFA Score", "value": qsofa_score, "unit": "points", "type": "score"}
        ]
        
        # Generate alerts from these exams
        all_alerts = []
        
        # Mock analyzers to add alerts from severity scores
        with patch('utils.alert_system.analisar_funcao_renal') as mock_renal, \
             patch('utils.alert_system.analisar_funcao_hepatica') as mock_hepatic:
            
            # Setup mock returns
            mock_renal.return_value = {
                'abnormalities': [
                    {
                        'parameter': 'Creatinina',
                        'message': 'Creatinina elevada (2.8 mg/dL)',
                        'value': 2.8,
                        'reference': '0.6-1.2 mg/dL',
                        'severity': 'severe',
                        'interpretation': 'Disfunção renal importante'
                    }
                ],
                'interpretation': 'Alteração importante da função renal',
                'severity': 'severe'
            }
            
            mock_hepatic.return_value = {
                'abnormalities': [
                    {
                        'parameter': 'Bilirrubina',
                        'message': 'Bilirrubina elevada (3.5 mg/dL)',
                        'value': 3.5,
                        'reference': '0.3-1.2 mg/dL',
                        'severity': 'moderate',
                        'interpretation': 'Alteração da função hepática'
                    }
                ],
                'interpretation': 'Alterações hepáticas moderadas',
                'severity': 'moderate'
            }
            
            # Generate alerts from regular exams
            regular_alerts = AlertSystem.generate_alerts(exams)
            all_alerts.extend(regular_alerts)
        
        # Create alerts from severity scores
        sofa_analysis = {
            'abnormalities': [
                {
                    'parameter': 'SOFA Score',
                    'message': f'SOFA Total: {sofa_score}',
                    'value': sofa_score,
                    'reference': '0 (normal)',
                    'severity': 'critical' if sofa_score > 11 else 'severe' if sofa_score > 8 else 'moderate',
                    'interpretation': sofa_interp[0]
                }
            ],
            'interpretation': sofa_interp[0],
            'severity': 'critical' if sofa_score > 11 else 'severe' if sofa_score > 8 else 'moderate'
        }
        
        qsofa_analysis = {
            'abnormalities': [
                {
                    'parameter': 'qSOFA Score',
                    'message': f'qSOFA: {qsofa_score}/3',
                    'value': qsofa_score,
                    'reference': '0 (normal)',
                    'severity': 'critical' if qsofa_score >= 2 else 'warning',
                    'interpretation': qsofa_interp[0]
                }
            ],
            'interpretation': qsofa_interp[0],
            'severity': 'critical' if qsofa_score >= 2 else 'warning'
        }
        
        sofa_alerts = AlertSystem._convert_analysis_to_alerts(sofa_analysis, 'SOFA Score')
        qsofa_alerts = AlertSystem._convert_analysis_to_alerts(qsofa_analysis, 'qSOFA Score')
        
        all_alerts.extend(sofa_alerts)
        all_alerts.extend(qsofa_alerts)
        
        # Sort all alerts by severity
        sorted_alerts = sorted(
            all_alerts, 
            key=lambda x: AlertSystem._severity_to_number(x['severity']), 
            reverse=True
        )
        
        # Verify that severity score alerts are properly integrated and prioritized
        sofa_alert_position = next((i for i, alert in enumerate(sorted_alerts) 
                                   if alert['parameter'] == 'SOFA Score'), -1)
        qsofa_alert_position = next((i for i, alert in enumerate(sorted_alerts) 
                                    if alert['parameter'] == 'qSOFA Score'), -1)
        
        # Verify that the SOFA and qSOFA alerts exist
        assert sofa_alert_position >= 0, "SOFA score alert not found"
        assert qsofa_alert_position >= 0, "qSOFA score alert not found"
        
        # Verify that critical or severe alerts are near the top
        if sofa_score > 8 or qsofa_score >= 2:  # These would be critical or severe
            assert min(sofa_alert_position, qsofa_alert_position) < 3, "Critical severity scores should be prioritized"

    def test_alert_system_handling_of_null_values(self):
        """Test how the alert system handles null values in exam data."""
        # Create exams with null values
        null_exams = [
            {"test": "Test with None", "value": None, "unit": "mg/dL"},
            {"test": "Test with null", "value": "null", "unit": "U/L"},
            {"test": "Test with empty string", "value": "", "unit": "mmol/L"}
        ]
        
        # The alert system should handle these gracefully
        try:
            results = AlertSystem._organize_exams_by_type(null_exams)
            # Test passes if no exception is raised
            null_handled = True
        except Exception:
            null_handled = False
        
        assert null_handled, "Alert system should handle null values gracefully"
        
        # These should be categorized as "other" since they have no recognizable type
        assert "other" in results
        assert len(results["other"]) == len(null_exams) 