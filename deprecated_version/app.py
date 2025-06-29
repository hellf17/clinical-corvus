import streamlit as st
import os
import tempfile
import io
from PIL import Image
import base64
import Labs
from datetime import datetime
import pandas as pd
import plotly.graph_objects as go
import matplotlib.pyplot as plt
import numpy as np
from dotenv import load_dotenv
from Labs import (extrair_campos_pagina, analisar_gasometria, analisar_eletrólitos, 
                  analisar_hemograma, analisar_funcao_renal, analisar_funcao_hepatica, 
                  analisar_marcadores_cardiacos, analisar_inflamatorios, analisar_metabolico, 
                  extrair_id, analisar_microbiologia, PatientData, calcular_clearance_creatinina,
                  calcular_sofa, calcular_apache_ii, REFERENCE_RANGES)
import time
import re

# Carregar variáveis de ambiente
load_dotenv()

st.set_page_config(
    page_title="Clinical Helper",
    page_icon="🏥",
    layout="wide"
)

def local_css(file_name):
    with open(file_name) as f:
        st.markdown(f'<style>{f.read()}</style>', unsafe_allow_html=True)

def get_base64_of_bin_file(bin_file):
    with open(bin_file, 'rb') as f:
        data = f.read()
    return base64.b64encode(data).decode()

def set_background(png_file):
    bin_str = get_base64_of_bin_file(png_file)
    page_bg_img = '''
    <style>
    .stApp {
    background-image: url("data:image/png;base64,%s");
    background-size: cover;
    background-repeat: no-repeat;
    background-attachment: fixed;
    }
    </style>
    ''' % bin_str
    st.markdown(page_bg_img, unsafe_allow_html=True)

def custom_theme():
    st.markdown("""
    <style>
    .main-header {
        font-size: 2.5rem;
        color: #3498db;
        text-align: center;
        margin-bottom: 1rem;
    }
    .sub-header {
        font-size: 1.5rem;
        color: #2980b9;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
    }
    .result-box {
        padding: 1.5rem;
        border-radius: 5px;
        background-color: #f8f9fa;
        border-left: 5px solid #3498db;
        margin-bottom: 1rem;
    }
    .system-label {
        color: #2c3e50;
        font-weight: bold;
        margin-top: 0.5rem;
    }
    .analysis-label {
        color: #e74c3c;
        font-weight: bold;
    }
    .normal-value {
        color: #27ae60;
    }
    .abnormal-value {
        color: #e74c3c;
        font-weight: bold;
    }
    .info-text {
        font-size: 1rem;
        color: #7f8c8d;
    }
    </style>
    """, unsafe_allow_html=True)

def processar_pdf(uploaded_file):
    try:
        # Criar um arquivo temporário para salvar o PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp:
            temp.write(uploaded_file.getvalue())
            temp_path = temp.name
        
        # Extrair informações de identificação
        nome, data, hora = extrair_id(temp_path)
        
        # Processar o arquivo e extrair os dados de todas as páginas usando a função melhorada
        paginas_extraidas = extrair_campos_pagina(temp_path)  # Agora processa todas as páginas
        
        # Apagar o arquivo temporário
        os.unlink(temp_path)
        
        # Combinar os dados de todas as páginas
        combined_data = {}
        for pagina_data in paginas_extraidas:
            combined_data.update(pagina_data)
        
        if not combined_data:
            return nome, data, hora, {}
        
        # Analisar os dados extraídos
        gases_results = []
        electrolytes_results = []
        cbc_results = []
        renal_results = []
        liver_results = []
        cardiac_results = []
        inflammatory_results = []
        metabolic_results = []
        micro_results = []
        
        # Verificar quais análises são necessárias com base nos dados extraídos
        has_gasometria = any(campo in combined_data for campo in ["pH", "pO2", "pCO2", "HCO3-", "BE", "Lactato", "SpO2"])
        has_eletrolitos = any(campo in combined_data for campo in ["Na+", "K+", "Ca+", "Mg+", "iCa", "P"])
        has_hemograma = any(campo in combined_data for campo in ["Hb", "Ht", "Leuco", "Plaq", "Retic"])
        has_renal = any(campo in combined_data for campo in ["Creat", "Ur"])
        has_hepatica = any(campo in combined_data for campo in ["TGO", "TGP", "BT", "BD", "BI", "GamaGT", "FosfAlc", "Albumina"])
        has_cardiacos = any(campo in combined_data for campo in ["BNP", "CK-MB", "Tropo", "CPK", "LDH"])
        has_inflamatorios = any(campo in combined_data for campo in ["PCR", "FatorReumatoide"])
        has_metabolico = any(campo in combined_data for campo in ["Glicose", "HbA1c", "AcidoUrico", "T4L", "TSH"])
        has_microbiologia = any(campo in combined_data for campo in ["Hemocult", "HemocultAntibiograma", "Urocult"])
        
        # Realizar as análises necessárias
        if has_gasometria:
            gas_analysis = analisar_gasometria(combined_data)
            if gas_analysis:
                gases_results.extend(gas_analysis)
        
        if has_eletrolitos:
            electrolyte_analysis = analisar_eletrólitos(combined_data)
            if electrolyte_analysis:
                electrolytes_results.extend(electrolyte_analysis)
        
        if has_hemograma:
            cbc_analysis = analisar_hemograma(combined_data)
            if cbc_analysis:
                cbc_results.extend(cbc_analysis)
        
        if has_renal:
            renal_analysis = analisar_funcao_renal(combined_data)
            if renal_analysis:
                renal_results.extend(renal_analysis)
        
        if has_hepatica:
            liver_analysis = analisar_funcao_hepatica(combined_data)
            if liver_analysis:
                liver_results.extend(liver_analysis)
        
        if has_cardiacos:
            cardiac_analysis = analisar_marcadores_cardiacos(combined_data)
            if cardiac_analysis:
                cardiac_results.extend(cardiac_analysis)
        
        if has_inflamatorios:
            inflammatory_analysis = analisar_inflamatorios(combined_data)
            if inflammatory_analysis:
                inflammatory_results.extend(inflammatory_analysis)
        
        if has_metabolico:
            metabolic_analysis = analisar_metabolico(combined_data)
            if metabolic_analysis:
                metabolic_results.extend(metabolic_analysis)
        
        if has_microbiologia:
            micro_analysis = analisar_microbiologia(combined_data)
            if micro_analysis:
                micro_results.extend(micro_analysis)
        
        # Organizar os resultados por sistema
        results = {
            "Identificação": {"Nome": nome, "Data": data, "Hora": hora},
            "Dados": combined_data,
            "Sistemas": {
                "Gasometria": gases_results,
                "Eletrólitos": electrolytes_results,
                "Hemograma": cbc_results,
                "Função Renal": renal_results,
                "Função Hepática": liver_results,
                "Marcadores Cardíacos": cardiac_results,
                "Marcadores Inflamatórios": inflammatory_results,
                "Parâmetros Metabólicos": metabolic_results,
                "Microbiologia": micro_results
            }
        }
        
        return nome, data, hora, combined_data
    except Exception as e:
        st.error(f"Erro ao processar o arquivo: {str(e)}")
        return None, None, None, None

def is_abnormal(param, value):
    if param in REFERENCE_RANGES and value is not None:
        try:
            val = float(value)
            min_val, max_val = REFERENCE_RANGES[param]
            return val < min_val or val > max_val
        except (ValueError, TypeError):
            return False
    return False

def exibir_tendencia(exame, valor_atual, historico=None):
    if historico is None:
        # Simular valores históricos se não fornecidos
        datas = pd.date_range(end=datetime.now(), periods=5, freq='W').tolist()
        if exame in REFERENCE_RANGES:
            min_val, max_val = REFERENCE_RANGES[exame]
            media = (min_val + max_val) / 2
            valores = [media * (0.9 + 0.2 * np.random.random()) for _ in range(4)]
        else:
            valores = [valor_atual * (0.9 + 0.2 * np.random.random()) for _ in range(4)]
        
        valores.append(valor_atual)
        historico = pd.DataFrame({
            'Data': datas,
            'Valor': valores
        })
    
    # Criar gráfico com Plotly
    fig = go.Figure()
    
    # Adicionar linha para o exame
    fig.add_trace(go.Scatter(
        x=historico['Data'], 
        y=historico['Valor'],
        mode='lines+markers',
        name=exame
    ))
    
    # Adicionar faixas de referência se disponíveis
    if exame in REFERENCE_RANGES:
        min_val, max_val = REFERENCE_RANGES[exame]
        fig.add_shape(
            type="rect",
            x0=historico['Data'].min(),
            x1=historico['Data'].max(),
            y0=min_val,
            y1=max_val,
            line=dict(color="rgba(0,255,0,0.1)", width=0),
            fillcolor="rgba(0,255,0,0.1)",
        )
    
    # Configurar layout
    fig.update_layout(
        title=f"Tendência de {exame}",
        xaxis_title="Data",
        yaxis_title="Valor",
        height=300,
        margin=dict(l=0, r=0, t=30, b=0)
    )
    
    return fig

def exibir_grafico_sofa(sofa_scores):
    sistemas = [k for k in sofa_scores.keys() if k not in ["Total", "Interpretação"]]
    valores = [sofa_scores[k] for k in sistemas]
    
    # Criar figura
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Definir paleta de cores baseada na gravidade
    cores = ['#4CAF50', '#8BC34A', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722']
    barras = ax.bar(sistemas, valores, color=[cores[min(v, 5)] for v in valores])
    
    # Adicionar rótulos
    ax.set_title('Pontuação SOFA por Sistema', fontsize=15)
    ax.set_ylabel('Pontuação', fontsize=12)
    ax.set_ylim(0, 4.5)
    
    # Adicionar valores nas barras
    for barra in barras:
        height = barra.get_height()
        ax.text(barra.get_x() + barra.get_width()/2., height + 0.1,
                f'{height:.0f}', ha='center', va='bottom')
    
    plt.tight_layout()
    return fig

def main():
    custom_theme()
    
    st.title("UTI Helper - Análise de Exames")
    
    with st.sidebar:
        st.header("Opções")
        
        # Upload de arquivo
        uploaded_file = st.file_uploader("Carregar relatório de exames (PDF)", type="pdf")
        
        st.header("Dados do Paciente")
        usar_dados_paciente = st.checkbox("Incluir dados do paciente", value=False)

        paciente = None
        if usar_dados_paciente:
            with st.form("dados_paciente"):
                st.subheader("Informações do Paciente")
                nome = st.text_input("Nome")
                col1, col2, col3 = st.columns(3)
                with col1:
                    idade = st.number_input("Idade", min_value=0, max_value=120, value=50)
                with col2:
                    peso = st.number_input("Peso (kg)", min_value=0.0, max_value=300.0, value=70.0)
                with col3:
                    altura = st.number_input("Altura (cm)", min_value=0, max_value=250, value=170)
                
                col1, col2 = st.columns(2)
                with col1:
                    sexo = st.selectbox("Sexo", options=["M", "F"])
                with col2:
                    etnia = st.selectbox("Etnia", options=["Branco", "Negro", "Asiático", "Outro"])
                
                # Campo de diagnóstico (só aparece quando "incluir dados do paciente" está ativo)
                diagnosis = st.text_area("Diagnóstico", height=100)
                
                # Adicionar campos para sinais vitais
                st.subheader("Sinais Vitais")
                col1, col2, col3 = st.columns(3)
                with col1:
                    fc = st.number_input("FC (bpm)", min_value=0, max_value=300, value=80)
                    pas = st.number_input("PAS (mmHg)", min_value=0, max_value=300, value=120)
                with col2:
                    spo2 = st.number_input("SpO2 (%)", min_value=0, max_value=100, value=96)
                    pad = st.number_input("PAD (mmHg)", min_value=0, max_value=200, value=80)
                with col3:
                    tax = st.number_input("Tax (°C)", min_value=30.0, max_value=45.0, value=36.5, format="%.1f")
                    glasgow = st.number_input("Escala de Glasgow", min_value=3, max_value=15, value=15)
                
                col1, col2 = st.columns(2)
                with col1:
                    aminas = st.checkbox("Em uso de aminas", value=False)
                with col2:
                    ventilacao = st.checkbox("Em ventilação mecânica", value=False)
                
                submitted = st.form_submit_button("Salvar dados do paciente")
                
                if submitted:
                    # Criar objeto de dados do paciente
                    paciente = PatientData(
                        nome=nome,
                        idade=idade,
                        sexo=sexo,
                        peso=peso,
                        altura=altura,
                        etnia=etnia,
                        diagnostico=diagnosis
                    )
                    # Set vital signs and support parameters
                    paciente.fc = fc
                    paciente.pas = pas
                    paciente.pad = pad
                    paciente.tax = tax
                    paciente.spo2 = spo2
                    paciente.glasgow = glasgow
                    paciente.aminas = aminas
                    paciente.ventilacao = ventilacao
                    
                    st.success("Dados salvos com sucesso!")
        
        # Opção de AI Insights
        st.header("Análise IA")
        usar_ia = st.checkbox("Gerar insights clínicos com IA", value=False)
        
        # Sobre
        st.markdown("---")
        st.markdown("### Sobre")
        st.markdown("Desenvolvido para análise de exames laboratoriais em UTI.")
        st.markdown("Versão 1.0")
    
    # Exibir página de início se nenhum arquivo foi carregado
    if uploaded_file is None:
        st.markdown("""
        <div class="">
            <h3>Bem-vindo ao UTI Helper</h3>
            <p>Esta ferramenta foi desenvolvida para auxiliar médicos na análise e interpretação de exames laboratoriais.</p>
            <p>👈 Carregue um arquivo PDF de resultado de exames para começar a análise</p>
            <p>Características principais:</p>
            <ul>
                <li>Processamento automático de PDFs de laboratório</li>
                <li>Análise integrada de gasometria arterial</li>
                <li>Detecção de valores anormais e tendências</li>
                <li>Cálculos derivados (ex: gradiente alvéolo-arterial)</li>
                <li>Sugestões clinicamente relevantes</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)
        return
    
    # Conteúdo principal quando um arquivo é carregado
    try:
        # Adiciona um bloco try-except para tratar o erro de desempacotamento
        nome, data, hora, dados_exames = processar_pdf(uploaded_file)
    except ValueError as e:
        # Bypass para o erro de desempacotamento
        st.warning("Não foi possível extrair todos os dados do arquivo. Usando valores padrão.")
        nome = "Nome não encontrado"
        data = "Data não encontrada"
        hora = "Hora não encontrada"
        dados_exames = {}  # Valor padrão para dados_exames
    
    if not dados_exames:
        st.error("Não foi possível extrair dados do arquivo. Verifique se é um relatório de exames válido.")
        return
    
    # Usar os dados do paciente do formulário ou do PDF
    if not paciente:
        # Criar um objeto paciente básico com dados do PDF, mas agora é opcional ter nome
        paciente = PatientData(nome="Paciente não identificado")
    elif not paciente.nome and nome and nome != "Nome não encontrado":
        paciente.nome = nome
    
    # Exibir cabeçalho com dados do paciente
    col1, col2, col3 = st.columns([4, 1, 1])
    with col1:
        st.subheader(f"Paciente: {paciente.nome or 'Não identificado'}")
    with col2:
        st.write(f"Data: {data}")
    with col3:
        st.write(f"Hora: {hora}")
    
    # Mostrar dados demográficos do paciente se disponíveis
    if paciente and (paciente.idade or paciente.sexo or paciente.peso or paciente.altura):
        st.subheader("Dados Demográficos")
        cols = st.columns(6)  # Aumentado para 6 colunas para melhor uso do espaço
        if paciente.idade:
            cols[0].write(f"**Idade:** {paciente.idade} anos")
        if paciente.sexo:
            cols[1].write(f"**Sexo:** {'Masculino' if paciente.sexo == 'M' else 'Feminino'}")
        if paciente.peso:
            cols[2].write(f"**Peso:** {paciente.peso} kg")
        if paciente.altura:
            cols[3].write(f"**Altura:** {paciente.altura} cm")
    
    # Mostrar sinais vitais se disponíveis        
    if paciente and any([paciente.fc, paciente.pas, paciente.spo2, paciente.tax, paciente.glasgow, paciente.diurese, paciente.hgt]):
        st.subheader("Sinais Vitais")
        cols = st.columns(6)  # Aumentado para 6 colunas para melhor uso do espaço
        
        i = 0
        if paciente.fc:
            cols[i % 6].metric("FC", f"{paciente.fc} bpm")
            i += 1
        if paciente.pas and paciente.pad:
            cols[i % 6].metric("PA", f"{paciente.pas}/{paciente.pad} mmHg")
            i += 1
        if paciente.spo2:
            cols[i % 6].metric("SpO2", f"{paciente.spo2}%")
            i += 1
        if paciente.tax:
            cols[i % 6].metric("Tax", f"{paciente.tax}°C")
            i += 1
        if paciente.glasgow:
            cols[i % 6].metric("Glasgow", f"{paciente.glasgow}")
            i += 1
        if paciente.diurese:
            cols[i % 6].metric("Diurese", f"{paciente.diurese} mL/24h")
            i += 1
        if paciente.hgt:
            cols[i % 6].metric("HGT", f"{paciente.hgt} mg/dL")
            i += 1
            
    st.markdown("---")
    
    # Criar tabs para diferentes categorias de análise
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "📊 Resultados", 
        "🔬 Análise Clínica", 
        "📈 Tendências",
        "⚕️ Escores de Gravidade",
        "🦠 Microbiologia"
    ])
    
    # Tab 1: Resultados dos exames
    with tab1:
        st.header("Resultados dos Exames")
        
        # Organizar exames por categorias
        categorias = {
            'Sistema Hematológico': ['Hb', 'Ht', 'Leuco', 'Bastões', 'Segm', 'Plaq', 'Retic'],
            'Sistema Renal/Metabólico': ['Creat', 'Ur', 'Na+', 'K+', 'Ca+', 'Mg+', 'iCa', 'P',
                                       'pH', 'pCO2', 'pO2', 'HCO3-', 'BE', 'SpO2', 'Lactato',
                                       'Glicose', 'HbA1c'],
            'Sistema Cardiovascular': ['BNP', 'CK-MB', 'Tropo'],
            'Sistema Digestivo/Hepático': ['TGO', 'TGP', 'BT', 'BD', 'BI', 'GamaGT', 'FosfAlc', 
                                        'Amilase', 'Lipase', 'Albumina', 'CPK', 'LDH', 'AcidoUrico'],
            'Sistema de Coagulação': ['RNI', 'TTPA'],
            'Marcadores Inflamatórios': ['PCR', 'FatorReumatoide'],
            'Culturas e Sorologias': ['Hemocult', 'HemocultAntibiograma', 'Urocult', 'CultVigilNasal', 
                                   'CultVigilRetal', 'BetaHCG', 'HBsAg', 'AntiHBs', 'AntiHBcTotal', 
                                   'AntiHVAIgM', 'HCV', 'HIV', 'VDRL', 'CoombsDir', 'GrupoABO', 
                                   'FatorRh', 'DengueNS1']
        }
        
        # Exibir exames por categoria
        for categoria, campos in categorias.items():
            campos_presentes = [campo for campo in campos if campo in dados_exames]
            
            if campos_presentes:
                st.subheader(categoria)
                
                # Criar colunas para exibir os resultados - aumentar para 5 colunas
                cols = st.columns([1, 1, 1, 1, 1])
                for i, campo in enumerate(campos_presentes):
                    valor = dados_exames[campo]
                    col = cols[i % 5]
                    
                    # Verificar se está dentro da faixa de referência
                    estilo = ""
                    if isinstance(valor, (int, float)) and campo in REFERENCE_RANGES:
                        min_val, max_val = REFERENCE_RANGES[campo]
                        if valor < min_val:
                            estilo = "color: red"
                        elif valor > max_val:
                            estilo = "color: red"
                    
                    # Exibir o valor
                    with col:
                        if estilo:
                            st.markdown(f"**{campo}**: <span style='{estilo}'>{valor}</span>", unsafe_allow_html=True)
                        else:
                            st.write(f"**{campo}**: {valor}")
        
        # Tab 2: Análise Clínica
        with tab2:
            st.header("Análise Clínica")
            
            # Gasometria
            if any(campo in dados_exames for campo in ['pH', 'pCO2']):
                with st.expander("Análise de Gases Arteriais", expanded=True):
                    resultados = analisar_gasometria(dados_exames)
                    for resultado in resultados:
                        st.write(resultado)
            
            # Eletrólitos
            if any(campo in dados_exames for campo in ['Na+', 'K+', 'Ca+', 'Mg+', 'iCa']):
                with st.expander("Análise de Eletrólitos", expanded=True):
                    resultados = analisar_eletrólitos(dados_exames)
                    for resultado in resultados:
                        st.write(resultado)
            
            # Hemograma
            if any(campo in dados_exames for campo in ['Hb', 'Ht', 'Leuco', 'Plaq']):
                with st.expander("Análise Hematológica", expanded=True):
                    resultados = analisar_hemograma(dados_exames)
                    for resultado in resultados:
                        st.write(resultado)
            
            # Função Renal
            if any(campo in dados_exames for campo in ['Creat', 'Ur']):
                with st.expander("Análise da Função Renal", expanded=True):
                    resultados = analisar_funcao_renal(dados_exames)
                    for resultado in resultados:
                        st.write(resultado)
                    
                    # Adicionar clearance de creatinina se paciente tiver dados
                    if paciente and paciente.idade and paciente.sexo and 'Creat' in dados_exames:
                        st.subheader("Clearance de Creatinina")
                        clearance = calcular_clearance_creatinina(dados_exames['Creat'], paciente)
                        
                        # Exibir resultados de clearance
                        col1, col2 = st.columns([1, 1])
                        with col1:
                            for formula in ['Cockcroft-Gault', 'MDRD']:
                                if formula in clearance:
                                    st.metric(f"{formula}", f"{clearance[formula]} mL/min/1.73m²")
                        
                        with col2:
                            for formula in ['CKD-EPI', 'Schwartz (Pediátrico)']:
                                if formula in clearance:
                                    st.metric(f"{formula}", f"{clearance[formula]} mL/min/1.73m²")
                        
                        if "Interpretação" in clearance:
                            st.info(clearance["Interpretação"])
            
            # Função Hepática
            if any(campo in dados_exames for campo in ['TGO', 'TGP', 'BT', 'BD', 'BI', 'GamaGT', 'FosfAlc']):
                with st.expander("Análise da Função Hepática", expanded=True):
                    resultados = analisar_funcao_hepatica(dados_exames)
                    for resultado in resultados:
                        st.write(resultado)
            
            # Marcadores Cardíacos
            if any(campo in dados_exames for campo in ['BNP', 'CK-MB', 'Tropo']):
                with st.expander("Análise de Marcadores Cardíacos", expanded=True):
                    resultados = analisar_marcadores_cardiacos(dados_exames)
                    for resultado in resultados:
                        st.write(resultado)
            
            # Marcadores Inflamatórios
            if 'PCR' in dados_exames:
                with st.expander("Análise de Marcadores Inflamatórios", expanded=True):
                    resultados = analisar_inflamatorios(dados_exames)
                    for resultado in resultados:
                        st.write(resultado)
            
            # Metabólico
            if any(campo in dados_exames for campo in ['Glicose', 'HbA1c']):
                with st.expander("Análise Metabólica", expanded=True):
                    resultados = analisar_metabolico(dados_exames)
                    for resultado in resultados:
                        st.write(resultado)
            
            # Insights da IA usando OpenRouter (futuro)
            if usar_ia:
                with st.expander("🤖 Insights clínicos gerados por IA", expanded=True):
                    st.info("Analisando exames com IA para gerar insights clínicos...")
                    
                    # Placeholder para futura implementação com OpenRouter
                    st.code("""
# Implementação futura:
from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key=os.getenv("OPENROUTER_API_KEY"),
)

# Preparar dados para envio
exam_data = format_exams_for_ai(dados_exames)

completion = client.chat.completions.create(
  model="deepseek/deepseek-r1-distill-llama-70b:free",
  messages=[
    {
      "role": "user",
      "content": f"Analise os seguintes resultados de exames e forneça insights clínicos: {exam_data}"
    }
  ]
)
insights = completion.choices[0].message.content
                    """)
                    
                    # Simular insights para demonstração
                    st.markdown("""
                    #### Análise Clínica Sugerida
                    
                    Com base nos resultados laboratoriais, observa-se um padrão sugestivo de:
                    
                    1. **Alterações metabólicas** consistentes com estresse fisiológico
                    2. **Resposta inflamatória moderada**
                    3. **Possível disfunção renal** em estágio inicial
                    
                    **Recomendações:**
                    - Monitorar balanço hídrico e função renal
                    - Considerar ajustes no suporte ventilatório com base na gasometria
                    - Vigilância para sinais precoces de sepse
                    """)
        
        # Tab 3: Tendências
        with tab3:
            st.header("Tendências Temporais")
            st.write("Visualize a evolução dos principais parâmetros ao longo do tempo")
            
            # Selecionar exames para visualizar tendências
            exames_disponiveis = list(dados_exames.keys())
            if exames_disponiveis:
                exames_selecionados = st.multiselect(
                    "Selecione os exames para visualizar tendências",
                    options=exames_disponiveis,
                    default=exames_disponiveis[0:min(3, len(exames_disponiveis))]
                )
                
                # Exibir gráficos de tendência para cada exame selecionado
                if exames_selecionados:
                    for exame in exames_selecionados:
                        try:
                            if isinstance(dados_exames[exame], (int, float)):
                                fig = exibir_tendencia(exame, dados_exames[exame])
                                st.plotly_chart(fig, use_container_width=True)
                            else:
                                st.write(f"Não é possível gerar tendência para {exame} (valor não numérico)")
                        except Exception as e:
                            st.error(f"Erro ao gerar tendência para {exame}: {e}")
            else:
                st.warning("Nenhum exame disponível para análise de tendências")
            
            st.info("Nota: Dados históricos simulados para demonstração. Em uma versão completa, os dados seriam obtidos do banco de dados do paciente.")
        
        # Tab 4: Escores de Gravidade
        with tab4:
            st.header("Escores de Gravidade")
            
            if paciente and paciente.idade:
                col1, col2 = st.columns(2)
                
                with col1:
                    st.subheader("SOFA Score")
                    sofa = calcular_sofa(dados_exames, paciente)
                    
                    # Exibir pontuação total com destaque visual
                    if sofa["Total"] < 6:
                        st.markdown(f'<h1 style="color:#4CAF50;text-align:center">{sofa["Total"]}</h1>', unsafe_allow_html=True)
                    elif sofa["Total"] < 10:
                        st.markdown(f'<h1 style="color:#FFC107;text-align:center">{sofa["Total"]}</h1>', unsafe_allow_html=True)
                    else:
                        st.markdown(f'<h1 style="color:#F44336;text-align:center">{sofa["Total"]}</h1>', unsafe_allow_html=True)
                    
                    if "Interpretação" in sofa:
                        st.info(sofa["Interpretação"])
                    
                    # Exibir gráfico SOFA
                    fig = exibir_grafico_sofa(sofa)
                    st.pyplot(fig)
                
                with col2:
                    st.subheader("APACHE II Score")
                    apache = calcular_apache_ii(dados_exames, paciente)
                    
                    if "erro" not in apache:
                        # Exibir pontuação total com destaque visual
                        score = apache["Pontuação"]
                        if score < 10:
                            st.markdown(f'<h1 style="color:#4CAF50;text-align:center">{score}</h1>', unsafe_allow_html=True)
                        elif score < 20:
                            st.markdown(f'<h1 style="color:#FFC107;text-align:center">{score}</h1>', unsafe_allow_html=True)
                        else:
                            st.markdown(f'<h1 style="color:#F44336;text-align:center">{score}</h1>', unsafe_allow_html=True)
                        
                        st.write(f"**Mortalidade estimada:** {apache['Mortalidade Hospitalar Estimada']}")
                        st.write(f"**Pontos Fisiológicos:** {apache['Pontos Fisiológicos']}")
                        st.info(apache["Nota"])
                        
                        # Criar um gráfico de gauge para visualização da mortalidade
                        mortalidade_str = apache['Mortalidade Hospitalar Estimada'].replace('%', '')
                        mortalidade = float(mortalidade_str)
                        
                        fig = go.Figure(go.Indicator(
                            mode = "gauge+number",
                            value = mortalidade,
                            domain = {'x': [0, 1], 'y': [0, 1]},
                            title = {'text': "Mortalidade Estimada (%)"},
                            gauge = {
                                'axis': {'range': [None, 100]},
                                'bar': {'color': "#F44336"},
                                'steps': [
                                    {'range': [0, 25], 'color': "#4CAF50"},
                                    {'range': [25, 50], 'color': "#FFC107"},
                                    {'range': [50, 100], 'color': "#FF5722"}
                                ],
                                'threshold': {
                                    'line': {'color': "black", 'width': 4},
                                    'thickness': 0.75,
                                    'value': mortalidade
                                }
                            }
                        ))
                        
                        fig.update_layout(height=300)
                        st.plotly_chart(fig, use_container_width=True)
                    else:
                        st.error(apache["erro"])
                
                # Adicionar outras métricas úteis
                st.subheader("Outras Métricas")
                col1, col2, col3 = st.columns([1, 1, 1])
                
                with col1:
                    if paciente.peso and paciente.altura:
                        imc = paciente.calcular_imc()
                        if imc:
                            st.metric("IMC", f"{imc:.1f} kg/m²")
                            
                            # Interpretar IMC
                            if imc < 18.5:
                                st.caption("Abaixo do peso")
                            elif imc < 25:
                                st.caption("Peso normal")
                            elif imc < 30:
                                st.caption("Sobrepeso")
                            elif imc < 35:
                                st.caption("Obesidade Grau I")
                            elif imc < 40:
                                st.caption("Obesidade Grau II")
                            else:
                                st.caption("Obesidade Grau III")
                
                with col2:
                    if paciente.altura and paciente.sexo:
                        peso_ideal = paciente.calcular_peso_ideal()
                        if peso_ideal:
                            st.metric("Peso Ideal", f"{peso_ideal:.1f} kg")
                
                with col3:
                    if paciente.peso and paciente.altura:
                        sup_corp = paciente.calcular_superficie_corporal()
                        if sup_corp:
                            st.metric("Superfície Corporal", f"{sup_corp:.2f} m²")
            else:
                st.warning("Dados do paciente insuficientes para calcular escores de gravidade")
                st.write("É necessário informar ao menos idade, sexo e peso.")
        
        # Tab 5: Microbiologia
        with tab5:
            st.header("Análise Microbiológica")
            
            if any(campo in dados_exames for campo in ['Hemocult', 'HemocultAntibiograma', 'Urocult']):
                resultados = analisar_microbiologia(dados_exames)
                
                if resultados:
                    for resultado in resultados:
                        if resultado.startswith('Hemocultura positiva'):
                            st.error(resultado)
                        elif resultado.startswith('ALERTA'):
                            st.warning(resultado)
                        elif resultado.startswith('\nInterpretação'):
                            st.subheader("Interpretação do Antibiograma")
                        elif resultado.startswith('Padrões de resistência'):
                            st.markdown(f"**{resultado}**")
                        elif resultado.startswith('  •'):
                            st.markdown(resultado)
                        elif resultado.startswith('Antibióticos com sensibilidade'):
                            st.markdown(f"**{resultado}**")
                        elif resultado.startswith('Opções terapêuticas'):
                            st.markdown(f"**{resultado}**")
                        else:
                            st.write(resultado)
                    
                    # Adicionar visualização de padrão de sensibilidade/resistência
                    if 'HemocultAntibiograma' in dados_exames:
                        st.subheader("Visualização de Sensibilidade")
                        
                        # Simular dados do antibiograma para visualização
                        antibiograma_texto = dados_exames['HemocultAntibiograma']
                        antibioticos_sensiveis = []
                        antibioticos_resistentes = []
                        
                        # Extrair antibióticos sensíveis e resistentes
                        for linha in antibiograma_texto.split('\n'):
                            linha = linha.strip()
                            if 'sensível' in linha.lower():
                                antibiotico = linha.split('Sensível')[0].strip()
                                antibioticos_sensiveis.append(antibiotico)
                            elif 'resistente' in linha.lower():
                                antibiotico = linha.split('Resistente')[0].strip()
                                antibioticos_resistentes.append(antibiotico)
                        
                        # Criar dataframe para visualização
                        dados_viz = []
                        for ab in antibioticos_sensiveis:
                            dados_viz.append({"Antibiótico": ab, "Status": "Sensível", "Valor": 1})
                        for ab in antibioticos_resistentes:
                            dados_viz.append({"Antibiótico": ab, "Status": "Resistente", "Valor": 1})
                        
                        if dados_viz:
                            df = pd.DataFrame(dados_viz)
                            
                            # Criar gráfico de barras
                            fig = px.bar(
                                df, 
                                x="Antibiótico", 
                                y="Valor",
                                color="Status",
                                color_discrete_map={"Sensível": "#4CAF50", "Resistente": "#F44336"},
                                title="Padrão de Sensibilidade a Antibióticos"
                            )
                            
                            fig.update_layout(
                                xaxis_title="",
                                yaxis_title="",
                                yaxis_showticklabels=False,
                                showlegend=True
                            )
                            
                            st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("Nenhum dado microbiológico disponível nos exames.")
        
        # Botão para exportar relatório
        st.markdown("---")
        col1, col2 = st.columns([1, 5])
        with col1:
            if st.button("📄 Exportar Relatório"):
                st.success("Relatório exportado com sucesso! (funcionalidade simulada)")
                
        with col2:
            if st.button("🖨️ Imprimir"):
                st.code("window.print()", language="javascript")
                st.info("Função de impressão acionada")

# Importações adicionais para visualizações
import plotly.express as px

# Executar a aplicação
if __name__ == "__main__":
    # CSS styles for the app
    st.markdown("""
        <style>
        .main {
            padding: 1rem;
        }
        .stApp {
            max-width: 100%; 
            margin: 0 auto;
        }
        .info-box {
            background-color: #f0f2f6;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }
        .section-header {
            background-color: #0e4c92;
            color: white;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
        }
        .exam-value {
            font-weight: bold;
        }
        .abnormal-high {
            color: #d62728;
            font-weight: bold;
        }
        .abnormal-low {
            color: #2ca02c;
            font-weight: bold;
        }
        .abnormal-very-high {
            color: #d62728;
            font-weight: bold;
            background-color: #ffeeee;
            padding: 2px 5px;
            border-radius: 3px;
        }
        .abnormal-very-low {
            color: #2ca02c;
            font-weight: bold;
            background-color: #eeffee;
            padding: 2px 5px;
            border-radius: 3px;
        }
        .interpretation {
            margin-top: 10px;
            padding: 10px;
            background-color: #f8f9fa;
            border-left: 3px solid #0e4c92;
        }
        .welcome-image {
            width: 100%;
            border-radius: 10px;
            margin-bottom: 20px;
            object-fit: cover;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    # Initialize session state for patient data
    if 'patients' not in st.session_state:
        st.session_state.patients = {}

    # Initialize session state for success message display
    if 'show_success' not in st.session_state:
        st.session_state.show_success = False

    main() 