"""
Regular expression patterns for extracting lab test results from PDF text.
"""

# Dictionary of regex patterns for extracting data from lab tests
CAMPOS_DESEJADOS = {
    # Hemograma
    'Hb': r'HEMOGLOBINA\.+:\s*([\d,.]+)|HEMOGLOBINA[\s\S]*?:\s*([\d,.]+)',
    'Ht': r'HEMAT[ÓO]CRITO\.+:\s*([\d,.]+)|HEMATOCRITO[\s\S]*?:\s*([\d,.]+)',
    'Leuco': r'LEUC[ÓO]CITOS\.+:\s*([\d,.]+)|LEUCOCITOS[\s\S]*?:\s*([\d,.]+)', # Total leukocytes
    'Plaq': r'PLAQUETAS[:.]+\s*([\d,.]+)',
    'Retic': r'CONTAGEM DE RETICULOCITOS[\s\S]*?Resultado[\s\S]*?:\s*([\d,.]+)',
    
    # Differential Leukocytes - New Patterns
    'Bastonetes_perc': r'BAST[OÕ]NETES\.+:\s*([\d,.]+)\s*%',
    'Bastonetes_abs':  r'BAST[OÕ]NETES\.+:(?:[^%\\n]*?%[^/\\n]*?)?([\d,.]+)\s*(?:/mm³|/µL|/\xb5L)?',

    'Segmentados_perc': r'(?:SEGMENTADOS|NEUTR[ÓO]FILOS\s*SEGMENTADOS)\.+:\s*([\d,.]+)\s*%',
    'Segmentados_abs':  r'(?:SEGMENTADOS|NEUTR[ÓO]FILOS\s*SEGMENTADOS)\.+(?:[^%\\n]*?%[^/\\n]*?)?([\d,.]+)\s*(?:/mm³|/µL|/\xb5L)?',

    'Linfocitos_perc': r'LINF[OÓ]CITOS(?:\s*T[ÍI]PICOS)?\.+:\s*([\d,.]+)\s*%',
    'Linfocitos_abs':  r'LINF[OÓ]CITOS(?:\s*T[ÍI]PICOS)?\.+(?:[^%\\n]*?%[^/\\n]*?)?([\d,.]+)\s*(?:/mm³|/µL|/\xb5L)?',
    
    'Monocitos_perc': r'MON[OÓ]CITOS\.+:\s*([\d,.]+)\s*%',
    'Monocitos_abs':  r'MON[OÓ]CITOS\.+(?:[^%\\n]*?%[^/\\n]*?)?([\d,.]+)\s*(?:/mm³|/µL|/\xb5L)?',

    'Eosinofilos_perc': r'EOSIN[OÓ]FILOS\.+:\s*([\d,.]+)\s*%',
    'Eosinofilos_abs':  r'EOSIN[OÓ]FILOS\.+(?:[^%\\n]*?%[^/\\n]*?)?([\d,.]+)\s*(?:/mm³|/µL|/\xb5L)?',

    'Basofilos_perc': r'BAS[OÓ]FILOS\.+:\s*([\d,.]+)\s*%',
    'Basofilos_abs':  r'BAS[OÓ]FILOS\.+(?:[^%\\n]*?%[^/\\n]*?)?([\d,.]+)\s*(?:/mm³|/µL|/\xb5L)?',

    'Mielocitos_perc': r'MIEL[OÓ]CITOS\.+:\s*([\d,.]+)\s*%',
    'Mielocitos_abs':  r'MIEL[OÓ]CITOS\.+(?:[^%\\n]*?%[^/\\n]*?)?([\d,.]+)\s*(?:/mm³|/µL|/\xb5L)?',

    'Metamielocitos_perc': r'METAMIEL[OÓ]CITOS\.+:\s*([\d,.]+)\s*%',
    'Metamielocitos_abs':  r'METAMIEL[OÓ]CITOS\.+(?:[^%\\n]*?%[^/\\n]*?)?([\d,.]+)\s*(?:/mm³|/µL|/\xb5L)?',

    # Electrolytes
    'K+': r'POT[ÁA]SSIO[\s\S]*?[:.]+\s*([\d,.]+)',
    'Na+': r'S[ÓO]DIO[\s\S]*?[:.]+\s*([\d,.]+)',
    'Ca+': r'C[ÁA]LCIO\s*\n?Resultado\.+:\s*([\d,.]+)',
    'iCa': r'CALCIO IONICO[\s\S]*?:\s*([\d,.]+)',
    'Mg+': r'MAGN[ÉE]SIO\s*\n?Resultado\.+:\s*([\d,.]+)',
    'P': r'F[ÓO]SFORO[\s\S]*?Resultado[\s\S]*?:\s*([\d,.]+)',
    
    # Renal/Hepatic
    'Creat': r'CREATININA\s*\n?Resultado\.+:\s*([\d,.]+)|CREATININA[\s\S]*?:\s*([\d,.]+)',
    'Ur': r'UREIA\s*\n?Resultado\.+:\s*([\d,.]+)|UREIA[\s\S]*?:\s*([\d,.]+)',
    'PCR': r'PCR - PROTEÍNA C REATIVA\s*\n?Resultado\.+:\s*([\d,.]+)',
    'VHS': r'VELOCIDADE DE HEMOSSEDIMENTA[ÇC][ÃA]O(?: SANGUE)?[\s\S]*?Resultado\.+:\s*([\d,.]+)',
    'RNI': r'INR\.+:\s*([\d,.]+)',
    'TTPA': r'(?:TTP\s*-\s*TEMPO DE TROMBOPLASTINA PARCIAL|TTPA(?:[\s:-]*TEMPO DE TROMBOPLASTINA PARCIAL ATIVADA)?|TEMPO DE TROMBOPLASTINA PARCIAL ATIVADA)[\s\S]*?Resultado\.+:\s*([\d,.]+)',
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
    'AntiHBcIgM': r'HEPATITE B - ANTI-HBC IGM[\s\S]*?Resultado[\s\S]*?:\s*([^\n]+)',
    'AntiHBcIgG': r'HEPATITE B - ANTI-HBC IGM[\s\S]*?Resultado[\s\S]*?:\s*([^\n]+)',
    'AntiHVAIgM': r'HEPATITE A - ANTI - HVA IGM[\s\S]*?Leitura[\s\S]*?:\s*([^\n]+)',
    'HCV': r'HEPATITE C[\s\S]*?Resultado[\s\S]*?:\s*([^\n]+)',
    'HIV': r'HIV[\s\S]*?Resultado[\s\S]*?:\s*([^\n]+)',
    'VDRL': r'VDRL[\s\S]*?Resultado[\s\S]*?:\s*([^\n]+)',
    'DengueNS1': r'DENGUE - ANTÍGENO NS1[\s\S]*?Resultado[\s\S]*?:\s*([^\n]+)',
} 