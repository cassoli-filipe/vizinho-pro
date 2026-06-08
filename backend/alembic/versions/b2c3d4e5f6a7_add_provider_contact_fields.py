"""add provider contact and experience fields

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-07

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("providers", sa.Column("contact_whatsapp", sa.String(20), nullable=True))
    op.add_column("providers", sa.Column("experience_years", sa.Integer, nullable=True))
    op.add_column("providers", sa.Column("services", postgresql.ARRAY(sa.String), nullable=True))


def downgrade() -> None:
    op.drop_column("providers", "services")
    op.drop_column("providers", "experience_years")
    op.drop_column("providers", "contact_whatsapp")
