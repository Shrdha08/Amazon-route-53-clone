"""Idempotent seed: demo user plus sample zones/records. Run: python -m app.seed"""
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models import DnsRecord, HostedZone, User
from app.services.zones import default_records, generate_zone_id, normalize_name

DEMO_USER = ("admin", "admin123", "123456789012")

SAMPLE_ZONES = [
    ("example.com", "Production public zone", False, [
        ("example.com", "A", 300, "93.184.216.34"),
        ("www.example.com", "CNAME", 300, "example.com"),
        ("example.com", "MX", 3600, "10 mail.example.com\n20 mail2.example.com"),
        ("example.com", "TXT", 300, '"v=spf1 include:_spf.example.com ~all"'),
        ("api.example.com", "A", 60, "10.0.1.10\n10.0.1.11"),
        ("ipv6.example.com", "AAAA", 300, "2001:db8::1"),
        ("_sip._tcp.example.com", "SRV", 300, "10 60 5060 sip.example.com"),
        ("example.com", "CAA", 3600, '0 issue "letsencrypt.org"'),
    ]),
    ("internal.corp", "Private zone for internal services", True, [
        ("db.internal.corp", "A", 60, "10.0.5.20"),
        ("cache.internal.corp", "A", 60, "10.0.5.30"),
        ("20.5.0.10.in-addr.arpa", "PTR", 300, "db.internal.corp"),
    ]),
    ("staging.example.org", "Staging environment", False, [
        ("staging.example.org", "A", 300, "203.0.113.25"),
        ("blog.staging.example.org", "CNAME", 300, "staging.example.org"),
    ]),
]


def seed(db: DbSession) -> None:
    if not db.scalar(select(User).where(User.username == DEMO_USER[0])):
        db.add(User(username=DEMO_USER[0], password_hash=hash_password(DEMO_USER[1]), account_id=DEMO_USER[2]))
    if db.scalar(select(HostedZone).limit(1)) is None:
        for name, comment, private, records in SAMPLE_ZONES:
            zone = HostedZone(
                id=generate_zone_id(),
                name=normalize_name(name),
                comment=comment,
                is_private=private,
                vpc_region="us-east-1" if private else None,
                vpc_id="vpc-0a1b2c3d4e5f" if private else None,
            )
            db.add(zone)
            db.flush()
            db.add_all(default_records(zone))
            db.add_all(
                DnsRecord(zone_id=zone.id, name=normalize_name(n), type=t, ttl=ttl, value=v)
                for n, t, ttl, v in records
            )
    db.commit()


if __name__ == "__main__":
    Base.metadata.create_all(engine)
    with SessionLocal() as session:
        seed(session)
    print("Seed complete.")
