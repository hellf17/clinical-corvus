"""update_patients_table_add_birthdate_and_rename_columns

Revision ID: 6ea6b2970f09
Revises: 9d8f1a5b2c3e
Create Date: 2025-09-02 22:35:31.272965

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6ea6b2970f09'
down_revision: Union[str, None] = '9d8f1a5b2c3e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add the missing birthDate column
    with op.batch_alter_table('patients', schema=None) as batch_op:
        batch_op.add_column(sa.Column('birthDate', sa.DateTime(), nullable=True))
        
        # Rename Portuguese columns to English to match the model
        batch_op.alter_column('idade', new_column_name='age')
        batch_op.alter_column('sexo', new_column_name='gender')
        batch_op.alter_column('peso', new_column_name='weight')
        batch_op.alter_column('altura', new_column_name='height')
        batch_op.alter_column('etnia', new_column_name='ethnicity')
        batch_op.alter_column('data_internacao', new_column_name='admission_date')
        batch_op.alter_column('diagnostico', new_column_name='primary_diagnosis')
        batch_op.alter_column('exames', new_column_name='comorbidities')
        batch_op.alter_column('medicacoes', new_column_name='medications')
        batch_op.alter_column('exame_fisico', new_column_name='physical_exam')
        batch_op.alter_column('historia_familiar', new_column_name='family_history')
        batch_op.alter_column('historia_clinica', new_column_name='clinical_history')


def downgrade() -> None:
    """Downgrade schema."""
    # Remove the birthDate column
    with op.batch_alter_table('patients', schema=None) as batch_op:
        batch_op.drop_column('birthDate')
        
        # Rename English columns back to Portuguese
        batch_op.alter_column('age', new_column_name='idade')
        batch_op.alter_column('gender', new_column_name='sexo')
        batch_op.alter_column('weight', new_column_name='peso')
        batch_op.alter_column('height', new_column_name='altura')
        batch_op.alter_column('ethnicity', new_column_name='etnia')
        batch_op.alter_column('admission_date', new_column_name='data_internacao')
        batch_op.alter_column('primary_diagnosis', new_column_name='diagnostico')
        batch_op.alter_column('comorbidities', new_column_name='exames')
        batch_op.alter_column('medications', new_column_name='medicacoes')
        batch_op.alter_column('physical_exam', new_column_name='exame_fisico')
        batch_op.alter_column('family_history', new_column_name='historia_familiar')
        batch_op.alter_column('clinical_history', new_column_name='historia_clinica')
