# This file makes the schemas directory a proper Python package
# It re-exports common schema components for easier imports

# User and Authentication schemas
from .user import (
    UserBase, UserCreate, UserLogin, UserRoleUpdate, User, UserInDB,
    AuthStatus, Token, TokenData
)

# Patient schemas
from .patient import (
    Sex, Ethnicity, PatientBase, PatientCreate,
    PatientUpdate, Patient, PatientSummary,
    PatientListResponse
)

# Group schemas
from .group import (
    GroupBase, GroupCreate, GroupUpdate, Group,
    GroupRole, GroupMembershipBase, GroupMembershipCreate, GroupMembershipUpdate, GroupMembership,
    GroupPatientBase, GroupPatientCreate, GroupPatient,
    GroupWithMembersAndPatients, GroupListResponse,
    GroupMembershipListResponse, GroupPatientListResponse
)

# Lab Result schemas
from .lab_result import (
    TestCategoryBase, TestCategoryCreate, TestCategory,
    LabResultBase, LabResultCreate, LabResult,
    LabInterpretationBase, LabInterpretationCreate, LabInterpretation,
    LabResultWithInterpretations
)

# Test Result schemas
from .test_result import (
    TestResult, AlertItem, AlertSummary, FileAnalysisResult
)

# Clinical Score schemas
from .clinical_score import (
    ScoreType, ClinicalScoreBase, ClinicalScoreCreate,
    ClinicalScore, ScoreResult
)

# Medical Test Analysis schemas - UPDATED: analysis → lab_analysis
from .lab_analysis import (
    BloodGasInput, BloodGasResult,
    ElectrolyteInput, ElectrolyteResult,
    HematologyInput, HematologyResult,
    RenalInput, RenalResult,
    SofaInput, QSofaInput, ApacheIIInput,
    HepaticInput, HepaticResult,
    MetabolicInput
)

# Medication schemas
from .medication import (
    MedicationStatus, MedicationRoute, MedicationFrequency,
    MedicationBase, MedicationCreate, MedicationPatientCreate, MedicationUpdate,
    Medication, MedicationList
)

# Clinical Note schemas
from .clinical_note import (
    NoteType, ClinicalNoteBase, ClinicalNoteCreate,
    ClinicalNote, ClinicalNoteUpdate, ClinicalNoteList
)

# Stored Analysis schemas - UPDATED: analyses → stored_analyses
from .stored_analyses import (
    AnalysisBase, AnalysisCreate, AnalysisUpdate,
    Analysis, AnalysisList
)

# AI Chat schemas
from .ai_chat import (
    AIChatMessageBase, AIChatMessageCreate, AIChatMessage,
    AIChatConversationBase, AIChatConversationCreate, AIChatConversation,
    AIChatConversationUpdate, AIChatConversationSummary, AIChatConversationList,
    SendMessageRequest, SendMessageResponse, MessageWithPatientContextRequest
)

# Health Tip schemas
from .health_tip import (
    HealthTipBase, HealthTipCreate, HealthTipUpdate,
    HealthTip, HealthTipList
)

# Health Diary schemas
from .health_diary import (
    HealthDiaryEntryBase, HealthDiaryEntryCreate, HealthDiaryEntryUpdate,
    HealthDiaryEntry, HealthDiaryEntryList
)

# Lab Summary schemas
from .lab_summary import (
    LabTrendItem, LabSummary
)

# Alert Schemas
from .alert import (
    AlertBase,
    AlertCreate,
    AlertUpdate,
    AlertInDBBase,
    Alert,
    AlertResponse,
    AlertGenerateResponse,
    AlertStats,
    AlertListResponse
)