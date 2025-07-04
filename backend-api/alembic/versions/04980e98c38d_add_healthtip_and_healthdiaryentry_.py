"""Add HealthTip and HealthDiaryEntry models

Revision ID: 04980e98c38d
Revises: 
Create Date: 2025-04-30 20:14:13.179451

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# Add this import for the custom GUID type
import database.types


# revision identifiers, used by Alembic.
revision: str = '04980e98c38d'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('health_tips',
    sa.Column('tip_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('category', sa.String(length=100), nullable=True),
    sa.Column('source', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('is_general', sa.Boolean(), nullable=True),
    sa.PrimaryKeyConstraint('tip_id')
    )
    op.create_index(op.f('ix_health_tips_tip_id'), 'health_tips', ['tip_id'], unique=False)
    op.create_table('test_categories',
    sa.Column('category_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('category_id'),
    sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_test_categories_category_id'), 'test_categories', ['category_id'], unique=False)
    op.create_table('users',
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=True),
    sa.Column('hashed_password', sa.String(length=255), nullable=True),
    sa.Column('role', sa.String(length=50), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('user_id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_user_id'), 'users', ['user_id'], unique=False)
    op.create_table('health_diary_entries',
    sa.Column('entry_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('entry_date', sa.DateTime(), nullable=False),
    sa.Column('mood', sa.String(length=100), nullable=True),
    sa.Column('symptoms', sa.Text(), nullable=True),
    sa.Column('activity_level', sa.String(length=100), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ),
    sa.PrimaryKeyConstraint('entry_id')
    )
    op.create_index(op.f('ix_health_diary_entries_entry_date'), 'health_diary_entries', ['entry_date'], unique=False)
    op.create_index(op.f('ix_health_diary_entries_entry_id'), 'health_diary_entries', ['entry_id'], unique=False)
    op.create_table('patients',
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=True),
    sa.Column('idade', sa.Integer(), nullable=True),
    sa.Column('sexo', sa.String(length=1), nullable=True),
    sa.Column('peso', sa.Float(), nullable=True),
    sa.Column('altura', sa.Float(), nullable=True),
    sa.Column('etnia', sa.String(length=50), nullable=True),
    sa.Column('data_internacao', sa.DateTime(), nullable=True),
    sa.Column('diagnostico', sa.Text(), nullable=True),
    sa.Column('exames', sa.Text(), nullable=True),
    sa.Column('medicacoes', sa.Text(), nullable=True),
    sa.Column('exame_fisico', sa.Text(), nullable=True),
    sa.Column('historia_familiar', sa.Text(), nullable=True),
    sa.Column('historia_clinica', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ),
    sa.PrimaryKeyConstraint('patient_id')
    )
    op.create_index(op.f('ix_patients_patient_id'), 'patients', ['patient_id'], unique=False)
    op.create_table('ai_chat_conversations',
    sa.Column('id', database.types.GUID(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('last_message_content', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.patient_id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_chat_conversations_id'), 'ai_chat_conversations', ['id'], unique=False)
    op.create_table('alerts',
    sa.Column('alert_id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=True),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('alert_type', sa.String(), nullable=True),
    sa.Column('message', sa.String(), nullable=True),
    sa.Column('severity', sa.String(), nullable=True),
    sa.Column('is_read', sa.Boolean(), nullable=True),
    sa.Column('details', sa.JSON(), nullable=True),
    sa.Column('created_by', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('parameter', sa.String(), nullable=True),
    sa.Column('category', sa.String(), nullable=True),
    sa.Column('value', sa.Float(), nullable=True),
    sa.Column('reference', sa.String(), nullable=True),
    sa.Column('status', sa.String(), nullable=True),
    sa.Column('interpretation', sa.Text(), nullable=True),
    sa.Column('recommendation', sa.Text(), nullable=True),
    sa.Column('acknowledged_by', sa.String(), nullable=True),
    sa.Column('acknowledged_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['created_by'], ['users.user_id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.patient_id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ),
    sa.PrimaryKeyConstraint('alert_id')
    )
    op.create_index(op.f('ix_alerts_alert_id'), 'alerts', ['alert_id'], unique=False)
    op.create_table('analyses',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.patient_id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_analyses_id'), 'analyses', ['id'], unique=False)
    op.create_table('clinical_notes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('note_type', sa.Enum('PROGRESS', 'ADMISSION', 'DISCHARGE', 'PROCEDURE', 'CONSULTATION', 'OTHER', name='notetype'), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.patient_id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_clinical_notes_id'), 'clinical_notes', ['id'], unique=False)
    op.create_table('clinical_scores',
    sa.Column('score_id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('score_type', sa.String(length=50), nullable=False),
    sa.Column('value', sa.Float(), nullable=False),
    sa.Column('timestamp', sa.DateTime(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.patient_id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ),
    sa.PrimaryKeyConstraint('score_id')
    )
    op.create_index(op.f('ix_clinical_scores_score_id'), 'clinical_scores', ['score_id'], unique=False)
    op.create_table('lab_results',
    sa.Column('result_id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('category_id', sa.Integer(), nullable=True),
    sa.Column('test_name', sa.String(length=100), nullable=False),
    sa.Column('value_numeric', sa.Float(), nullable=True),
    sa.Column('value_text', sa.String(length=255), nullable=True),
    sa.Column('unit', sa.String(length=50), nullable=True),
    sa.Column('timestamp', sa.DateTime(), nullable=False),
    sa.Column('reference_range_low', sa.Float(), nullable=True),
    sa.Column('reference_range_high', sa.Float(), nullable=True),
    sa.Column('is_abnormal', sa.Boolean(), nullable=True),
    sa.Column('collection_datetime', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('created_by', sa.Integer(), nullable=True),
    sa.Column('test_category_id', sa.Integer(), nullable=True),
    sa.Column('reference_text', sa.String(), nullable=True),
    sa.Column('comments', sa.Text(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('report_datetime', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['category_id'], ['test_categories.category_id'], ),
    sa.ForeignKeyConstraint(['created_by'], ['users.user_id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.patient_id'], ),
    sa.ForeignKeyConstraint(['test_category_id'], ['test_categories.category_id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ),
    sa.PrimaryKeyConstraint('result_id')
    )
    op.create_index(op.f('ix_lab_results_result_id'), 'lab_results', ['result_id'], unique=False)
    op.create_table('medications',
    sa.Column('medication_id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('dosage', sa.String(length=100), nullable=True),
    sa.Column('frequency', sa.Enum('ONCE', 'DAILY', 'BID', 'TID', 'QID', 'CONTINUOUS', 'AS_NEEDED', 'OTHER', 'ONCE_DAILY', 'TWICE_DAILY', 'THREE_TIMES_DAILY', 'FOUR_TIMES_DAILY', name='medicationfrequency'), nullable=False),
    sa.Column('raw_frequency', sa.String(length=100), nullable=True),
    sa.Column('route', sa.Enum('ORAL', 'INTRAVENOUS', 'INTRAMUSCULAR', 'SUBCUTANEOUS', 'TOPICAL', 'INHALATION', 'RECTAL', 'OTHER', name='medicationroute'), nullable=False),
    sa.Column('start_date', sa.DateTime(), nullable=False),
    sa.Column('end_date', sa.DateTime(), nullable=True),
    sa.Column('active', sa.Boolean(), nullable=True),
    sa.Column('prescriber', sa.String(length=255), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('status', sa.Enum('ACTIVE', 'COMPLETED', 'SUSPENDED', 'CANCELLED', name='medicationstatus'), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.patient_id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ),
    sa.PrimaryKeyConstraint('medication_id')
    )
    op.create_index(op.f('ix_medications_medication_id'), 'medications', ['medication_id'], unique=False)
    op.create_table('ai_chat_messages',
    sa.Column('id', database.types.GUID(), nullable=False),
    sa.Column('conversation_id', database.types.GUID(), nullable=False),
    sa.Column('role', sa.String(length=50), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('message_metadata', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['conversation_id'], ['ai_chat_conversations.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_chat_messages_id'), 'ai_chat_messages', ['id'], unique=False)
    op.create_table('lab_interpretations',
    sa.Column('interpretation_id', sa.Integer(), nullable=False),
    sa.Column('result_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('interpretation_text', sa.Text(), nullable=False),
    sa.Column('ai_generated', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['result_id'], ['lab_results.result_id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ),
    sa.PrimaryKeyConstraint('interpretation_id')
    )
    op.create_index(op.f('ix_lab_interpretations_interpretation_id'), 'lab_interpretations', ['interpretation_id'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_lab_interpretations_interpretation_id'), table_name='lab_interpretations')
    op.drop_table('lab_interpretations')
    op.drop_index(op.f('ix_ai_chat_messages_id'), table_name='ai_chat_messages')
    op.drop_table('ai_chat_messages')
    op.drop_index(op.f('ix_medications_medication_id'), table_name='medications')
    op.drop_table('medications')
    op.drop_index(op.f('ix_lab_results_result_id'), table_name='lab_results')
    op.drop_table('lab_results')
    op.drop_index(op.f('ix_clinical_scores_score_id'), table_name='clinical_scores')
    op.drop_table('clinical_scores')
    op.drop_index(op.f('ix_clinical_notes_id'), table_name='clinical_notes')
    op.drop_table('clinical_notes')
    op.drop_index(op.f('ix_analyses_id'), table_name='analyses')
    op.drop_table('analyses')
    op.drop_index(op.f('ix_alerts_alert_id'), table_name='alerts')
    op.drop_table('alerts')
    op.drop_index(op.f('ix_ai_chat_conversations_id'), table_name='ai_chat_conversations')
    op.drop_table('ai_chat_conversations')
    op.drop_index(op.f('ix_patients_patient_id'), table_name='patients')
    op.drop_table('patients')
    op.drop_index(op.f('ix_health_diary_entries_entry_id'), table_name='health_diary_entries')
    op.drop_index(op.f('ix_health_diary_entries_entry_date'), table_name='health_diary_entries')
    op.drop_table('health_diary_entries')
    op.drop_index(op.f('ix_users_user_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_test_categories_category_id'), table_name='test_categories')
    op.drop_table('test_categories')
    op.drop_index(op.f('ix_health_tips_tip_id'), table_name='health_tips')
    op.drop_table('health_tips')
    # ### end Alembic commands ###
