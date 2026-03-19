from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import secrets
import base64
import json
from typing import Optional
from fastapi import Depends, HTTPException, status, Cookie
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
    return f"{salt}${hashed}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        salt, stored_hash = hashed_password.split('$')
        computed = hashlib.pbkdf2_hmac('sha256', plain_password.encode(), salt.encode(), 100000).hex()
        return hmac.compare_digest(computed, stored_hash)
    except (ValueError, AttributeError):
        return False


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


def _b64decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    if padding != 4:
        s += '=' * padding
    return base64.urlsafe_b64decode(s)


def create_access_token(data: dict) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload["exp"] = int(expire.timestamp())
    payload["iat"] = int(datetime.now(timezone.utc).timestamp())

    header_b64 = _b64encode(json.dumps(header, separators=(',', ':')).encode())
    payload_b64 = _b64encode(json.dumps(payload, separators=(',', ':')).encode())
    message = f"{header_b64}.{payload_b64}"

    signature = hmac.new(
        settings.SECRET_KEY.encode(), message.encode(), hashlib.sha256
    ).digest()
    sig_b64 = _b64encode(signature)

    return f"{message}.{sig_b64}"


def _decode_jwt(token: str) -> dict:
    parts = token.split('.')
    if len(parts) != 3:
        raise ValueError("Invalid token")

    header_b64, payload_b64, sig_b64 = parts

    # Verify signature
    message = f"{header_b64}.{payload_b64}"
    expected_sig = hmac.new(
        settings.SECRET_KEY.encode(), message.encode(), hashlib.sha256
    ).digest()
    actual_sig = _b64decode(sig_b64)

    if not hmac.compare_digest(expected_sig, actual_sig):
        raise ValueError("Invalid signature")

    # Decode payload
    payload = json.loads(_b64decode(payload_b64))

    # Check expiration
    exp = payload.get("exp")
    if exp and datetime.now(timezone.utc).timestamp() > exp:
        raise ValueError("Token expired")

    return payload


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    access_token_cookie: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    # Use token from cookie if not provided via Authorization header
    if token is None:
        token = access_token_cookie
    if token is None:
        raise credentials_exception
    try:
        payload = _decode_jwt(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except (ValueError, Exception):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user
