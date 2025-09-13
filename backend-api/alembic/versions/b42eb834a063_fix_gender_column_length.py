"""fix_gender_column_length

Revision ID: b42eb834a063
Revises: 7d5a3c84f2b1
Create Date: 2025-09-03 23:49:29.699246

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b42eb834a063'
down_revision: Union[str, None] = '7d5a3c84f2b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Alter the gender column to allow longer strings
    op.alter_column('patients', 'gender',
                    existing_type=sa.String(1),
                    type_=sa.String(10),
                    existing_nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    # Revert the gender column back to VARCHAR(1)
    op.alter_column('patients', 'gender',
                    existing_type=sa.String(10),
                    type_=sa.String(1),
                    existing_nullable=True)
