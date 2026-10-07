from fastapi import HTTPException, Request
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.config import Settings

_hasher = PasswordHasher()
SESSION_USER = "user"


def verify_credentials(settings: Settings, username: str, password: str) -> bool:
    if username != settings.app_username:
        _hasher.hash(password)
        return False
    try:
        return _hasher.verify(settings.app_password_hash.get_secret_value(), password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def require_user(request: Request) -> str:
    user = request.session.get(SESSION_USER)
    if not user:
        raise HTTPException(status_code=401, detail="Sign in required.")
    return user
