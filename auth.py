import os
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError

SECRET_KEY = os.getenv("SECRET_KEY", "ai-mesang-secret-key-2025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}${h}"

def verify_password(plain: str, hashed: str) -> bool:
    try:
        salt, h = hashed.split("$")
        return hashlib.sha256((salt + plain).encode()).hexdigest() == h
    except:
        return False

class AuthManager:
    def hash_password(self, password: str) -> str:
        return hash_password(password)

    def verify_password(self, plain: str, hashed: str) -> bool:
        return verify_password(plain, hashed)

    def create_token(self, user_id: int) -> str:
        exp = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        return jwt.encode({"sub": str(user_id), "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)
