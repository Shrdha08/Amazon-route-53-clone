import random
import string

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession

from app.models import DnsRecord, HostedZone, ZoneTag

_NS_SET = (
    "ns-1536.awsdns-00.co.uk.\nns-0.awsdns-00.com.\n"
    "ns-1024.awsdns-00.org.\nns-512.awsdns-00.net."
)
_SOA = "ns-1536.awsdns-00.co.uk. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"


class ZoneError(Exception):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def normalize_name(name: str) -> str:
    return name.strip().lower().rstrip(".") + "."


def generate_zone_id() -> str:
    return "Z" + "".join(random.choices(string.ascii_uppercase + string.digits, k=19))


def default_records(zone: HostedZone) -> list[DnsRecord]:
    """NS + SOA records that Route 53 creates automatically with every zone."""
    return [
        DnsRecord(zone_id=zone.id, name=zone.name, type="NS", ttl=172800, value=_NS_SET),
        DnsRecord(zone_id=zone.id, name=zone.name, type="SOA", ttl=900, value=_SOA),
    ]


def _record_count_subquery():
    return (
        select(DnsRecord.zone_id, func.count(DnsRecord.id).label("n"))
        .group_by(DnsRecord.zone_id)
        .subquery()
    )


def _with_count(zone: HostedZone, count: int) -> HostedZone:
    zone.record_count = count  # type: ignore[attr-defined]  (read by ZoneOut)
    return zone


def list_zones(
    db: DbSession,
    q: str = "",
    zone_type: str = "all",
    sort_by: str = "name",
    descending: bool = False,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[HostedZone], int]:
    counts = _record_count_subquery()
    record_count = func.coalesce(counts.c.n, 0)
    stmt = select(HostedZone, record_count).outerjoin(counts, counts.c.zone_id == HostedZone.id)

    if q.strip():
        like = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(func.lower(HostedZone.name).like(like), func.lower(HostedZone.id).like(like),
                func.lower(HostedZone.comment).like(like))
        )
    if zone_type == "public":
        stmt = stmt.where(HostedZone.is_private.is_(False))
    elif zone_type == "private":
        stmt = stmt.where(HostedZone.is_private.is_(True))

    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0

    sort_col = {
        "name": HostedZone.name,
        "type": HostedZone.is_private,
        "records": record_count,
        "created": HostedZone.created_at,
    }[sort_by]
    stmt = stmt.order_by(sort_col.desc() if descending else sort_col.asc(), HostedZone.name.asc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)

    return [_with_count(z, n) for z, n in db.execute(stmt).all()], total


def get_zone(db: DbSession, zone_id: str) -> HostedZone:
    zone = db.get(HostedZone, zone_id)
    if not zone:
        raise ZoneError(404, f"No hosted zone found with ID: {zone_id}")
    count = db.scalar(select(func.count(DnsRecord.id)).where(DnsRecord.zone_id == zone_id)) or 0
    return _with_count(zone, count)


def create_zone(db: DbSession, name: str, comment: str, is_private: bool,
                vpc_region: str | None, vpc_id: str | None, tags: list[tuple[str, str]]) -> HostedZone:
    zone = HostedZone(id=generate_zone_id(), name=name, comment=comment, is_private=is_private,
                      vpc_region=vpc_region, vpc_id=vpc_id)
    zone.tags = [ZoneTag(key=k, value=v) for k, v in tags]
    db.add(zone)
    try:
        db.flush()
        db.add_all(default_records(zone))
        db.commit()
    except IntegrityError:
        db.rollback()
        kind = "private" if is_private else "public"
        raise ZoneError(409, f"A {kind} hosted zone named {name.rstrip('.')} already exists") from None
    return get_zone(db, zone.id)


def update_zone(db: DbSession, zone_id: str, comment: str) -> HostedZone:
    zone = get_zone(db, zone_id)
    zone.comment = comment
    db.commit()
    return get_zone(db, zone_id)


def delete_zone(db: DbSession, zone_id: str) -> None:
    """Mirror Route 53: a zone can only be deleted once only its NS and SOA records remain."""
    zone = get_zone(db, zone_id)
    extra = db.scalar(
        select(func.count(DnsRecord.id)).where(
            DnsRecord.zone_id == zone_id,
            ~((DnsRecord.name == zone.name) & DnsRecord.type.in_(("NS", "SOA"))),
        )
    )
    if extra:
        raise ZoneError(409, "The hosted zone contains records other than the default NS and SOA "
                             "records. Delete those records before deleting the hosted zone.")
    db.delete(zone)
    db.commit()
