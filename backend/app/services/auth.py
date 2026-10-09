from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.config import settings
from app.core.security import new_session_token, verify_password
from app.models import Session, User
from app.models.user import utcnow


def authenticate(db: DbSession, username: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.username == username))
    if user and verify_password(password, user.password_hash):
        return user
    return None


def create_session(db: DbSession, user: User) -> Session:
    session = Session(
        token=new_session_token(),
        user_id=user.id,
        expires_at=utcnow() + timedelta(hours=settings.session_ttl_hours),
    )
    db.add(session)
    db.commit()
    return session


def get_user_by_token(db: DbSession, token: str | None) -> User | None:
    if not token:
        return None
    session = db.get(Session, token)
    if not session:
        return None
    expires = session.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=utcnow().tzinfo)
    if expires < utcnow():
        db.delete(session)
        db.commit()
        return None
    return session.user


def delete_session(db: DbSession, token: str | None) -> None:
    session = db.get(Session, token) if token else None
    if session:
        db.delete(session)
        db.commit()
