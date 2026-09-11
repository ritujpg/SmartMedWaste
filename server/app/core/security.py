import os
import jwt
from typing import Any
from passlib.context import CryptContext

from .config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # passlib's bcrypt backend can verify a database-backed password_hash.
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_jwt_token(subject: str, role: str, user_id: str | None = None, email: str | None = None) -> str:
    payload: dict[str, Any] = {"sub": subject, "role": role}
    if user_id:
        payload["id"] = str(user_id)
    if email:
        payload["email"] = str(email)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")


def decode_jwt_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
