"""
add user_preferences table for notifications, language, timezone

Revision ID: 3e1b2c7f5a10
Revises: ef3a9ab4c004
Create Date: 2025-09-08 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3e1b2c7f5a10'
down_revision = 'ef3a9ab4c004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'user_preferences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('email_clinical_alerts', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('email_group_updates', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('product_updates', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('language', sa.String(length=10), nullable=False, server_default='pt-BR'),
        sa.Column('timezone', sa.String(length=64), nullable=False, server_default='UTC'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_user_preferences_user_id')
    )


def downgrade() -> None:
    op.drop_table('user_preferences')

