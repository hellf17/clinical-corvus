"""
Tests for the complete alert system workflow.
Validates the end-to-end alert generation process across multiple analyzers.
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

class TestAlertWorkflow:
    """Test the complete alert system workflow."""
    
    @patch('utils.alert_system.analisar_funcao_hepatica')
    @patch('utils.alert_system.analisar_funcao_renal')
    @patch('utils.alert_system.analisar_hematologia')
    @patch('utils.alert_system.analisar_gasometria')
    @patch('utils.alert_system.analisar_eletroliticos')
    def test_complete_alert_generation_workflow(
        self, 
        mock_eletroliticos, 
        mock_gasometria, 
        mock_hematologia, 
        mock_renal, 
        mock_hepatica
    ):
        """Test the complete alert generation workflow with multiple analyzers."""
        # Setup mixed set of test results across different types
        exams = [
            {"test": "TGO", "value": 120, "unit": "U/L", "reference": "5-40", "type": "hepatic"},
            {"test": "TGP", "value": 150, "unit": "U/L", "reference": "7-56", "type": "hepatic"},
            {"test": "Creatinina", "value": 2.1, "unit": "mg/dL", "reference": "0.6-1.2", "type": "renal"},
            {"test": "Uréia", "value": 80, "unit": "mg/dL", "reference": "15-40", "type": "renal"},
            {"test": "Hemoglobina", "value": 9.0, "unit": "g/dL", "reference": "12-16", "type": "hematology"},
            {"test": "Leucócitos", "value": 15000, "unit": "/mm³", "reference": "4000-10000", "type": "hematology"},
            {"test": "pH", "value": 7.25, "unit": "", "reference": "7.35-7.45", "type": "blood_gases"},
            {"test": "pO2", "value": 65, "unit": "mmHg", "reference": "80-100", "type": "blood_gases"},
            {"test": "Sódio", "value": 130, "unit": "mEq/L", "reference": "135-145", "type": "electrolytes"},
            {"test": "Potássio", "value": 5.8, "unit": "mEq/L", "reference": "3.5-5.0", "type": "electrolytes"},
        ]
        
        # Configure mock returns for each analyzer
        mock_hepatica.return_value = {
            'abnormalities': [
                {
                    'parameter': 'TGO',
                    'message': 'TGO elevado (120 U/L)',
                    'value': 120,
                    'reference': '5-40 U/L',
                    'severity': 'moderate',
                    'interpretation': 'Elevação moderada de enzimas hepáticas'
                },
                {
                    'parameter': 'TGP',
                    'message': 'TGP elevado (150 U/L)',
                    'value': 150,
                    'reference': '7-56 U/L',
                    'severity': 'moderate',
                    'interpretation': 'Elevação moderada de enzimas hepáticas'
                }
            ],
            'interpretation': 'Alterações sugestivas de lesão hepatocelular',
            'severity': 'moderate'
        }
        
        mock_renal.return_value = {
            'abnormalities': [
                {
                    'parameter': 'Creatinina',
                    'message': 'Creatinina elevada (2.1 mg/dL)',
                    'value': 2.1,
                    'reference': '0.6-1.2 mg/dL',
                    'severity': 'severe',
                    'interpretation': 'Disfunção renal importante'
                },
                {
                    'parameter': 'Uréia',
                    'message': 'Uréia elevada (80 mg/dL)',
                    'value': 80,
                    'reference': '15-40 mg/dL',
                    'severity': 'moderate',
                    'interpretation': 'Elevação de escórias nitrogenadas'
                }
            ],
            'interpretation': 'Achados compatíveis com lesão renal aguda',
            'severity': 'severe',
            'critical_conditions': [
                {
                    'parameter': 'Lesão Renal Aguda',
                    'description': 'Creatinina >1.5x o valor basal',
                    'action': 'Avaliar função renal com urgência'
                }
            ]
        }
        
        mock_hematologia.return_value = {
            'abnormalities': [
                {
                    'parameter': 'Hemoglobina',
                    'message': 'Hemoglobina reduzida (9.0 g/dL)',
                    'value': 9.0,
                    'reference': '12-16 g/dL',
                    'severity': 'moderate',
                    'interpretation': 'Anemia moderada'
                },
                {
                    'parameter': 'Leucócitos',
                    'message': 'Leucocitose (15000 /mm³)',
                    'value': 15000,
                    'reference': '4000-10000 /mm³',
                    'severity': 'moderate',
                    'interpretation': 'Leucocitose moderada'
                }
            ],
            'interpretation': 'Anemia moderada com leucocitose',
            'severity': 'moderate'
        }
        
        mock_gasometria.return_value = {
            'abnormalities': [
                {
                    'parameter': 'pH',
                    'message': 'pH reduzido (7.25)',
                    'value': 7.25,
                    'reference': '7.35-7.45',
                    'severity': 'moderate',
                    'interpretation': 'Acidemia'
                },
                {
                    'parameter': 'pO2',
                    'message': 'pO2 reduzido (65 mmHg)',
                    'value': 65,
                    'reference': '80-100 mmHg',
                    'severity': 'moderate',
                    'interpretation': 'Hipoxemia'
                }
            ],
            'interpretation': 'Acidose metabólica com hipoxemia',
            'severity': 'severe'
        }
        
        mock_eletroliticos.return_value = {
            'abnormalities': [
                {
                    'parameter': 'Sódio',
                    'message': 'Sódio reduzido (130 mEq/L)',
                    'value': 130,
                    'reference': '135-145 mEq/L',
                    'severity': 'mild',
                    'interpretation': 'Hiponatremia leve'
                },
                {
                    'parameter': 'Potássio',
                    'message': 'Potássio elevado (5.8 mEq/L)',
                    'value': 5.8,
                    'reference': '3.5-5.0 mEq/L',
                    'severity': 'severe',
                    'interpretation': 'Hipercalemia significativa'
                }
            ],
            'interpretation': 'Distúrbios eletrolíticos mistos',
            'severity': 'severe',
            'critical_conditions': [
                {
                    'parameter': 'Hipercalemia',
                    'description': 'Potássio >5.5 mEq/L',
                    'action': 'Monitorar ECG e considerar medidas para redução do potássio'
                }
            ]
        }
        
        # Generate alerts
        alerts = AlertSystem.generate_alerts(exams)
        
        # Verify total alerts (expect at least 10 abnormalities + 2 critical + some interpretations)
        assert len(alerts) >= 12
        
        # Verify that all analyzer methods were called
        mock_hepatica.assert_called_once()
        mock_renal.assert_called_once()
        mock_hematologia.assert_called_once()
        mock_gasometria.assert_called_once()
        mock_eletroliticos.assert_called_once()
        
        # Verify critical alerts are at the top (should be sorted by severity)
        assert alerts[0]['severity'] == 'critical'
        assert alerts[1]['severity'] == 'critical'
        
        # Verify that severe alerts come before moderate ones
        severe_indices = [i for i, alert in enumerate(alerts) if alert['severity'] == 'severe']
        moderate_indices = [i for i, alert in enumerate(alerts) if alert['severity'] == 'moderate']
        if severe_indices and moderate_indices:
            assert min(severe_indices) < min(moderate_indices)
        
        # Verify presence of key alerts
        alert_parameters = [alert['parameter'] for alert in alerts]
        
        # Critical conditions
        assert 'Lesão Renal Aguda' in alert_parameters
        assert 'Hipercalemia' in alert_parameters
        
        # Key abnormalities
        assert 'Creatinina' in alert_parameters
        assert 'Potássio' in alert_parameters
        assert 'pH' in alert_parameters
        assert 'TGO' in alert_parameters
        assert 'Hemoglobina' in alert_parameters
    
    @patch('utils.alert_system.analisar_funcao_renal')
    @patch('utils.alert_system.analisar_hematologia')
    def test_workflow_with_partial_analyzers(self, mock_hematologia, mock_renal):
        """Test the alert workflow when only a subset of analyzers receive inputs."""
        # Only provide renal and hematology exams
        exams = [
            {"test": "Creatinina", "value": 1.8, "unit": "mg/dL", "type": "renal"},
            {"test": "Hemoglobina", "value": 9.5, "unit": "g/dL", "type": "hematology"},
            {"test": "Plaquetas", "value": 80000, "unit": "/mm³", "type": "hematology"}
        ]
        
        # Configure mock returns
        mock_renal.return_value = {
            'abnormalities': [
                {
                    'parameter': 'Creatinina',
                    'message': 'Creatinina elevada (1.8 mg/dL)',
                    'value': 1.8,
                    'reference': '0.6-1.2 mg/dL',
                    'severity': 'moderate',
                    'interpretation': 'Disfunção renal moderada'
                }
            ],
            'interpretation': 'Alteração sugestiva de disfunção renal',
            'severity': 'moderate'
        }
        
        mock_hematologia.return_value = {
            'abnormalities': [
                {
                    'parameter': 'Hemoglobina',
                    'message': 'Hemoglobina reduzida (9.5 g/dL)',
                    'value': 9.5,
                    'reference': '12-16 g/dL',
                    'severity': 'moderate',
                    'interpretation': 'Anemia moderada'
                },
                {
                    'parameter': 'Plaquetas',
                    'message': 'Plaquetas reduzidas (80000 /mm³)',
                    'value': 80000,
                    'reference': '150000-450000 /mm³',
                    'severity': 'moderate',
                    'interpretation': 'Trombocitopenia moderada'
                }
            ],
            'interpretation': 'Anemia com trombocitopenia',
            'severity': 'moderate'
        }
        
        # Generate alerts
        alerts = AlertSystem.generate_alerts(exams)
        
        # Verify the number of alerts (3 abnormalities)
        assert len(alerts) >= 3
        
        # Verify only the mocked analyzers were called
        mock_renal.assert_called_once()
        mock_hematologia.assert_called_once()
        
        # Verify presence of key alerts
        alert_parameters = [alert['parameter'] for alert in alerts]
        assert 'Creatinina' in alert_parameters
        assert 'Hemoglobina' in alert_parameters
        assert 'Plaquetas' in alert_parameters
        
        # Verify correct source identification
        for alert in alerts:
            if alert['parameter'] == 'Creatinina':
                assert alert['source'] == 'Função Renal'
            elif alert['parameter'] in ['Hemoglobina', 'Plaquetas']:
                assert alert['source'] == 'Hematologia'
    
    @patch('utils.alert_system.analisar_microbiologia')
    def test_workflow_with_critical_microbiology_results(self, mock_microbiologia):
        """Test the alert workflow with critical microbiology results."""
        # Provide microbiology exams
        exams = [
            {"test": "Hemocultura", "value": "Positivo - Klebsiella pneumoniae multirresistente", "type": "microbiology"},
            {"test": "Antibiótico", "value": "Meropenem - R, Colistina - S", "type": "microbiology"}
        ]
        
        # Configure mock return with critical condition
        mock_microbiologia.return_value = {
            'abnormalities': [
                {
                    'parameter': 'Hemocultura',
                    'message': 'Hemocultura positiva para Klebsiella pneumoniae multirresistente',
                    'value': 'Positivo - Klebsiella pneumoniae multirresistente',
                    'reference': 'Negativo',
                    'severity': 'critical',
                    'interpretation': 'Infecção por germe multirresistente'
                },
                {
                    'parameter': 'Sensibilidade Antibiótica',
                    'message': 'Resistência a carbapenêmicos',
                    'value': 'Meropenem - R, Colistina - S',
                    'reference': 'Sensível aos antimicrobianos de primeira linha',
                    'severity': 'severe',
                    'interpretation': 'Resistência a múltiplos antibióticos'
                }
            ],
            'interpretation': 'Bacteremia por Klebsiella pneumoniae multirresistente',
            'severity': 'critical',
            'critical_conditions': [
                {
                    'parameter': 'Infecção Multirresistente',
                    'description': 'Klebsiella pneumoniae produtora de carbapenemase',
                    'action': 'Isolamento de contato, consulta com infectologia, ajuste de antibioticoterapia'
                }
            ]
        }
        
        # Generate alerts
        alerts = AlertSystem.generate_alerts(exams)
        
        # Verify the number of alerts (2 abnormalities + 1 critical + 1 interpretation)
        assert len(alerts) >= 4
        
        # Verify the microbiologia analyzer was called
        mock_microbiologia.assert_called_once()
        
        # Verify critical alert is first
        assert alerts[0]['severity'] == 'critical'
        # Check for the critical condition somewhere in the alerts
        critical_alerts = [alert for alert in alerts if 'Infecção Multirresistente' in alert.get('parameter', '')]
        assert len(critical_alerts) > 0
        
        # Verify presence of key alerts
        alert_parameters = [alert['parameter'] for alert in alerts]
        assert 'Hemocultura' in alert_parameters
        assert 'Sensibilidade Antibiótica' in alert_parameters
        
        # Check the alert recommendation includes specific action
        critical_alert = next(a for a in alerts if a['parameter'] == 'Infecção Multirresistente')
        assert 'isolamento' in critical_alert['recommendation'].lower()
        assert 'infectologia' in critical_alert['recommendation'].lower()
    
    def test_alert_system_with_empty_exams(self):
        """Test the alert system with empty exam list."""
        # Generate alerts with empty list
        alerts = AlertSystem.generate_alerts([])
        
        # Should return empty list
        assert alerts == []
        
    def test_alert_system_with_uncategorized_exams(self):
        """Test the alert system with exams that don't match any category."""
        # Provide exams without recognized types
        exams = [
            {"test": "Teste Personalizado", "value": "45", "unit": "U/L"},
            {"test": "Exame Desconhecido", "value": "Normal", "unit": ""}
        ]
        
        # Generate alerts
        alerts = AlertSystem.generate_alerts(exams)
        
        # Should return empty list since no analyzer will process these exams
        assert alerts == [] 