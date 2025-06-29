"""Simple test script to manually check the functions."""

# Reimplemented functions for testing
def determinar_categoria(nome_campo: str) -> str:
    """
    Determina a categoria de um exame com base no nome do campo.
    """
    categorias = {
        "hemograma": ["Hemoglobina", "Hematócrito", "Leucócitos", "Plaquetas", "Eritrócitos", "VCM", "HCM", "CHCM", "RDW", "Leucocitos", "Hematocrito"],
        "bioquimica": ["Ureia", "Creatinina", "Sódio", "Potássio", "Cloro", "Cálcio", "Fósforo", "Magnésio", "Bilirrubina", "AST", "ALT", "Fosfatase Alcalina", "GGT", "Proteínas Totais", "Albumina", "Glicose", "Colesterol", "Triglicerídeos", "HDL", "LDL", "TGO", "TGP"],
        "gasometria": ["pH", "pCO2", "pO2", "HCO3", "BE", "Lactato", "SatO2", "FiO2"],
        "coagulacao": ["TP", "INR", "TTPA", "Fibrinogênio", "D-dímero"],
        "urina": ["pH Urinário", "Densidade", "Proteinuria", "Glicosúria", "Cetonuria", "Nitrito", "Leucocituria", "Hematuria"]
    }
    
    # Primeiro procurar uma correspondência exata
    nome_campo_lower = nome_campo.lower()
    for categoria, campos in categorias.items():
        for campo in campos:
            if campo.lower() == nome_campo_lower:
                return categoria
    
    # Se não encontrar correspondência exata, procurar por correspondência parcial
    for categoria, campos in categorias.items():
        if any(campo.lower() in nome_campo_lower for campo in campos):
            return categoria
            
    return "outros"

def obter_unidade(nome_campo: str) -> str:
    """
    Retorna a unidade de medida comum para o campo especificado.
    """
    unidades = {
        "Hemoglobina": "g/dL",
        "Hematócrito": "%",
        "Hematocrito": "%",
        "Leucócitos": "/mm³",
        "Leucocitos": "/mm³",
        "Plaquetas": "/mm³",
        "Eritrócitos": "milhões/mm³",
        "VCM": "fL",
        "HCM": "pg",
        "CHCM": "g/dL",
        "Ureia": "mg/dL",
        "Creatinina": "mg/dL",
        "Sódio": "mEq/L",
        "Potássio": "mEq/L",
        "Cloro": "mEq/L",
        "Cálcio": "mg/dL",
        "Magnésio": "mg/dL",
        "pH": "",
        "pH Urinário": "",
        "pCO2": "mmHg",
        "pO2": "mmHg",
        "HCO3": "mEq/L",
        "BE": "mEq/L",
        "Lactato": "mmol/L",
        "SatO2": "%",
        "Glicose": "mg/dL",
        "PCR": "mg/dL",
        "TGO/AST": "U/L",
        "TGP/ALT": "U/L"
    }
    
    # Primeiro procurar uma correspondência exata
    nome_campo_lower = nome_campo.lower()
    for campo, unidade in unidades.items():
        if campo.lower() == nome_campo_lower:
            return unidade
    
    # Se não encontrar correspondência exata, procurar por correspondência parcial
    for campo, unidade in unidades.items():
        if campo.lower() in nome_campo_lower:
            return unidade
            
    return ""

def obter_valores_referencia(nome_campo: str) -> tuple:
    """
    Retorna os valores de referência para o campo especificado.
    """
    valores_ref = {
        "Hemoglobina": (12.0, 16.0),
        "Hematócrito": (36.0, 47.0),
        "Hematocrito": (36.0, 47.0),
        "Leucócitos": (4000, 10000),
        "Leucocitos": (4000, 10000),
        "Plaquetas": (150000, 450000),
        "Eritrócitos": (4.0, 5.5),
        "Ureia": (10, 50),
        "Creatinina": (0.6, 1.2),
        "Sódio": (135, 145),
        "Potássio": (3.5, 5.0),
        "Cloro": (98, 107),
        "Cálcio": (8.5, 10.5),
        "Magnésio": (1.6, 2.6),
        "pH": (7.35, 7.45),
        "pH Urinário": (5.0, 7.0),
        "pCO2": (35, 45),
        "pO2": (80, 100),
        "HCO3": (22, 26),
        "BE": (-2, 2),
        "Lactato": (0.5, 1.5),
        "SatO2": (95, 100),
        "Glicose": (70, 100),
        "PCR": (0, 0.5),
        "TGO/AST": (10, 40),
        "TGP/ALT": (7, 56)
    }
    
    # Primeiro procurar uma correspondência exata
    nome_campo_lower = nome_campo.lower()
    for campo, valores in valores_ref.items():
        if campo.lower() == nome_campo_lower:
            return valores
    
    # Se não encontrar correspondência exata, procurar por correspondência parcial
    for campo, valores in valores_ref.items():
        if campo.lower() in nome_campo_lower:
            return valores
            
    return None, None

# Run tests
def test_functions():
    try:
        print("===== Testing determinar_categoria =====", flush=True)
        result1 = determinar_categoria("Hemoglobina")
        print(f"determinar_categoria('Hemoglobina'): {result1}", flush=True)
        assert result1 == "hemograma", f"Expected 'hemograma', got '{result1}'"
        
        result2 = determinar_categoria("Leucocitos")
        print(f"determinar_categoria('Leucocitos'): {result2}", flush=True)
        assert result2 == "hemograma", f"Expected 'hemograma', got '{result2}'"
        
        result3 = determinar_categoria("Plaquetas")
        print(f"determinar_categoria('Plaquetas'): {result3}", flush=True)
        assert result3 == "hemograma", f"Expected 'hemograma', got '{result3}'"
        
        print("\n===== Testing obter_unidade =====", flush=True)
        result4 = obter_unidade("Hemoglobina")
        print(f"obter_unidade('Hemoglobina'): {result4}", flush=True)
        assert result4 == "g/dL", f"Expected 'g/dL', got '{result4}'"
        
        result5 = obter_unidade("Hematocrito")
        print(f"obter_unidade('Hematocrito'): {result5}", flush=True)
        assert result5 == "%", f"Expected '%', got '{result5}'"
        
        result6 = obter_unidade("Leucocitos")
        print(f"obter_unidade('Leucocitos'): {result6}", flush=True)
        assert result6 == "/mm³", f"Expected '/mm³', got '{result6}'"
        
        print("\n===== Testing obter_valores_referencia =====", flush=True)
        min_val, max_val = obter_valores_referencia("Hemoglobina")
        print(f"obter_valores_referencia('Hemoglobina'): ({min_val}, {max_val})", flush=True)
        assert min_val == 12.0, f"Expected 12.0, got {min_val}"
        assert max_val == 16.0, f"Expected 16.0, got {max_val}"

        print("\nAll tests passed!", flush=True)
    except AssertionError as e:
        print(f"\nTest failed: {e}", flush=True)
    except Exception as e:
        print(f"\nUnexpected error: {e}", flush=True)
    
if __name__ == "__main__":
    test_functions() 