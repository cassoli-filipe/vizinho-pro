"""create provider events table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-06-08

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "provider_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("out_of_area", sa.Boolean, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["provider_id"], ["providers.id"], name="fk_provider_events_provider"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute(
        "CREATE INDEX ix_provider_events_provider_created "
        "ON provider_events(provider_id, created_at DESC)"
    )

    op.execute("ALTER TABLE provider_events ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY provider_events_select ON provider_events
            FOR SELECT USING (provider_id = auth.uid())
    """)
    op.execute("""
        CREATE POLICY provider_events_insert ON provider_events
            FOR INSERT WITH CHECK (true)
    """)


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS provider_events_insert ON provider_events")
    op.execute("DROP POLICY IF EXISTS provider_events_select ON provider_events")
    op.drop_index("ix_provider_events_provider_created", table_name="provider_events")
    op.drop_table("provider_events")
