"""
Microbiology analysis module for interpreting culture results and other microbiological tests.
"""

def analisar_microbiologia(dados):
    """
    Analyze microbiology results including cultures, antibiograms, and serology.
    
    Args:
        dados: Dictionary containing microbiology test results
        
    Returns:
        list: List of analysis findings and interpretations
    """
    resultados = []
    
    # Check if there's enough data to analyze
    if not any(k in dados for k in [
        'Hemocult', 'HemocultAntibiograma', 'Urocult', 'CultVigilNasal', 
        'CultVigilRetal', 'CoombsDir', 'HBsAg', 'AntiHBs', 'AntiHBcTotal', 
        'HCV', 'HIV', 'VDRL'
    ]):
        return []
    
    # Analyze blood culture results
    if 'Hemocult' in dados:
        hemocult = dados['Hemocult']
        resultados.append(f"Hemocultura: {hemocult}")
        
        if "positivo" in hemocult.lower():
            # Extract organism name if present
            if ":" in hemocult:
                organismo = hemocult.split(":", 1)[1].strip()
                resultados.append(f"Organismo isolado: {organismo}")
            
            if "gram" in hemocult.lower():
                if "gram positivo" in hemocult.lower():
                    resultados.append("Bactéria Gram-positiva isolada - considerar Staphylococcus, Streptococcus ou Enterococcus como possíveis agentes")
                    
                    if "cocos" in hemocult.lower():
                        resultados.append("Cocos Gram-positivos são frequentemente associados com endocardite, infecções de cateter ou bacteremia")
                elif "gram negativo" in hemocult.lower():
                    resultados.append("Bactéria Gram-negativa isolada - considerar Enterobacteriaceae (E. coli, Klebsiella) ou não-fermentadores (Pseudomonas, Acinetobacter)")
                    resultados.append("Bacteremia por Gram-negativos pode evoluir para choque séptico rapidamente - monitorar parâmetros hemodinâmicos")
            
            # Look for specific patterns
            for pattern, interpretation in [
                ("staph", "Staphylococcus pode indicar infecção relacionada a cateter, endocardite ou bacteremia primária"),
                ("aureus", "S. aureus é um patógeno virulento associado a endocardite, osteomielite e infecções de pele/partes moles"),
                ("coagulase", "Staphylococcus coagulase-negativo frequentemente representa contaminação, mas pode ser significativo em pacientes com dispositivos implantados"),
                ("strep", "Streptococcus pode indicar pneumonia, meningite, endocardite ou infecção de pele/partes moles"),
                ("pneumo", "S. pneumoniae é comumente associado a pneumonia, meningite ou sinusite"),
                ("entero", "Enterococcus pode indicar infecção intra-abdominal, urinária ou relacionada a cateter"),
                ("escherichia", "E. coli é comumente associada a infecções urinárias, intra-abdominais ou colangite"),
                ("klebsiella", "Klebsiella spp. é associada a pneumonia, ITU ou infecções intra-abdominais"),
                ("pseudo", "Pseudomonas aeruginosa é frequentemente associada a pneumonia hospitalar, infecções em queimados ou em pacientes neutropênicos"),
                ("acineto", "Acinetobacter é um patógeno hospitalar comum em UTI, associado a pneumonia e infecções de ferida"),
                ("candida", "Candidemia é uma infecção fúngica grave com alta mortalidade, considerar remoção de cateteres e terapia antifúngica"),
            ]:
                if pattern in hemocult.lower():
                    resultados.append(interpretation)
            
            resultados.append("Recomendação: revisar fontes potenciais de infecção, avaliar duração de antibioticoterapia baseada no patógeno e foco infeccioso")
        elif "negativo" in hemocult.lower():
            resultados.append("Ausência de crescimento bacteriano")
            if "48h" in hemocult or "72h" in hemocult:
                resultados.append("Resultado após período de incubação adequado")
            else:
                resultados.append("Verificar tempo de incubação e número de amostras coletadas")
        elif "contamin" in hemocult.lower():
            resultados.append("Provável contaminação - considerar repetir coleta com técnica adequada")
    
    # Analyze antibiogram if available
    if 'HemocultAntibiograma' in dados and 'Hemocult' in dados and "positivo" in dados['Hemocult'].lower():
        antibiograma = dados['HemocultAntibiograma']
        resultados.append("Antibiograma:")
        
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
            resultados.append(f"Sensível a: {', '.join(sensivel)}")
        if resistente:
            resultados.append(f"Resistente a: {', '.join(resistente)}")
        
        # Check for common resistance patterns
        if any(ab in ' '.join(resistente).lower() for ab in ["oxacilina", "meticilina"]):
            resultados.append("Perfil sugestivo de Staphylococcus resistente à meticilina (MRSA) - considerar vancomicina, daptomicina ou linezolida")
        
        if any(ab in ' '.join(resistente).lower() for ab in ["vancomicina", "vancomicin"]) and "entero" in dados['Hemocult'].lower():
            resultados.append("Possível Enterococcus resistente à vancomicina (VRE) - considerar linezolida ou daptomicina")
        
        carbapenems = ["meropenem", "imipenem", "ertapenem", "doripenem"]
        if any(carb in ' '.join(resistente).lower() for carb in carbapenems) and any(gram_neg in dados['Hemocult'].lower() for gram_neg in ["escherichia", "klebsiella", "enterobac"]):
            resultados.append("Possível Enterobacteriaceae produtora de carbapenemase (KPC) - opções terapêuticas limitadas, considerar polimixina, tigeciclina ou ceftazidima-avibactam")
        
        if any(ab in ' '.join(resistente).lower() for ab in ["ciprofloxacino", "levofloxacino"]) and "pseudo" in dados['Hemocult'].lower():
            resultados.append("Pseudomonas resistente a fluoroquinolonas - considerar terapia combinada baseada no antibiograma")
        
        if any(ab in ' '.join(resistente).lower() for ab in ["ceftriaxona", "cefotaxima", "ceftazidima"]) and any(gram_neg in dados['Hemocult'].lower() for gram_neg in ["escherichia", "klebsiella"]):
            resultados.append("Possível Enterobacteriaceae produtora de beta-lactamase de espectro estendido (ESBL) - evitar cefalosporinas")
    
    # Analyze urine culture results
    if 'Urocult' in dados:
        urocult = dados['Urocult']
        resultados.append(f"Urocultura: {urocult}")
        
        if "positivo" in urocult.lower() or ">" in urocult or "UFC" in urocult:
            # Try to extract colony count
            if ">" in urocult and "UFC" in urocult:
                import re
                colony_count = re.search(r'>?\s*(\d+\.?\d*)\s*x?\s*10\^(\d+)\s*UFC', urocult)
                if colony_count:
                    base = float(colony_count.group(1))
                    exponent = int(colony_count.group(2))
                    count = base * (10 ** exponent)
                    
                    if count >= 100000:
                        resultados.append(f"Crescimento significativo (≥10^5 UFC/mL) - sugestivo de infecção urinária")
                    elif count >= 10000:
                        resultados.append(f"Crescimento intermediário (10^4-10^5 UFC/mL) - pode ser significativo em certas situações clínicas")
                    else:
                        resultados.append(f"Crescimento de baixa contagem (<10^4 UFC/mL) - avaliar contexto clínico")
            
            # Look for common pathogens
            for pattern, interpretation in [
                ("escherichia coli", "E. coli é o patógeno mais comum em ITU comunitária"),
                ("klebsiella", "Klebsiella spp. é frequente em ITU hospitalar ou em pacientes com uso recente de antibióticos"),
                ("proteus", "Proteus spp. produz urease e pode estar associado a cálculos urinários"),
                ("enterococcus", "Enterococcus spp. pode indicar ITU complicada ou uso prévio de cefalosporinas"),
                ("pseudomonas", "Pseudomonas aeruginosa é comum em ITU hospitalar, associada a manipulação do trato urinário ou uso de cateteres"),
                ("candida", "Candidúria pode representar colonização, especialmente em uso de cateter vesical ou antibióticos de amplo espectro"),
            ]:
                if pattern in urocult.lower():
                    resultados.append(interpretation)
            
            resultados.append("Recomendação: adequar antibioticoterapia conforme antibiograma e considerar duração baseada na classificação (ITU complicada vs não-complicada)")
        elif "negativo" in urocult.lower() or "ausência" in urocult.lower():
            resultados.append("Ausência de crescimento bacteriano significativo")
            resultados.append("Em paciente com sintomas urinários e urocultura negativa, considerar: antibioticoterapia prévia, patógenos fastidiosos, uretrite/cistite não-infecciosa")
    
    # Analyze surveillance cultures
    if 'CultVigilNasal' in dados:
        nasal = dados['CultVigilNasal']
        resultados.append(f"Cultura de vigilância nasal: {nasal}")
        
        if "mrsa" in nasal.lower() or ("staphylococcus aureus" in nasal.lower() and "resistente" in nasal.lower()):
            resultados.append("Colonização por MRSA detectada - considerar precaução de contato e possível descolonização em situações específicas")
    
    if 'CultVigilRetal' in dados:
        retal = dados['CultVigilRetal']
        resultados.append(f"Cultura de vigilância retal: {retal}")
        
        if "vre" in retal.lower() or ("enterococcus" in retal.lower() and "resistente" in retal.lower() and "vancomicina" in retal.lower()):
            resultados.append("Colonização por VRE detectada - implementar precaução de contato")
        
        if any(pattern in retal.lower() for pattern in ["kpc", "carbapenemase", "carbapenêmicos", "carbapenens"]):
            resultados.append("Colonização por Enterobacteriaceae produtora de carbapenemase detectada - implementar precaução de contato")
    
    # Analyze serology results
    if 'HIV' in dados:
        hiv = dados['HIV']
        resultados.append(f"Sorologia HIV: {hiv}")
        
        if "positivo" in hiv.lower() or "reagente" in hiv.lower():
            resultados.append("Resultado reagente para HIV - confirmar com carga viral e iniciar acompanhamento especializado")
        elif "negativo" in hiv.lower() or "não reagente" in hiv.lower():
            resultados.append("Resultado não reagente para HIV")
    
    # Analyze hepatitis serology
    hep_results = []
    
    if 'HBsAg' in dados:
        hbsag = dados['HBsAg']
        if "positivo" in hbsag.lower() or "reagente" in hbsag.lower():
            hep_results.append("HBsAg positivo - infecção atual por hepatite B")
        else:
            hep_results.append("HBsAg negativo")
    
    if 'AntiHBs' in dados:
        antihbs = dados['AntiHBs']
        if "positivo" in antihbs.lower() or "reagente" in antihbs.lower():
            hep_results.append("Anti-HBs positivo - imunidade contra hepatite B (pós-vacinação ou infecção prévia resolvida)")
        else:
            hep_results.append("Anti-HBs negativo - ausência de imunidade contra hepatite B")
    
    if 'AntiHBcTotal' in dados:
        antihbc = dados['AntiHBcTotal']
        if "positivo" in antihbc.lower() or "reagente" in antihbc.lower():
            hep_results.append("Anti-HBc Total positivo - contato prévio com vírus da hepatite B")
        else:
            hep_results.append("Anti-HBc Total negativo")
    
    if 'HCV' in dados:
        hcv = dados['HCV']
        if "positivo" in hcv.lower() or "reagente" in hcv.lower():
            hep_results.append("Anti-HCV positivo - possível infecção por hepatite C, confirmar com PCR")
        else:
            hep_results.append("Anti-HCV negativo")
    
    # Interpret hepatitis profile if we have results
    if hep_results:
        resultados.append("Perfil sorológico para hepatites:")
        resultados.extend(hep_results)
        
        # Interpret HBV status if we have all three markers
        if all(k in dados for k in ['HBsAg', 'AntiHBs', 'AntiHBcTotal']):
            hbsag_pos = "positivo" in dados['HBsAg'].lower() or "reagente" in dados['HBsAg'].lower()
            antihbs_pos = "positivo" in dados['AntiHBs'].lower() or "reagente" in dados['AntiHBs'].lower()
            antihbc_pos = "positivo" in dados['AntiHBcTotal'].lower() or "reagente" in dados['AntiHBcTotal'].lower()
            
            if hbsag_pos and not antihbs_pos and antihbc_pos:
                resultados.append("Interpretação: Hepatite B aguda ou crônica")
            elif not hbsag_pos and antihbs_pos and antihbc_pos:
                resultados.append("Interpretação: Infecção prévia por hepatite B, com resolução e imunidade")
            elif not hbsag_pos and antihbs_pos and not antihbc_pos:
                resultados.append("Interpretação: Imunidade vacinal contra hepatite B")
            elif not hbsag_pos and not antihbs_pos and antihbc_pos:
                resultados.append("Interpretação: Possível hepatite B oculta ou anticorpos anti-HBs em níveis indetectáveis após infecção prévia")
            elif not hbsag_pos and not antihbs_pos and not antihbc_pos:
                resultados.append("Interpretação: Suscetível à infecção por hepatite B")
    
    # Analyze other serologies
    if 'VDRL' in dados:
        vdrl = dados['VDRL']
        resultados.append(f"VDRL: {vdrl}")
        
        if "positivo" in vdrl.lower() or "reagente" in vdrl.lower():
            # Try to extract titer
            if "1:" in vdrl:
                import re
                titer = re.search(r'1:(\d+)', vdrl)
                if titer:
                    titer_val = int(titer.group(1))
                    resultados.append(f"VDRL reagente, título 1:{titer_val}")
                    
                    if titer_val >= 32:
                        resultados.append("Título elevado - sugestivo de sífilis recente não tratada")
                    else:
                        resultados.append("Confirmar com teste treponêmico (FTA-Abs, TPHA ou ELISA)")
            else:
                resultados.append("VDRL reagente - confirmar com teste treponêmico específico")
        else:
            resultados.append("VDRL não reagente")
    
    # Other relevant microbiology tests
    if 'CoombsDir' in dados:
        coombs = dados['CoombsDir']
        resultados.append(f"Coombs direto: {coombs}")
        
        if "positivo" in coombs.lower() or "reagente" in coombs.lower():
            resultados.append("Coombs direto positivo - sugere anemia hemolítica autoimune, reação transfusional ou doença hemolítica do recém-nascido")
    
    return resultados 