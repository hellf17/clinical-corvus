"""
Cardiac markers analysis module for interpreting cardiac-related lab tests.
"""

from src.utils.reference_ranges import REFERENCE_RANGES

def analisar_marcadores_cardiacos(dados, hora_dor=None):
    """
    Analyze cardiac markers to assess for myocardial injury and heart failure.
    
    Args:
        dados: Dictionary containing cardiac marker parameters (Troponin, CK-MB, BNP, etc.)
        hora_dor: Hours since chest pain onset (for troponin interpretation)
        
    Returns:
        list: List of analysis findings and interpretations
    """
    resultados = []
    
    # Check if there's enough data to analyze
    if not any(k in dados for k in ['Tropo', 'CK-MB', 'BNP', 'CPK', 'LDH']):
        return []
    
    # Analyze troponin (marker of cardiac injury)
    has_troponin_elevation = False
    if 'Tropo' in dados:
        troponina = dados['Tropo']
        
        # Troponin interpretation depends on assay's 99th percentile upper reference limit
        # Using a general cutoff of 0.04 ng/mL for high-sensitivity troponin
        if troponina > 0.04:
            has_troponin_elevation = True
            resultados.append(f"Troponina elevada ({troponina} ng/mL)")
            
            if troponina > 1.0:
                resultados.append("Elevação acentuada de troponina - sugere dano miocárdico significativo")
                if hora_dor and hora_dor < 6:
                    resultados.append("Observação: início recente de dor (<6h) com troponina muito elevada sugere infarto agudo do miocárdio de grande extensão")
            elif troponina > 0.1:
                resultados.append("Elevação moderada de troponina - sugere lesão miocárdica, avaliar contexto clínico")
            else:
                resultados.append("Elevação discreta de troponina - pode ocorrer em diversas condições além de SCA, como IC descompensada, TEP, sepse, miocardite ou insuficiência renal")
        else:
            resultados.append(f"Troponina normal ({troponina} ng/mL)")
            if hora_dor and hora_dor < 3:
                resultados.append("Observação: troponina normal com <3h de sintomas não exclui SCA. Considerar repetir em 3h")
    
    # Analyze CK-MB (less specific for cardiac injury)
    if 'CK-MB' in dados:
        ckmb = dados['CK-MB']
        
        if ckmb > 5:
            resultados.append(f"CK-MB elevada ({ckmb} ng/mL)")
            if ckmb > 25:
                resultados.append("Elevação acentuada de CK-MB - sugere lesão miocárdica extensa")
            elif ckmb > 10:
                resultados.append("Elevação moderada de CK-MB - compatível com lesão miocárdica")
            elif ckmb > 5:
                resultados.append("Elevação discreta de CK-MB - pode ser vista em SCA, miocardite ou rabdomiólise com envolvimento cardíaco mínimo")
        else:
            resultados.append(f"CK-MB normal ({ckmb} ng/mL)")
    
    # Calculate CK-MB/CPK ratio if both are available (helps differentiate cardiac from skeletal muscle injury)
    if 'CK-MB' in dados and 'CPK' in dados:
        ckmb = dados['CK-MB']
        cpk = dados['CPK']
        
        if cpk > 0:  # Avoid division by zero
            ratio = (ckmb / cpk) * 100  # Calculate as percentage
            resultados.append(f"Relação CK-MB/CPK: {ratio:.1f}%")
            
            if ratio > 5:
                resultados.append("Relação CK-MB/CPK >5% - sugere origem cardíaca da elevação enzimática")
            elif ratio < 3 and cpk > REFERENCE_RANGES['CPK'][1]:
                resultados.append("Relação CK-MB/CPK <3% com CPK elevada - sugere origem musculoesquelética (rabdomiólise)")
    
    # Analyze CPK (less specific, can be from skeletal muscle)
    if 'CPK' in dados:
        cpk = dados['CPK']
        cpk_min, cpk_max = REFERENCE_RANGES['CPK']
        
        if cpk > cpk_max:
            resultados.append(f"CPK elevada ({cpk} U/L)")
            if cpk > 5000:
                resultados.append("Elevação muito acentuada de CPK - sugere rabdomiólise grave, trauma muscular extenso ou distúrbio neuromuscular")
            elif cpk > 1000:
                resultados.append("Elevação acentuada de CPK - pode indicar rabdomiólise, infarto extenso, miopatia ou trauma muscular")
            elif cpk > cpk_max:
                resultados.append("Elevação discreta a moderada de CPK - pode ocorrer após exercício intenso, SCA, miopatias ou uso de certos medicamentos")
        else:
            resultados.append(f"CPK normal ({cpk} U/L)")
    
    # Analyze BNP/NT-proBNP (marker of heart failure and cardiac stress)
    if 'BNP' in dados:
        bnp = dados['BNP']
        
        if bnp > 100:
            resultados.append(f"BNP elevado ({bnp} pg/mL)")
            if bnp > 1000:
                resultados.append("Elevação acentuada de BNP - fortemente sugestivo de insuficiência cardíaca descompensada ou cor pulmonale agudo")
            elif bnp > 500:
                resultados.append("Elevação moderada a acentuada de BNP - sugere insuficiência cardíaca ou sobrecarga ventricular direita (ex: TEP)")
            elif bnp > 100:
                resultados.append("Elevação discreta a moderada de BNP - pode indicar insuficiência cardíaca leve a moderada, hipertensão pulmonar, idade avançada ou insuficiência renal")
        elif bnp > 50:
            resultados.append(f"BNP levemente elevado ({bnp} pg/mL)")
            resultados.append("Elevações discretas de BNP podem ocorrer na idade avançada, sexo feminino, insuficiência renal ou hipertrofia ventricular")
        else:
            resultados.append(f"BNP normal ({bnp} pg/mL)")
            resultados.append("BNP <100 pg/mL tem valor preditivo negativo elevado para insuficiência cardíaca descompensada")
    
    # Analyze LDH (very non-specific, can be elevated in MI)
    if 'LDH' in dados:
        ldh = dados['LDH']
        ldh_min, ldh_max = REFERENCE_RANGES['LDH']
        
        if ldh > ldh_max:
            resultados.append(f"LDH elevada ({ldh} U/L)")
            if ldh > 1000:
                resultados.append("Elevação acentuada de LDH - pode ocorrer em hemólise, isquemia tecidual extensa, rabdomiólise ou neoplasias")
            elif ldh > ldh_max:
                resultados.append("Elevação moderada de LDH - enzima pouco específica, elevada em diversas condições")
    
    # Comprehensive interpretation of multiple cardiac markers
    if has_troponin_elevation:
        if 'CK-MB' in dados and dados['CK-MB'] > 5:
            resultados.append("Padrão de elevação de troponina e CK-MB - sugestivo de injúria miocárdica aguda")
            
            if 'BNP' in dados and dados['BNP'] > 500:
                resultados.append("Elevação concomitante de troponina e BNP - pode indicar infarto com disfunção ventricular ou IC descompensada por SCA")
        
        if 'Creat' in dados and dados['Creat'] > 2.0:
            resultados.append("Observação: a elevação de troponina em pacientes com insuficiência renal pode ser devido à redução da depuração renal, e nem sempre indica isquemia miocárdica aguda")
            
    # Recommendations based on findings
    if has_troponin_elevation:
        resultados.append("Recomendação: considerar ECG seriado, monitorização cardíaca e avaliação complementar de isquemia miocárdica")
        
    if 'BNP' in dados and dados['BNP'] > 500:
        resultados.append("Recomendação: avaliar função cardíaca por ecocardiograma e quadro clínico para sinais/sintomas de insuficiência cardíaca")
    
    return resultados 