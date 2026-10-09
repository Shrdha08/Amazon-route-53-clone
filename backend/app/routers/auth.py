from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session as DbSession

from app.core.config import settings
from app.core.database import get_db
from app.models import User
from app.routers.deps import get_current_user
from app.schemas.auth import LoginRequest, UserOut
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=UserOut)
def login(body: LoginRequest, response: Response, db: DbSession = Depends(get_db)):
    user = auth_service.authenticate(db, body.username, body.password)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect username or password")
    session = auth_service.create_session(db, user)
    response.set_cookie(
        settings.cookie_name,
        session.token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.session_ttl_hours * 3600,
        path="/",
    )
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    db: DbSession = Depends(get_db),
    token: str | None = Cookie(default=None, alias=settings.cookie_name),
):
    auth_service.delete_session(db, token)
    response.delete_cookie(settings.cookie_name, path="/")


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
