"""Durable solve configuration, lifecycle, progress, result and execution lease."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0002"
down_revision = "0001"


def upgrade():
    json_type = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")
    op.create_table(
        "solves",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("heartbeat_at", sa.DateTime(timezone=True)),
        sa.Column("run_token", sa.String(36)),
        sa.Column("iteration", sa.Integer(), nullable=False),
        sa.Column("max_iterations", sa.Integer(), nullable=False),
        sa.Column("algorithm", sa.String(16), nullable=False),
        sa.Column("elapsed_seconds", sa.Float(), nullable=False),
        sa.Column("exploitability_pct", sa.Float()),
        sa.Column("error", sa.Text()),
        sa.Column("config", json_type, nullable=False),
        sa.Column("result", json_type),
    )
    op.create_index("ix_solves_status", "solves", ["status"])


def downgrade():
    op.drop_index("ix_solves_status", table_name="solves")
    op.drop_table("solves")
