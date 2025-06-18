"""
Analyzer modules for the UTI Helper application.

This package contains modules for analyzing different types of laboratory results:
- Blood gases analysis
- Electrolytes analysis
- Hematology analysis
- Renal function analysis
- Hepatic function analysis
- Cardiac markers analysis
- Metabolic analysis
- Microbiology analysis
"""

from src.analyzers.blood_gases import analisar_gasometria
from src.analyzers.electrolytes import analisar_eletrolitos, analisar_eletrólitos
from src.analyzers.hematology import analisar_hemograma
from src.analyzers.renal import analisar_funcao_renal
from src.analyzers.hepatic import analisar_funcao_hepatica
from src.analyzers.cardiac import analisar_marcadores_cardiacos
from src.analyzers.metabolic import analisar_metabolismo
from src.analyzers.microbiology import analisar_microbiologia

__all__ = [
    'analisar_gasometria',
    'analisar_eletrolitos',
    'analisar_eletrólitos',  # Mantido para compatibilidade
    'analisar_hemograma',
    'analisar_funcao_renal',
    'analisar_funcao_hepatica',
    'analisar_marcadores_cardiacos',
    'analisar_metabolismo',
    'analisar_microbiologia'
] 