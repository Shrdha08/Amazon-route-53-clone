from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session as DbSession

from app.core.config import settings
from app.core.database import get_db
from app.models import User
from app.services import auth as auth_service


def get_current_user(
    db: DbSession = Depends(get_db),
    token: str | None = Cookie(default=None, alias=settings.cookie_name),
) -> User:
    user = auth_service.get_user_by_token(db, token)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    return user
