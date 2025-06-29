"""
Clinical Helper - Main application file.
"""

import streamlit as st
import os
import tempfile
from datetime import datetime, timedelta
import pandas as pd
import plotly.graph_objects as go
import matplotlib.pyplot as plt
import numpy as np
from dotenv import load_dotenv
import plotly.express as px
import requests
import json
from src.auth.google_oauth import GoogleOAuth
import logging

# Set up logging (add this near the top imports)
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)

# Carregar variáveis de ambiente
load_dotenv()

# Importar módulos de banco de dados
from src.database import create_tables, get_db_session, get_or_create_user
from src.database import (
    get_patients_for_user, get_patient_by_id, add_patient,
    add_lab_results_batch, get_lab_results_for_patient,
    get_medications_for_patient, add_medication,
    add_clinical_score, get_clinical_scores_for_patient
)

# Modelos de IA disponíveis
AVAILABLE_MODELS = {
    "Google Gemini Flash (Padrão)": "google/gemini-2.0-flash-exp:free",
    "Google Gemini Pro (Casos complexos)": "google/gemini-2.5-pro-exp-03-25:free",
    "DeepSeek R1 Qwen 32B": "deepseek/deepseek-r1-distill-qwen-32b:free"
}

# Import our refactored modules
from src import (
    PatientData, extrair_id, extrair_campos_pagina,
    analisar_gasometria, analisar_eletrólitos, analisar_hemograma,
    analisar_funcao_renal, analisar_funcao_hepatica, analisar_marcadores_cardiacos,
    analisar_metabolismo, analisar_microbiologia,
    patient_form, display_patient_info, display_lab_results, display_analysis_results,
    REFERENCE_RANGES, is_abnormal, get_reference_range_text
)

# Import severity score functions
from src.utils.severity_scores import calcular_sofa, calcular_apache2, calcular_qsofa

# Set page configuration
st.set_page_config(
    page_title="Clinical Helper",
    page_icon="🏥",
    layout="wide"
)

# Store the base URL in session state for redirects
if "app_url" not in st.session_state:
    base_url = os.getenv("STREAMLIT_BASE_URL", "http://localhost:8501")
    st.session_state["app_url"] = base_url

# Inicializar banco de dados
create_tables()

# Initialize session state for patient data if not exists
if 'patient' not in st.session_state:
    st.session_state.patient = PatientData()
    st.session_state.patient.hist_clinica = ""
    st.session_state.patient.achados_exame = ""
    st.session_state.patient.achados_imagem = ""
    st.session_state.patient.comorbidades = []

if 'lab_results' not in st.session_state:
    st.session_state.lab_results = {}

if 'analysis_results' not in st.session_state:
    st.session_state.analysis_results = {
        "Gasometria": [],
        "Eletrólitos": [],
        "Hemograma": [],
        "Função Renal": [],
        "Função Hepática": [],
        "Marcadores Cardíacos": [],
        "Metabolismo": [],
        "Microbiologia": []
    }

if 'selected_patient_id' not in st.session_state:
    st.session_state.selected_patient_id = None

# --- Helper Functions --- (Keep these defined at the top level)

def exibir_tendencia(exame, valor_atual, historico=None):
    """Display trend chart for lab values over time."""
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
    """Display SOFA score chart."""
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

def process_pdf(uploaded_file):
    """Extract and process data from PDF."""
    # Criar arquivo temporário
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
        temp_file.write(uploaded_file.getvalue())
        temp_path = temp_file.name
    
    # Extrair texto do PDF
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(temp_path)
        texto_completo = ""
        for page in doc:
            texto_completo += page.get_text()
        doc.close()
    except Exception as e:
        st.error(f"Erro ao processar o PDF: {e}")
        os.unlink(temp_path)
        return {}
    
    # Limpar arquivo temporário
    os.unlink(temp_path)
    
    # Extrair dados usando regex
    dados_exames = extrair_campos_pagina(texto_completo)
    
    return dados_exames

def process_pdf_and_save(uploaded_file, patient_id, user_id):
    """Process PDF and save results to database."""
    # Processar o PDF (código existente)
    data = process_pdf(uploaded_file)
    
    # Extrair timestamp do PDF ou usar data atual
    result_timestamp = datetime.now()  # Adaptar para extrair do PDF se disponível
    
    # Salvar no banco de dados
    with get_db_session() as db_session:
        added_results = add_lab_results_batch(
            db_session,
            data,
            patient_id,
            user_id,
            result_timestamp
        )
    
    return data, added_results

def analyze_data(data):
    """Analyze lab results."""
    resultados = {
        "Gasometria": [],
        "Eletrólitos": [],
        "Hemograma": [],
        "Função Renal": [],
        "Função Hepática": [],
        "Marcadores Cardíacos": [],
        "Metabolismo": [],
        "Microbiologia": []
    }
    
    # Analisar gasometria
    if any(exame in data for exame in ["pH", "PaO2", "PaCO2", "HCO3", "BE", "SaO2"]):
        resultados["Gasometria"] = analisar_gasometria(data)
    
    # Analisar eletrólitos
    if any(exame in data for exame in ["Sódio", "Potássio", "Cálcio", "Magnésio", "Fósforo", "Cloro"]):
        resultados["Eletrólitos"] = analisar_eletrólitos(data)
    
    # Analisar hemograma
    if any(exame in data for exame in ["Hemoglobina", "Hematócrito", "Leucócitos", "Plaquetas"]):
        resultados["Hemograma"] = analisar_hemograma(data)
    
    # Analisar função renal
    if any(exame in data for exame in ["Ureia", "Creatinina", "TFG"]):
        resultados["Função Renal"] = analisar_funcao_renal(data, st.session_state.patient)
    
    # Analisar função hepática
    if any(exame in data for exame in ["TGO", "TGP", "Bilirrubina Total", "Bilirrubina Direta", "GGT", "Fosfatase Alcalina"]):
        resultados["Função Hepática"] = analisar_funcao_hepatica(data)
    
    # Analisar marcadores cardíacos
    if any(exame in data for exame in ["Troponina", "CK", "CK-MB", "LDH"]):
        resultados["Marcadores Cardíacos"] = analisar_marcadores_cardiacos(data)
    
    # Analisar metabolismo
    if any(exame in data for exame in ["Glicose", "HbA1c", "Lactato"]):
        resultados["Metabolismo"] = analisar_metabolismo(data)
    
    # Analisar microbiologia (se houver dados)
    culturas = [k for k in data.keys() if "cultura" in k.lower()]
    if culturas:
        resultados["Microbiologia"] = analisar_microbiologia(data, culturas)
    
    return resultados

def get_historic_data(patient_id, user_id, exam_name):
    """
    Get historic data for a specific exam.
    
    Args:
        patient_id: ID do paciente
        user_id: ID do usuário
        exam_name: Nome do exame
        
    Returns:
        DataFrame com histórico de valores ou None se não houver dados
    """
    # Chave de cache para evitar múltiplas consultas ao banco de dados
    cache_key = f"hist_{patient_id}_{user_id}_{exam_name}"
    
    if cache_key in st.session_state:
        return st.session_state[cache_key]
    
    try:
        with get_db_session() as db_session:
            results = get_lab_results_for_patient(db_session, patient_id, user_id)
        
        # Filtrar pelo nome do exame
        exam_results = [r for r in results if r.test_name == exam_name]
    
        if not exam_results:
            return None
        
                # Criar DataFrame com dados temporais
        df = pd.DataFrame({
            'Data': [r.timestamp for r in exam_results],
                    'Valor': [r.value_numeric for r in exam_results],
                    'Unidade': [r.unit for r in exam_results],
                    'Referencia_Baixa': [r.reference_range_low for r in exam_results],
                    'Referencia_Alta': [r.reference_range_high for r in exam_results],
                })
                
        # Ordenar por data e remover valores nulos
        df = df.sort_values('Data').dropna(subset=['Valor'])
                
        # Armazenar em cache para evitar consultas repetidas
        st.session_state[cache_key] = df
                
        return df
    except Exception as e:
        st.error(f"Erro ao obter dados históricos: {str(e)}")
        return None

def get_all_historic_data(patient_id, user_id):
    """
    Get all historic data for a patient across all exams.
    
    Args:
        patient_id: ID do paciente
        user_id: ID do usuário
        
    Returns:
        Dictionary com histórico de valores por exame
    """
    # Chave de cache para evitar múltiplas consultas ao banco de dados
    cache_key = f"all_hist_{patient_id}_{user_id}"
    
    if cache_key in st.session_state:
        return st.session_state[cache_key]
    
    try:
        with get_db_session() as db_session:
            results = get_lab_results_for_patient(db_session, patient_id, user_id)
            
        if not results:
            return {}
        
        # Agrupar por nome do exame
        exams_data = {}
        for result in results:
            exam_name = result.test_name
            
            if exam_name not in exams_data:
                exams_data[exam_name] = []
                
            exams_data[exam_name].append({
                'Data': result.timestamp,
                'Valor': result.value_numeric,
                'Unidade': result.unit,
                'Referencia_Baixa': result.reference_range_low,
                'Referencia_Alta': result.reference_range_high,
            })
        
        # Converter para DataFrames
        for exam_name, data_list in exams_data.items():
            df = pd.DataFrame(data_list)
            # Ordenar por data e remover valores nulos
            df = df.sort_values('Data').dropna(subset=['Valor'])
            exams_data[exam_name] = df
        
        # Armazenar em cache para evitar consultas repetidas
        st.session_state[cache_key] = exams_data
        
        return exams_data
    except Exception as e:
        st.error(f"Erro ao obter todos os dados históricos: {str(e)}")
        return {}

def exibir_tendencia_real(exame, patient_id, user_id):
    """Display trend chart for lab values using real data from database."""
    historico = get_historic_data(patient_id, user_id, exame)
    
    if historico is None or len(historico) <= 1:
        # Fallback para dados simulados se não houver dados suficientes
        return exibir_tendencia(exame, 0)
    
    # Valor atual é o mais recente
    valor_atual = historico.iloc[-1]['Valor']
    
    # Criar gráfico com Plotly
    fig = go.Figure()
    
    # Adicionar linha para o exame
    fig.add_trace(go.Scatter(
        x=historico['Data'], 
        y=historico['Valor'],
        mode='lines+markers',
        name=exame,
        hovertemplate='%{x}<br>%{y} ' + historico.iloc[0]['Unidade'] if 'Unidade' in historico and len(historico) > 0 else ''
    ))
    
    # Adicionar faixas de referência se disponíveis no banco de dados
    if 'Referencia_Baixa' in historico and 'Referencia_Alta' in historico and not historico['Referencia_Baixa'].isnull().all():
        # Usar valores de referência do banco de dados
        min_val = historico['Referencia_Baixa'].iloc[0]
        max_val = historico['Referencia_Alta'].iloc[0]
        fig.add_shape(
            type="rect",
            x0=historico['Data'].min(),
            x1=historico['Data'].max(),
            y0=min_val,
            y1=max_val,
            line=dict(color="rgba(0,255,0,0.1)", width=0),
            fillcolor="rgba(0,255,0,0.1)",
        )
    # Fallback para valores de referência globais
    elif exame in REFERENCE_RANGES:
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
        yaxis_title=f"Valor ({historico.iloc[0]['Unidade'] if 'Unidade' in historico and len(historico) > 0 else ''})",
        height=300,
        margin=dict(l=0, r=0, t=30, b=0)
    )
    
    return fig

def exibir_tendencias_multiplas(exames, patient_id, user_id, normalize=False):
    """
    Cria um gráfico com múltiplos parâmetros para comparação.
    
    Args:
        exames: Lista de nomes de exames para exibir
        patient_id: ID do paciente
        user_id: ID do usuário
        normalize: Se True, normaliza os valores para facilitar comparação de escalas diferentes
    
    Returns:
        Figura Plotly
    """
    if not exames:
        return None
    
    # Tentar obter todos os dados históricos de uma vez (mais eficiente)
    todos_historicos = get_all_historic_data(patient_id, user_id)
    
    # Criar figura
    fig = go.Figure()
    
    # Para normalização
    if normalize:
        min_values = {}
        max_values = {}
    
    # Adicionar cada exame ao gráfico
    for exame in exames:
        # Verificar se o exame está no cache de todos os históricos
        if exame in todos_historicos:
            historico = todos_historicos[exame]
        else:
            # Fallback para busca individual
            historico = get_historic_data(patient_id, user_id, exame)
            
        if historico is None or len(historico) < 1:
            continue
        
        unidade = historico.iloc[0]['Unidade'] if 'Unidade' in historico else ''
        
        if normalize:
            # Salvar min/max para normalização
            min_values[exame] = historico['Valor'].min()
            max_values[exame] = historico['Valor'].max()
            # Normalizar valores (0-1)
            if max_values[exame] > min_values[exame]:
                historico['Valor_Norm'] = (historico['Valor'] - min_values[exame]) / (max_values[exame] - min_values[exame])
                y_values = historico['Valor_Norm']
                hover_text = [f"{exame}: {v} {unidade} (normalizado: {n:.2f})" 
                              for v, n in zip(historico['Valor'], historico['Valor_Norm'])]
            else:
                y_values = historico['Valor']
                hover_text = [f"{exame}: {v} {unidade}" for v in historico['Valor']]
        else:
            y_values = historico['Valor']
            hover_text = [f"{exame}: {v} {unidade}" for v in historico['Valor']]
        
        # Adicionar linha para o exame
        fig.add_trace(go.Scatter(
            x=historico['Data'],
            y=y_values,
            mode='lines+markers',
            name=exame,
            hovertemplate='%{x}<br>%{text}',
            text=hover_text
        ))
        
        # Adicionar faixas de referência se estiver mostrando valores não-normalizados
        if not normalize:
            # Tentar usar valores de referência do banco de dados
            if 'Referencia_Baixa' in historico and 'Referencia_Alta' in historico and not historico['Referencia_Baixa'].isnull().all():
                min_val = historico['Referencia_Baixa'].iloc[0]
                max_val = historico['Referencia_Alta'].iloc[0]
                fig.add_shape(
                    type="rect",
                    x0=historico['Data'].min(),
                    x1=historico['Data'].max(),
                    y0=min_val,
                    y1=max_val,
                    line=dict(color=f"rgba(0,255,0,0.1)", width=0),
                    fillcolor=f"rgba(0,255,0,0.1)",
                    name=f"Ref. {exame}"
                )
            # Fallback para valores de referência globais
            elif exame in REFERENCE_RANGES:
                min_val, max_val = REFERENCE_RANGES[exame]
                fig.add_shape(
                    type="rect",
                    x0=historico['Data'].min(),
                    x1=historico['Data'].max(),
                    y0=min_val,
                    y1=max_val,
                    line=dict(color=f"rgba(0,255,0,0.1)", width=0),
                    fillcolor=f"rgba(0,255,0,0.1)",
                    name=f"Ref. {exame}"
                )
    
    # Configurar layout
    title = "Comparação de Parâmetros" if normalize else "Tendências Múltiplas"
    y_title = "Valor Normalizado (0-1)" if normalize else "Valor"
    
    fig.update_layout(
        title=title,
        xaxis_title="Data",
        yaxis_title=y_title,
        height=400,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        margin=dict(l=0, r=0, t=50, b=0),
        hovermode="closest"
    )
    
    # Adicionar botões para zoom em períodos específicos
    fig.update_layout(
        updatemenus=[
            dict(
                type="buttons",
                direction="left",
                buttons=[
                    dict(
                        args=[{"xaxis.range": [None, None]}],
                        label="Todo período",
                        method="relayout"
                    ),
                    dict(
                        args=[{"xaxis.range": [(datetime.now() - timedelta(days=7)), datetime.now()]}],
                        label="Última semana",
                        method="relayout"
                    ),
                    dict(
                        args=[{"xaxis.range": [(datetime.now() - timedelta(days=30)), datetime.now()]}],
                        label="Último mês",
                        method="relayout"
                    ),
                ],
                pad={"r": 10, "t": 10},
                showactive=True,
                x=0,
                xanchor="left",
                y=1.15,
                yanchor="top"
            ),
        ]
    )
    
    return fig

def criar_linha_tempo_consolidada(patient_id, user_id):
    """
    Cria uma linha do tempo consolidada com todos os exames e intervenções.
    
    Args:
        patient_id: ID do paciente
        user_id: ID do usuário
        
    Returns:
        Figura Plotly com linha do tempo interativa
    """
    # Obter todos os dados históricos
    todos_dados = get_all_historic_data(patient_id, user_id)
    
    if not todos_dados:
        return None
    
    # Preparar dados para linha do tempo
    eventos = []
    for exame, df in todos_dados.items():
        if len(df) < 1:
            continue
            
        for idx, row in df.iterrows():
            # Verificar se está fora do intervalo de referência
            is_abnormal = False
            ref_text = ""
            
            if not pd.isna(row.get('Referencia_Baixa')) and not pd.isna(row.get('Referencia_Alta')):
                ref_low = row['Referencia_Baixa']
                ref_high = row['Referencia_Alta']
                valor = row['Valor']
                
                if valor < ref_low or valor > ref_high:
                    is_abnormal = True
                    ref_text = f" (Ref: {ref_low}-{ref_high})"
            
            # Classificar severidade para código de cores
            cor = "black"  # normal
            if is_abnormal:
                # Verificar quão fora está do intervalo
                if not pd.isna(row.get('Referencia_Baixa')) and not pd.isna(row.get('Referencia_Alta')):
                    ref_low = row['Referencia_Baixa']
                    ref_high = row['Referencia_Alta']
                    valor = row['Valor']
                    
                    # Calcular percentual fora do intervalo
                    if valor < ref_low:
                        pct_off = (ref_low - valor) / ref_low if ref_low != 0 else 1
                        if pct_off > 0.3:
                            cor = "red"  # muito abaixo
                        else:
                            cor = "orange"  # abaixo
                    elif valor > ref_high:
                        pct_off = (valor - ref_high) / ref_high if ref_high != 0 else 1
                        if pct_off > 0.3:
                            cor = "red"  # muito acima
                        else:
                            cor = "orange"  # acima
            
            unidade = row.get('Unidade', '')
            texto = f"{exame}: {row['Valor']} {unidade}{ref_text}"
            
            eventos.append({
                'Data': row['Data'],
                'Exame': exame,
                'Texto': texto,
                'Valor': row['Valor'],
                'Cor': cor,
                'Alterado': is_abnormal
            })
    
    # Ordenar eventos por data
    eventos_df = pd.DataFrame(eventos)
    if len(eventos_df) == 0:
        return None
        
    eventos_df = eventos_df.sort_values('Data')
    
    # Agrupar eventos por data para visualização
    datas_unicas = eventos_df['Data'].dt.date.unique()
    
    # Criar figura
    fig = go.Figure()
    
    # Adicionar linha do tempo principal
    fig.add_trace(go.Scatter(
        x=datas_unicas,
        y=[1] * len(datas_unicas),
        mode='markers',
        marker=dict(size=15, color='royalblue', symbol='diamond'),
        name='Datas de Exames',
        hoverinfo='none'
    ))
    
    # Adicionar eventos individuais com cores diferentes para alterados
    for i, data in enumerate(datas_unicas):
        # Filtrar eventos do dia
        eventos_dia = eventos_df[eventos_df['Data'].dt.date == data]
        
        # Adicionar texto para hover
        textos = [f"{e['Texto']} ({e['Data'].strftime('%H:%M')})" for _, e in eventos_dia.iterrows()]
        texto_hover = "<br>".join(textos)
        
        # Contar quantos exames alterados
        num_alterados = eventos_dia['Alterado'].sum()
        
        # Adicionar anotação para cada data
        fig.add_annotation(
            x=data,
            y=1.1,
            text=f"{len(eventos_dia)} exames<br>{num_alterados} alterados" if num_alterados > 0 else f"{len(eventos_dia)} exames",
            showarrow=True,
            arrowhead=2,
            arrowsize=1,
            arrowwidth=2,
            arrowcolor='gray',
            font=dict(
                size=10,
                color='black' if num_alterados == 0 else 'red' if num_alterados > len(eventos_dia)/2 else 'orange'
            ),
            align="center",
            bordercolor="gray",
            borderwidth=1,
            borderpad=4,
            bgcolor="white",
            opacity=0.8,
            hoverlabel=dict(
                font_size=12,
                font_family="Arial"
            ),
            hovertext=texto_hover
        )
    
    # Configurar layout
    fig.update_layout(
        title='Linha do Tempo de Exames',
        xaxis=dict(
            title='Data',
            type='date',
            tickformat='%d/%m/%Y',
            tickangle=45,
            showgrid=True
        ),
        yaxis=dict(
            showticklabels=False,
            zeroline=False,
            showgrid=False,
            range=[0.5, 1.5]
        ),
        height=300,
        margin=dict(l=10, r=10, t=40, b=10),
        hovermode="closest",
        showlegend=False
    )
    
    # Adicionar botões para zoom em períodos específicos
    fig.update_layout(
        updatemenus=[
            dict(
                type="buttons",
                direction="left",
                buttons=[
                    dict(
                        args=[{"xaxis.range": [None, None]}],
                        label="Todo período",
                        method="relayout"
                    ),
                    dict(
                        args=[{"xaxis.range": [(datetime.now() - timedelta(days=7)).date(), datetime.now().date()]}],
                        label="Última semana",
                        method="relayout"
                    ),
                    dict(
                        args=[{"xaxis.range": [(datetime.now() - timedelta(days=30)).date(), datetime.now().date()]}],
                        label="Último mês",
                        method="relayout"
                    ),
                ],
                pad={"r": 10, "t": 10},
                showactive=True,
                x=0,
                xanchor="left",
                y=1.15,
                yanchor="top"
            ),
        ]
    )
    
    return fig

def calcular_matriz_correlacao(exames, patient_id, user_id):
    """
    Calcula a matriz de correlação entre os exames selecionados.
    
    Args:
        exames: Lista de nomes de exames para correlacionar
        patient_id: ID do paciente
        user_id: ID do usuário
        
    Returns:
        DataFrame com matriz de correlação e figura Plotly
    """
    # Obter todos os dados históricos
    todos_dados = get_all_historic_data(patient_id, user_id)
    
    if not todos_dados or len(exames) < 2:
        return None, None
    
    # Filtrar apenas os exames solicitados
    dados_filtrados = {k: v for k, v in todos_dados.items() if k in exames}
    
    # Precisamos de pelo menos 2 exames com dados
    if len(dados_filtrados) < 2:
        return None, None
    
    # Criar DataFrame com todos os exames para correlação
    # Primeiro, precisamos de uma série temporal comum
    todas_datas = set()
    for df in dados_filtrados.values():
        todas_datas.update(df['Data'].dt.date)
    
    todas_datas = sorted(todas_datas)
    
    # Criar DataFrame vazio com as datas como índice
    df_correlacao = pd.DataFrame(index=todas_datas)
    
    # Preencher com os valores mais recentes para cada data
    for exame, df in dados_filtrados.items():
        # Agrupar por data e pegar o último valor do dia para cada data
        df['data_only'] = df['Data'].dt.date
        last_values = df.groupby('data_only')['Valor'].last()
        
        # Adicionar ao DataFrame de correlação
        df_correlacao[exame] = last_values
    
    # Calcular matriz de correlação
    matriz_corr = df_correlacao.corr(min_periods=3)  # Pelo menos 3 pontos para correlação
    
    # Criar heatmap
    fig = go.Figure(data=go.Heatmap(
        z=matriz_corr.values,
        x=matriz_corr.columns,
        y=matriz_corr.index,
        colorscale='RdBu_r',  # Red para neg, Blue para pos
        zmid=0,  # Centro da escala em 0
        text=[[f"{val:.2f}" for val in row] for row in matriz_corr.values],
        texttemplate="%{text}",
        textfont={"size":10},
        hovertemplate='Correlação entre %{y} e %{x}: %{z:.3f}<extra></extra>'
    ))
    
    # Configurar layout
    fig.update_layout(
        title='Matriz de Correlação entre Exames',
        height=500,
        margin=dict(l=60, r=30, t=60, b=30),
    )
    
    return matriz_corr, fig

def criar_grafico_dispersao(exame1, exame2, patient_id, user_id):
    """
    Cria um gráfico de dispersão para analisar a correlação entre dois exames.
    
    Args:
        exame1, exame2: Nomes dos exames para correlacionar
        patient_id: ID do paciente
        user_id: ID do usuário
        
    Returns:
        Figura Plotly com gráfico de dispersão
    """
    # Obter dados dos dois exames
    dados1 = get_historic_data(patient_id, user_id, exame1)
    dados2 = get_historic_data(patient_id, user_id, exame2)
    
    if dados1 is None or dados2 is None or len(dados1) < 3 or len(dados2) < 3:
        return None
    
    # Precisamos de pontos comuns - juntar por data
    dados1['data_only'] = dados1['Data'].dt.date
    dados2['data_only'] = dados2['Data'].dt.date
    
    # Obter datas em comum
    datas_comuns = set(dados1['data_only']).intersection(set(dados2['data_only']))
    
    if len(datas_comuns) < 3:
        return None
    
    # Filtrar apenas datas em comum e pegar o último valor de cada dia
    dados1_filtrado = dados1[dados1['data_only'].isin(datas_comuns)]
    dados2_filtrado = dados2[dados2['data_only'].isin(datas_comuns)]
    
    dados1_agrupado = dados1_filtrado.groupby('data_only')['Valor'].last().reset_index()
    dados2_agrupado = dados2_filtrado.groupby('data_only')['Valor'].last().reset_index()
    
    # Juntar os DataFrames
    df_merged = pd.merge(
        dados1_agrupado, 
        dados2_agrupado, 
        on='data_only', 
        suffixes=('_1', '_2')
    )
    
    # Calcular correlação
    corr = df_merged['Valor_1'].corr(df_merged['Valor_2'])
    
    # Calcular linha de regressão
    slope, intercept = np.polyfit(df_merged['Valor_1'], df_merged['Valor_2'], 1)
    
    # Criar figura
    fig = go.Figure()
    
    # Adicionar pontos de dispersão
    fig.add_trace(go.Scatter(
        x=df_merged['Valor_1'],
        y=df_merged['Valor_2'],
        mode='markers+text',
        marker=dict(size=10, color='royalblue'),
        text=df_merged['data_only'].astype(str),
        textposition="top center",
        name='Valores',
        hovertemplate=f'{exame1}: %{{x}}<br>{exame2}: %{{y}}<br>Data: %{{text}}'
    ))
    
    # Adicionar linha de regressão
    x_range = np.linspace(df_merged['Valor_1'].min(), df_merged['Valor_1'].max(), 100)
    y_range = intercept + slope * x_range
    
    fig.add_trace(go.Scatter(
        x=x_range,
        y=y_range,
        mode='lines',
        line=dict(color='red', dash='dash'),
        name=f'Regressão (r={corr:.2f})'
    ))
    
    # Adicionar valores de referência
    unidade1 = dados1['Unidade'].iloc[0] if 'Unidade' in dados1 and len(dados1) > 0 else ''
    unidade2 = dados2['Unidade'].iloc[0] if 'Unidade' in dados2 and len(dados2) > 0 else ''
    
    # Configurar layout
    fig.update_layout(
        title=f'Correlação entre {exame1} e {exame2} (r = {corr:.2f})',
        xaxis=dict(
            title=f'{exame1} ({unidade1})',
            zeroline=True,
            gridwidth=1,
        ),
        yaxis=dict(
            title=f'{exame2} ({unidade2})',
            zeroline=True,
            gridwidth=1,
        ),
        height=600,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        ),
        template='plotly_white',
        annotations=[
            dict(
                x=0.02,
                y=0.98,
                xref="paper",
                yref="paper",
                text=f"Correlação: {corr:.2f}",
                showarrow=False,
                font=dict(
                    size=14,
                    color="black" if abs(corr) < 0.3 else "orange" if abs(corr) < 0.7 else "red"
                ),
                align="left",
                bordercolor="black",
                borderwidth=1,
                borderpad=4,
                bgcolor="white",
                opacity=0.8
            )
        ]
    )
    
    return fig

def create_patient_sidebar():
    """Create sidebar for patient selection and management."""
    st.sidebar.title("Gerenciamento de Pacientes")
    
    # Get patients from database
    with get_db_session() as db_session:
        patients = get_patients_for_user(db_session, st.session_state.user_id)
    
    # Create patient selector
    patient_options = ["+ Novo Paciente"] + [f"{p.name} (ID: {p.patient_id})" for p in patients]
    
    selected_option = st.sidebar.selectbox(
        "Selecione um Paciente",
        options=patient_options,
        index=0 if not st.session_state.selected_patient_id 
        else patient_options.index(next((p for p in patient_options if f"ID: {st.session_state.selected_patient_id})" in p), patient_options[0]))
    )
    # Handle new patient
    if selected_option == "+ Novo Paciente":
        st.sidebar.subheader("Novo Paciente")
        
        with st.sidebar.form("new_patient_form"):
            patient_name = st.text_input("Nome do Paciente")
            patient_age = st.number_input("Idade", min_value=0, max_value=120)
            patient_sex = st.selectbox("Sexo", options=["M", "F"])
            patient_weight = st.number_input("Peso (kg)", min_value=0.0, max_value=500.0)
            patient_height = st.number_input("Altura (cm)", min_value=0.0, max_value=250.0)
            patient_ethnicity = st.selectbox("Etnia", options=["Branco", "Negro", "Asiatico", "Outro"])
            patient_diagnosis = st.text_area("Diagnóstico")
            
            submit_button = st.form_submit_button("Salvar Paciente")
            
            if submit_button and patient_name:
                # Add patient to database
                with get_db_session() as db_session:
                    new_patient = add_patient(
                        db_session,
                        {
                            "name": patient_name,
                            "idade": patient_age,
                            "sexo": patient_sex,
                            "peso": patient_weight,
                            "altura": patient_height,
                            "etnia": patient_ethnicity,
                            "diagnostico": patient_diagnosis,
                            "data_internacao": datetime.now()
                        },
                        st.session_state.user_id
                    )
                    
                    st.session_state.selected_patient_id = new_patient.patient_id
                    st.rerun()
    else:
        # Extract patient_id from selection
        patient_id = int(selected_option.split("ID: ")[1].split(")")[0])
        
        if patient_id != st.session_state.selected_patient_id:
            st.session_state.selected_patient_id = patient_id
            
            # Load patient data
            with get_db_session() as db_session:
                patient = get_patient_by_id(db_session, patient_id, st.session_state.user_id)
                
                if patient:
                    # Update session state with patient data
                    st.session_state.patient = PatientData(
                        nome=patient.name,
                        idade=patient.idade,
                        sexo=patient.sexo,
                        peso=patient.peso,
                        altura=patient.altura,
                        etnia=patient.etnia,
                        data_internacao=patient.data_internacao,
                        diagnostico=patient.diagnostico
                    )
    
    return st.session_state.selected_patient_id is not None

def get_exams_by_category():
    # Assuming this function exists somewhere and returns a dict
    # Example implementation (replace with actual logic)
    return {
        "Gasometria": ["pH", "PaO2", "PaCO2", "HCO3", "BE", "SaO2"],
        "Eletrólitos": ["Sódio", "Potássio", "Cálcio", "Magnésio", "Fósforo", "Cloro"],
        "Hemograma": ["Hemoglobina", "Hematócrito", "Leucócitos", "Plaquetas"],
        "Função Renal": ["Ureia", "Creatinina", "TFG"],
        "Função Hepática": ["TGO", "TGP", "Bilirrubina Total", "Bilirrubina Direta", "GGT", "Fosfatase Alcalina"],
        "Marcadores Cardíacos": ["Troponina", "CK", "CK-MB", "LDH"],
        "Metabolismo": ["Glicose", "HbA1c", "Lactato"],
        # ... other categories
    }

def gerar_resposta_ia(pergunta, dados, modelo_id="google/gemini-2.0-flash-exp:free"):
    """Gerar resposta do Dr. Corvus com OpenRouter."""
    url = "http://localhost:7777/v1/chat"
    
    try:
        payload = {
            "model": modelo_id,
            "messages": [
                {
                    "role": "system",
                    "content": """Você é Dr. Corvus, um assistente médico especializado em análise de exames laboratoriais e 
                    suporte à decisão clínica. Sua função é interpretar resultados, identificar alterações importantes e 
                    fornecer orientações baseadas em evidências.
                    
                    Você tem acesso a dados do paciente e resultados de exames que devem ser usados para contextualizar suas respostas.
                    
                    Regras importantes:
                    1. Comunique-se em português do Brasil usando terminologia médica apropriada
                    2. Baseie suas respostas apenas em dados médicos objetivos e literatura científica reconhecida
                    3. Destaque claramente valores laboratoriais alterados e sua possível significância clínica
                    4. Mantenha o foco em interpretação de exames e correlação clínica
                    5. Indique quando alguma informação necessária não estiver disponível para responder adequadamente
                    6. Seja conciso e organizado, use marcadores quando apropriado
                    7. Considere o contexto clínico completo do paciente, incluindo diagnóstico, ao interpretar resultados
                    8. Sugira possíveis diagnósticos diferenciais quando apropriado, mas evite afirmações definitivas
                    9. Evite repetir todos os dados fornecidos, foque apenas nos relevantes para a pergunta
                    10. Recomende exames adicionais quando puderem contribuir para esclarecer a situação
                    
                    IMPORTANTE: Seu propósito é auxiliar profissionais de saúde, não pacientes diretamente. 
                    Seus conselhos não substituem avaliação médica presencial.
                    """
                },
                {
                    "role": "user",
                    "content": f"""
                    Dados do Paciente:
                    
                    {dados}
                    
                    Pergunta do médico: {pergunta}
                    """
                }
            ]
        }
        
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        resposta = response.json()['choices'][0]['message']['content']
        return resposta
                
    except Exception as e:
        st.error(f"Erro ao comunicar com o Dr. Corvus: {str(e)}")
        return "Desculpe, ocorreu um erro ao processar sua pergunta. Por favor, tente novamente mais tarde."

# --- Main Application Logic --- 

def main():
    """Main application function."""
    st.markdown("<h1 class='main-header'>Clinical Helper</h1>", unsafe_allow_html=True)

    # Log the authentication state when main.py runs
    auth_state = st.session_state.get("authenticated", False)
    user_email = st.session_state.get("user", {}).get("email", "Not available")
    logger.info(f"Main.py loaded. Authentication state: {auth_state}, User: {user_email}")

    # Check authentication status using the new system
    if not GoogleOAuth.is_authenticated():
        # Show login screen if not authenticated
        logger.info("User not authenticated, showing login screen.")
        st.title("�� Clinical Helper")
        st.subheader("Sistema de auxílio para análise de exames laboratoriais e suporte à decisão clínica em UTI")
        st.info("Por favor, faça login para acessar o sistema.") # Kept this message
        col1, col2 = st.columns([1, 3])
        with col1:
            GoogleOAuth.login_button("🔐 Login com Google")
        with st.expander("ℹ️ Sobre o Clinical Helper"):
             st.markdown("""
             **Clinical Helper** é uma ferramenta desenvolvida para auxiliar profissionais médicos
             na análise e interpretação de exames laboratoriais, particularmente em ambientes de
             unidade de terapia intensiva (UTI).

             O sistema processa relatórios laboratoriais em PDF, extrai dados relevantes e fornece
             análise clínica baseada em intervalos de referência e algoritmos médicos.
             """)
        return # Stop execution if not authenticated

    # --- Authenticated User Logic --- 
    # Get or create user (Only runs if authenticated)
    user_id = None
    with get_db_session() as db_session:
        # Assuming user info is now in st.session_state['user'] from the new OAuth
        if 'user' in st.session_state:
             user_info = st.session_state['user']
             user = get_or_create_user(
                 db_session,
                 user_info.get("email", "unknown_email"),
                 user_info.get("name", "Unknown User")
             )
             st.session_state.user_id = user.user_id
             user_id = user.user_id # Assign to local variable for use
        else:
             # Handle case where user info might be missing after authentication
             st.error("Não foi possível obter informações do usuário após o login.")
             GoogleOAuth.logout()
             st.experimental_rerun()
             return
    
    # Ensure user_id is set before proceeding
    if not user_id:
        st.error("ID do usuário não definido. Tentando fazer logout.")
        GoogleOAuth.logout()
        st.experimental_rerun()
        return

    # Create patient sidebar and check if patient is selected
    has_patient = create_patient_sidebar() # This now correctly uses st.session_state.user_id

    # Sidebar content for authenticated users
    st.sidebar.success(f"Logado como: {st.session_state.get('name')}")
    if st.sidebar.button("Logout"):
        GoogleOAuth.logout()
        st.experimental_rerun()
        return # Stop execution after logout

    # --- Main Application Tabs --- 
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "📝 Dados do Paciente",
        "🧪 Resultados de Exames",
        "📊 Análise",
            "📈 Tendências",
        "🤖 Dr. Corvus"
        ])

    with tab1:
        st.subheader("Informações do Paciente")
        if has_patient:
            display_patient_info(st.session_state.patient)
        else:
            st.info("Por favor, selecione ou crie um paciente na barra lateral.")
    
    with tab2:
        st.subheader("Resultados de Exames")
        if not has_patient:
            st.info("Por favor, selecione ou crie um paciente na barra lateral.")
        else:
            uploaded_file = st.file_uploader("Faça upload de um relatório de exames em PDF", type="pdf")
            if uploaded_file is not None:
                dados_exames, saved_results = process_pdf_and_save(
                    uploaded_file,
                    st.session_state.selected_patient_id,
                    user_id # Use local variable
                )
                st.session_state.lab_results = dados_exames
                st.session_state.analysis_results = analyze_data(dados_exames)
                display_lab_results(dados_exames)
            else:
                with get_db_session() as db_session:
                    results = get_lab_results_for_patient(
                        db_session,
                        st.session_state.selected_patient_id,
                        user_id # Use local variable
                    )
                    if results:
                        dados_exames = {}
                        for result in results:
                            dados_exames[result.test_name] = {
                                "value": result.value_numeric if result.value_numeric is not None else result.value_text,
                                "unit": result.unit,
                                "reference_low": result.reference_range_low,
                                "reference_high": result.reference_range_high
                            }
                        st.session_state.lab_results = dados_exames
                        st.write("Resultados mais recentes:")
                        display_lab_results(dados_exames)
                    else:
                        st.info("Nenhum resultado de exame encontrado. Por favor, faça upload de um relatório.")
    
    with tab3:
        st.subheader("Análise dos Resultados")
        if not has_patient:
            st.info("Por favor, selecione ou crie um paciente na barra lateral.")
        elif not st.session_state.lab_results:
            st.info("Nenhum resultado de exame disponível para análise.")
        else:
            display_analysis_results(st.session_state.analysis_results)
            st.markdown("#### Escores de Gravidade")
            col1, col2, col3 = st.columns(3)
            sofa_scores = calcular_sofa(st.session_state.patient, st.session_state.lab_results)
            col1.metric("SOFA Total", sofa_scores["Total"])
            qsofa = calcular_qsofa(st.session_state.patient, st.session_state.lab_results)
            col2.metric("qSOFA", qsofa["Total"])
            apache2 = calcular_apache2(st.session_state.patient, st.session_state.lab_results)
            col3.metric("APACHE II", apache2["Total"])
            st.pyplot(exibir_grafico_sofa(sofa_scores))
            with get_db_session() as db_session:
                for score_name, score_data in [
                    ("SOFA", sofa_scores), 
                    ("qSOFA", qsofa), 
                    ("APACHE II", apache2)
                ]:
                    add_clinical_score(
                        db_session,
                        st.session_state.selected_patient_id,
                        user_id, # Use local variable
                        score_name,
                        float(score_data["Total"]),
                        datetime.now()
                    )
    
    with tab4:
        st.subheader("Visualização Temporal")
        if not has_patient:
            st.info("Por favor, selecione ou crie um paciente na barra lateral.")
        else:
            vis_tab1, vis_tab2, vis_tab3, vis_tab4, vis_tab5 = st.tabs([
                "Exame Individual", "Comparação Múltipla", "Painel Completo",
                "Linha do Tempo", "Análise de Correlações"
            ])
            categorias = get_exams_by_category() # Get categories once

            with vis_tab1:
                st.subheader("Selecione um exame para visualização")
                categoria_selecionada = st.selectbox("Categoria de Exames", options=list(categorias.keys()))
                if categoria_selecionada:
                    exames_disponiveis = categorias[categoria_selecionada]
                    exame_selecionado = st.selectbox("Exame", options=exames_disponiveis)
                    if exame_selecionado:
                        fig = exibir_tendencia_real(exame_selecionado, st.session_state.selected_patient_id, user_id)
                        st.plotly_chart(fig, use_container_width=True)
                        historico = get_historic_data(st.session_state.selected_patient_id, user_id, exame_selecionado)
                        if historico is not None and len(historico) > 1:
                            st.subheader("Estatísticas")
                            col1, col2, col3, col4 = st.columns(4)
                            col1.metric("Valor Atual", f"{historico.iloc[-1]['Valor']:.2f}")
                            col2.metric("Média", f"{historico['Valor'].mean():.2f}")
                            col3.metric("Mínimo", f"{historico['Valor'].min():.2f}")
                            col4.metric("Máximo", f"{historico['Valor'].max():.2f}")
                            if len(historico) >= 3:
                                valores_recentes = historico.iloc[-3:]['Valor']
                                if len(valores_recentes) >= 2:
                                    tendencia = valores_recentes.iloc[-1] - valores_recentes.iloc[0]
                                    msg_tendencia = (
                                        f"**Tendência:** {'Ascendente ↑' if tendencia > 0 else 'Descendente ↓' if tendencia < 0 else 'Estável →'} "
                                        f"({tendencia:.2f} nos últimos {len(valores_recentes)} exames)"
                                    )
                                    st.markdown(msg_tendencia)

            with vis_tab2:
                st.subheader("Comparação de Múltiplos Parâmetros")
                categoria_multi = st.selectbox("Categoria de Exames", options=list(categorias.keys()), key="multi_cat")
                if categoria_multi:
                    exames_disponiveis = categorias[categoria_multi]
                    exames_selecionados = st.multiselect(
                        "Selecione exames para comparação",
                        options=exames_disponiveis,
                        default=exames_disponiveis[:2] if len(exames_disponiveis) > 1 else exames_disponiveis[:1]
                    )
                    if exames_selecionados:
                        normalizar = st.checkbox("Normalizar valores (0-1) para facilitar comparação", value=True)
                        fig = exibir_tendencias_multiplas(exames_selecionados, st.session_state.selected_patient_id, user_id, normalize=normalizar)
                        if fig:
                            st.plotly_chart(fig, use_container_width=True)
                        else:
                            st.info("Não há dados suficientes para os exames selecionados.")
                    else:
                        st.info("Selecione pelo menos um exame para visualizar.")

            with vis_tab3:
                st.subheader("Painel de Visualização Completo")
                cats_selecionadas = st.multiselect(
                    "Selecione categorias para o painel",
                    options=list(categorias.keys()),
                    default=["Gasometria", "Eletrólitos"]
                )
                if cats_selecionadas:
                    todos_dados = get_all_historic_data(st.session_state.selected_patient_id, user_id)
                    num_cols = 2
                    for cat in cats_selecionadas:
                        st.subheader(cat)
                        exames_cat = categorias.get(cat, [])
                        cols = st.columns(num_cols)
                        for i, exame in enumerate(exames_cat):
                            with cols[i % num_cols]:
                                if exame in todos_dados and len(todos_dados[exame]) > 1:
                                    fig = exibir_tendencia_real(exame, st.session_state.selected_patient_id, user_id)
                                    st.plotly_chart(fig, use_container_width=True)
                                else:
                                    st.info(f"Dados insuficientes para {exame}")
                else:
                    st.info("Selecione pelo menos uma categoria para visualizar.")

            with vis_tab4:
                st.subheader("Linha do Tempo Consolidada")
                st.markdown("""
                Esta visualização mostra todos os exames em uma linha do tempo unificada, 
                destacando quando foram realizados e quais apresentaram alterações.
                """)
                fig_timeline = criar_linha_tempo_consolidada(st.session_state.selected_patient_id, user_id)
                if fig_timeline:
                    st.plotly_chart(fig_timeline, use_container_width=True)
                    st.markdown("""
                    **Como interpretar:**
                    - Cada diamante representa um dia com exames realizados
                    - O número mostra quantos exames foram realizados naquele dia
                    - Exames alterados são indicados em laranja ou vermelho
                    - Passe o mouse sobre cada ponto para ver detalhes dos exames
                    """)
                else:
                    st.info("Não há dados suficientes para criar uma linha do tempo.")

            with vis_tab5:
                st.subheader("Análise de Correlações entre Parâmetros")
                st.markdown("""
                Esta visualização permite analisar correlações entre diferentes parâmetros laboratoriais, 
                ajudando a identificar padrões e relações entre os exames.
                """)
                st.markdown("### Selecione Parâmetros para Correlação")
                categoria_corr = st.selectbox("Categoria", options=list(categorias.keys()), key="corr_cat")
                if categoria_corr:
                    exames_para_correlacao = st.multiselect(
                        "Selecione pelo menos 2 exames para análise de correlação",
                        options=categorias[categoria_corr],
                        default=categorias[categoria_corr][:min(4, len(categorias[categoria_corr]))]
                    )
                    if len(exames_para_correlacao) >= 2:
                        matriz_corr, fig_corr = calcular_matriz_correlacao(exames_para_correlacao, st.session_state.selected_patient_id, user_id)
                        if fig_corr:
                            st.plotly_chart(fig_corr, use_container_width=True)
                            st.markdown("""
                            **Como interpretar:**
                            - Valores próximos a 1 indicam forte correlação positiva (um aumenta, outro aumenta)
                            - Valores próximos a -1 indicam forte correlação negativa (um aumenta, outro diminui)
                            - Valores próximos a 0 indicam pouca ou nenhuma correlação
                            """)
                            st.markdown("### Análise Detalhada de Dois Parâmetros")
                            col1, col2 = st.columns(2)
                            with col1:
                                exame1 = st.selectbox("Primeiro Parâmetro", options=exames_para_correlacao, index=0)
                            with col2:
                                outras_opcoes = [e for e in exames_para_correlacao if e != exame1]
                                exame2 = st.selectbox("Segundo Parâmetro", options=outras_opcoes, index=0 if len(outras_opcoes) > 0 else 0)
                            if exame1 and exame2 and exame1 != exame2:
                                fig_scatter = criar_grafico_dispersao(exame1, exame2, st.session_state.selected_patient_id, user_id)
                                if fig_scatter:
                                    st.plotly_chart(fig_scatter, use_container_width=True)
                                    if matriz_corr is not None:
                                        corr_value = matriz_corr.loc[exame1, exame2]
                                        if abs(corr_value) > 0.7:
                                            st.success(f"Há uma correlação {corr_value:.2f} forte entre {exame1} e {exame2}!")
                                            if corr_value > 0:
                                                st.markdown(f"Esses parâmetros tendem a aumentar ou diminuir juntos, o que pode indicar uma relação fisiológica.")
                                            else:
                                                st.markdown(f"Quando um parâmetro aumenta, o outro tende a diminuir, o que pode indicar um mecanismo compensatório.")
                                else:
                                    st.info("Não há dados suficientes em datas coincidentes para criar o gráfico de dispersão.")
                        else:
                            st.info("Não há dados suficientes para calcular correlações entre os parâmetros selecionados.")
                    else:
                        st.info("Selecione pelo menos 2 exames para análise de correlação.")

    with tab5:
        st.subheader("Dr. Corvus - Assistente Clínico")
        if not has_patient:
            st.info("Por favor, selecione ou crie um paciente na barra lateral.")
        else:
            modelo = st.selectbox("Selecione o modelo de IA", options=list(AVAILABLE_MODELS.keys()))
            modelo_id = AVAILABLE_MODELS[modelo]
            pergunta = st.text_area("Faça uma pergunta ao Dr. Corvus sobre o paciente:", height=100)
            btn_perguntar = st.button("Consultar Dr. Corvus")
            if btn_perguntar and pergunta:
                with st.spinner("Dr. Corvus está analisando..."):
                    contexto_paciente = str(st.session_state.patient)
                    if st.session_state.lab_results:
                        contexto_paciente += "\n\nResultados de Exames Laboratoriais:\n"
                        for exame, dados in st.session_state.lab_results.items():
                            valor = dados.get("value", "")
                            unidade = dados.get("unit", "")
                            ref_low = dados.get("reference_low", "")
                            ref_high = dados.get("reference_high", "")
                            is_outside = is_abnormal(valor, ref_low, ref_high)
                            ref_text = get_reference_range_text(ref_low, ref_high)
                            line = f"- {exame}: {valor} {unidade} "
                            if is_outside:
                                line += f"(ALTERADO - Referência: {ref_text})"
                            else:
                                line += f"(Referência: {ref_text})"
                            contexto_paciente += line + "\n"
                    if st.session_state.analysis_results:
                        contexto_paciente += "\n\nAnálises Clínicas:\n"
                        for sistema, analises in st.session_state.analysis_results.items():
                            if analises:
                                contexto_paciente += f"\n{sistema}:\n"
                                for analise in analises:
                                    contexto_paciente += f"- {analise}\n"
                    resposta = gerar_resposta_ia(pergunta, contexto_paciente, modelo_id)
                    st.markdown("<div class='result-box'>", unsafe_allow_html=True)
                    st.markdown(resposta)
                    st.markdown("</div>", unsafe_allow_html=True)
            with st.expander("Histórico de Consultas"):
                st.info("O histórico de consultas será implementado na próxima fase com persistência no banco de dados.")

# Hide Streamlit's default menu and footer
hide_menu_style = """
    <style>
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    </style>
"""
st.markdown(hide_menu_style, unsafe_allow_html=True)

if __name__ == "__main__":
    main() 