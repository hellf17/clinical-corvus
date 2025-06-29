"""
Streamlit UI components for displaying laboratory test results.
"""

import streamlit as st
import pandas as pd
from src.utils import is_abnormal, get_reference_range_text

def display_lab_results(data, title="Resultados de Exames"):
    """
    Display lab test results in a formatted Streamlit component.
    
    Args:
        data: Dictionary of lab test results
        title: Section title
    """
    if not data:
        st.warning("Nenhum resultado de exame disponível.")
        return
        
    st.subheader(title)
    
    # Convert to DataFrame for easier display
    results = []
    
    for test_name, value in data.items():
        # Skip non-numeric or empty values
        if not isinstance(value, (int, float)):
            continue
            
        # Get reference range if available
        ref_range = get_reference_range_text(test_name)
        
        # Check if value is abnormal
        abnormal = is_abnormal(test_name, value)
        
        results.append({
            "Exame": test_name,
            "Resultado": value,
            "Referência": ref_range,
            "Status": "ALTERADO" if abnormal else "NORMAL"
        })
    
    if not results:
        st.info("Nenhum resultado numérico disponível.")
        return
        
    # Create DataFrame
    df = pd.DataFrame(results)
    
    # Display as table with conditional formatting
    st.dataframe(
        df,
        column_config={
            "Exame": st.column_config.TextColumn("Exame"),
            "Resultado": st.column_config.NumberColumn("Resultado"),
            "Referência": st.column_config.TextColumn("Referência"),
            "Status": st.column_config.TextColumn("Status")
        },
        hide_index=True,
        use_container_width=True
    )

def display_analysis_results(analysis_results, system_title):
    """
    Display analysis results for a specific body system.
    
    Args:
        analysis_results: List of analysis findings
        system_title: Title of the body system being analyzed
    """
    if not analysis_results:
        return
        
    st.subheader(f"Análise - {system_title}")
    
    # Add a styled box for the results
    with st.container():
        st.markdown(
            f"""
            <div class="result-box">
                <div class="system-label">{system_title}</div>
            """, 
            unsafe_allow_html=True
        )
        
        for result in analysis_results:
            # Highlight primary disturbances
            if "Distúrbio primário" in result:
                st.markdown(
                    f'<div class="analysis-label">{result}</div>',
                    unsafe_allow_html=True
                )
            # Normal styling for other findings
            else:
                st.write(result)
        
        st.markdown("</div>", unsafe_allow_html=True)

def display_trend_chart(test_name, current_value, historical_values=None):
    """
    Display a trend chart for a lab test result.
    
    Args:
        test_name: Name of the test
        current_value: Current value
        historical_values: List of (timestamp, value) tuples for historical data
    """
    if not historical_values:
        historical_values = []
        
    # Include current value in chart
    all_values = historical_values + [(pd.Timestamp.now(), current_value)]
    
    # Create DataFrame
    df = pd.DataFrame(all_values, columns=["Timestamp", "Value"])
    
    st.subheader(f"Tendência - {test_name}")
    
    # Display chart
    st.line_chart(df.set_index("Timestamp"))
    
    # Display a table of values
    st.dataframe(
        df,
        column_config={
            "Timestamp": st.column_config.DatetimeColumn("Data"),
            "Value": st.column_config.NumberColumn(test_name)
        },
        hide_index=True,
        use_container_width=True
    ) 