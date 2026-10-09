import json
import uuid

from app.services.zone_files import parse_zone_file

ZONE = """\
$ORIGIN example.org.
$TTL 1h
@       IN SOA ns1 hostmaster (
            2024010101 ; serial
            7200 900 1209600 86400 )
        IN NS  ns1
@       IN A   192.0.2.1   ; apex
www     300 IN CNAME @
mail    IN A 192.0.2.10
        IN A 192.0.2.11
@       IN MX 10 mail
@       IN TXT "v=spf1 -all" "second string; not a comment"
_sip._tcp IN SRV 1 2 5060 sip.other.net.
"""


def _by_key(sets):
    return {(s.name, s.type): s for s in sets}


def test_parse_directives_comments_parens_and_inheritance():
    sets, issues = parse_zone_file(ZONE, "example.org.")
    assert issues == []
    got = _by_key(sets)
    assert got[("example.org.", "SOA")].values == ["ns1.example.org. hostmaster.example.org. 2024010101 7200 900 1209600 86400"]
    assert got[("example.org.", "NS")].values == ["ns1.example.org."]  # owner inherited from previous line
    assert got[("example.org.", "A")].values == ["192.0.2.1"]
    assert got[("example.org.", "A")].ttl == 3600  # $TTL 1h
    assert got[("www.example.org.", "CNAME")].ttl == 300
    assert got[("www.example.org.", "CNAME")].values == ["example.org."]
    assert got[("mail.example.org.", "A")].values == ["192.0.2.10", "192.0.2.11"]  # grouped round robin
    assert got[("example.org.", "MX")].values == ["10 mail.example.org."]
    assert got[("example.org.", "TXT")].values == ['"v=spf1 -all" "second string; not a comment"']
    assert got[("_sip._tcp.example.org.", "SRV")].values == ["1 2 5060 sip.other.net."]


def test_parse_reports_problems_with_line_numbers():
    sets, issues = parse_zone_file("$INCLUDE other.zone\n  IN A 1.2.3.4\nwww IN\n", "example.org.")
    assert sets == []
    assert [i.line for i in issues] == [1, 2, 3]


def _zone(client, name):
    r = client.post("/api/hosted-zones", json={"name": name})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _unique(prefix="imp"):
    return f"{prefix}-{uuid.uuid4().hex[:8]}.example"


def test_import_creates_skips_and_reports(auth_client):
    name = _unique()
    zid = _zone(auth_client, name)
    zone_text = f"""\
$ORIGIN {name}.
@ IN SOA ns hostmaster 1 2 3 4 5
@ IN NS ns-1.awsdns.com.
www IN A 192.0.2.5
@ IN MX 10 mail
bad IN A not-an-ip
other.elsewhere.net. IN A 192.0.2.9
@ IN HINFO "x" "y"
"""
    r = auth_client.post(f"/api/hosted-zones/{zid}/records/import", json={"content": zone_text})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["created"] == 2
    assert {(s["type"]) for s in body["skipped"]} == {"SOA", "NS"}
    messages = " | ".join(e["message"] for e in body["errors"])
    assert "not a valid IPv4" in messages and "outside the hosted zone" in messages and "HINFO" in messages
    # Re-importing is idempotent: existing records are skipped, nothing is overwritten.
    again = auth_client.post(f"/api/hosted-zones/{zid}/records/import", json={"content": zone_text}).json()
    assert again["created"] == 0
    assert any("already exists" in s["message"] for s in again["skipped"])


def test_import_validation_and_auth(auth_client, client):
    zid = _zone(auth_client, _unique())
    assert auth_client.post(f"/api/hosted-zones/{zid}/records/import", json={"content": ""}).status_code == 422
    assert auth_client.post("/api/hosted-zones/ZNOPE/records/import", json={"content": "x"}).status_code == 404


def test_export_bind_and_json(auth_client):
    zid = _zone(auth_client, _unique("exp"))
    auth_client.post(f"/api/hosted-zones/{zid}/records", json={"name": "www", "type": "A", "ttl": 60, "values": ["1.1.1.1", "2.2.2.2"]})
    bind = auth_client.get(f"/api/hosted-zones/{zid}/export")
    assert bind.status_code == 200
    assert "attachment" in bind.headers["content-disposition"] and ".zone" in bind.headers["content-disposition"]
    assert "$ORIGIN" in bind.text and "\t60\tIN\tA\t1.1.1.1" in bind.text and "\t60\tIN\tA\t2.2.2.2" in bind.text
    assert bind.text.index("SOA") < bind.text.index("\tA\t")  # apex records first

    js = auth_client.get(f"/api/hosted-zones/{zid}/export", params={"format": "json"})
    data = json.loads(js.text)
    assert ".json" in js.headers["content-disposition"]
    assert data["hosted_zone"]["id"] == zid
    www = next(r for r in data["records"] if r["name"].startswith("www."))
    assert www["values"] == ["1.1.1.1", "2.2.2.2"] and www["ttl"] == 60
    assert auth_client.get(f"/api/hosted-zones/{zid}/export", params={"format": "xml"}).status_code == 422


def test_export_then_import_round_trip(auth_client):
    name = _unique("rt")
    src = _zone(auth_client, name)
    for body in [
        {"name": "", "type": "MX", "values": ["10 mail.example.com"]},
        {"name": "", "type": "TXT", "values": ["hello world"]},
        {"name": "a", "type": "A", "values": ["10.0.0.1", "10.0.0.2"]},
        {"name": "_x._tcp", "type": "SRV", "values": ["1 2 3 target.example.com"]},
        {"name": "", "type": "CAA", "values": ['0 issue "letsencrypt.org"']},
    ]:
        assert auth_client.post(f"/api/hosted-zones/{src}/records", json={"ttl": 120, **body}).status_code == 201
    exported = auth_client.get(f"/api/hosted-zones/{src}/export").text

    dst = auth_client.post("/api/hosted-zones", json={"name": name, "is_private": True, "vpc_region": "us-east-1", "vpc_id": "vpc-1"}).json()["id"]
    result = auth_client.post(f"/api/hosted-zones/{dst}/records/import", json={"content": exported}).json()
    assert result["created"] == 5 and result["errors"] == []

    def snapshot(zid):
        items = auth_client.get(f"/api/hosted-zones/{zid}/records", params={"page_size": 100}).json()["items"]
        return {(r["name"], r["type"]): (r["ttl"], r["values"]) for r in items if r["type"] not in ("NS", "SOA")}

    assert snapshot(src) == snapshot(dst)


def test_bulk_delete_partial_failures(auth_client):
    zid = _zone(auth_client, _unique("bulk"))
    ids = [auth_client.post(f"/api/hosted-zones/{zid}/records", json={"name": f"h{i}", "type": "A", "values": ["1.1.1.1"]}).json()["id"] for i in range(3)]
    apex = next(r["id"] for r in auth_client.get(f"/api/hosted-zones/{zid}/records").json()["items"] if r["type"] == "SOA")
    r = auth_client.post(f"/api/hosted-zones/{zid}/records/bulk-delete", json={"ids": ids + [apex, 987654, ids[0]]})
    assert r.status_code == 200
    body = r.json()
    assert sorted(body["deleted"]) == sorted(ids)
    assert {f["id"] for f in body["failed"]} == {apex, 987654}
    assert auth_client.get(f"/api/hosted-zones/{zid}/records").json()["total"] == 2
    assert auth_client.post(f"/api/hosted-zones/{zid}/records/bulk-delete", json={"ids": []}).status_code == 422
    assert auth_client.post("/api/hosted-zones/ZNOPE/records/bulk-delete", json={"ids": [1]}).status_code == 404
