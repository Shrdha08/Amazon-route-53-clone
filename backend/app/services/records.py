from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session as DbSession

from app.models import DnsRecord, HostedZone
from app.schemas.record import RecordOut
from app.services import record_validation as rv
from app.services.errors import ServiceError
from app.services.zones import get_zone

_PROTECTED_APEX_TYPES = ("NS", "SOA")


def to_out(rec: DnsRecord) -> RecordOut:
    return RecordOut(
        id=rec.id, zone_id=rec.zone_id, name=rec.name, type=rec.type, ttl=rec.ttl,
        values=rec.value.split("\n"), routing_policy=rec.routing_policy,
        created_at=rec.created_at, updated_at=rec.updated_at,
    )


def resolve_name(zone: HostedZone, raw: str) -> str:
    """Turn user input ('', '@', 'www', 'www.example.com') into a fully qualified name in the zone."""
    name = raw.strip().lower().rstrip(".")
    apex = zone.name.rstrip(".")
    if name in ("", "@", apex):
        return zone.name
    if name.endswith("." + apex):
        full = name
    else:
        full = f"{name}.{apex}"
    labels = full.split(".")
    if len(full) > 253 or not all(1 <= len(label) <= 63 for label in labels):
        raise ServiceError(422, "Record name is not valid")
    return full + "."


def _is_apex(zone: HostedZone, rec: DnsRecord) -> bool:
    return rec.name == zone.name and rec.type in _PROTECTED_APEX_TYPES


def _get(db: DbSession, zone_id: str, record_id: int) -> tuple[HostedZone, DnsRecord]:
    zone = get_zone(db, zone_id)
    rec = db.get(DnsRecord, record_id)
    if not rec or rec.zone_id != zone_id:
        raise ServiceError(404, f"No record found with ID: {record_id}")
    return zone, rec


def list_records(
    db: DbSession, zone_id: str, q: str = "", record_type: str = "", sort_by: str = "name",
    descending: bool = False, page: int = 1, page_size: int = 10,
) -> tuple[list[DnsRecord], int]:
    zone = get_zone(db, zone_id)
    stmt = select(DnsRecord).where(DnsRecord.zone_id == zone_id)
    if q.strip():
        like = f"%{q.strip().lower()}%"
        stmt = stmt.where(or_(func.lower(DnsRecord.name).like(like), func.lower(DnsRecord.value).like(like)))
    if record_type:
        stmt = stmt.where(DnsRecord.type == record_type)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    col = {"name": DnsRecord.name, "type": DnsRecord.type, "ttl": DnsRecord.ttl}[sort_by]
    order = [col.desc() if descending else col.asc(), DnsRecord.type.asc()]
    if sort_by == "name":
        order.insert(0, (DnsRecord.name != zone.name).asc())  # zone apex first, like the console
    stmt = stmt.order_by(*order).offset((page - 1) * page_size).limit(page_size)
    return list(db.scalars(stmt)), total


def create_record(db: DbSession, zone_id: str, raw_name: str, record_type: str, ttl: int, raw_values: list[str]) -> DnsRecord:
    zone = get_zone(db, zone_id)
    name = resolve_name(zone, raw_name)
    ttl = rv.validate_ttl(ttl)
    values = rv.normalize_values(record_type, raw_values)

    existing = list(db.scalars(select(DnsRecord).where(DnsRecord.zone_id == zone_id, DnsRecord.name == name)))
    if any(r.type == record_type for r in existing):
        raise ServiceError(409, f"A {record_type} record named {name.rstrip('.')} already exists. "
                                "Edit the existing record to change its values.")
    if record_type == "CNAME" and (name == zone.name or existing):
        raise ServiceError(409, "A CNAME record cannot be created at the zone apex or where other records exist with the same name")
    if any(r.type == "CNAME" for r in existing):
        raise ServiceError(409, f"A CNAME record named {name.rstrip('.')} exists; no other record types can share its name")

    rec = DnsRecord(zone_id=zone_id, name=name, type=record_type, ttl=ttl, value="\n".join(values))
    db.add(rec)
    db.commit()
    return rec


def update_record(db: DbSession, zone_id: str, record_id: int, ttl: int, raw_values: list[str]) -> DnsRecord:
    _zone, rec = _get(db, zone_id, record_id)
    rec.ttl = rv.validate_ttl(ttl)
    if rec.type == "SOA":
        values = [v.strip() for v in raw_values if v.strip()]
        if len(values) != 1 or len(values[0].split()) != 7:
            raise ServiceError(422, "SOA value must be: primary-ns hostmaster serial refresh retry expire minimum")
    else:
        values = rv.normalize_values(rec.type, raw_values)
    rec.value = "\n".join(values)
    db.commit()
    return rec


def delete_record(db: DbSession, zone_id: str, record_id: int) -> None:
    zone, rec = _get(db, zone_id, record_id)
    if _is_apex(zone, rec):
        raise ServiceError(409, f"The {rec.type} record at the zone apex is required and cannot be deleted")
    db.delete(rec)
    db.commit()
