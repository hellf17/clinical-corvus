"""
Models package for the Clinical Helper application.

This module is kept for backward compatibility.
All models are now defined in database.models

This file will be deprecated in future versions.
"""

import warnings

warnings.warn(
    "models/ package is deprecated and will be removed in a future version. "
    "Import models from database.models instead.",
    DeprecationWarning,
    stacklevel=2
)

# Import all models from database.models
from database.models import (
    # Users & Patients
    User,
    Patient,
    Group,
    GroupMembership,
    GroupPatient,
    
    # Laboratory related models
    TestCategory,
    LabResult,
    LabInterpretation,
    
    # Medication & Treatment models
    Medication,
    MedicationStatus,
    MedicationRoute,
    ClinicalScore,
    ClinicalNote,
    NoteType,
    
    # AI Chat models
    AIChatConversation,
    AIChatMessage
)

# All models are now available by importing from models package
__all__ = [
    'User', 'Patient', 'Group', 'GroupMembership', 'GroupPatient',
    'TestCategory', 'LabResult', 'LabInterpretation',
    'Medication', 'MedicationStatus', 'MedicationRoute', 
    'ClinicalScore', 'ClinicalNote', 'NoteType',
    'AIChatConversation', 'AIChatMessage'
] 