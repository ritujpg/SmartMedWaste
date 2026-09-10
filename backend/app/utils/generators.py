import secrets
import string
from uuid import UUID


def public_id(prefix: str) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return f"{prefix}-{''.join(secrets.choice(alphabet) for _ in range(8))}"


def tracking_url(waste_id: UUID, base_url: str) -> str:
    return f"{base_url.rstrip('/')}/{waste_id}"
