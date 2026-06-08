"""add review response fields

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-08

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("reviews", sa.Column("provider_response", sa.Text, nullable=True))
    op.add_column(
        "reviews",
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.execute("""
        CREATE POLICY reviews_update ON reviews
            FOR UPDATE USING (
                provider_id = auth.uid()
                OR resident_id = auth.uid()
            )
    """)


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS reviews_update ON reviews")
    op.drop_column("reviews", "responded_at")
    op.drop_column("reviews", "provider_response")
