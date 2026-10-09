from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import utcnow


class HostedZone(Base):
    __tablename__ = "hosted_zones"
    __table_args__ = (UniqueConstraint("name", "is_private", name="uq_zone_name_type"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # e.g. Z0123456789ABCDEFGHIJ
    name: Mapped[str] = mapped_column(String(255), index=True)  # normalized, trailing dot
    comment: Mapped[str] = mapped_column(Text, default="")
    is_private: Mapped[bool] = mapped_column(Boolean, default=False)
    vpc_region: Mapped[str | None] = mapped_column(String(32), nullable=True)
    vpc_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    records: Mapped[list["DnsRecord"]] = relationship(
        back_populates="zone", cascade="all, delete-orphan", passive_deletes=True
    )
    tags: Mapped[list["ZoneTag"]] = relationship(
        back_populates="zone", cascade="all, delete-orphan", passive_deletes=True
    )


class ZoneTag(Base):
    __tablename__ = "zone_tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    zone_id: Mapped[str] = mapped_column(ForeignKey("hosted_zones.id", ondelete="CASCADE"), index=True)
    key: Mapped[str] = mapped_column(String(128))
    value: Mapped[str] = mapped_column(String(256), default="")

    zone: Mapped[HostedZone] = relationship(back_populates="tags")


class DnsRecord(Base):
    __tablename__ = "dns_records"
    __table_args__ = (
        UniqueConstraint("zone_id", "name", "type", "set_identifier", name="uq_record_identity"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    zone_id: Mapped[str] = mapped_column(ForeignKey("hosted_zones.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)  # FQDN, trailing dot
    type: Mapped[str] = mapped_column(String(8), index=True)
    ttl: Mapped[int] = mapped_column(Integer, default=300)
    value: Mapped[str] = mapped_column(Text)  # one value per line
    routing_policy: Mapped[str] = mapped_column(String(32), default="Simple")
    set_identifier: Mapped[str] = mapped_column(String(128), default="")
    alias_target: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    zone: Mapped[HostedZone] = relationship(back_populates="records")
