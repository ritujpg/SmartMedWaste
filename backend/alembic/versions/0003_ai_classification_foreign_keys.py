"""Add foreign keys for classification ownership and verification fields."""
from alembic import op

revision = "0003_ai_classification_foreign_keys"
down_revision = "0002_ai_classification_provider"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("ai_classifications", recreate="always") as batch_op:
        batch_op.create_foreign_key("fk_ai_classifications_facility_id", "facilities", ["facility_id"], ["id"], ondelete="CASCADE")
        batch_op.create_foreign_key("fk_ai_classifications_requested_by", "users", ["requested_by"], ["id"], ondelete="CASCADE")
        batch_op.create_foreign_key("fk_ai_classifications_verified_by", "users", ["verified_by"], ["id"], ondelete="SET NULL")
        batch_op.create_foreign_key("fk_ai_classifications_reported_by", "users", ["reported_by"], ["id"], ondelete="SET NULL")


def downgrade():
    with op.batch_alter_table("ai_classifications", recreate="always") as batch_op:
        batch_op.drop_constraint("fk_ai_classifications_reported_by", type_="foreignkey")
        batch_op.drop_constraint("fk_ai_classifications_verified_by", type_="foreignkey")
        batch_op.drop_constraint("fk_ai_classifications_requested_by", type_="foreignkey")
        batch_op.drop_constraint("fk_ai_classifications_facility_id", type_="foreignkey")