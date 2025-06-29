# Enhanced version of Labs.py

import PyPDF2
import re
import pyperclip
import os
import datetime

# PatientData class to store and manage patient demographic information
class PatientData:
    def __init__(self, nome="", idade=None, sexo=None, peso=None, altura=None, etnia=None, data_internacao=None, diagnostico=None):
        self.nome = nome
        self.idade = idade
        self.sexo = sexo.upper() if sexo else None  # M or F
        self.peso = peso  # kg
        self.altura = altura  # cm
        self.etnia = etnia.lower() if etnia else None  # negro, branco, asiatico, outro
        self.data_internacao = data_internacao  # datetime object
        self.diagnostico = diagnostico  # Clinical diagnosis
        
        # Sinais vitais
        self.fc = None  # Frequência cardíaca
        self.pas = None  # Pressão arterial sistólica
        self.pad = None  # Pressão arterial diastólica
        self.diurese = None  # Volume de diurese (mL)
        self.spo2 = None  # Saturação de oxigênio (%)
        self.glasgow = None  # Escala de Glasgow (3-15)
        self.tax = None  # Temperatura axilar (°C)
        self.hgt = None  # Glicemia capilar (mg/dL)
        
        # Support parameters
        self.aminas = False  # Em uso de aminas vasoativas
        self.ventilacao = False  # Em ventilação mecânica
    
    def calcular_imc(self):
        """Calculate BMI if height and weight are available"""
        if self.peso and self.altura:
            return self.peso / ((self.altura/100) ** 2)
        return None
    
    def calcular_peso_ideal(self):
        """Calculate ideal body weight based on height and sex"""
        if not self.altura or not self.sexo:
            return None
            
        if self.sexo == 'M':
            return 50 + 0.91 * (self.altura - 152.4)
        else:  # Female
            return 45.5 + 0.91 * (self.altura - 152.4)
    
    def calcular_superficie_corporal(self):
        """Calculate body surface area using Dubois formula"""
        if self.peso and self.altura:
            return 0.007184 * (self.altura ** 0.725) * (self.peso ** 0.425)
        return None
    
    def dias_internacao(self, data_atual=None):
        """Calculate days since admission"""
        if not self.data_internacao:
            return None
            
        if data_atual is None:
            data_atual = datetime.datetime.now()
            
        delta = data_atual - self.data_internacao
        return delta.days

    def __str__(self):
        """String representation of patient data"""
        info = [f"Nome: {self.nome}"]
        if self.idade:
            info.append(f"Idade: {self.idade} anos")
        if self.sexo:
            info.append(f"Sexo: {'Masculino' if self.sexo == 'M' else 'Feminino'}")
        if self.peso:
            info.append(f"Peso: {self.peso} kg")
        if self.altura:
            info.append(f"Altura: {self.altura} cm")
        if self.etnia:
            info.append(f"Etnia: {self.etnia.title()}")
            
        # Adicionar sinais vitais se disponíveis
        vitals = []
        if self.fc:
            vitals.append(f"FC: {self.fc} bpm")
        if self.pas and self.pad:
            vitals.append(f"PA: {self.pas}/{self.pad} mmHg")
        if self.spo2:
            vitals.append(f"SpO2: {self.spo2}%")
        if self.tax:
            vitals.append(f"Tax: {self.tax}°C")
        if self.glasgow:
            vitals.append(f"Glasgow: {self.glasgow}")
        if self.diurese:
            vitals.append(f"Diurese: {self.diurese} mL")
        if self.hgt:
            vitals.append(f"HGT: {self.hgt} mg/dL")
            
        if vitals:
            info.append("\nSinais Vitais:")
            info.extend(vitals)
            
        return "\n".join(info)

# Normal reference ranges for analysis
REFERENCE_RANGES = {
    # Blood gases
    'pH': (7.35, 7.45),
    'pCO2': (35, 45),  # mmHg
    'pO2': (80, 100),  # mmHg
    'HCO3-': (22, 26),  # mmol/L
    'SpO2': (95, 100),  # %
    'BE': (-3, 3),     # Base Excess mmol/L
    
    # Electrolytes
    'Na+': (135, 145),  # mmol/L
    'K+': (3.5, 5.0),   # mmol/L
    'Ca+': (8.5, 10.5), # mg/dL
    'iCa': (1.10, 1.35), # mmol/L
    'Mg+': (1.5, 2.5),  # mg/dL
    'P': (2.5, 4.5),    # mg/dL (Fósforo)
    
    # CBC
    'Hb': (12, 16),     # g/dL (adjustable by gender)
    'Ht': (36, 46),     # % (adjustable by gender)
    'Leuco': (4000, 10000), # /mm³
    'Plaq': (150000, 450000), # /mm³
    'Retic': (0.5, 1.5),  # %
    
    # Others
    'Creat': (0.6, 1.2), # mg/dL
    'Ur': (10, 50),     # mg/dL
    'PCR': (0, 0.5),    # mg/dL
    'Lactato': (4.5, 19.8), # mg/dL
    'Glicose': (70, 100), # mg/dL
    'HbA1c': (4.0, 5.7), # %
    'Albumina': (3.5, 5.2), # g/dL
    'CPK': (26, 192),    # U/L
    'LDH': (140, 280),   # U/L
    'AcidoUrico': (3.5, 7.2), # mg/dL
    'ProteinuriaVol': (0, 150), # mg/24h
    'T4L': (0.7, 1.8),   # ng/dL
    'TSH': (0.4, 4.0),   # µUI/mL
    'FatorReumatoide': (0, 14), # UI/mL
    
    # Urine
    'ProtCreatRatio': (0, 0.2), # mg/mg
    'UrineDensity': (1.005, 1.035),
    'UrineLeuco': (0, 10),  # p/campo
    'UrineHem': (0, 5),    # p/campo
}

# Dicionário global de padrões para extração de dados dos exames
campos_desejados = {
    # Hemograma
    'Hb': r'HEMOGLOBINA\.+:\s*([\d,.]+)|HEMOGLOBINA[\s\S]*?:\s*([\d,.]+)',
    'Ht': r'HEMAT[ÓO]CRITO\.+:\s*([\d,.]+)|HEMATOCRITO[\s\S]*?:\s*([\d,.]+)',
    'Leuco': r'LEUC[ÓO]CITOS\.+:\s*([\d,.]+)|LEUCOCITOS[\s\S]*?:\s*([\d,.]+)',
    'Bastões': r'BAST[OÕ]NETES\.+:\s*([\d,.]+)',
    'Segm': r'SEGMENTADOS\.+:\s*([\d,.]+)',
    'Plaq': r'PLAQUETAS\.+:\s*([\d,.]+)',
    'Retic': r'CONTAGEM DE RETICULOCITOS[\s\S]*?Resultado[\s\S]*?:\s*([\d,.]+)',
    
    # Electrolytes
    'K+': r'POT[ÁA]SSIO\s*\n?Resultado\.+:\s*([\d,.]+)|POTÁSSIO[\s\S]*?:\s*([\d,.]+)',
    'Na+': r'S[ÓO]DIO\s*\n?Resultado\.+:\s*([\d,.]+)|SÓDIO[\s\S]*?:\s*([\d,.]+)',
    'Ca+': r'C[ÁA]LCIO\s*\n?Resultado\.+:\s*([\d,.]+)',
    'iCa': r'CALCIO IONICO[\s\S]*?:\s*([\d,.]+)',
    'Mg+': r'MAGN[ÉE]SIO\s*\n?Resultado\.+:\s*([\d,.]+)',
    'P': r'F[ÓO]SFORO[\s\S]*?Resultado[\s\S]*?:\s*([\d,.]+)',
    
    # Renal/Hepatic
    'Creat': r'CREATININA\s*\n?Resultado\.+:\s*([\d,.]+)',
    'Ur': r'UREIA\s*\n?Resultado\.+:\s*([\d,.]+)',
    'PCR': r'PCR - PROTEÍNA C REATIVA\s*\n?Resultado\.+:\s*([\d,.]+)',
    'RNI': r'INR\.+:\s*([\d,.]+)',
    'TTPA': r'TTPA\s*\n?[\s\S]*?:\s*([\d,.]+)',
    'TGO': r'TGO[\s\S]*?Resultado\.+:\s*([\d,.]+)',
    'TGP': r'TGP[\s\S]*?Resultado\.+:\s*([\d,.]+)',
    'BT': r'Bilirrubina Total\.+:\s*([\d,.]+)',
    'BD': r'Bilirrubina Direta\.+:\s*([\d,.]+)',
    'BI': r'Bilirrubina Indireta:\s*([\d,.]+)',
    'GamaGT': r'GAMA GT[\s\S]*?Resultado\.+:\s*([\d,.]+)',
    'FosfAlc': r'FOSFATASE ALCALINA\s*\n?Resultado\.+:\s*([\d,.]+)',
    'Amilase': r'AMILASE\s*\n?Resultado\.+:\s*([\d,.]+)',
    'Lipase': r'LIPASE\s*\n?Resultado\.+:\s*([\d,.]+)',
    'Albumina': r'ALBUMINA[\s\S]*?Resultado[\s\S]*?:\s*([\d,.]+)',
    'CPK': r'CPK[\s\S]*?Resultado[\s\S]*?:\s*([\d,.]+)',
    'LDH': r'DESIDROGENASE LACTICA[\s\S]*?Resultado[\s\S]*?:\s*([\d,.]+)',
    'AcidoUrico': r'[ÁA]CIDO [ÚU]RICO[\s\S]*?Resultado[\s\S]*?:\s*([\d,.]+)',
    
    # Gasometria - updated patterns for both formats
    'pH': r'GASOMETRIA[\s\S]*?pH\.+:\s*([\d,.]+)|pH\.+:\s*([\d,.]+)',
    'pCO2': r'GASOMETRIA[\s\S]*?pCO2\.+:\s*([\d,.]+)|pCO2\.+:\s*([\d,.]+)',
    'pO2': r'GASOMETRIA[\s\S]*?pO2\.+:\s*([\d,.]+)|pO2\.+:\s*([\d,.]+)',
    'HCO3-': r'GASOMETRIA[\s\S]*?HCO3[\s\S]*?\.+:\s*([\d,.]+)|HCO3\.+:\s*([\d,.]+)',
    'SpO2': r'SATURA[ÇC][ÃA]O DE O2\.+:\s*([\d,.]+)',
    'Lactato': r'LACTATO\.+:\s*([\d,.]+)',
    
    # Marcadores cardíacos
    'BNP': r'BNP[\s\S]*?Resultado\.+:\s*([\d,.]+)',
    'CK-MB': r'CK-MB[\s\S]*?Resultado\.+:\s*([\d,.]+)',
    'Tropo': r'TROPONINA[\s\S]*?Resultado\.+:\s*([\d,.]+)',
    
    # Metabólico e Endócrino
    'Glicose': r'GLICOSE[\s\S]*?:\s*([\d,.]+)|GLICOSE[\s\S]*?Resultado\.+:\s*([\d,.]+)',
    'HbA1c': r'Hb A1c[\s\S]*?:\s*([\d,.]+)',
    'T4L': r'T4[\s\S]*?LIVRE[\s\S]*?Resultado[\s\S]*?:\s*([\d,.]+)',
    'TSH': r'TSH[\s\S]*?Resultado[\s\S]*?:\s*([\d,.]+)',
    
    # Urina
    'ProtCreatRatio': r'RELAÇÃO PROTEÍNA/CREATININA[\s\S]*?Relação[\s\S]*?:\s*([\d,.]+)',
    'ProteinuriaVol': r'PROTEINURIA - 24H[\s\S]*?Resultado[\s\S]*?:\s*([\d,.]+)',
    'UrineDensity': r'Densidade[\s\S]*?:\s*([\d,.]+)',
    'UrineLeuco': r'Leucocitos \(p/Campo\)[\s\S]*?:\s*(\d+)',
    'UrineHem': r'Hemacias \(p/Campo\)[\s\S]*?:\s*(\d+)',
    
    # Imunologia
    'FatorReumatoide': r'FATOR REUMATOIDE[\s\S]*?Resultado[\s\S]*?:\s*([\d,.]+)',
    
    # Culturas e Sorologias (resultados qualitativos)
    'CultVigilNasal': r'CULTURA DE VIGILANCIA - NASAL[\s\S]*?RESULTADO[\s\S]*?:\s*([^\n]+)',
    'CultVigilRetal': r'CULTURA DE VIGILANCIA - RETAL[\s\S]*?RESULTADO[\s\S]*?:\s*([^\n]+)',
    'Hemocult': r'HEMOCULTURA AUTOMATIZADA(?:[\s\S]*?)(?:RESULTADO|Resultado)[\s\S]*?:\s*([^\n]+(?:\n[^A][^\n]*)*)',
    'HemocultAntibiograma': r'ANTIBIOGRAMA(?:[\s\S]*?)ANTIBIOTICOS SENSIBILIDADE[\s\S]*?((?:(?:Sensível|Resistente)[\s\S]*?)+)(?:Valor de Referência|HEMOCULTURA|BETA)',
    'Urocult': r'UROCULTURA[\s\S]*?RESULTADO[\s\S]*?:\s*([^\n]+)',
    'CoombsDir': r'COOMBS DIRETO[\s\S]*?Resultado[\s\S]*?:\s*([^\n]+)',
    'GrupoABO': r'GRUPO SANGUINEO[\s\S]*?Resultado[\s\S]*?:\s*([^\n]+)',
    'FatorRh': r'FATOR RH[\s\S]*?Resultado[\s\S]*?:\s*([^\n]+)',
    'BetaHCG': r'BETA HCG[\s\S]*?Resultado[\s\S]*?:\s*([^\n]+)',
    'HBsAg': r'HEPATITE B - HBSAG[\s\S]*?Resultado[\s\S]*?:\s*([^\n]+)',
    'AntiHBs': r'HEPATITE B - ANTI - HBS[\s\S]*?Resultado[\s\S]*?:\s*([^\n]+)',
    'AntiHBcTotal': r'HEPATITE B - ANTI-HBC TOTAL[\s\S]*?Resultado[\s\S]*?:\s*([^\n]+)',
    'AntiHVAIgM': r'HEPATITE A - ANTI - HVA IGM[\s\S]*?Leitura[\s\S]*?:\s*([^\n]+)',
    'HCV': r'HEPATITE C[\s\S]*?Resultado[\s\S]*?:\s*([^\n]+)',
    'HIV': r'HIV[\s\S]*?Resultado[\s\S]*?:\s*([^\n]+)',
    'VDRL': r'VDRL[\s\S]*?Resultado[\s\S]*?:\s*([^\n]+)',
    'DengueNS1': r'DENGUE - ANTÍGENO NS1[\s\S]*?Resultado[\s\S]*?:\s*([^\n]+)',
}

def extrair_campos_pagina(pdf_path, numero_pagina=None):
    """
    Extrai campos de uma página específica ou de todas as páginas de um PDF.
    
    Args:
        pdf_path: Caminho para o arquivo PDF
        numero_pagina: Número da página específica (começando de 1) ou None para processar todas as páginas
        
    Returns:
        Se numero_pagina for especificado: dicionário com os campos extraídos daquela página
        Se numero_pagina for None: lista de dicionários, um para cada página
    """
    try:
    with open(pdf_path, 'rb') as arquivo_pdf:
        leitor = PyPDF2.PdfReader(arquivo_pdf)
            
            # Se o número da página não for informado, processar todas as páginas
            if numero_pagina is None:
                resultados = []
                for i in range(len(leitor.pages)):
                    pagina = leitor.pages[i]
                    texto = pagina.extract_text()
                    
                    # Extrair campos desta página
                    dados_extraidos = extrair_campos_do_texto(texto)
                    if dados_extraidos:
                        resultados.append(dados_extraidos)
                return resultados
            else:
                # Processar apenas a página especificada
                if numero_pagina > len(leitor.pages):
                    return {}
                    
        pagina = leitor.pages[numero_pagina - 1]
        texto = pagina.extract_text()
        
                # Extrair campos desta página
                return extrair_campos_do_texto(texto)
    except Exception as e:
        print(f"Erro ao processar PDF {pdf_path}: {e}")
        if numero_pagina is None:
            return []
        else:
            return {}

def extrair_campos_do_texto(texto):
    """Extrai campos de texto usando os padrões definidos em campos_desejados"""
        dados_extraidos = {}

        for campo, padrao in campos_desejados.items():
        try:
            correspondencia = re.search(padrao, texto, re.IGNORECASE)
            if correspondencia:
                # Handle patterns with multiple capturing groups
                grupos = correspondencia.groups()
                valor = next((g for g in grupos if g is not None), None)
                if valor:
                    dados_extraidos[campo] = valor.strip()
        except (AttributeError, IndexError) as e:
            # Skip if there's an error with the pattern or group
            continue

        # Convert string values to numeric where appropriate
        for key in dados_extraidos:
            if key not in ['Proteinuria', 'Cetonuria', 'Nitrito', 'Leveduras', 'Bacteriuria', 
                          'DengueIgM', 'DengueIgG', 'NS1', 'Leucocituria', 'Hematuria']:
                try:
                # Handle values with commas (European format)
                dados_extraidos[key] = float(dados_extraidos[key].replace('.', '').replace(',', '.'))
                except (ValueError, AttributeError):
                # Keep as string if conversion fails
                pass

        return dados_extraidos

def analisar_gasometria(dados):
    """
    Analyze arterial blood gas values with improved interpretation based on 
    the American Thoracic Society's 6-step approach.
    """
    if not all(k in dados for k in ['pH', 'pCO2']):
        return []
    
    analise = []
    disturbio_primario = []
    disturbio_secundario = []
    nota_educacional = []
    
    ph = dados['pH']
    pco2 = dados['pCO2']
    hco3 = dados.get('HCO3-', None)
    
    # Passo 1: Avaliar pH - Definição do estado ácido-base
    if ph < 7.35:
        analise.append(f"Acidemia (pH: {ph})")
        if ph < 7.25:
            nota_educacional.append("Acidemia grave pode comprometer função celular e cardiovascular")
    elif ph > 7.45:
        analise.append(f"Alcalemia (pH: {ph})")
        if ph > 7.55:
            nota_educacional.append("Alcalemia grave pode causar tetania, arritmias e redução da perfusão cerebral")
    else:
        analise.append(f"pH normal ({ph})")
    
    # Passo 2: Identificação do distúrbio primário
    # Variáveis para rastrear distúrbios já detectados
    acidose_respiratoria_detectada = False
    acidose_metabolica_detectada = False
    alcalose_respiratoria_detectada = False
    alcalose_metabolica_detectada = False
    
    if ph < 7.35:  # Acidemia
        if pco2 > REFERENCE_RANGES['pCO2'][1]:
            acidose_respiratoria_detectada = True
            disturbio_primario.append("Acidose Respiratória")
            # Distinguir entre aguda e crônica e calcular compensação esperada
            if hco3:
                # Fórmula para acidose respiratória aguda: ΔHCOз = 0.1 x ΔpCO₂
                hco3_esperado_agudo = 24 + (0.1 * (pco2 - 40))
                # Fórmula para acidose respiratória crônica: ΔHCOз = 0.4 x ΔpCO₂
                hco3_esperado_cronico = 24 + (0.4 * (pco2 - 40))
                
                # Determinar se a compensação é adequada
                if abs(hco3 - hco3_esperado_agudo) <= 2:
                    disturbio_secundario.append(f"Compensação metabólica aguda adequada (HCO3- atual: {hco3} mEq/L, esperado: {hco3_esperado_agudo:.1f} mEq/L)")
                elif abs(hco3 - hco3_esperado_cronico) <= 2:
                    disturbio_secundario.append(f"Compensação metabólica crônica adequada (HCO3- atual: {hco3} mEq/L, esperado: {hco3_esperado_cronico:.1f} mEq/L)")
                elif hco3 > hco3_esperado_cronico + 2:
                    disturbio_secundario.append(f"Alcalose metabólica adicional (HCO3- atual: {hco3} mEq/L, máximo esperado para compensação: {hco3_esperado_cronico:.1f} mEq/L)")
                    alcalose_metabolica_detectada = True
                elif hco3 < hco3_esperado_agudo - 2:
                    disturbio_secundario.append(f"Acidose metabólica adicional (HCO3- atual: {hco3} mEq/L, mínimo esperado: {hco3_esperado_agudo:.1f} mEq/L)")
                    acidose_metabolica_detectada = True
                
                nota_educacional.append(f"Em acidose respiratória não compensada, espera-se HCO3- de 24 mEq/L")
        
        # Check for metabolic acidosis only if respiratory acidosis isn't the primary disturbance
        if hco3 and hco3 < REFERENCE_RANGES['HCO3-'][0] and not acidose_respiratoria_detectada:
            acidose_metabolica_detectada = True
            disturbio_primario.append("Acidose Metabólica")
            # Calcular pCO2 esperado (Compensação respiratória)
            # Fórmula de Winter: pCO2 esperado = 1.5 × [HCO3-] + 8 ± 2
            pco2_esperado = 1.5 * hco3 + 8
            
            if abs(pco2 - pco2_esperado) <= 2:
                disturbio_secundario.append(f"Compensação respiratória adequada (pCO2 atual: {pco2} mmHg, esperado: {pco2_esperado:.1f} mmHg)")
            elif pco2 < pco2_esperado - 2:
                disturbio_secundario.append(f"Alcalose respiratória adicional (pCO2 atual: {pco2} mmHg, mínimo esperado: {pco2_esperado-2:.1f} mmHg)")
                alcalose_respiratoria_detectada = True
            elif pco2 > pco2_esperado + 2:
                disturbio_secundario.append(f"Acidose respiratória adicional (pCO2 atual: {pco2} mmHg, máximo esperado: {pco2_esperado+2:.1f} mmHg)")
                acidose_respiratoria_detectada = True
            
            # Calcular anion gap se disponível
            if 'Na+' in dados and 'Cl-' in dados:
                na = dados['Na+']
                cl = dados['Cl-']
                ag = na - (cl + hco3)
                if ag > 12:
                    analise.append(f"Acidose metabólica com ânion gap aumentado (AG: {ag})")
                    nota_educacional.append("Considerar: cetoacidose, acidose láctica, intoxicação, uremia")
                else:
                    analise.append(f"Acidose metabólica com ânion gap normal (AG: {ag})")
                    nota_educacional.append("Considerar: diarreia, ATR, fístula pancreática, acidose tubular renal")
            
            nota_educacional.append(f"Em acidose metabólica não compensada, espera-se pCO2 de 40 mmHg")
            
    elif ph > 7.45:  # Alkalemia
        if pco2 < REFERENCE_RANGES['pCO2'][0]:
            alcalose_respiratoria_detectada = True
            disturbio_primario.append("Alcalose Respiratória")
            # Calcular HCO3 esperado
            if hco3:
                # Fórmula para alcalose respiratória aguda: ΔHCO3 = 0.2 × (40 - pCO2)
                hco3_esperado_agudo = 24 - (0.2 * (40 - pco2))
                # Fórmula para alcalose respiratória crônica: ΔHCO3 = 0.5 × (40 - pCO2)
                hco3_esperado_cronico = 24 - (0.5 * (40 - pco2))
                
                if abs(hco3 - hco3_esperado_agudo) <= 2:
                    disturbio_secundario.append(f"Compensação metabólica aguda adequada (HCO3- atual: {hco3} mEq/L, esperado: {hco3_esperado_agudo:.1f} mEq/L)")
                elif abs(hco3 - hco3_esperado_cronico) <= 2:
                    disturbio_secundario.append(f"Compensação metabólica crônica adequada (HCO3- atual: {hco3} mEq/L, esperado: {hco3_esperado_cronico:.1f} mEq/L)")
                elif hco3 < hco3_esperado_cronico - 2:
                    disturbio_secundario.append(f"Acidose metabólica adicional (HCO3- atual: {hco3} mEq/L, mínimo esperado: {hco3_esperado_cronico:.1f} mEq/L)")
                    acidose_metabolica_detectada = True
                elif hco3 > hco3_esperado_agudo + 2:
                    disturbio_secundario.append(f"Alcalose metabólica adicional (HCO3- atual: {hco3} mEq/L, máximo esperado: {hco3_esperado_agudo:.1f} mEq/L)")
                    alcalose_metabolica_detectada = True
                
                nota_educacional.append(f"Em alcalose respiratória não compensada, espera-se HCO3- de 24 mEq/L")
        
        # Check for metabolic alkalosis only if respiratory alkalosis isn't the primary disturbance
        if hco3 and hco3 > REFERENCE_RANGES['HCO3-'][1] and not alcalose_respiratoria_detectada:
            alcalose_metabolica_detectada = True
            disturbio_primario.append("Alcalose Metabólica")
            # Compensação esperada para alcalose metabólica: ΔpCO₂ = 0.7 × ΔHCO₃
            # Para cada aumento de 1 mEq/L no HCO3 acima de 24, o pCO2 aumenta 0.7 mmHg
            pco2_esperado = 40 + (0.7 * (hco3 - 24))
            
            if abs(pco2 - pco2_esperado) <= 2:
                disturbio_secundario.append(f"Compensação respiratória adequada (pCO2 atual: {pco2} mmHg, esperado: {pco2_esperado:.1f} mmHg)")
            elif pco2 > pco2_esperado + 2:
                disturbio_secundario.append(f"Acidose respiratória adicional (pCO2 atual: {pco2} mmHg, máximo esperado: {pco2_esperado+2:.1f} mmHg)")
                acidose_respiratoria_detectada = True
            elif pco2 < pco2_esperado - 2:
                disturbio_secundario.append(f"Alcalose respiratória adicional (pCO2 atual: {pco2} mmHg, mínimo esperado: {pco2_esperado-2:.1f} mmHg)")
                alcalose_respiratoria_detectada = True
            
            nota_educacional.append(f"Em alcalose metabólica não compensada, espera-se pCO2 de 40 mmHg")
            nota_educacional.append("Causas comuns: vômitos, uso de diuréticos, hiperaldosteronismo")
    
    # Check for mixed disturbances - but clear the primary disturbance list first if we're adding a mixed disturbance
    if (acidose_metabolica_detectada and acidose_respiratoria_detectada) or \
       (acidose_metabolica_detectada and alcalose_respiratoria_detectada) or \
       (alcalose_metabolica_detectada and acidose_respiratoria_detectada) or \
       (alcalose_metabolica_detectada and alcalose_respiratoria_detectada):
        # If we already have more than one primary disturbance, replace them with a mixed disturbance
        disturbio_primario = []
        
        if acidose_metabolica_detectada and acidose_respiratoria_detectada:
            disturbio_primario.append("Distúrbio misto - Acidose metabólica e respiratória")
        elif acidose_metabolica_detectada and alcalose_respiratoria_detectada:
            disturbio_primario.append("Distúrbio misto - Acidose metabólica e alcalose respiratória")
        elif alcalose_metabolica_detectada and acidose_respiratoria_detectada:
            disturbio_primario.append("Distúrbio misto - Alcalose metabólica e acidose respiratória")
        elif alcalose_metabolica_detectada and alcalose_respiratoria_detectada:
            disturbio_primario.append("Distúrbio misto - Alcalose metabólica e respiratória")
    
    # Passo 3: Classificar a gravidade do distúrbio primário
    if disturbio_primario:
        for disturbio in disturbio_primario:
            if "Acidose Respiratória" in disturbio:
                if pco2 > 60:
                    analise.append("Acidose respiratória grave")
                
            elif "Acidose Metabólica" in disturbio:
                if hco3 and hco3 < 15:
                    analise.append("Acidose metabólica grave")
                
            elif "Alcalose Respiratória" in disturbio:
                if pco2 < 25:
                    analise.append("Alcalose respiratória grave")
                
            elif "Alcalose Metabólica" in disturbio:
                if hco3 and hco3 > 40:
                    analise.append("Alcalose metabólica grave")
    
    # Passo 4: Verificar se há distúrbio misto (mais de um distúrbio primário ou compensação inadequada)
    if len(disturbio_primario) > 1 or "misto" in " ".join(disturbio_primario).lower():
        analise.append("Distúrbio ácido-base misto detectado")
        nota_educacional.append("Distúrbios mistos ocorrem quando múltiplos processos patológicos afetam simultaneamente o equilíbrio ácido-base")
    
    # Passo 5: Adicionar distúrbios primários e secundários à análise final
    for item in disturbio_primario:
        analise.append(f"Distúrbio primário: {item}")
    
    for item in disturbio_secundario:
        analise.append(f"Distúrbio secundário: {item}")
    
    # Passo 6: Verificar oxigenação
    if 'pO2' in dados:
        pO2 = dados['pO2']
        if pO2 < REFERENCE_RANGES['pO2'][0]:
            if pO2 < 60:
                analise.append(f"Hipoxemia grave (pO2: {pO2} mmHg)")
                nota_educacional.append("Hipoxemia grave pode exigir suporte ventilatório")
            else:
                analise.append(f"Hipoxemia leve a moderada (pO2: {pO2} mmHg)")
        
        # Calcular relação P/F se houver FiO2
        if 'FiO2' in dados and dados['FiO2'] > 0:
            fio2 = dados['FiO2']
            relacao_pf = pO2 / fio2
            if relacao_pf < 300:
                if relacao_pf < 100:
                    analise.append(f"Relação P/F gravemente reduzida: {relacao_pf:.1f} - compatível com SDRA grave")
                elif relacao_pf < 200:
                    analise.append(f"Relação P/F moderadamente reduzida: {relacao_pf:.1f} - compatível com SDRA moderada")
                else:
                    analise.append(f"Relação P/F levemente reduzida: {relacao_pf:.1f} - compatível com SDRA leve")
    
    # Check Base Excess
    if 'BE' in dados:
        be = dados['BE']
        if be < REFERENCE_RANGES['BE'][0]:
            analise.append(f"Déficit de base (BE: {be})")
            if be < -10:
                nota_educacional.append("Déficit de base acentuado sugere acidose metabólica grave")
        elif be > REFERENCE_RANGES['BE'][1]:
            analise.append(f"Excesso de base (BE: {be})")
            if be > 10:
                nota_educacional.append("Excesso de base acentuado sugere alcalose metabólica grave")
    
    # Check lactate
    if 'Lactato' in dados:
        lactato = dados['Lactato']
        if lactato > REFERENCE_RANGES['Lactato'][1]:
            if lactato > 4:
                analise.append(f"Hiperlactatemia grave (Lactato: {lactato} mg/dL)")
                nota_educacional.append("Hiperlactatemia grave sugere hipoperfusão tissular, considerar choque")
            else:
                analise.append(f"Hiperlactatemia (Lactato: {lactato} mg/dL)")
    
    # Adicionar nota educacional se houver achados significativos
    if nota_educacional:
        analise.append("---")
        analise.append("NOTA EDUCACIONAL:")
        for nota in nota_educacional:
            analise.append(f"• {nota}")
        
        analise.append("---")
        analise.append("INTERPRETAÇÃO SISTEMÁTICA DE GASOMETRIA ARTERIAL (MÉTODO ATS):")
        analise.append("1. Verifique o pH para determinar acidemia ou alcalemia")
        analise.append("2. Verifique pCO2 (causa respiratória) e HCO3- (causa metabólica)")
        analise.append("3. Calcule a compensação esperada para determinar se há distúrbios mistos")
        analise.append("4. Interprete o contexto clínico para determinar a causa subjacente")
    
    return analise

def analisar_eletrólitos(dados):
    """Analyze electrolyte abnormalities."""
    analise = []
    
    # Potassium analysis
    if 'K+' in dados:
        k = dados['K+']
        if k < REFERENCE_RANGES['K+'][0]:
            if k < 3.0:
                analise.append(f"Hipocalemia grave (K+: {k})")
            else:
                analise.append(f"Hipocalemia (K+: {k})")
        elif k > REFERENCE_RANGES['K+'][1]:
            if k > 6.0:
                analise.append(f"Hipercalemia grave (K+: {k})")
            else:
                analise.append(f"Hipercalemia (K+: {k})")
    
    # Sodium analysis
    if 'Na+' in dados:
        na = dados['Na+']
        if na < REFERENCE_RANGES['Na+'][0]:
            if na < 125:
                analise.append(f"Hiponatremia grave (Na+: {na})")
            else:
                analise.append(f"Hiponatremia (Na+: {na})")
        elif na > REFERENCE_RANGES['Na+'][1]:
            if na > 155:
                analise.append(f"Hipernatremia grave (Na+: {na})")
            else:
                analise.append(f"Hipernatremia (Na+: {na})")
    
    # Calcium analysis
    if 'Ca+' in dados:
        ca = dados['Ca+']
        if ca < REFERENCE_RANGES['Ca+'][0]:
            if ca < 7.5:
                analise.append(f"Hipocalcemia grave (Ca+: {ca})")
            else:
                analise.append(f"Hipocalcemia (Ca+: {ca})")
        elif ca > REFERENCE_RANGES['Ca+'][1]:
            if ca > 12:
                analise.append(f"Hipercalcemia grave (Ca+: {ca})")
            else:
                analise.append(f"Hipercalcemia (Ca+: {ca})")
    
    # Ionized calcium analysis
    if 'iCa' in dados:
        ica = dados['iCa']
        if ica < REFERENCE_RANGES['iCa'][0]:
            if ica < 0.90:
                analise.append(f"Hipocalcemia iônica grave (iCa: {ica})")
            else:
                analise.append(f"Hipocalcemia iônica (iCa: {ica})")
        elif ica > REFERENCE_RANGES['iCa'][1]:
            analise.append(f"Hipercalcemia iônica (iCa: {ica})")
    
    # Magnesium analysis
    if 'Mg+' in dados:
        mg = dados['Mg+']
        if mg < REFERENCE_RANGES['Mg+'][0]:
            analise.append(f"Hipomagnesemia (Mg+: {mg})")
        elif mg > REFERENCE_RANGES['Mg+'][1]:
            analise.append(f"Hipermagnesemia (Mg+: {mg})")
    
    return analise

def analisar_hemograma(dados):
    """Analyze complete blood count values."""
    analise = []
    
    if 'Hb' in dados:
        hb = dados['Hb']
        if hb < REFERENCE_RANGES['Hb'][0]:
            if hb < 8:
                analise.append(f"Anemia grave (Hb: {hb})")
            else:
                analise.append(f"Anemia (Hb: {hb})")
        elif hb > REFERENCE_RANGES['Hb'][1]:
            analise.append(f"Policitemia (Hb: {hb})")
    
    if 'Leuco' in dados:
        leuco = dados['Leuco']
        if leuco < REFERENCE_RANGES['Leuco'][0]:
            analise.append(f"Leucopenia (Leuco: {leuco})")
        elif leuco > REFERENCE_RANGES['Leuco'][1]:
            if leuco > 20000:
                analise.append(f"Leucocitose acentuada (Leuco: {leuco})")
            else:
                analise.append(f"Leucocitose (Leuco: {leuco})")
    
    if 'Plaq' in dados:
        plaq = dados['Plaq']
        if plaq < REFERENCE_RANGES['Plaq'][0]:
            if plaq < 50000:
                analise.append(f"Trombocitopenia grave (Plaq: {plaq})")
            else:
                analise.append(f"Trombocitopenia (Plaq: {plaq})")
        elif plaq > REFERENCE_RANGES['Plaq'][1]:
            analise.append(f"Trombocitose (Plaq: {plaq})")
    
    return analise

def analisar_funcao_renal(dados):
    """Analyze renal function parameters."""
    analise = []
    
    if 'Creat' in dados and 'Ur' in dados:
        creat = dados['Creat']
        ur = dados['Ur']
        
        if creat > REFERENCE_RANGES['Creat'][1]:
            if creat > 3.0:
                analise.append(f"Insuficiência renal grave (Creat: {creat})")
            else:
                analise.append(f"Elevação de creatinina (Creat: {creat})")
                
        if ur > REFERENCE_RANGES['Ur'][1]:
            analise.append(f"Elevação de ureia (Ur: {ur})")
            
        # Check BUN/Creatinine ratio for prerenal azotemia
        if creat > REFERENCE_RANGES['Creat'][1] and ur > REFERENCE_RANGES['Ur'][1]:
            bun = ur / 2.14  # Approximate BUN from Urea
            ratio = bun / creat
            if ratio > 20:
                analise.append("Padrão sugestivo de azotemia pré-renal")
    
    return analise

def analisar_funcao_hepatica(dados):
    """Analyze liver function parameters."""
    analise = []
    
    # TGO/TGP analysis
    if 'TGO' in dados and 'TGP' in dados:
        tgo = dados['TGO']
        tgp = dados['TGP']
        
        if tgo > 37 and tgp > 34:
            if tgo > 200 or tgp > 200:
                analise.append(f"Elevação importante de transaminases (TGO: {tgo}, TGP: {tgp})")
            else:
                analise.append(f"Elevação de transaminases (TGO: {tgo}, TGP: {tgp})")
                
            # Check TGO/TGP ratio for alcoholic vs viral pattern
            ratio = tgo / tgp
            if ratio > 2:
                analise.append("Padrão sugestivo de lesão hepática alcoólica")
            elif ratio < 1:
                analise.append("Padrão sugestivo de hepatite viral/medicamentosa")
    
    # Bilirubin analysis
    if 'BT' in dados:
        bt = dados['BT']
        if bt > 1.2:
            if 'BD' in dados and 'BI' in dados:
                bd = dados['BD']
                bi = dados['BI']
                
                if bd > bi:
                    analise.append(f"Hiperbilirrubinemia de predomínio direto (BT: {bt}, BD: {bd})")
                else:
                    analise.append(f"Hiperbilirrubinemia de predomínio indireto (BT: {bt}, BI: {bi})")
            else:
                analise.append(f"Hiperbilirrubinemia (BT: {bt})")
    
    # Other liver markers
    if 'GamaGT' in dados:
        ggt = dados['GamaGT']
        if ggt > 37:
            analise.append(f"Elevação de GGT ({ggt})")
    
    if 'FosfAlc' in dados:
        fa = dados['FosfAlc']
        if fa > 130:
            analise.append(f"Elevação de fosfatase alcalina ({fa})")
    
    return analise

def analisar_marcadores_cardiacos(dados):
    """Analyze cardiac markers."""
    analise = []
    
    if 'Tropo' in dados:
        tropo = dados['Tropo']
        if tropo > 0.01:
            if tropo > 0.1:
                analise.append(f"Troponina elevada - significativa ({tropo})")
            else:
                analise.append(f"Troponina elevada ({tropo})")
    
    if 'CK-MB' in dados:
        ckmb = dados['CK-MB']
        if ckmb > 25:
            analise.append(f"CK-MB elevada ({ckmb})")
    
    if 'BNP' in dados:
        bnp = dados['BNP']
        if bnp > 100:
            if bnp > 400:
                analise.append(f"BNP muito elevado ({bnp}) - IC provável")
            else:
                analise.append(f"BNP elevado ({bnp})")
    
    return analise

def analisar_inflamatorios(dados):
    """Analyze inflammatory markers."""
    analise = []
    
    if 'PCR' in dados:
        pcr = dados['PCR']
        if pcr > REFERENCE_RANGES['PCR'][1]:
            if pcr > 10:
                analise.append(f"PCR muito elevada ({pcr})")
            else:
                analise.append(f"PCR elevada ({pcr})")
    
    # Add additional inflammatory markers analysis here if needed
    
    return analise

def analisar_metabolico(dados):
    """Analyze metabolic parameters."""
    analise = []
    
    if 'Glicose' in dados:
        glicose = dados['Glicose']
        if glicose < REFERENCE_RANGES['Glicose'][0]:
            if glicose < 50:
                analise.append(f"Hipoglicemia grave ({glicose})")
            else:
                analise.append(f"Hipoglicemia ({glicose})")
        elif glicose > REFERENCE_RANGES['Glicose'][1]:
            if glicose > 250:
                analise.append(f"Hiperglicemia acentuada ({glicose})")
            else:
                analise.append(f"Hiperglicemia ({glicose})")
    
    if 'HbA1c' in dados:
        hba1c = dados['HbA1c']
        if hba1c > 5.7:
            if hba1c >= 6.5:
                analise.append(f"HbA1c elevada - compatível com diabetes ({hba1c}%)")
            else:
                analise.append(f"HbA1c elevada - pré-diabetes ({hba1c}%)")
    
    return analise

def analisar_microbiologia(dados):
    """Analyze microbiology results like blood cultures."""
    analise = []
    
    # Check if blood culture results exist
    if 'Hemocult' in dados:
        resultado = dados['Hemocult']
        
        # Check for negative blood culture
        if "não houve" in resultado.lower() or "negativo" in resultado.lower() or "ausência" in resultado.lower():
            analise.append("Hemocultura negativa - sem crescimento de patógenos")
        else:
            # Process positive blood culture
            analise.append(f"Hemocultura positiva: {resultado}")
            
            # Analyze organism type
            patogenos = {
                'escherichia coli': {
                    'tipo': 'Bacilo Gram-negativo',
                    'grupo': 'Enterobacteriaceae',
                    'comentario': 'Comum em infecções urinárias e abdominais'
                },
                'klebsiella': {
                    'tipo': 'Bacilo Gram-negativo',
                    'grupo': 'Enterobacteriaceae',
                    'comentario': 'Associada a pneumonias e ITU'
                },
                'pseudomonas': {
                    'tipo': 'Bacilo Gram-negativo',
                    'grupo': 'Não-fermentador',
                    'comentario': 'Resistência intrínseca a múltiplos antibióticos'
                },
                'staphylococcus aureus': {
                    'tipo': 'Coco Gram-positivo',
                    'grupo': 'Staphylococcus',
                    'comentario': 'Verificar sensibilidade à oxacilina (MRSA)'
                },
                'staphylococcus epidermidis': {
                    'tipo': 'Coco Gram-positivo',
                    'grupo': 'Staphylococcus coagulase-negativo',
                    'comentario': 'Frequentemente contaminante, avaliar contexto clínico'
                },
                'enterococcus': {
                    'tipo': 'Coco Gram-positivo',
                    'grupo': 'Enterococcus',
                    'comentario': 'Verificar sensibilidade à vancomicina (VRE)'
                },
                'candida': {
                    'tipo': 'Fungo leveduriforme',
                    'grupo': 'Fungo',
                    'comentario': 'Considerar terapia antifúngica empírica'
                },
                'streptococcus pneumoniae': {
                    'tipo': 'Coco Gram-positivo',
                    'grupo': 'Streptococcus',
                    'comentario': 'Verificar sensibilidade à penicilina'
                }
            }
            
            # Identify organism
            for patogeno, info in patogenos.items():
                if patogeno.lower() in resultado.lower():
                    analise.append(f"Organismo identificado: {patogeno.title()} ({info['tipo']})")
                    analise.append(f"Grupo: {info['grupo']}")
                    analise.append(f"Nota clínica: {info['comentario']}")
                    break
            
            # Check for colony count
            if "colônia" in resultado.lower() or "ufc" in resultado.lower():
                if ">4.000" in resultado or ">10.000" in resultado:
                    analise.append("Alta carga microbiana detectada - sugestivo de infecção significativa")
                elif "1.000" in resultado or "2.000" in resultado:
                    analise.append("Moderada carga microbiana - clinicamente significativa")
                elif "<500" in resultado or "isolada" in resultado:
                    analise.append("Baixa carga microbiana - avaliar significado clínico")
            
            # Flag special conditions
            if "esbl" in resultado.lower() or "beta-lactamase" in resultado.lower():
                analise.append("ALERTA: Possível produtor de beta-lactamase de espectro estendido (ESBL)")
            if "kpc" in resultado.lower() or "carbapenemase" in resultado.lower():
                analise.append("ALERTA: Possível produtor de carbapenemase (KPC)")
            if "mrsa" in resultado.lower() or "oxacilina" in resultado.lower() and "resistente" in resultado.lower():
                analise.append("ALERTA: Possível Staphylococcus aureus resistente à meticilina (MRSA)")
            if "24 horas" in resultado.lower():
                analise.append("Nota: Crescimento rápido (24h) - sugestivo de alta carga bacteriana")
    
    # Analyze antibiogram if present
    if 'HemocultAntibiograma' in dados:
        antibiograma = dados['HemocultAntibiograma']
        antibiograma_analise = analisar_antibiograma(antibiograma, 'Hemocult' in dados and dados['Hemocult'])
        analise.extend(antibiograma_analise)
    
    return analise

def analisar_antibiograma(antibiograma, organismo=""):
    """Analyze antibiogram results and provide clinical interpretation."""
    analise = []
    
    # Early return if no data
    if not antibiograma:
        return analise
    
    # Extract sensitivities and resistances
    antibioticos_sensiveis = []
    antibioticos_resistentes = []
    
    # Parse each line for antibiotic and sensitivity
    for linha in antibiograma.split('\n'):
        linha = linha.strip()
        if not linha:
            continue
            
        if 'sensível' in linha.lower():
            antibiotico = linha.split('Sensível')[0].strip()
            antibioticos_sensiveis.append(antibiotico)
        elif 'resistente' in linha.lower():
            antibiotico = linha.split('Resistente')[0].strip()
            antibioticos_resistentes.append(antibiotico)
    
    # Group antibiotics by class
    classes_antibioticos = {
        'Carbapenêmicos': ['meropenem', 'imipenem', 'ertapenem', 'doripenem'],
        'Cefalosporinas 3ª/4ª geração': ['ceftriaxona', 'cefotaxima', 'ceftazidima', 'cefepima'],
        'Cefalosporinas 1ª/2ª geração': ['cefazolina', 'cefuroxima', 'cefoxitina'],
        'Penicilinas': ['ampicilina', 'amoxicilina', 'piperacilina'],
        'Penicilinas + Inibidores': ['amoxicilina/ácido clavulânico', 'ampicilina/sulbactan', 'piperacilina/tazobactan'],
        'Quinolonas': ['ciprofloxacino', 'levofloxacino', 'moxifloxacino', 'norfloxacino'],
        'Aminoglicosídeos': ['gentamicina', 'amicacina', 'tobramicina'],
        'Glicopeptídeos': ['vancomicina', 'teicoplanina'],
        'Macrolídeos': ['eritromicina', 'azitromicina', 'claritromicina'],
        'Outros': ['sulfametoxazol/trimetoprima', 'aztreonam', 'polimixina', 'colistina', 'tigeciclina', 'linezolida', 'clindamicina']
    }
    
    # Group sensitive antibiotics by class
    sensibilidade_por_classe = {}
    for antibiotico in antibioticos_sensiveis:
        for classe, lista in classes_antibioticos.items():
            for ab in lista:
                if ab.lower() in antibiotico.lower():
                    if classe not in sensibilidade_por_classe:
                        sensibilidade_por_classe[classe] = []
                    sensibilidade_por_classe[classe].append(antibiotico)
                    break
    
    # Identify resistance patterns
    padroes_resistencia = []
    
    # Check for ESBL
    esbl_markers = ['ceftriaxona', 'cefotaxima', 'ceftazidima', 'cefepima', 'aztreonam']
    esbl_count = sum(1 for ab in antibioticos_resistentes if any(marker.lower() in ab.lower() for marker in esbl_markers))
    carbapenem_resistant = any('meropenem' in ab.lower() or 'imipenem' in ab.lower() or 'ertapenem' in ab.lower() for ab in antibioticos_resistentes)
    
    if esbl_count >= 3 and not carbapenem_resistant and 'esbl' in antibiograma.lower():
        padroes_resistencia.append("ESBL (Beta-lactamase de espectro estendido)")
    
    # Check for carbapenem resistance
    if carbapenem_resistant:
        padroes_resistencia.append("Resistência a carbapenêmicos (possível KPC ou MBL)")
    
    # Check for multi-drug resistance (MDR)
    mdr_classes = [
        sum(1 for ab in antibioticos_resistentes if any(carbapenem.lower() in ab.lower() for carbapenem in classes_antibioticos['Carbapenêmicos'])) > 0,
        sum(1 for ab in antibioticos_resistentes if any(cef.lower() in ab.lower() for cef in classes_antibioticos['Cefalosporinas 3ª/4ª geração'])) > 0,
        sum(1 for ab in antibioticos_resistentes if any(quinolona.lower() in ab.lower() for quinolona in classes_antibioticos['Quinolonas'])) > 0,
        sum(1 for ab in antibioticos_resistentes if any(amino.lower() in ab.lower() for amino in classes_antibioticos['Aminoglicosídeos'])) > 0
    ]
    
    if sum(mdr_classes) >= 3:
        padroes_resistencia.append("Multi-droga resistente (MDR) - resistência a ≥3 classes de antibióticos")
    
    # Generate analysis
    analise.append("\nInterpretação do Antibiograma:")
    
    # Add resistance patterns
    if padroes_resistencia:
        analise.append("Padrões de resistência detectados:")
        for padrao in padroes_resistencia:
            analise.append(f"  • {padrao}")
    
    # Add sensitivity by class
    if sensibilidade_por_classe:
        analise.append("Antibióticos com sensibilidade preservada por classe:")
        for classe, antibioticos in sensibilidade_por_classe.items():
            analise.append(f"  • {classe}: {', '.join(antibioticos)}")
    
    # Suggest treatment options
    analise.append("Opções terapêuticas potenciais (confirmar com sensibilidade in vitro):")
    
    # Check for carbapenem sensitivity first (preferred for severe infections)
    if 'Carbapenêmicos' in sensibilidade_por_classe:
        analise.append(f"  • Primeira escolha: {sensibilidade_por_classe['Carbapenêmicos'][0]} (amplo espectro)")
    
    # Check for other options
    alternative_classes = ['Quinolonas', 'Aminoglicosídeos', 'Outros']
    for classe in alternative_classes:
        if classe in sensibilidade_por_classe:
            analise.append(f"  • Alternativa: {sensibilidade_por_classe[classe][0]}")
            break
    
    # Special notes for certain organisms
    if "escherichia coli" in organismo.lower() and "esbl" in antibiograma.lower():
        analise.append("  • Nota: E. coli ESBL+ geralmente mantém sensibilidade aos carbapenêmicos")
    
    return analise

def extrair_id(pdf_path):
    try:
    with open(pdf_path, 'rb') as arquivo_pdf:
        leitor = PyPDF2.PdfReader(arquivo_pdf)
        primeira_pagina = leitor.pages[0]
        texto_primeira_pagina = primeira_pagina.extract_text()

            # Updated pattern to capture name after numbers
            padrao_nome = r'Paciente\.+:[\d-]+([^\n]+?)(?:Requisição)'
            correspondencia_nome = re.search(padrao_nome, texto_primeira_pagina, re.IGNORECASE)
            nome = correspondencia_nome.group(1).strip() if correspondencia_nome else "Nome não encontrado"

            padrao_data = r"Coletado em: (\d{2}/\d{2}/\d{4})"
            correspondencia_data = re.search(padrao_data, texto_primeira_pagina, re.IGNORECASE)
            data = correspondencia_data.group(1).strip() if correspondencia_data else "Data não encontrada"

            padrao_hora = r"Coletado em: \d{2}/\d{2}/\d{4} (\d{2}:\d{2})"
            correspondencia_hora = re.search(padrao_hora, texto_primeira_pagina, re.IGNORECASE)
            hora = correspondencia_hora.group(1).strip() if correspondencia_hora else "Hora não encontrada"

        return nome, data, hora
    except Exception as e:
        print(f"Erro ao extrair ID: {e}")
        return "Nome não encontrado", "Data não encontrada", "Hora não encontrada"

def calcular_clearance_creatinina(creatinina, paciente):
    """
    Calculate creatinine clearance using different formulas based on available data.
    Returns a dictionary with results from different formulas.
    """
    results = {}
    
    if not creatinina or not paciente.idade or not paciente.sexo:
        return {"erro": "Dados insuficientes. Necessário: creatinina, idade e sexo."}
    
    # Cockcroft-Gault formula (requires weight)
    if paciente.peso:
        factor = 1.0 if paciente.sexo == 'M' else 0.85
        cg = ((140 - paciente.idade) * paciente.peso * factor) / (72 * creatinina)
        results["Cockcroft-Gault"] = round(cg, 2)
    
    # MDRD formula (4-variable)
    sexo_factor = 1.0 if paciente.sexo == 'M' else 0.742
    etnia_factor = 1.212 if paciente.etnia == 'negro' else 1.0
    
    mdrd = 175 * (creatinina ** -1.154) * (paciente.idade ** -0.203) * sexo_factor * etnia_factor
    results["MDRD"] = round(mdrd, 2)
    
    # CKD-EPI formula
    if paciente.sexo == 'M':
        if creatinina <= 0.9:
            ckd_epi = 141 * ((creatinina/0.9) ** -0.411) * (0.993 ** paciente.idade)
        else:
            ckd_epi = 141 * ((creatinina/0.9) ** -1.209) * (0.993 ** paciente.idade)
    else:  # Female
        if creatinina <= 0.7:
            ckd_epi = 144 * ((creatinina/0.7) ** -0.329) * (0.993 ** paciente.idade)
        else:
            ckd_epi = 144 * ((creatinina/0.7) ** -1.209) * (0.993 ** paciente.idade)
    
    # Apply ethnicity factor for CKD-EPI
    if paciente.etnia == 'negro':
        ckd_epi *= 1.159
        
    results["CKD-EPI"] = round(ckd_epi, 2)
    
    # Schwartz formula for pediatric patients (age < 18)
    if paciente.idade < 18 and paciente.altura:
        k = 0.413  # constant for children and adolescent females
        if paciente.sexo == 'M' and paciente.idade >= 13:
            k = 0.70  # adolescent males
        schwartz = (k * paciente.altura) / creatinina
        results["Schwartz (Pediátrico)"] = round(schwartz, 2)
    
    # Add interpretation
    if "CKD-EPI" in results:
        ckd = results["CKD-EPI"]
        if ckd >= 90:
            results["Interpretação"] = "Função renal normal ou levemente reduzida (Estágio 1)"
        elif ckd >= 60:
            results["Interpretação"] = "Insuficiência renal leve a moderada (Estágio 2)"
        elif ckd >= 30:
            results["Interpretação"] = "Insuficiência renal moderada a grave (Estágio 3)"
        elif ckd >= 15:
            results["Interpretação"] = "Insuficiência renal grave (Estágio 4)"
        else:
            results["Interpretação"] = "Insuficiência renal terminal (Estágio 5)"
    
    return results

def calcular_sofa(dados, paciente=None):
    """
    Calculate SOFA (Sequential Organ Failure Assessment) score
    Returns the total score and breakdown by system
    """
    score = {
        "Respiratório": 0,
        "Coagulação": 0,
        "Hepático": 0,
        "Cardiovascular": 0,
        "SNC": 0,
        "Renal": 0,
        "Total": 0
    }
    
    # PaO2/FiO2 ratio - Respiratory
    if 'pO2' in dados and 'FiO2' in dados:
        pao2_fio2 = dados['pO2'] / dados['FiO2']
        
        if pao2_fio2 < 100:
            score["Respiratório"] = 4
        elif pao2_fio2 < 200:
            score["Respiratório"] = 3
        elif pao2_fio2 < 300:
            score["Respiratório"] = 2
        elif pao2_fio2 < 400:
            score["Respiratório"] = 1
    
    # Platelets - Coagulation
    if 'Plaq' in dados:
        plaq = dados['Plaq'] / 1000  # Convert to x10^3/µL if needed
        
        if plaq < 20:
            score["Coagulação"] = 4
        elif plaq < 50:
            score["Coagulação"] = 3
        elif plaq < 100:
            score["Coagulação"] = 2
        elif plaq < 150:
            score["Coagulação"] = 1
    
    # Bilirubin - Liver
    if 'BT' in dados:
        bt = dados['BT']
        
        if bt > 12:
            score["Hepático"] = 4
        elif bt > 6:
            score["Hepático"] = 3
        elif bt > 2:
            score["Hepático"] = 2
        elif bt > 1.2:
            score["Hepático"] = 1
    
    # Creatinine - Renal
    if 'Creat' in dados:
        creat = dados['Creat']
        
        if creat > 5.0:
            score["Renal"] = 4
        elif creat > 3.5:
            score["Renal"] = 3
        elif creat > 2.0:
            score["Renal"] = 2
        elif creat > 1.2:
            score["Renal"] = 1
    
    # Note: Cardiovascular and CNS components require clinical data not available in lab results
    # These should be filled in manually or obtained from other sources
    
    # Calculate total score
    score["Total"] = sum(v for k, v in score.items() if k != "Total")
    
    # Add interpretation
    if score["Total"] < 6:
        score["Interpretação"] = "Disfunção orgânica leve (<6 pontos)"
    elif score["Total"] < 10:
        score["Interpretação"] = "Disfunção orgânica moderada (6-9 pontos)"
    else:
        score["Interpretação"] = "Disfunção orgânica grave (≥10 pontos). Mortalidade esperada >40%."
    
    return score

def calcular_apache_ii(dados, paciente):
    """
    Calculate APACHE II score - requires lab data and clinical data
    Note: This is a simplified version, complete APACHE II requires more clinical data
    """
    if not paciente or not paciente.idade:
        return {"erro": "Dados do paciente insuficientes para cálculo do APACHE II"}
    
    score = 0
    pontos_fisiologicos = 0
    
    # Temperature - requires clinical data, not typically in lab results
    # Heart rate - requires clinical data, not typically in lab results
    # Respiratory rate - requires clinical data, not typically in lab results
    # MAP - requires clinical data, not typically in lab results
    
    # Oxygenation
    if 'pO2' in dados and 'FiO2' in dados:
        pao2_fio2 = dados['pO2'] / dados['FiO2']
        
        if dados.get('FiO2', 0) < 0.5:  # FiO2 < 50%
            if dados['pO2'] < 55:
                pontos_fisiologicos += 4
            elif dados['pO2'] < 60:
                pontos_fisiologicos += 3
            elif dados['pO2'] < 70:
                pontos_fisiologicos += 1
        else:  # FiO2 >= 50%
            if pao2_fio2 < 200:
                pontos_fisiologicos += 4
            elif pao2_fio2 < 350:
                pontos_fisiologicos += 2
    
    # Arterial pH
    if 'pH' in dados:
        ph = dados['pH']
        if ph < 7.15:
            pontos_fisiologicos += 4
        elif ph < 7.25:
            pontos_fisiologicos += 3
        elif ph < 7.33:
            pontos_fisiologicos += 2
        elif ph > 7.6:
            pontos_fisiologicos += 4
        elif ph > 7.5:
            pontos_fisiologicos += 3
        elif ph > 7.45:
            pontos_fisiologicos += 1
    
    # Sodium
    if 'Na+' in dados:
        na = dados['Na+']
        if na < 110:
            pontos_fisiologicos += 4
        elif na < 120:
            pontos_fisiologicos += 3
        elif na < 130:
            pontos_fisiologicos += 2
        elif na < 135:
            pontos_fisiologicos += 1
        elif na > 180:
            pontos_fisiologicos += 4
        elif na > 170:
            pontos_fisiologicos += 3
        elif na > 160:
            pontos_fisiologicos += 2
        elif na > 155:
            pontos_fisiologicos += 1
    
    # Potassium
    if 'K+' in dados:
        k = dados['K+']
        if k < 2.5:
            pontos_fisiologicos += 4
        elif k < 3.0:
            pontos_fisiologicos += 3
        elif k < 3.5:
            pontos_fisiologicos += 1
        elif k > 7.0:
            pontos_fisiologicos += 4
        elif k > 6.0:
            pontos_fisiologicos += 3
        elif k > 5.5:
            pontos_fisiologicos += 2
        elif k > 5.0:
            pontos_fisiologicos += 1
    
    # Creatinine
    if 'Creat' in dados:
        creat = dados['Creat']
        # Double points if acute renal failure
        arf_factor = 2  # would need clinical info to determine if ARF
        if creat > 3.5:
            pontos_fisiologicos += 4 * arf_factor
        elif creat > 2.0:
            pontos_fisiologicos += 3 * arf_factor
        elif creat > 1.5:
            pontos_fisiologicos += 2 * arf_factor
    
    # Hematocrit
    if 'Ht' in dados:
        ht = dados['Ht']
        if ht < 20:
            pontos_fisiologicos += 4
        elif ht < 30:
            pontos_fisiologicos += 2
        elif ht < 46:
            pontos_fisiologicos += 0
        elif ht > 60:
            pontos_fisiologicos += 4
        elif ht > 50:
            pontos_fisiologicos += 2
    
    # White blood cell count
    if 'Leuco' in dados:
        wbc = dados['Leuco'] / 1000  # Convert to 10^3/uL
        if wbc < 1.0:
            pontos_fisiologicos += 4
        elif wbc < 3.0:
            pontos_fisiologicos += 2
        elif wbc > 40.0:
            pontos_fisiologicos += 4
        elif wbc > 20.0:
            pontos_fisiologicos += 2
        elif wbc > 15.0:
            pontos_fisiologicos += 1
    
    # Glasgow Coma Scale - requires clinical data, not in lab results
    # Assume normal (GCS 15) if not provided
    gcs = 15
    pontos_fisiologicos += (15 - gcs)
    
    # Age points
    if paciente.idade >= 75:
        score += 6
    elif paciente.idade >= 65:
        score += 5
    elif paciente.idade >= 55:
        score += 3
    elif paciente.idade >= 45:
        score += 2
    
    # Chronic health points
    # Would need clinical history, assuming none for now
    
    # Total score
    total_score = pontos_fisiologicos + score
    
    # Calculate mortality based on score
    if total_score <= 4:
        mortality = "4%"
    elif total_score <= 9:
        mortality = "8%"
    elif total_score <= 14:
        mortality = "15%"
    elif total_score <= 19:
        mortality = "25%"
    elif total_score <= 24:
        mortality = "40%"
    elif total_score <= 29:
        mortality = "55%"
    elif total_score <= 34:
        mortality = "75%"
    else:
        mortality = "85%"
    
    return {
        "Pontuação": total_score,
        "Pontos Fisiológicos": pontos_fisiologicos,
        "Mortalidade Hospitalar Estimada": mortality,
        "Nota": "APACHE II simplificado - Baseado apenas em dados laboratoriais. Para cálculo completo, adicione dados clínicos (temperatura, FC, FR, PAM, GCS, doença crônica)."
    }

def solicitar_dados_paciente():
    """Collect patient data from user input"""
    print("\n=== DADOS DO PACIENTE ===")
    nome = input("Nome do paciente: ").strip()
    
    idade = None
    while idade is None:
        try:
            idade_str = input("Idade (anos): ").strip()
            if idade_str:
                idade = int(idade_str)
        except ValueError:
            print("Idade inválida. Por favor, informe um número inteiro.")
    
    sexo = None
    while sexo not in ['M', 'F', '']:
        sexo = input("Sexo (M/F): ").strip().upper()
    
    peso = None
    while peso is None:
        try:
            peso_str = input("Peso (kg): ").strip()
            if peso_str:
                peso = float(peso_str)
        except ValueError:
            print("Peso inválido. Por favor, informe um número válido.")
    
    altura = None
    while altura is None:
        try:
            altura_str = input("Altura (cm): ").strip()
            if altura_str:
                altura = float(altura_str)
        except ValueError:
            print("Altura inválida. Por favor, informe um número válido.")
    
    etnia = input("Etnia (negro, branco, asiatico, outro): ").strip().lower()
    
    # Return patient data
    return PatientData(nome=nome, idade=idade, sexo=sexo, peso=peso, altura=altura, etnia=etnia)

def main():
    try:
        # Allow user to select PDF file
        pdf_path = input("Digite o caminho completo do arquivo PDF ou arraste o arquivo para esta janela: ").strip().strip('"')
        
        if not os.path.exists(pdf_path):
            print(f"Arquivo não encontrado: {pdf_path}")
            input("Pressione Enter para sair...")
            return
        
        # Ask if user wants to input patient data
        incluir_dados_paciente = input("Deseja incluir dados do paciente para cálculos adicionais? (S/N): ").strip().upper() == 'S'
        
        # Get patient data if requested
        paciente = None
        if incluir_dados_paciente:
            paciente = solicitar_dados_paciente()
        
        nome, data, hora = extrair_id(pdf_path)
        
        resultados = []
        analises = []
        
        # Add patient info
        if paciente:
            dados_paciente = {'Nome': paciente.nome or nome, 'Data': data, 'Hora': hora}
            resultados.append(str(paciente))
        else:
        dados_paciente = {'Nome': nome, 'Data': data, 'Hora': hora}
        resultados.append(f"Nome: {nome}")
        resultados.append(f"Data: {data}")
        resultados.append(f"Hora: {hora}")
        
        # Process all pages in the PDF
        with open(pdf_path, 'rb') as arquivo_pdf:
            leitor = PyPDF2.PdfReader(arquivo_pdf)
            total_paginas = len(leitor.pages)
        
        # Combined data from all pages
        dados_combinados = {}
        
        for numero_da_pagina in range(total_paginas):
            try:
            dados_pagina = extrair_campos_pagina(pdf_path, numero_da_pagina + 1)
            dados_combinados.update(dados_pagina)
            except Exception as e:
                print(f"Erro ao processar página {numero_da_pagina + 1}: {e}")
        
        # Add a new category for cultures and qualitative tests
        categorias = {
            'Sistema Hematológico': ['Hb', 'Ht', 'Leuco', 'Bastões', 'Segm', 'Plaq'],
            
            'Sistema Renal/Metabólico': ['Creat', 'Ur', 'Na+', 'K+', 'Ca+', 'Mg+', 'iCa', 
                                          'pH', 'pCO2', 'pO2', 'HCO3-', 'BE', 'SpO2', 'Lactato', 
                                          'Glicose', 'HbA1c'],
            
            'Sistema Cardiovascular': ['BNP', 'CK-MB', 'Tropo'],
            
            'Sistema Digestivo/Hepático': ['TGO', 'TGP', 'BT', 'BD', 'BI', 'GamaGT', 'FosfAlc', 'Amilase', 'Lipase'],
            
            'Sistema de Coagulação': ['RNI', 'TTPA'],
            
            'Marcadores Inflamatórios': ['PCR'],
            
            'Culturas e Sorologias': ['Hemocult', 'HemocultAntibiograma', 'Urocult', 'CultVigilNasal', 'CultVigilRetal', 
                                      'BetaHCG', 'HBsAg', 'AntiHBs', 'AntiHBcTotal', 'AntiHVAIgM', 'HCV', 'HIV', 'VDRL', 
                                      'CoombsDir', 'GrupoABO', 'FatorRh', 'DengueNS1']
        }
        
        # Print what values were extracted (for debugging)
        print("\nValores extraídos:")
        for key, value in dados_combinados.items():
            print(f"{key}: {value}")
        
        # Format and print results by category
        for categoria, campos in categorias.items():
            campos_presentes = [campo for campo in campos if campo in dados_combinados]
            
            if campos_presentes:
                resultados.append(f"\n{categoria}:")
                for campo in campos_presentes:
                    resultados.append(f"  {campo}: {dados_combinados[campo]}")
        
        # Run analyses based on the new organization
        # Gasometria and electrolytes (now part of renal/metabolic)
        if any(campo in dados_combinados for campo in ['pH', 'pCO2']):
            gaso_analise = analisar_gasometria(dados_combinados)
            if gaso_analise:
                analises.append("\nAnálise de Gases Arteriais:")
                for resultado in gaso_analise:
                    analises.append(f"  - {resultado}")
        
        # Electrolytes analysis
        if any(campo in dados_combinados for campo in ['Na+', 'K+', 'Ca+', 'Mg+', 'iCa']):
            eletro_analise = analisar_eletrólitos(dados_combinados)
            if eletro_analise:
                analises.append("\nAnálise de Eletrólitos:")
                for resultado in eletro_analise:
                    analises.append(f"  - {resultado}")
        
        # Hematologic analysis
        if any(campo in dados_combinados for campo in ['Hb', 'Ht', 'Leuco', 'Plaq']):
            hemo_analise = analisar_hemograma(dados_combinados)
            if hemo_analise:
                analises.append("\nAnálise Hematológica:")
                for resultado in hemo_analise:
                    analises.append(f"  - {resultado}")
        
        # Renal function
        if any(campo in dados_combinados for campo in ['Creat', 'Ur']):
            renal_analise = analisar_funcao_renal(dados_combinados)
            if renal_analise:
                analises.append("\nAnálise da Função Renal:")
                for resultado in renal_analise:
                    analises.append(f"  - {resultado}")
        
                # Add creatinine clearance calculation if patient data available
                if paciente and 'Creat' in dados_combinados:
                    clearance = calcular_clearance_creatinina(dados_combinados['Creat'], paciente)
                    analises.append("\nClearance de Creatinina:")
                    for formula, valor in clearance.items():
                        if formula != "erro":
                            if formula == "Interpretação":
                                analises.append(f"  - {valor}")
                            else:
                                analises.append(f"  - {formula}: {valor} mL/min/1.73m²")
        
        # Hepatic function
        if any(campo in dados_combinados for campo in ['TGO', 'TGP', 'BT', 'BD', 'BI', 'GamaGT', 'FosfAlc']):
            hepatica_analise = analisar_funcao_hepatica(dados_combinados)
            if hepatica_analise:
                analises.append("\nAnálise da Função Hepática:")
                for resultado in hepatica_analise:
                analises.append(f"  - {resultado}")
                    
        # Cardiac markers
        if any(campo in dados_combinados for campo in ['BNP', 'CK-MB', 'Tropo']):
            cardiac_analise = analisar_marcadores_cardiacos(dados_combinados)
            if cardiac_analise:
                analises.append("\nAnálise de Marcadores Cardíacos:")
                for resultado in cardiac_analise:
                    analises.append(f"  - {resultado}")
        
        # Inflammatory markers
        if 'PCR' in dados_combinados:
            infl_analise = analisar_inflamatorios(dados_combinados)
            if infl_analise:
                analises.append("\nAnálise de Marcadores Inflamatórios:")
                for resultado in infl_analise:
                    analises.append(f"  - {resultado}")
        
        # Metabolic analysis
        if any(campo in dados_combinados for campo in ['Glicose', 'HbA1c']):
            metab_analise = analisar_metabolico(dados_combinados)
            if metab_analise:
                analises.append("\nAnálise Metabólica:")
                for resultado in metab_analise:
                    analises.append(f"  - {resultado}")
        
        # After all other analyses, add microbiology analysis
        if any(campo in dados_combinados for campo in ['Hemocult', 'HemocultAntibiograma', 'Urocult']):
            micro_analise = analisar_microbiologia(dados_combinados)
            if micro_analise:
                analises.append("\nAnálise Microbiológica:")
                for resultado in micro_analise:
                    analises.append(f"  - {resultado}")
        
        # Add severity scores if patient data is available
        if paciente:
            analises.append("\n=== ESCORES DE GRAVIDADE ===")
            
            # SOFA Score
            sofa = calcular_sofa(dados_combinados, paciente)
            analises.append("\nSOFA Score:")
            analises.append(f"  - Pontuação Total: {sofa['Total']} pontos")
            for sistema, pontos in sofa.items():
                if sistema not in ["Total", "Interpretação"]:
                    analises.append(f"  - {sistema}: {pontos} pontos")
            if "Interpretação" in sofa:
                analises.append(f"  - {sofa['Interpretação']}")
            
            # APACHE II Score (simplified version)
            apache = calcular_apache_ii(dados_combinados, paciente)
            if "erro" not in apache:
                analises.append("\nAPACHE II Score (simplificado):")
                analises.append(f"  - Pontuação Total: {apache['Pontuação']} pontos")
                analises.append(f"  - Mortalidade estimada: {apache['Mortalidade Hospitalar Estimada']}")
                analises.append(f"  - Nota: {apache['Nota']}")
        
        # Combine results and analysis
        if analises:
            resultados.extend(["\n=== ANÁLISE CLÍNICA ==="])
            resultados.extend(analises)
        
        # Format and display results
        resultados_texto = '\n'.join(resultados)
        try:
        pyperclip.copy(resultados_texto)
        print("\nResultados copiados para a área de transferência!")
        except Exception as e:
            print(f"\nNão foi possível copiar para a área de transferência: {e}")
        
        print(resultados_texto)
        
    except Exception as e:
        print(f"Erro: {e}")
        import traceback
        traceback.print_exc()
    
    input("\nPressione Enter para sair...")

if __name__ == "__main__":
    main()