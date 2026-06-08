"""create hires table

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-06-08

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "hires",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("resident_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "hired_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("estimated_value", sa.Numeric(10, 2), nullable=True),
        sa.Column("source_type", sa.String(20), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["resident_id"], ["profiles.id"], name="fk_hires_resident"),
        sa.ForeignKeyConstraint(["provider_id"], ["providers.id"], name="fk_hires_provider"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_hires_resident_id", "hires", ["resident_id"])
    op.create_index("ix_hires_provider_id", "hires", ["provider_id"])

    op.execute("ALTER TABLE hires ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY hires_resident_select ON hires
            FOR SELECT USING (resident_id = auth.uid())
    """)
    op.execute("""
        CREATE POLICY hires_resident_insert ON hires
            FOR INSERT WITH CHECK (resident_id = auth.uid())
    """)


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS hires_resident_insert ON hires")
    op.execute("DROP POLICY IF EXISTS hires_resident_select ON hires")
    op.drop_index("ix_hires_provider_id", table_name="hires")
    op.drop_index("ix_hires_resident_id", table_name="hires")
    op.drop_table("hires")
