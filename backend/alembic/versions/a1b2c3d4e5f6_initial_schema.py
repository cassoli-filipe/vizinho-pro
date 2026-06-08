"""initial schema

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-06-03

"""
from typing import Sequence, Union

import geoalchemy2
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.execute("CREATE TYPE usertype AS ENUM ('morador', 'prestador')")
    op.execute("CREATE TYPE subscriptionstatus AS ENUM ('active', 'inactive', 'suspended')")
    op.execute(
        "CREATE TYPE servicecategory AS ENUM ("
        "'piscineiro', 'eletricista', 'jardineiro', 'encanador',"
        "'pintor', 'pedreiro', 'limpeza', 'seguranca', 'outros')"
    )

    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
    """)

    # --- profiles ---
    op.create_table(
        "profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "user_type",
            postgresql.ENUM(name="usertype", create_type=False),
            nullable=False,
        ),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("cpf_hash", sa.String(64), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cpf_hash", name="uq_profiles_cpf_hash"),
        sa.UniqueConstraint("email", name="uq_profiles_email"),
    )
    op.create_index("ix_profiles_cpf_hash", "profiles", ["cpf_hash"])
    op.execute("""
        CREATE TRIGGER profiles_updated_at
            BEFORE UPDATE ON profiles
            FOR EACH ROW EXECUTE FUNCTION update_updated_at()
    """)

    # --- providers ---
    op.create_table(
        "providers",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_name", sa.String(255), nullable=False),
        sa.Column(
            "category",
            postgresql.ENUM(name="servicecategory", create_type=False),
            nullable=False,
        ),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("center_lat", sa.Float, nullable=False),
        sa.Column("center_lng", sa.Float, nullable=False),
        sa.Column("radius_km", sa.Float, nullable=False),
        sa.Column(
            "location",
            geoalchemy2.Geometry("POINT", srid=4326),
            nullable=False,
        ),
        sa.Column(
            "subscription_status",
            postgresql.ENUM(name="subscriptionstatus", create_type=False),
            server_default="active",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["id"], ["profiles.id"], name="fk_providers_profile"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_providers_location", "providers", ["location"], postgresql_using="gist"
    )
    op.create_index(
        "ix_providers_subscription_status", "providers", ["subscription_status"]
    )
    op.execute("""
        CREATE TRIGGER providers_updated_at
            BEFORE UPDATE ON providers
            FOR EACH ROW EXECUTE FUNCTION update_updated_at()
    """)

    # --- reviews ---
    op.create_table(
        "reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("resident_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rating", sa.Integer, nullable=False),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column(
            "verified_hire",
            sa.Boolean,
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_reviews_rating"),
        sa.ForeignKeyConstraint(
            ["provider_id"], ["providers.id"], name="fk_reviews_provider"
        ),
        sa.ForeignKeyConstraint(
            ["resident_id"], ["profiles.id"], name="fk_reviews_resident"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reviews_provider_id", "reviews", ["provider_id"])

    # --- RLS ---
    op.execute("ALTER TABLE profiles ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE providers ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE reviews ENABLE ROW LEVEL SECURITY")

    # profiles: leitura de perfis ativos; escrita/edição apenas do próprio perfil
    op.execute("""
        CREATE POLICY profiles_select ON profiles
            FOR SELECT USING (deleted_at IS NULL)
    """)
    op.execute("""
        CREATE POLICY profiles_insert ON profiles
            FOR INSERT WITH CHECK (id = auth.uid())
    """)
    op.execute("""
        CREATE POLICY profiles_update ON profiles
            FOR UPDATE USING (id = auth.uid() AND deleted_at IS NULL)
    """)

    # providers: leitura apenas de prestadores ativos; escrita/edição apenas do próprio
    op.execute("""
        CREATE POLICY providers_select ON providers
            FOR SELECT USING (subscription_status = 'active')
    """)
    op.execute("""
        CREATE POLICY providers_insert ON providers
            FOR INSERT WITH CHECK (id = auth.uid())
    """)
    op.execute("""
        CREATE POLICY providers_update ON providers
            FOR UPDATE USING (id = auth.uid())
    """)

    # reviews: leitura pública de avaliações ativas;
    # inserção apenas por moradores (verified_hire é setado por admin/serviço)
    op.execute("""
        CREATE POLICY reviews_select ON reviews
            FOR SELECT USING (deleted_at IS NULL)
    """)
    op.execute("""
        CREATE POLICY reviews_insert ON reviews
            FOR INSERT WITH CHECK (
                resident_id = auth.uid()
                AND EXISTS (
                    SELECT 1 FROM profiles
                    WHERE id = auth.uid()
                      AND user_type = 'morador'
                      AND deleted_at IS NULL
                )
            )
    """)


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS reviews_insert ON reviews")
    op.execute("DROP POLICY IF EXISTS reviews_select ON reviews")
    op.execute("DROP POLICY IF EXISTS providers_update ON providers")
    op.execute("DROP POLICY IF EXISTS providers_insert ON providers")
    op.execute("DROP POLICY IF EXISTS providers_select ON providers")
    op.execute("DROP POLICY IF EXISTS profiles_update ON profiles")
    op.execute("DROP POLICY IF EXISTS profiles_insert ON profiles")
    op.execute("DROP POLICY IF EXISTS profiles_select ON profiles")

    op.execute("DROP TRIGGER IF EXISTS providers_updated_at ON providers")
    op.execute("DROP TRIGGER IF EXISTS profiles_updated_at ON profiles")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at")

    op.drop_index("ix_reviews_provider_id", table_name="reviews")
    op.drop_table("reviews")

    op.drop_index("ix_providers_subscription_status", table_name="providers")
    op.drop_index("ix_providers_location", table_name="providers")
    op.drop_table("providers")

    op.drop_index("ix_profiles_cpf_hash", table_name="profiles")
    op.drop_table("profiles")

    op.execute("DROP TYPE IF EXISTS servicecategory")
    op.execute("DROP TYPE IF EXISTS subscriptionstatus")
    op.execute("DROP TYPE IF EXISTS usertype")
