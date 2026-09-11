from pydantic import BaseModel, EmailStr
from typing import Optional, Literal


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Literal["facility", "collector", "administrator"]
    organization: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
