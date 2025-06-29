"""Add clerk_user_id to users table

Revision ID: 263c335ffb32
Revises: 04980e98c38d
Create Date: 2025-04-30 23:55:12.118060

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
# Assuming database.types defines GUID if needed for other DBs
# import database.types # Uncomment if GUID type is used


# revision identifiers, used by Alembic.
revision: str = '263c335ffb32'
down_revision: Union[str, None] = '04980e98c38d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('clerk_user_id', sa.String(length=255), nullable=True))
        batch_op.create_index(batch_op.f('ix_users_clerk_user_id'), ['clerk_user_id'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_clerk_user_id'))
        batch_op.drop_column('clerk_user_id')
