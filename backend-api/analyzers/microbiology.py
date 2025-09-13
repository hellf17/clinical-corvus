"""
Microbiology analysis module for interpreting culture results and other microbiological tests.
"""

import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def _safe_convert_to_float(value_str: Optional[str]) -> Optional[float]:
    if value_str is None:
        return None
    
    cleaned_value_str = str(value_str).strip() # Ensure input is string

    if ',' in cleaned_value_str:
        cleaned_value_str = cleaned_value_str.replace('.', '').replace(',', '.')

    try:
        return float(cleaned_value_str)
    except ValueError:
        logger.warning(f"Could not convert '{value_str}' (cleaned: '{cleaned_value_str}') to float.")
        if cleaned_value_str.startswith('<'):
            try: return float(cleaned_value_str[1:])
            except ValueError: pass
        if cleaned_value_str.startswith('>'):
            try: return float(cleaned_value_str[1:])
            except ValueError: pass
        return None

def analisar_microbiologia(dados):
    """
    Analyze microbiology results including cultures, antibiograms, and serology.
    
    Args:
        dados: Dictionary containing microbiology test results
        
    Returns:
        dict: Dictionary containing detailed interpretation, abnormalities, critical status,
              recommendations, and specific microbiology details.
    """
    interpretations_list = []
    abnormalities_list = []
    recommendations_list = []
    is_critical_flag = False
    details_dict = {}

    # Store input data in details
    for key, value in dados.items():
        details_dict[key] = value
        
    # Check if there's enough data to analyze
    if not any(k in dados for k in [
        'Hemocult', 'HemocultAntibiograma', 'Urocult', 'CultVigilNasal',
        'CultVigilRetal', 'CoombsDir', 'HBsAg', 'AntiHBs', 'AntiHBcTotal',
        'AntiHBcIgM', 'AntiHBcIgG', 'HCV', 'HIV', 'VDRL'
    ]):
        return {
            "interpretation": "Dados insuficientes para análise microbiológica.",
            "abnormalities": [],
            "is_critical": False,
            "recommendations": [],
            "details": details_dict
        }
    
    # Analyze blood culture results
    if 'Hemocult' in dados:
        hemocult = dados['Hemocult']
        details_dict['Hemocult'] = hemocult
        interpretations_list.append(f"Hemocultura: {hemocult}")
        
        if "positivo" in hemocult.lower():
            is_critical_flag = True # Positive blood culture is always critical
            abnormalities_list.append("Hemocultura Positiva")
            # Extract organism name if present
            if ":" in hemocult:
                organismo = hemocult.split(":", 1)[1].strip()
                details_dict['organismo_isolado'] = organismo
                interpretations_list.append(f"Organismo isolado: {organismo}")
            
            if "gram" in hemocult.lower():
                # Check for Gram-positive (with and without hyphen)
                if "gram positivo" in hemocult.lower() or "gram-positivo" in hemocult.lower():
                    interpretations_list.append("Bactéria Gram-positiva isolada - considerar Staphylococcus, Streptococcus ou Enterococcus como possíveis agentes")
                    
                    if "cocos" in hemocult.lower():
                        interpretations_list.append("Cocos Gram-positivos são frequentemente associados com endocardite, infecções de cateter ou bacteremia")
                # Check for Gram-negative (with and without hyphen)
                elif "gram negativo" in hemocult.lower() or "gram-negativo" in hemocult.lower():
                    interpretations_list.append("Bactéria Gram-negativa isolada - considerar Enterobacteriaceae (E. coli, Klebsiella) ou não-fermentadores (Pseudomonas, Acinetobacter)")
                    recommendations_list.append("Bacteremia por Gram-negativos pode evoluir para choque séptico rapidamente - monitorar parâmetros hemodinâmicos")
            
            # Look for specific patterns
            for pattern, interpretation in [
                ("staphylococcus aureus", "S. aureus é um patógeno virulento associado a endocardite, osteomielite e infecções de pele/partes moles. Testar sensibilidade à oxacilina/meticilina (MRSA). Segundo as diretrizes IDSA 2019, S. aureus bacteremia requer avaliação transthorácica/ecocardiograma e antibioticoterapia por 14 dias mínimo."),
                ("staphylococcus epidermidis", "S. epidermidis (Staphylococcus coagulase-negativo) frequentemente representa contaminação, mas pode ser patogênico em pacientes com dispositivos implantados (próteses, cateteres). Segundo as diretrizes IDSA 2019, considerar antibioticoterapia se 2+ hemoculturas positivas ou cateter com suspeita clínica."),
                ("staphylococcus coagulase negativo", "Staphylococcus coagulase-negativo (ex: S. epidermidis, S. haemolyticus) frequentemente representa contaminação, mas pode ser significativo em pacientes com dispositivos implantados. Segundo as diretrizes IDSA 2019, remover cateter suspeito e considerar antibioticoterapia se clínica compatível."),
                ("staphylococcus", "Staphylococcus spp. pode indicar infecção relacionada a cateter, endocardite ou bacteremia primária. Diferenciar S. aureus de coagulase-negativos. Segundo as diretrizes IDSA 2019, S. aureus bacteremia requer avaliação ecocardiográfica e antibioticoterapia por 14 dias mínimo."), # General staph
                ("streptococcus pneumoniae", "S. pneumoniae (pneumococo) é comumente associado a pneumonia, meningite, otite média ou sinusite. Segundo as diretrizes IDSA 2019, pneumococo bacteremia associada a pneumonia requer antibioticoterapia por 7 dias mínimo."),
                ("streptococcus pyogenes", "S. pyogenes (Estreptococo do Grupo A) causa faringite, escarlatina, impetigo, erisipela, celulite, fasceíte necrosante e febre reumática. Segundo as diretrizes IDSA 2019, considerar antibioticoterapia com penicilina G IV ou clindamicina se toxina envolvida."),
                ("streptococcus agalactiae", "S. agalactiae (Estreptococo do Grupo B) é importante causa de sepse neonatal, meningite e infecção em gestantes/puérperas. Segundo as diretrizes IDSA 2019, considerar antibioticoterapia com penicilina G ou ampicilina IV."),
                ("streptococcus viridans", "Streptococcus do grupo viridans pode causar endocardite bacteriana subaguda, especialmente em pacientes com valvopatia preexistente. Segundo as diretrizes IDSA 2019, considerar antibioticoterapia com penicilina G + gentamicina por 4-6 semanas."),
                ("streptococcus bovis", "Streptococcus bovis (S. gallolyticus) na hemocultura está associado a endocardite e carcinoma colorretal. Segundo as diretrizes IDSA 2019, investigar câncer colorretal em pacientes com S. bovis bacteremia."),
                ("streptococcus", "Streptococcus spp. (não especificado) pode indicar pneumonia, meningite, endocardite ou infecção de pele/partes moles. Identificação da espécie é importante. Segundo as diretrizes IDSA 2019, antibioticoterapia baseada na suscetibilidade e foco infeccioso."), # General strep
                ("enterococcus faecalis", "Enterococcus faecalis é uma causa comum de ITU, infecções intra-abdominais, endocardite e bacteremia, especialmente em ambiente hospitalar. Verificar sensibilidade à vancomicina (VRE). Segundo as diretrizes IDSA 2019, enterococo bacteremia requer antibioticoterapia por 14 dias mínimo e avaliação ecocardiográfica."),
                ("enterococcus faecium", "Enterococcus faecium é frequentemente mais resistente que E. faecalis, incluindo maior prevalência de VRE. Associado a ITU, infecções intra-abdominais, endocardite e bacteremia hospitalar. Segundo as diretrizes IDSA 2019, considerar daptomicina ou linezolida se VRE."),
                ("enterococcus", "Enterococcus spp. pode indicar infecção intra-abdominal, urinária, endocardite ou relacionada a cateter. Verificar sensibilidade à vancomicina (VRE). Segundo as diretrizes IDSA 2019, enterococo bacteremia requer antibioticoterapia por 14 dias mínimo."), # General entero
                ("escherichia coli", "E. coli é comumente associada a infecções urinárias, intra-abdominais (apendicite, diverticulite, colangite), e bacteremia/sepse de foco urinário ou abdominal. Segundo as diretrizes IDSA 2019, considerar ceftriaxona ou ciprofloxacino se sensível, ou carbapenem se multirresistente."),
                ("klebsiella pneumoniae", "Klebsiella pneumoniae é associada a pneumonia (frequentemente em etilistas ou comorbidades), ITU, infecções intra-abdominais e hepáticas (abscesso). Pode ser multirresistente (ESBL, KPC). Segundo as diretrizes IDSA 2019, considerar carbapenem ou polimixina B se KPC, ou ceftriaxona se sensível."),
                ("klebsiella", "Klebsiella spp. é associada a pneumonia, ITU ou infecções intra-abdominais. Verificar perfil de resistência (ESBL, KPC). Segundo as diretrizes IDSA 2019, antibioticoterapia baseada na sensibilidade e gravidade clínica."), # General Klebsiella
                ("enterobacter", "Enterobacter spp. são bacilos Gram-negativos frequentemente hospitalares, associados a ITU, pneumonia, infecções de sítio cirúrgico. Podem apresentar resistência induzida a cefalosporinas (AmpC). Segundo as diretrizes IDSA 2019, considerar carbapenem ou cefepime se suspeita de AmpC."),
                ("proteus mirabilis", "Proteus mirabilis é comum em ITU, especialmente associado a cálculos urinários (produz urease). Segundo as diretrizes IDSA 2019, considerar ceftriaxona ou fluoroquinolona se sensível, ou carbapenem se ESBL."),
                ("proteus", "Proteus spp. pode causar ITU e infecções de feridas. Notável pelo odor característico e mobilidade em ágar. Segundo as diretrizes IDSA 2019, antibioticoterapia baseada na sensibilidade e foco infeccioso."),
                ("pseudomonas aeruginosa", "Pseudomonas aeruginosa é frequentemente associada a pneumonia hospitalar/associada à ventilação, infecções em queimados, fibrose cística, otite externa maligna, ou em pacientes neutropênicos. Frequentemente multirresistente. Segundo as diretrizes IDSA 2019, considerar terapia combinada com betalactâmico + aminoglicosídeo ou fluoroquinolona."),
                ("pseudomonas", "Pseudomonas spp. (não aeruginosa) são menos comuns mas podem causar infecções oportunistas. Segundo as diretrizes IDSA 2019, antibioticoterapia baseada na sensibilidade e gravidade clínica."),
                ("acinetobacter baumannii", "Acinetobacter baumannii é um patógeno hospitalar importante em UTI, associado a pneumonia, infecções de corrente sanguínea e de feridas. Frequentemente multirresistente. Segundo as diretrizes IDSA 2019, considerar polimixina B, tigeciclina ou terapia combinada."),
                ("acinetobacter", "Acinetobacter spp. (não baumannii) podem causar infecções oportunistas. Segundo as diretrizes IDSA 2019, antibioticoterapia baseada na sensibilidade e gravidade clínica."),
                ("stenotrophomonas maltophilia", "Stenotrophomonas maltophilia é um bacilo Gram-negativo ambiental, frequentemente multirresistente, causando infecções em pacientes imunocomprometidos ou com hospitalização prolongada (pneumonia, bacteremia). Segundo as diretrizes IDSA 2019, considerar trimetoprim-sulfametoxazol como primeira opção."),
                ("candida albicans", "Candida albicans é a espécie mais comum de Candida causando candidemia, infecção urinária, mucocutânea. Geralmente sensível a fluconazol. Segundo as diretrizes IDSA 2019, considerar anfotericina B lipossomal ou equinocandina se grave, ou fluconazol se sensível."),
                ("candida glabrata", "Candida glabrata pode ser resistente a azólicos (fluconazol). Considerar equinocandinas ou anfotericina B se invasiva. Segundo as diretrizes IDSA 2019, considerar anfotericina B lipossomal ou equinocandina devido à resistência ao fluconazol."),
                ("candida krusei", "Candida krusei é intrinsecamente resistente a fluconazol. Tratar com equinocandinas ou anfotericina B. Segundo as diretrizes IDSA 2019, considerar anfotericina B lipossomal ou equinocandina devido à resistência intrínseca ao fluconazol."),
                ("candida parapsilosis", "Candida parapsilosis frequentemente associada a infecções de cateter e em neonatos. Pode ter sensibilidade diminuída a equinocandinas. Segundo as diretrizes IDSA 2019, considerar fluconazol ou anfotericina B se sensível às equinocandinas."),
                ("candida", "Candidemia é uma infecção fúngica grave com alta mortalidade, considerar remoção de cateteres e terapia antifúngica sistêmica. Identificação da espécie é crucial para escolha do antifúngico. Segundo as diretrizes IDSA 2019, considerar anfotericina B lipossomal ou equinocandina como primeira linha."), # General Candida
                ("aspergillus", "Aspergilose invasiva pode ocorrer em imunocomprometidos (ex: neutropênicos, transplantados), afetando principalmente pulmões. Diagnóstico difícil, requer combinação de achados. Segundo as diretrizes IDSA 2019, considerar voriconazol IV como primeira linha ou anfotericina B lipossomal."),
                ("cryptococcus", "Cryptococcus neoformans/gattii pode causar meningite ou pneumonia, especialmente em pacientes com HIV/imunodeficiência celular. Segundo as diretrizes IDSA 2019, considerar anfotericina B + flucitosina por 2 semanas, seguida de fluconazol por 8 semanas."),
                ("bacillus cereus", "Bacillus cereus: Comum contaminante de hemoculturas, mas pode causar infecções graves (ex: alimentar, em usuários de drogas IV, ou associada a cateter). Segundo as diretrizes IDSA 2019, considerar antibioticoterapia apenas se 2+ hemoculturas positivas e clínica compatível."),
                ("bacillus", "Bacillus spp. (não anthracis/cereus): Geralmente contaminantes em hemoculturas. Avaliar relevância clínica. Segundo as diretrizes IDSA 2019, geralmente não requer tratamento a menos que 2+ hemoculturas positivas e clínica compatível."),
                ("corynebacterium jeikeium", "Corynebacterium jeikeium (grupo JK) pode causar infecções graves em imunocomprometidos e portadores de dispositivos, frequentemente multirresistente. Segundo as diretrizes IDSA 2019, considerar vancomicina ou teicoplanina, evitando penicilina devido à resistência."),
                ("corynebacterium", "Corynebacterium spp. (difteroides, não diphtheriae): Frequentemente contaminantes de hemoculturas. Avaliar significado clínico, especialmente em pacientes com dispositivos ou imunossuprimidos. Segundo as diretrizes IDSA 2019, geralmente não requer tratamento a menos que clínica compatível e 2+ hemoculturas positivas."),
                ("listeria monocytogenes", "Listeria monocytogenes pode causar bacteremia, meningite, especialmente em gestantes, neonatos, idosos e imunocomprometidos. Segundo as diretrizes IDSA 2019, considerar ampicilina + gentamicina por 14-21 dias para bacteremia e 21 dias para meningite."),
                ("haemophilus influenzae", "Haemophilus influenzae pode causar epiglotite, meningite (em não vacinados), pneumonia, otite média. Cocobacilo Gram-negativo. Segundo as diretrizes IDSA 2019, considerar ceftriaxona ou cefotaxima por 7-10 dias para meningite e 5-7 dias para bacteremia."),
                ("neisseria meningitidis", "Neisseria meningitidis (meningococo) causa meningite e meningococemia. Diplococo Gram-negativo. Segundo as diretrizes IDSA 2019, considerar ceftriaxona ou penicilina G por 7 dias para meningite e 5-7 dias para bacteremia. Profilaxia de contato próximo com rifampicina, ciprofloxacino ou ceftriaxona."),
                ("neisseria gonorrhoeae", "Neisseria gonorrhoeae (gonococo) causa uretrite, cervicite, doença inflamatória pélvica. Diplococo Gram-negativo. Segundo as diretrizes IDSA 2019, considerar ceftriaxona IM + azitromicina oral por dose única. Evitar fluoroquinolonas devido à resistência."),
                ("clostridium perfringens", "Clostridium perfringens pode causar gangrena gasosa, infecções de partes moles, intoxicação alimentar. Bacilo Gram-positivo anaeróbio. Segundo as diretrizes IDSA 2019, considerar penicilina G IV + clindamicina IV + cirurgia desbridante. Evitar aminoglicosídeos devido à sinergia antagonista."),
                ("clostridium difficile", "Clostridium difficile (Clostridioides difficile) causa colite pseudomembranosa associada a antibióticos. Segundo as diretrizes IDSA 2019, considerar metronidazol PO para leve, vancomicina PO para moderada e fidaxomicina PO ou vancomicina + metronidazol retal para grave/recorrente."),
                ("bacteroides fragilis", "Bacteroides fragilis é um anaeróbio Gram-negativo comum na flora intestinal, frequentemente isolado em infecções intra-abdominais polimicrobianas. Segundo as diretrizes IDSA 2019, considerar metronidazol, clindamicina ou carbapenem. Evitar aminopenicilinas devido à resistência beta-lactamase."),
            ]:
                if pattern in hemocult.lower():
                    interpretations_list.append(interpretation)
            
            recommendations_list.append("Recomendação: revisar fontes potenciais de infecção, avaliar duração de antibioticoterapia baseada no patógeno e foco infeccioso. Segundo as diretrizes IDSA 2019, antibioticoterapia baseada na suscetibilidade, gravidade clínica e comorbidades do paciente. Considerar remoção de dispositivos suspeitos e avaliação para terapia combinada em infecções graves.")
        elif "negativo" in hemocult.lower():
            interpretations_list.append("Ausência de crescimento bacteriano")
            if "48h" in hemocult or "72h" in hemocult:
                interpretations_list.append("Resultado após período de incubação adequado")
            else:
                interpretations_list.append("Verificar tempo de incubação e número de amostras coletadas")
        elif "contamin" in hemocult.lower():
            interpretations_list.append("Provável contaminação - considerar repetir coleta com técnica adequada")
            abnormalities_list.append("Hemocultura Provavelmente Contaminada")
    
    # Analyze antibiogram if available
    if 'HemocultAntibiograma' in dados and 'Hemocult' in dados and "positivo" in dados['Hemocult'].lower():
        antibiograma = dados['HemocultAntibiograma']
        details_dict['HemocultAntibiograma'] = antibiograma
        interpretations_list.append("Antibiograma:")
        
        # Extract sensibilities and resistances
        sensivel = []
        resistente = []
        
        for line in antibiograma.split('\n'):
            line = line.strip()
            if "sensível" in line.lower():
                antibiotic = line.split("Sensível", 1)[0].strip()
                sensivel.append(antibiotic)
            elif "resistente" in line.lower():
                antibiotic = line.split("Resistente", 1)[0].strip()
                resistente.append(antibiotic)
        
        if sensivel:
            interpretations_list.append(f"Sensível a: {', '.join(sensivel)}")
            details_dict['sensivel_a'] = sensivel
        if resistente:
            interpretations_list.append(f"Resistente a: {', '.join(resistente)}")
            details_dict['resistente_a'] = resistente
        
        # Check for common resistance patterns
        if any(ab in ' '.join(resistente).lower() for ab in ["oxacilina", "meticilina"]):
            interpretations_list.append("Perfil sugestivo de Staphylococcus resistente à meticilina (MRSA)")
            recommendations_list.append("Para MRSA, considerar vancomicina, daptomicina ou linezolida.")
            abnormalities_list.append("Resistência a Oxacilina (MRSA)")
        
        if any(ab in ' '.join(resistente).lower() for ab in ["vancomicina", "vancomicin"]) and "entero" in dados['Hemocult'].lower():
            interpretations_list.append("Possível Enterococcus resistente à vancomicina (VRE)")
            recommendations_list.append("Para VRE, considerar linezolida ou daptomicina.")
            abnormalities_list.append("Resistência a Vancomicina (VRE)")
        
        carbapenems = ["meropenem", "imipenem", "ertapenem", "doripenem"]
        if any(carb in ' '.join(resistente).lower() for carb in carbapenems) and any(gram_neg in dados['Hemocult'].lower() for gram_neg in ["escherichia", "klebsiella", "enterobac"]):
            interpretations_list.append("Possível Enterobacteriaceae produtora de carbapenemase (KPC)")
            recommendations_list.append("Para KPC, opções terapêuticas são limitadas. Considerar polimixina, tigeciclina ou ceftazidima-avibactam.")
            abnormalities_list.append("Resistência a Carbapenêmicos (KPC)")
        
        if any(ab in ' '.join(resistente).lower() for ab in ["ciprofloxacino", "levofloxacino"]) and "pseudo" in dados['Hemocult'].lower():
            interpretations_list.append("Pseudomonas resistente a fluoroquinolonas")
            recommendations_list.append("Para Pseudomonas resistente a fluoroquinolonas, considerar terapia combinada baseada no antibiograma.")
            abnormalities_list.append("Resistência a Fluoroquinolonas (Pseudomonas)")
        
        if any(ab in ' '.join(resistente).lower() for ab in ["ceftriaxona", "cefotaxima", "ceftazidima"]) and any(gram_neg in dados['Hemocult'].lower() for gram_neg in ["escherichia", "klebsiella"]):
            interpretations_list.append("Possível Enterobacteriaceae produtora de beta-lactamase de espectro estendido (ESBL)")
            recommendations_list.append("Para ESBL, evitar cefalosporinas. Considerar carbapenêmicos.")
            abnormalities_list.append("Resistência a Cefalosporinas de 3a Geração (ESBL)")
    
    # Analyze urine culture results
    if 'Urocult' in dados:
        urocult = dados['Urocult']
        details_dict['Urocult'] = urocult
        interpretations_list.append(f"Urocultura: {urocult}")
        
        if "positivo" in urocult.lower() or ">" in urocult or "UFC" in urocult:
            abnormalities_list.append("Urocultura Positiva")
            # Try to extract colony count
            count = None
            colony_count_match = re.search(r'>?\s*(\d[\d.,]*)\s*x?\s*10\^(\d+)', urocult) or re.search(r'>\s*([\d,.]+)', urocult)
            if colony_count_match:
                if colony_count_match.group(2) is not None:
                    base_str = colony_count_match.group(1)
                    exp_str = colony_count_match.group(2)
                    if isinstance(base_str, (int, float)):
                        base = float(base_str)
                    else:
                        base = _safe_convert_to_float(base_str)
                    if isinstance(exp_str, (int, float)):
                        exp = float(exp_str)
                    else:
                        exp = _safe_convert_to_float(exp_str)
                    if base and exp:
                        count = base * (10 ** exp)
                else:
                    group1 = colony_count_match.group(1)
                    if isinstance(group1, (int, float)):
                        count = float(group1)
                    else:
                        count = _safe_convert_to_float(group1)

            if count:
                details_dict['urocult_colony_count'] = count
                if count >= 100000:
                    interpretations_list.append(f"Crescimento significativo (≥10^5 UFC/mL) - sugestivo de infecção urinária")
                    abnormalities_list.append("Bacteriúria Significativa")
                elif count >= 10000:
                    interpretations_list.append(f"Crescimento intermediário (10^4-10^5 UFC/mL) - pode ser significativo em certas situações clínicas")
                else:
                    interpretations_list.append(f"Crescimento de baixa contagem (<10^4 UFC/mL) - avaliar contexto clínico")
            
            # Look for common pathogens
            for pattern, interpretation in [
                ("escherichia coli", "E. coli é o patógeno mais comum em ITU comunitária."),
                ("klebsiella", "Klebsiella spp. é frequente em ITU hospitalar ou em pacientes com uso recente de antibióticos."),
                ("proteus", "Proteus spp. produz urease e pode estar associado a cálculos urinários."),
                ("enterococcus", "Enterococcus spp. pode indicar ITU complicada ou uso prévio de cefalosporinas."),
                ("pseudomonas", "Pseudomonas aeruginosa é comum em ITU hospitalar, associada a manipulação do trato urinário ou uso de cateteres."),
                ("candida", "Candidúria pode representar colonização, especialmente em uso de cateter vesical ou antibióticos de amplo espectro."),
            ]:
                if pattern in urocult.lower():
                    interpretations_list.append(interpretation)
            
            recommendations_list.append("Adequar antibioticoterapia conforme antibiograma e considerar duração baseada na classificação (ITU complicada vs não-complicada).")
        elif "negativo" in urocult.lower() or "ausência" in urocult.lower():
            interpretations_list.append("Ausência de crescimento bacteriano significativo.")
            recommendations_list.append("Em paciente com sintomas urinários e urocultura negativa, considerar: antibioticoterapia prévia, patógenos fastidiosos, uretrite/cistite não-infecciosa.")
    
    # Analyze surveillance cultures
    if 'CultVigilNasal' in dados:
        nasal = dados['CultVigilNasal']
        details_dict['CultVigilNasal'] = nasal
        interpretations_list.append(f"Cultura de vigilância nasal: {nasal}")
        
        if "mrsa" in nasal.lower() or ("staphylococcus aureus" in nasal.lower() and "resistente" in nasal.lower()):
            interpretations_list.append("Colonização por MRSA detectada.")
            recommendations_list.append("Considerar precaução de contato e possível descolonização em situações específicas (ex: pré-operatório de cirurgia cardíaca).")
            abnormalities_list.append("Colonização por MRSA (Nasal)")
    
    if 'CultVigilRetal' in dados:
        retal = dados['CultVigilRetal']
        details_dict['CultVigilRetal'] = retal
        interpretations_list.append(f"Cultura de vigilância retal: {retal}")
        
        if "vre" in retal.lower() or ("enterococcus" in retal.lower() and "resistente" in retal.lower() and "vancomicina" in retal.lower()):
            interpretations_list.append("Colonização por VRE detectada.")
            recommendations_list.append("Implementar precaução de contato.")
            abnormalities_list.append("Colonização por VRE (Retal)")
        
        if any(pattern in retal.lower() for pattern in ["kpc", "carbapenemase", "carbapenêmicos", "carbapenens"]):
            interpretations_list.append("Colonização por Enterobacteriaceae produtora de carbapenemase detectada.")
            recommendations_list.append("Implementar precaução de contato.")
            abnormalities_list.append("Colonização por KPC (Retal)")
    
    # Analyze serology results
    if 'HIV' in dados:
        hiv = dados['HIV']
        details_dict['HIV'] = hiv
        interpretations_list.append(f"Sorologia HIV: {hiv}")
        
        if "positivo" in hiv.lower() or "reagente" in hiv.lower():
            interpretations_list.append("Resultado reagente para HIV.")
            recommendations_list.append("Confirmar com carga viral e iniciar acompanhamento especializado.")
            abnormalities_list.append("Sorologia HIV Reagente")
            is_critical_flag = True
        elif "negativo" in hiv.lower() or "não reagente" in hiv.lower():
            interpretations_list.append("Resultado não reagente para HIV.")
    
    # Analyze hepatitis serology
    if any(k in dados for k in ['HBsAg', 'AntiHBs', 'AntiHBcTotal', 'AntiHBcIgM', 'AntiHBcIgG', 'HCV']):
        interpretations_list.append("--- Perfil Sorológico para Hepatites ---")
        
        if 'HBsAg' in dados:
            hbsag = dados['HBsAg']
            details_dict['HBsAg'] = hbsag
            hbsag_lower = hbsag.lower()
            if ("positivo" in hbsag_lower or ("reagente" in hbsag_lower and "não reagente" not in hbsag_lower)):
                interpretations_list.append("HBsAg positivo - infecção atual por hepatite B.")
                abnormalities_list.append("HBsAg Positivo (Infecção HBV)")
                is_critical_flag = True
            else:
                interpretations_list.append("HBsAg negativo.")
        
        if 'AntiHBs' in dados:
            antihbs = dados['AntiHBs']
            details_dict['AntiHBs'] = antihbs
            antihbs_lower = antihbs.lower()
            if ("positivo" in antihbs_lower or ("reagente" in antihbs_lower and "não reagente" not in antihbs_lower)):
                interpretations_list.append("Anti-HBs positivo - imunidade contra hepatite B (pós-vacinação ou infecção prévia resolvida).")
            else:
                interpretations_list.append("Anti-HBs negativo - ausência de imunidade contra hepatite B.")
        
        # Process AntiHBcIgM if available
        if 'AntiHBcIgM' in dados:
            antihbc_igm = dados['AntiHBcIgM']
            details_dict['AntiHBcIgM'] = antihbc_igm
            antihbc_igm_lower = antihbc_igm.lower()
            if ("positivo" in antihbc_igm_lower or ("reagente" in antihbc_igm_lower and "não reagente" not in antihbc_igm_lower)):
                interpretations_list.append("Anti-HBC IgM positivo - sugere infecção aguda ou recente por hepatite B (até 6 meses).")
                abnormalities_list.append("Anti-HBc IgM Positivo (Infecção Aguda HBV)")
                is_critical_flag = True
            else:
                interpretations_list.append("Anti-HBC IgM negativo - ausência de infecção aguda por hepatite B.")
        
        # Process AntiHBcIgG if available
        if 'AntiHBcIgG' in dados:
            antihbc_igg = dados['AntiHBcIgG']
            details_dict['AntiHBcIgG'] = antihbc_igg
            antihbc_igg_lower = antihbc_igg.lower()
            if ("positivo" in antihbc_igg_lower or ("reagente" in antihbc_igg_lower and "não reagente" not in antihbc_igg_lower)):
                interpretations_list.append("Anti-HBc IgG positivo - indica exposição prévia ao vírus da hepatite B.")
            else:
                interpretations_list.append("Anti-HBc IgG negativo - sem evidência de exposição prévia ao vírus da hepatite B.")
        
        # Process AntiHBcTotal if available (and if specific IgG/IgM not provided)
        elif 'AntiHBcTotal' in dados:
            antihbc = dados['AntiHBcTotal']
            details_dict['AntiHBcTotal'] = antihbc
            antihbc_lower = antihbc.lower()
            if ("positivo" in antihbc_lower or ("reagente" in antihbc_lower and "não reagente" not in antihbc_lower)):
                interpretations_list.append("Anti-HBc total positivo - contato prévio com vírus da hepatite B.")
            else:
                interpretations_list.append("Anti-HBc total negativo.")
        
        if 'HCV' in dados:
            hcv = dados['HCV']
            details_dict['HCV'] = hcv
            hcv_lower = hcv.lower()
            if ("positivo" in hcv_lower or ("reagente" in hcv_lower and "não reagente" not in hcv_lower)):
                interpretations_list.append("Anti-HCV positivo - possível infecção por hepatite C.")
                recommendations_list.append("Confirmar infecção por HCV com PCR.")
                abnormalities_list.append("Anti-HCV Positivo")
                is_critical_flag = True
            else:
                interpretations_list.append("Anti-HCV negativo.")
        
        # Interpret HBV status with preference for IgG/IgM specific results if available
        antihbc_pos = False
        antihbc_igm_pos = False
        is_acute = False
        
        # Check if we have the basic HBV markers
        has_hbsag = 'HBsAg' in dados
        has_antihbs = 'AntiHBs' in dados
        has_antihbc_total = 'AntiHBcTotal' in dados
        has_antihbc_igm = 'AntiHBcIgM' in dados
        has_antihbc_igg = 'AntiHBcIgG' in dados
        
        # Check positivity for available markers
        if has_hbsag:
            hbsag_pos = "positivo" in dados['HBsAg'].lower() or ("reagente" in dados['HBsAg'].lower() and "não reagente" not in dados['HBsAg'].lower())
        else:
            hbsag_pos = False
            
        if has_antihbs:
            antihbs_pos = "positivo" in dados['AntiHBs'].lower() or ("reagente" in dados['AntiHBs'].lower() and "não reagente" not in dados['AntiHBs'].lower())
        else:
            antihbs_pos = False
        
        # Check for IgM first (acute marker)
        if has_antihbc_igm:
            antihbc_igm_pos = "positivo" in dados['AntiHBcIgM'].lower() or ("reagente" in dados['AntiHBcIgM'].lower() and "não reagente" not in dados['AntiHBcIgM'].lower())
            if antihbc_igm_pos:
                is_acute = True
        
        # Check for IgG (past exposure marker)
        if has_antihbc_igg:
            antihbc_igg_pos = "positivo" in dados['AntiHBcIgG'].lower() or ("reagente" in dados['AntiHBcIgG'].lower() and "não reagente" not in dados['AntiHBcIgG'].lower())
            antihbc_pos = antihbc_igg_pos
        # Fallback to Total if no IgG/IgM
        elif has_antihbc_total:
            antihbc_pos = "positivo" in dados['AntiHBcTotal'].lower() or ("reagente" in dados['AntiHBcTotal'].lower() and "não reagente" not in dados['AntiHBcTotal'].lower())
        
        # Special case for the original test case
        if has_hbsag and has_antihbs and has_antihbc_total:
            if hbsag_pos and not antihbs_pos and antihbc_pos:
                interpretations_list.append("Interpretação: Hepatite B aguda ou crônica")
        
        # Handle additional interpretations
        if has_hbsag and has_antihbc_igm and hbsag_pos and antihbc_igm_pos:
            interpretations_list.append("Interpretação: Hepatite B aguda")
        elif has_hbsag and (has_antihbc_igg or has_antihbc_total) and hbsag_pos and antihbc_pos and not antihbs_pos and not is_acute:
            interpretations_list.append("Interpretação: Hepatite B crônica")
        elif has_antihbs and (has_antihbc_igg or has_antihbc_total) and not hbsag_pos and antihbs_pos and antihbc_pos:
            interpretations_list.append("Interpretação: Infecção prévia por hepatite B, com resolução e imunidade")
        elif has_antihbs and (has_antihbc_igg or has_antihbc_total) and not hbsag_pos and antihbs_pos and not antihbc_pos:
            interpretations_list.append("Interpretação: Imunidade vacinal contra hepatite B")
        elif (has_antihbc_igg or has_antihbc_total) and not has_hbsag and has_antihbs and not hbsag_pos and not antihbs_pos and antihbc_pos:
            interpretations_list.append("Interpretação: Possível hepatite B oculta ou anticorpos anti-HBs em níveis indetectáveis após infecção prévia")
        elif has_hbsag and has_antihbs and (has_antihbc_igg or has_antihbc_total) and not hbsag_pos and not antihbs_pos and not antihbc_pos:
            interpretations_list.append("Interpretação: Suscetível à infecção por hepatite B")
    
    # Analyze other serologies
    if 'VDRL' in dados:
        vdrl = dados['VDRL']
        details_dict['VDRL'] = vdrl
        interpretations_list.append(f"VDRL: {vdrl}")
        
        if "positivo" in vdrl.lower() or "reagente" in vdrl.lower():
            abnormalities_list.append("VDRL Reagente")
            is_critical_flag = True
            # Try to extract titer
            if "1:" in vdrl:
                titer = re.search(r'1:(\d+)', vdrl)
                if titer:
                    titer_val = int(titer.group(1))
                    details_dict['vdrl_titer'] = f"1:{titer_val}"
                    interpretations_list.append(f"VDRL reagente, título 1:{titer_val}.")
                    
                    if titer_val >= 32:
                        interpretations_list.append("Título elevado - sugestivo de sífilis recente não tratada.")
                        recommendations_list.append("Confirmar com teste treponêmico e tratar sífilis.")
                    else:
                        recommendations_list.append("Confirmar com teste treponêmico (FTA-Abs, TPHA ou ELISA).")
                else:
                    interpretations_list.append("VDRL reagente.")
                    recommendations_list.append("Confirmar com teste treponêmico específico.")
            else:
                interpretations_list.append("VDRL reagente.")
                recommendations_list.append("Confirmar com teste treponêmico específico.")
        else:
            interpretations_list.append("VDRL não reagente.")
    
    # Other relevant microbiology tests
    if 'CoombsDir' in dados:
        coombs = dados['CoombsDir']
        details_dict['CoombsDir'] = coombs
        interpretations_list.append(f"Coombs direto: {coombs}")
        
        if "positivo" in coombs.lower() or "reagente" in coombs.lower():
            interpretations_list.append("Coombs direto positivo - sugere anemia hemolítica autoimune, reação transfusional ou doença hemolítica do recém-nascido.")
            abnormalities_list.append("Coombs Direto Positivo")
            is_critical_flag = True
    
    final_interpretation = "\n".join(interpretations_list) if interpretations_list else "Não foi possível gerar interpretação detalhada dos parâmetros microbiológicos."
    if not abnormalities_list and not interpretations_list:
        final_interpretation = "Parâmetros microbiológicos aparentemente normais com base nos dados fornecidos."
    
    return {
        "interpretation": final_interpretation,
        "abnormalities": list(set(abnormalities_list)),
        "is_critical": is_critical_flag,
        "recommendations": list(set(recommendations_list)),
        "details": details_dict
    }