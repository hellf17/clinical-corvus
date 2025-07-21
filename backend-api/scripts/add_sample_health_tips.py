#!/usr/bin/env python3
"""
Script to add sample health tips to the database.
Run this script to populate the health_tips table with initial data.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import SessionLocal
from database.models import HealthTip
from datetime import datetime

def add_sample_health_tips():
    """Add sample health tips to the database."""
    db: Session = SessionLocal()
    
    # Sample health tips in Portuguese
    sample_tips = [
        "Beba pelo menos 2 litros de água por dia para manter-se hidratado.",
        "Durma entre 7-9 horas por noite para uma boa recuperação do corpo.",
        "Pratique atividade física regularmente, pelo menos 30 minutos por dia.",
        "Evite alimentos processados e ultraprocessados.",
        "Faça exames de rotina regularmente para prevenção de doenças.",
        "Mantenha uma alimentação rica em frutas, verduras e legumes.",
        "Evite o consumo excessivo de açúcar e sal.",
        "Pratique técnicas de relaxamento para reduzir o estresse.",
        "Evite fumar e o consumo excessivo de álcool.",
        "Consulte regularmente seu médico para check-ups preventivos."
    ]
    
    try:
        # Check if tips already exist
        existing_count = db.query(HealthTip).count()
        if existing_count > 0:
            print(f"Health tips already exist ({existing_count} tips found). Skipping insertion.")
            return
        
        # Add sample tips
        for tip_text in sample_tips:
            health_tip = HealthTip(
                text=tip_text,
                created_at=datetime.now()
            )
            db.add(health_tip)
        
        db.commit()
        print(f"Successfully added {len(sample_tips)} health tips to the database.")
        
    except Exception as e:
        db.rollback()
        print(f"Error adding health tips: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_sample_health_tips()