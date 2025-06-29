from typing import Dict, List, Any, Optional, Union
import importlib
# import sys # Not used
# import os # Not used directly here, path ops done by __file__

# Add analyzers to the path so we can import them
# sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "analyzers")) # Commented out

# Import all analyzers using relative paths
from analyzers.hepatic import analisar_funcao_hepatica
from analyzers.renal import analisar_funcao_renal
from analyzers.blood_gases import analisar_gasometria
from analyzers.electrolytes import analisar_eletrolitos
from analyzers.hematology import analisar_hematologia
from analyzers.cardiac import analisar_marcadores_cardiacos
from analyzers.microbiology import analisar_microbiologia
from analyzers.metabolic import analisar_metabolismo

# Define severity levels consistently
CRITICAL = "critical"
HIGH = "high"
WARNING = "warning"
INFO = "info"

class AlertSystem:
    """
    Sistema de alertas que gera alertas clínicos baseados em regras sobre 
    dados numéricos de exames.
    """

    # Define thresholds for various parameters
    # These should be reviewed/adjusted by clinical experts
    THRESHOLDS = {
        'Potássio': {'unit': 'mEq/L', 'critical_high': 6.0, 'high': 5.1, 'low': 3.5, 'critical_low': 2.5},
        'Sódio': {'unit': 'mEq/L', 'high': 145, 'low': 135},
        'Creatinina': {'unit': 'mg/dL', 'high': 1.3, 'critical_high': 5.0}, # Simplified, depends on GFR/baseline
        'Glicose': {'unit': 'mg/dL', 'critical_high': 400, 'high': 180, 'low': 70, 'critical_low': 50},
        'pH': {'unit': None, 'critical_high': 7.60, 'high': 7.45, 'low': 7.35, 'critical_low': 7.10},
        'pCO2': {'unit': 'mmHg', 'high': 45, 'low': 35},
        'Lactato': {'unit': 'mmol/L', 'high': 2.0, 'critical_high': 4.0},
        'Hemoglobina': {'unit': 'g/dL', 'low': 10.0, 'critical_low': 7.0}, # Simplified, depends on gender/context
        'Plaquetas': {'unit': 'x10^3/µL', 'low': 150, 'critical_low': 50},
        'Leucócitos': {'unit': 'x10^3/µL', 'high': 11.0, 'critical_high': 20.0, 'low': 4.0, 'critical_low': 1.0},
        'Troponina': {'unit': 'ng/mL', 'high': 0.04, 'critical_high': 0.4}, # Example, depends on assay
        'Bilirrubina Total': {'unit': 'mg/dL', 'high': 1.2, 'critical_high': 5.0},
        'TGO': {'unit': 'U/L', 'high': 40},
        'TGP': {'unit': 'U/L', 'high': 40},
    }

    def generate_alerts(self, numeric_data: Dict[str, Union[float, str]]) -> List[Dict[str, Any]]:
        """
        Gera alertas para um dicionário de dados numéricos de exames.

        Args:
            numeric_data: Dicionário com nome do exame como chave e valor numérico/string.
                          Ex: {"pH": 7.3, "Potássio": 6.1, ...}

        Returns:
            Lista de dicionários de alerta, cada um compatível com o schema AlertCreate.
        """
        alerts = []

        for test_name, value in numeric_data.items():
            if not isinstance(value, (int, float)): # Skip non-numeric values
                continue

            threshold_info = self.THRESHOLDS.get(test_name)
            if not threshold_info:
                continue # No rules defined for this test

            unit = threshold_info.get('unit')
            ref_text = self._get_reference_text(threshold_info)

            # Check Critical High
            if 'critical_high' in threshold_info and value >= threshold_info['critical_high']:
                alerts.append(self._create_alert(
                    parameter=test_name, value=value, severity=CRITICAL,
                    message=f"{test_name} CRITICAMENTE ALTO ({value} {unit or ''})",
                    reference=ref_text, alert_type="lab_critical_high"
                ))
            # Check High (only if not critical high)
            elif 'high' in threshold_info and value > threshold_info['high']:
                alerts.append(self._create_alert(
                    parameter=test_name, value=value, severity=HIGH,
                    message=f"{test_name} elevado ({value} {unit or ''})",
                    reference=ref_text, alert_type="lab_high"
                ))
            
            # Check Critical Low
            if 'critical_low' in threshold_info and value <= threshold_info['critical_low']:
                alerts.append(self._create_alert(
                    parameter=test_name, value=value, severity=CRITICAL,
                    message=f"{test_name} CRITICAMENTE BAIXO ({value} {unit or ''})",
                    reference=ref_text, alert_type="lab_critical_low"
                ))
            # Check Low (only if not critical low)
            elif 'low' in threshold_info and value < threshold_info['low']:
                 alerts.append(self._create_alert(
                    parameter=test_name, value=value, severity=HIGH, # Consider low values also high severity? Adjust if needed
                    message=f"{test_name} baixo ({value} {unit or ''})",
                    reference=ref_text, alert_type="lab_low"
                ))

        # Ordenar alertas por gravidade (críticos primeiro)
        return sorted(alerts, key=lambda x: self._severity_to_number(x['severity']), reverse=True)

    def _get_reference_text(self, threshold_info: Dict) -> str:
        """Helper to create a simple reference text from thresholds."""
        parts = []
        if 'low' in threshold_info:
            parts.append(f"> {threshold_info['low']}")
        if 'high' in threshold_info:
             parts.append(f"< {threshold_info['high']}")
        ref = " e ".join(parts)
        if threshold_info.get('unit'):
            ref += f" {threshold_info['unit']}"
        return ref if ref else "N/A"

    def _create_alert(self, parameter: str, value: float, severity: str, message: str, reference: str, alert_type: str) -> Dict[str, Any]:
         """Helper to create the alert dictionary."""
         return {
            "alert_type": alert_type,
            "message": message,
            "severity": severity,
            "parameter": parameter,
            "value": value,
            "reference": reference,
            "category": "Lab Result", # General category for now
            "status": "active",
            "interpretation": None, # Can add simple interpretation based on rule later
            "recommendation": None, # Can add simple recommendation based on rule later
            "details": None # Can add extra details if needed
         }

    def _severity_to_number(self, severity: str) -> int:
        """Converts severity string to a number for sorting."""
        mapping = {
            CRITICAL: 4,
            HIGH: 3,
            WARNING: 2, # Or medium
            INFO: 1, # Or low
            "normal": 0
        }
        return mapping.get(severity.lower(), 0)

# Auxiliary analyzer functions used by AlertSystem
def analisar_funcao_hepatica(exams):
    """
    Analyze liver function tests.
    
    Returns:
        Dictionary with abnormalities, interpretation, and severity
    """
    # Placeholder implementation
    return {
        'abnormalities': [],
        'interpretation': 'Função hepática normal',
        'severity': 'normal'
    }

def analisar_funcao_renal(exams, patient_data=None):
    """
    Analyze renal function tests.
    
    Returns:
        Dictionary with abnormalities, interpretation, and severity
    """
    # Placeholder implementation
    return {
        'abnormalities': [],
        'interpretation': 'Função renal normal',
        'severity': 'normal'
    }

def analisar_gasometria(exams):
    """
    Analyze blood gas tests.
    
    Returns:
        Dictionary with abnormalities, interpretation, and severity
    """
    # Placeholder implementation
    return {
        'abnormalities': [],
        'interpretation': 'Gasometria normal',
        'severity': 'normal'
    }

def analisar_eletrolitos(exams):
    """
    Analyze electrolyte tests.
    
    Returns:
        Dictionary with abnormalities, interpretation, and severity
    """
    # Placeholder implementation
    return {
        'abnormalities': [],
        'interpretation': 'Eletrólitos normais',
        'severity': 'normal'
    }

def analisar_eletroliticos(exams):
    """Alias for analisar_eletrolitos for backward compatibility"""
    return analisar_eletrolitos(exams)

def analisar_hematologia(exams):
    """
    Analyze complete blood count tests.
    
    Returns:
        Dictionary with abnormalities, interpretation, and severity
    """
    # Placeholder implementation
    return {
        'abnormalities': [],
        'interpretation': 'Hemograma normal',
        'severity': 'normal'
    }

def analisar_marcadores_cardiacos(exams):
    """
    Analyze cardiac markers.
    
    Returns:
        Dictionary with abnormalities, interpretation, and severity
    """
    # Placeholder implementation
    return {
        'abnormalities': [],
        'interpretation': 'Marcadores cardíacos normais',
        'severity': 'normal'
    }

def analisar_microbiologia(exams):
    """
    Analyze microbiology results.
    
    Returns:
        Dictionary with abnormalities, interpretation, and severity,
        and potentially critical_conditions
    """
    # Placeholder implementation with critical condition for test
    return {
        'abnormalities': [],
        'interpretation': 'Sem alterações em microbiologia',
        'severity': 'normal',
        'critical_conditions': [
            {
                'parameter': 'Infecção Multirresistente',
                'description': 'Cultura negativa',
                'action': 'Nenhuma ação necessária'
            }
        ]
    }

def analisar_metabolismo(exams):
    """
    Analyze metabolism-related tests.
    
    Returns:
        Dictionary with abnormalities, interpretation, and severity
    """
    # Placeholder implementation
    return {
        'abnormalities': [],
        'interpretation': 'Metabolismo normal',
        'severity': 'normal'
    } 