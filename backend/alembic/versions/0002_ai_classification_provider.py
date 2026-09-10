"""Add provider metadata and classification audit fields."""
from alembic import op
from sqlalchemy import inspect

from app.models.base import AIClassification, AIClassificationReport

revision = "0002_ai_classification_provider"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    existing = {column["name"] for column in inspect(bind).get_columns("ai_classifications")}
    for name in ("facility_id", "requested_by", "assessment_confidence", "reason", "provider_name", "model_version",
                 "human_verified", "confirmed_category", "verified_by", "verified_at", "reported_by", "report_reason", "reported_at"):
        if name not in existing:
            column = AIClassification.__table__.c[name].copy()
            defaults = {
                "assessment_confidence": "0",
                "reason": "''",
                "provider_name": "'mock'",
                "human_verified": "false",
            }
            if name in defaults:
                column.server_default = defaults[name]
            op.add_column("ai_classifications", column)
    AIClassificationReport.__table__.create(bind=bind, checkfirst=True)


def downgrade():
    bind = op.get_bind()
    AIClassificationReport.__table__.drop(bind=bind, checkfirst=True)
    existing = {column["name"] for column in inspect(bind).get_columns("ai_classifications")}
    for name in ("reported_at", "report_reason", "reported_by", "verified_at", "verified_by", "confirmed_category",
                 "human_verified", "model_version", "provider_name", "reason", "assessment_confidence", "requested_by", "facility_id"):
        if name in existing:
            op.drop_column("ai_classifications", name)