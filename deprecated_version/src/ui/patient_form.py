"""
Streamlit UI component for patient data input form.
"""

import streamlit as st
import datetime
from src.models import PatientData

def patient_form(patient=None):
    """
    Display a form for entering/editing patient data.
    
    Args:
        patient: Optional PatientData object with existing data
        
    Returns:
        PatientData object with user input
    """
    if patient is None:
        patient = PatientData()
    
    with st.form("patient_data_form"):
        st.subheader("Dados do Paciente")
        
        # Basic demographics
        col1, col2 = st.columns(2)
        
        with col1:
            nome = st.text_input("Nome", value=patient.nome or "")
            idade = st.number_input("Idade (anos)", min_value=0, max_value=120, value=patient.idade or 0)
            
            sexo_options = {"M": "Masculino", "F": "Feminino"}
            sexo_default = patient.sexo if patient.sexo in sexo_options else "M"
            sexo = st.radio("Sexo", options=list(sexo_options.keys()), 
                            format_func=lambda x: sexo_options[x], 
                            horizontal=True,
                            index=0 if sexo_default == "M" else 1)
            
            etnia_options = {"branco": "Branco", "negro": "Negro", "asiatico": "Asiático", "outro": "Outro"}
            etnia_default = patient.etnia if patient.etnia in etnia_options.values() else "branco"
            etnia = st.selectbox("Etnia", options=list(etnia_options.keys()),
                                format_func=lambda x: etnia_options[x],
                                index=list(etnia_options.keys()).index(etnia_default) if patient.etnia else 0)
        
        with col2:
            peso = st.number_input("Peso (kg)", min_value=0.0, max_value=300.0, value=patient.peso or 0.0, step=0.1)
            altura = st.number_input("Altura (cm)", min_value=0, max_value=250, value=patient.altura or 0)
            
            # Date inputs
            data_internacao = st.date_input("Data de Internação", 
                                            value=patient.data_internacao.date() if patient.data_internacao else datetime.date.today())
            
            diagnostico = st.text_area("Diagnóstico Clínico", value=patient.diagnostico or "", height=80)
        
        # Vital signs
        st.subheader("Sinais Vitais")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            fc = st.number_input("FC (bpm)", min_value=0, max_value=300, value=patient.fc or 0)
            pas = st.number_input("PAS (mmHg)", min_value=0, max_value=300, value=patient.pas or 0)
            pad = st.number_input("PAD (mmHg)", min_value=0, max_value=200, value=patient.pad or 0)
        
        with col2:
            spo2 = st.number_input("SpO2 (%)", min_value=0, max_value=100, value=patient.spo2 or 0)
            tax = st.number_input("Tax (°C)", min_value=30.0, max_value=45.0, value=patient.tax or 36.0, step=0.1)
            glasgow = st.slider("Escala de Glasgow", min_value=3, max_value=15, value=patient.glasgow or 15)
        
        with col3:
            diurese = st.number_input("Diurese (mL/24h)", min_value=0, max_value=10000, value=patient.diurese or 0)
            hgt = st.number_input("HGT (mg/dL)", min_value=0, max_value=1000, value=patient.hgt or 0)
            
            col31, col32 = st.columns(2)
            with col31:
                aminas = st.checkbox("Em uso de aminas", value=patient.aminas)
            with col32:
                ventilacao = st.checkbox("Em ventilação mecânica", value=patient.ventilacao)
        
        submit_button = st.form_submit_button("Salvar dados do paciente")
        
        if submit_button:
            # Create updated patient object
            updated_patient = PatientData(
                nome=nome,
                idade=int(idade) if idade > 0 else None,
                sexo=sexo,
                peso=float(peso) if peso > 0 else None,
                altura=int(altura) if altura > 0 else None,
                etnia=etnia,
                data_internacao=datetime.datetime.combine(data_internacao, datetime.time()),
                diagnostico=diagnostico
            )
            
            # Update vital signs
            updated_patient.fc = int(fc) if fc > 0 else None
            updated_patient.pas = int(pas) if pas > 0 else None
            updated_patient.pad = int(pad) if pad > 0 else None
            updated_patient.spo2 = int(spo2) if spo2 > 0 else None
            updated_patient.tax = float(tax) if tax > 0 else None
            updated_patient.glasgow = int(glasgow) if glasgow > 0 else None
            updated_patient.diurese = int(diurese) if diurese > 0 else None
            updated_patient.hgt = int(hgt) if hgt > 0 else None
            updated_patient.aminas = aminas
            updated_patient.ventilacao = ventilacao
            
            return updated_patient, True
        
        return patient, False

def display_patient_info(patient):
    """
    Display patient information in a formatted card.
    
    Args:
        patient: PatientData object to display
    """
    if not patient or not patient.nome:
        st.warning("Dados do paciente não disponíveis.")
        return
        
    st.subheader("Informações do Paciente")
    
    with st.container():
        # Patient demographics
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown(f"**Nome:** {patient.nome}")
            st.markdown(f"**Idade:** {patient.idade} anos" if patient.idade else "**Idade:** N/D")
            st.markdown(f"**Sexo:** {'Masculino' if patient.sexo == 'M' else 'Feminino'}" if patient.sexo else "**Sexo:** N/D")
            st.markdown(f"**Etnia:** {patient.etnia.title()}" if patient.etnia else "**Etnia:** N/D")
        
        with col2:
            st.markdown(f"**Peso:** {patient.peso} kg" if patient.peso else "**Peso:** N/D")
            st.markdown(f"**Altura:** {patient.altura} cm" if patient.altura else "**Altura:** N/D")
            
            if patient.peso and patient.altura:
                imc = patient.calcular_imc()
                st.markdown(f"**IMC:** {imc:.1f} kg/m²")
                
                if imc < 18.5:
                    st.markdown("**Classificação:** Baixo peso")
                elif imc < 25:
                    st.markdown("**Classificação:** Peso normal")
                elif imc < 30:
                    st.markdown("**Classificação:** Sobrepeso")
                elif imc < 35:
                    st.markdown("**Classificação:** Obesidade grau I")
                elif imc < 40:
                    st.markdown("**Classificação:** Obesidade grau II")
                else:
                    st.markdown("**Classificação:** Obesidade grau III")
            
            if patient.data_internacao:
                dias = patient.dias_internacao()
                st.markdown(f"**Dias de internação:** {dias}")
        
        if patient.diagnostico:
            st.markdown(f"**Diagnóstico:** {patient.diagnostico}")
        
        # Display vital signs if available
        vitals_available = any([
            patient.fc, patient.pas, patient.pad, patient.spo2, 
            patient.tax, patient.glasgow, patient.diurese, patient.hgt
        ])
        
        if vitals_available:
            st.markdown("### Sinais Vitais")
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                if patient.fc:
                    st.markdown(f"**FC:** {patient.fc} bpm")
                if patient.pas and patient.pad:
                    st.markdown(f"**PA:** {patient.pas}/{patient.pad} mmHg")
            
            with col2:
                if patient.spo2:
                    st.markdown(f"**SpO2:** {patient.spo2}%")
                if patient.tax:
                    st.markdown(f"**Tax:** {patient.tax}°C")
                if patient.glasgow:
                    st.markdown(f"**Glasgow:** {patient.glasgow}")
            
            with col3:
                if patient.diurese:
                    st.markdown(f"**Diurese:** {patient.diurese} mL/24h")
                if patient.hgt:
                    st.markdown(f"**HGT:** {patient.hgt} mg/dL")
                    
                suporte = []
                if patient.aminas:
                    suporte.append("Em uso de aminas")
                if patient.ventilacao:
                    suporte.append("Em ventilação mecânica")
                
                if suporte:
                    st.markdown(f"**Suporte:** {', '.join(suporte)}") 