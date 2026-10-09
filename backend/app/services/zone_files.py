"""BIND zone file parsing and export (pure functions, no database access)."""
import re
from dataclasses import dataclass, field

from app.models import DnsRecord, HostedZone


@dataclass
class Issue:
    message: str
    line: int | None = None
    name: str | None = None
    type: str | None = None


@dataclass
class RecordSet:
    name: str  # fully qualified, trailing dot
    type: str
    ttl: int
    values: list[str] = field(default_factory=list)


@dataclass
class _Entry:
    line: int
    indented: bool  # owner name omitted: inherits the previous one
    tokens: list[str]


_TTL_UNITS = {"s": 1, "m": 60, "h": 3600, "d": 86400, "w": 604800}
_TTL_RE = re.compile(r"^(\d+[smhdw]?)+$", re.IGNORECASE)
_TTL_PART = re.compile(r"(\d+)([smhdw]?)", re.IGNORECASE)


def _parse_ttl(token: str) -> int:
    return sum(int(n) * _TTL_UNITS.get(unit.lower(), 1) for n, unit in _TTL_PART.findall(token))


def _tokenize(text: str) -> list[_Entry]:
    """Split into logical entries: handles comments, quoted strings and ( ) continuation."""
    entries: list[_Entry] = []
    tokens: list[str] = []
    cur: list[str] = []
    in_quote = False
    depth = 0
    line = 1
    entry_line = 1
    indented = False
    line_starts_ws = False
    at_line_start = True

    def flush_token():
        if cur:
            tokens.append("".join(cur))
            cur.clear()

    def end_entry():
        nonlocal tokens
        flush_token()
        if tokens:
            entries.append(_Entry(entry_line, indented, tokens))
        tokens = []

    i, n = 0, len(text)
    while i < n:
        ch = text[i]
        if at_line_start:
            line_starts_ws = ch in " \t"
            at_line_start = False
        if in_quote:
            cur.append(ch)
            if ch == "\\" and i + 1 < n:
                cur.append(text[i + 1])
                i += 1
            elif ch == '"':
                in_quote = False
            i += 1
            continue
        if ch == ";":
            while i < n and text[i] != "\n":
                i += 1
            continue
        if ch == "\n":
            if depth == 0:
                end_entry()
            else:
                flush_token()
            line += 1
            at_line_start = True
            i += 1
            continue
        if ch in " \t\r":
            flush_token()
        elif ch == "(":
            flush_token()
            depth += 1
        elif ch == ")":
            flush_token()
            depth = max(0, depth - 1)
        else:
            if not tokens and not cur:
                entry_line, indented = line, line_starts_ws
            if ch == '"':
                in_quote = True
            cur.append(ch)
        i += 1
    end_entry()
    return entries


def _qualify(token: str, origin: str) -> str:
    if token == "@":
        return origin
    if token.endswith("."):
        return token.lower()
    return f"{token.lower()}.{origin}"


def _rdata_value(rtype: str, rdata: list[str], origin: str) -> str:
    """Join rdata tokens into a value, qualifying relative hostnames against the origin."""
    parts = list(rdata)
    if rtype in ("NS", "CNAME", "PTR") and parts:
        parts[0] = _qualify(parts[0], origin)
    elif rtype == "SOA" and len(parts) >= 2:
        parts[0], parts[1] = _qualify(parts[0], origin), _qualify(parts[1], origin)
    elif rtype == "MX" and len(parts) == 2:
        parts[1] = _qualify(parts[1], origin)
    elif rtype == "SRV" and len(parts) == 4 and parts[3] != ".":
        parts[3] = _qualify(parts[3], origin)
    return " ".join(parts)


def parse_zone_file(text: str, default_origin: str) -> tuple[list[RecordSet], list[Issue]]:
    """Parse BIND master-file text into record sets grouped by (name, type)."""
    origin = default_origin
    default_ttl: int | None = None
    last_ttl: int | None = None
    last_owner: str | None = None
    groups: dict[tuple[str, str], RecordSet] = {}
    issues: list[Issue] = []

    for entry in _tokenize(text):
        toks = entry.tokens
        if toks[0].startswith("$"):
            directive = toks[0].upper()
            if directive == "$ORIGIN" and len(toks) == 2:
                origin = _qualify(toks[1], origin)
            elif directive == "$TTL" and len(toks) == 2 and _TTL_RE.match(toks[1]):
                default_ttl = _parse_ttl(toks[1])
            else:
                issues.append(Issue(f"Unsupported or malformed directive {toks[0]}", line=entry.line))
            continue

        i = 0
        if entry.indented:
            if last_owner is None:
                issues.append(Issue("Record has no owner name and no previous record to inherit from", line=entry.line))
                continue
            owner = last_owner
        else:
            owner = _qualify(toks[0], origin)
            i = 1
        last_owner = owner

        ttl: int | None = None
        while i < len(toks):
            t = toks[i]
            if t.upper() == "IN":
                i += 1
            elif ttl is None and _TTL_RE.match(t):
                ttl = _parse_ttl(t)
                i += 1
            else:
                break
        if i >= len(toks):
            issues.append(Issue("Record is missing a type", line=entry.line, name=owner))
            continue
        rtype, rdata = toks[i].upper(), toks[i + 1 :]
        if not rdata:
            issues.append(Issue("Record is missing its value", line=entry.line, name=owner, type=rtype))
            continue

        ttl = ttl if ttl is not None else default_ttl if default_ttl is not None else last_ttl if last_ttl is not None else 300
        last_ttl = ttl
        group = groups.setdefault((owner, rtype), RecordSet(owner, rtype, ttl))
        group.values.append(_rdata_value(rtype, rdata, origin))

    return list(groups.values()), issues


def export_bind(zone: HostedZone, records: list[DnsRecord]) -> str:
    lines = [
        f"; Zone file for {zone.name.rstrip('.')} exported from the Route 53 clone",
        f"$ORIGIN {zone.name}",
    ]
    for rec in records:
        for value in rec.value.split("\n"):
            lines.append(f"{rec.name}\t{rec.ttl}\tIN\t{rec.type}\t{value}")
    return "\n".join(lines) + "\n"


def export_json(zone: HostedZone, records: list[DnsRecord]) -> dict:
    return {
        "hosted_zone": {
            "id": zone.id,
            "name": zone.name,
            "comment": zone.comment,
            "is_private": zone.is_private,
            "vpc_region": zone.vpc_region,
            "vpc_id": zone.vpc_id,
            "tags": [{"key": t.key, "value": t.value} for t in zone.tags],
            "created_at": zone.created_at.isoformat(),
        },
        "records": [
            {"name": r.name, "type": r.type, "ttl": r.ttl, "values": r.value.split("\n"), "routing_policy": r.routing_policy}
            for r in records
        ],
    }
