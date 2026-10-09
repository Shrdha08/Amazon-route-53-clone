import random
import string

from app.models import DnsRecord, HostedZone

_NS_SET = (
    "ns-1536.awsdns-00.co.uk.\nns-0.awsdns-00.com.\n"
    "ns-1024.awsdns-00.org.\nns-512.awsdns-00.net."
)
_SOA = "ns-1536.awsdns-00.co.uk. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"


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
