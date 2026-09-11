import os
import jwt
from passlib.context import CryptContext

from .config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_jwt_token(subject: str, role: str) -> str:
    payload = {"sub": subject, "role": role}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")


def decode_jwt_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
