"""
Electrolyte analysis functions for interpreting electrolyte imbalances.
"""

from src.utils.reference_ranges import REFERENCE_RANGES
from functools import lru_cache

def analisar_eletrolitos(dados):
    """
    Analyze electrolyte values and provide clinical interpretation.
    
    Args:
        dados: Dictionary containing electrolyte parameters (Na+, K+, Ca+, etc.)
        
    Returns:
        list: List of analysis findings and interpretations
    """
    # Convert all values to float if possible
    params = {}
    for key, value in dados.items():
        if value is not None:
            try:
                params[key] = float(value)
            except (ValueError, TypeError):
                # Skip if value cannot be converted to float
                pass
    
    # Use cache for better performance
    return _analisar_eletrolitos_cached(
        params.get('Na+'),
        params.get('K+'),
        params.get('Ca+'),
        params.get('iCa'),
        params.get('Mg+'),
        params.get('P')
    )

@lru_cache(maxsize=128)
def _analisar_eletrolitos_cached(na=None, k=None, ca=None, ica=None, mg=None, p=None):
    """
    Cached version of electrolyte analysis for improved performance.
    All parameters must be immutable (numerical values) for the cache to work.
    
    Args:
        na: Sodium value in mmol/L (optional)
        k: Potassium value in mmol/L (optional)
        ca: Calcium value in mg/dL (optional)
        ica: Ionized calcium value in mmol/L (optional)
        mg: Magnesium value in mg/dL (optional)
        p: Phosphorus value in mg/dL (optional)
        
    Returns:
        list: List of interpretations and findings
    """
    resultados = []
    
    # Analyze sodium levels
    if na is not None:
        na_min, na_max = REFERENCE_RANGES['Na+']
        
        if na < na_min:
            resultados.append(f"Hiponatremia ({na} mmol/L)")
            if na < 125:
                resultados.append("Hiponatremia significativa - risco de manifestações neurológicas")
            if na < 120:
                resultados.append("Hiponatremia grave - risco de convulsões e coma")
        elif na > na_max:
            resultados.append(f"Hipernatremia ({na} mmol/L)")
            if na > 150:
                resultados.append("Hipernatremia significativa - sugere desidratação importante ou diabetes insipidus")
            if na > 160:
                resultados.append("Hipernatremia grave - risco aumentado de manifestações neurológicas e ruptura vascular cerebral")
        else:
            resultados.append(f"Sódio normal ({na} mmol/L)")
    
    # Analyze potassium levels
    if k is not None:
        k_min, k_max = REFERENCE_RANGES['K+']
        
        if k < k_min:
            resultados.append(f"Hipocalemia ({k} mmol/L)")
            if k < 3.0:
                resultados.append("Hipocalemia significativa - risco de arritmias e fraqueza muscular")
            if k < 2.5:
                resultados.append("Hipocalemia grave - requer reposição imediata")
        elif k > k_max:
            resultados.append(f"Hipercalemia ({k} mmol/L)")
            if k > 6.0:
                resultados.append("Hipercalemia significativa - risco de arritmias")
            if k > 6.5:
                resultados.append("Hipercalemia grave - risco de parada cardíaca, requer intervenção imediata")
        else:
            resultados.append(f"Potássio normal ({k} mmol/L)")
    
    # Analyze calcium levels
    if ca is not None:
        ca_min, ca_max = REFERENCE_RANGES['Ca+']
        
        if ca < ca_min:
            resultados.append(f"Hipocalcemia ({ca} mg/dL)")
            if ca < 7.0:
                resultados.append("Hipocalcemia significativa - risco de tetania, espasmos musculares e arritmias")
        elif ca > ca_max:
            resultados.append(f"Hipercalcemia ({ca} mg/dL)")
            if ca > 12.0:
                resultados.append("Hipercalcemia significativa - risco de alterações neurológicas e renais")
        else:
            resultados.append(f"Cálcio normal ({ca} mg/dL)")
    
    # Analyze ionized calcium if available
    if ica is not None:
        ica_min, ica_max = REFERENCE_RANGES['iCa']
        
        if ica < ica_min:
            resultados.append(f"Cálcio iônico reduzido ({ica} mmol/L)")
            resultados.append("Valores reduzidos de cálcio iônico podem indicar transfusão maciça, hipoparatireoidismo ou sepse")
        elif ica > ica_max:
            resultados.append(f"Cálcio iônico elevado ({ica} mmol/L)")
            resultados.append("Valores elevados de cálcio iônico podem indicar hiperparatireoidismo, malignidade ou uso excessivo de vitamina D")
        else:
            resultados.append(f"Cálcio iônico normal ({ica} mmol/L)")
    
    # Analyze magnesium levels
    if mg is not None:
        mg_min, mg_max = REFERENCE_RANGES['Mg+']
        
        if mg < mg_min:
            resultados.append(f"Hipomagnesemia ({mg} mg/dL)")
            resultados.append("Hipomagnesemia pode causar arritmias, fraqueza muscular e potencializar hipocalemia")
        elif mg > mg_max:
            resultados.append(f"Hipermagnesemia ({mg} mg/dL)")
            if mg > 4.0:
                resultados.append("Hipermagnesemia significativa - risco de depressão do sistema nervoso central e bloqueio neuromuscular")
        else:
            resultados.append(f"Magnésio normal ({mg} mg/dL)")
    
    # Analyze phosphorus levels
    if p is not None:
        p_min, p_max = REFERENCE_RANGES['P']
        
        if p < p_min:
            resultados.append(f"Hipofosfatemia ({p} mg/dL)")
            if p < 1.5:
                resultados.append("Hipofosfatemia significativa - pode causar fraqueza muscular, disfunção de leucócitos e síndrome da realimentação")
        elif p > p_max:
            resultados.append(f"Hiperfosfatemia ({p} mg/dL)")
            resultados.append("Hiperfosfatemia geralmente associada à disfunção renal ou rabdomiólise")
        else:
            resultados.append(f"Fósforo normal ({p} mg/dL)")
    
    # Evaluate potential disturbances based on multiple electrolytes
    
    # Check for combined disturbances of sodium and potassium
    if na is not None and k is not None:
        na_min, na_max = REFERENCE_RANGES['Na+']
        k_min, k_max = REFERENCE_RANGES['K+']
        
        if na < na_min and k > k_max:
            resultados.append("Hiponatremia com hipercalemia - considerar insuficiência adrenal ou uso de diuréticos poupadores de potássio")
        elif na > na_max and k < k_min:
            resultados.append("Hipernatremia com hipocalemia - sugere hiperaldosteronismo ou uso de diuréticos de alça")
    
    # Check for combined disturbances of calcium and phosphorus
    if ca is not None and p is not None:
        ca_min, ca_max = REFERENCE_RANGES['Ca+']
        p_min, p_max = REFERENCE_RANGES['P']
        
        if ca > ca_max and p < p_min:
            resultados.append("Hipercalcemia com hipofosfatemia - considerar hiperparatireoidismo primário")
        elif ca < ca_min and p > p_max:
            resultados.append("Hipocalcemia com hiperfosfatemia - considerar insuficiência renal ou hipoparatireoidismo")
    
    return resultados

# Alias para manter compatibilidade com o nome acentuado
analisar_eletrólitos = analisar_eletrolitos 