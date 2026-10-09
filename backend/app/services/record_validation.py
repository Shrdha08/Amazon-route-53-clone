"""Per-type validation and normalization of DNS record values (Route 53 formats)."""
import ipaddress
import re

from app.services.errors import ServiceError

# SOA is created with the zone and cannot be created by users.
CREATABLE_TYPES = ("A", "AAAA", "CAA", "CNAME", "MX", "NS", "PTR", "SRV", "TXT")
MAX_TTL = 2_147_483_647

_HOST_LABEL = re.compile(r"^(\*|[a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?)$")
_CAA = re.compile(r'^(\d{1,3})\s+([A-Za-z0-9]+)\s+"(.*)"$')


def _bad(message: str) -> ServiceError:
    return ServiceError(422, message)


def _hostname(value: str, what: str) -> str:
    host = value.strip().lower().rstrip(".")
    labels = host.split(".")
    if not host or len(host) > 253 or not all(_HOST_LABEL.match(label) for label in labels):
        raise _bad(f"{what} '{value}' is not a valid domain name")
    return host + "."


def _int_in(text: str, low: int, high: int, what: str) -> int:
    if not text.isdigit() or not low <= int(text) <= high:
        raise _bad(f"{what} must be a whole number between {low} and {high}")
    return int(text)


def _a(v: str) -> str:
    try:
        return str(ipaddress.IPv4Address(v.strip()))
    except ValueError:
        raise _bad(f"'{v}' is not a valid IPv4 address") from None


def _aaaa(v: str) -> str:
    try:
        return str(ipaddress.IPv6Address(v.strip()))
    except ValueError:
        raise _bad(f"'{v}' is not a valid IPv6 address") from None


def _mx(v: str) -> str:
    parts = v.split()
    if len(parts) != 2:
        raise _bad(f"MX value '{v}' must be in the format: priority mailserver, e.g. 10 mail.example.com")
    return f"{_int_in(parts[0], 0, 65535, 'MX priority')} {_hostname(parts[1], 'Mail server')}"


def _srv(v: str) -> str:
    parts = v.split()
    if len(parts) != 4:
        raise _bad(f"SRV value '{v}' must be in the format: priority weight port target, e.g. 10 5 5060 sip.example.com")
    prio, weight, port = (_int_in(parts[i], 0, 65535, name) for i, name in enumerate(("SRV priority", "SRV weight", "SRV port")))
    target = "." if parts[3] == "." else _hostname(parts[3], "SRV target")
    return f"{prio} {weight} {port} {target}"


def _caa(v: str) -> str:
    m = _CAA.match(v.strip())
    if not m:
        raise _bad(f'CAA value \'{v}\' must be in the format: flags tag "value", e.g. 0 issue "letsencrypt.org"')
    flags = _int_in(m.group(1), 0, 255, "CAA flags")
    return f'{flags} {m.group(2).lower()} "{m.group(3)}"'


def _txt(v: str) -> str:
    text = v.strip()
    if not (len(text) >= 2 and text.startswith('"') and text.endswith('"')):
        text = '"' + text.replace('"', '\\"') + '"'
    if len(text) > 4000:
        raise _bad("TXT value is too long (maximum 4000 characters)")
    return text


_NORMALIZERS = {
    "A": _a,
    "AAAA": _aaaa,
    "CNAME": lambda v: _hostname(v, "CNAME target"),
    "NS": lambda v: _hostname(v, "Name server"),
    "PTR": lambda v: _hostname(v, "PTR domain name"),
    "MX": _mx,
    "SRV": _srv,
    "CAA": _caa,
    "TXT": _txt,
}


def normalize_values(record_type: str, raw_values: list[str]) -> list[str]:
    values = [v.strip() for v in raw_values if v.strip()]
    if not values:
        raise _bad("At least one value is required")
    if record_type == "CNAME" and len(values) != 1:
        raise _bad("A CNAME record can have only one value")
    normalized = [_NORMALIZERS[record_type](v) for v in values]
    return list(dict.fromkeys(normalized))  # drop duplicates, keep order


def validate_ttl(ttl: int) -> int:
    if not 0 <= ttl <= MAX_TTL:
        raise _bad(f"TTL must be between 0 and {MAX_TTL}")
    return ttl
