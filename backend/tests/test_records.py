import uuid

import pytest


def _zone(client, name):
    r = client.post("/api/hosted-zones", json={"name": name})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _url(zid, rid=None):
    return f"/api/hosted-zones/{zid}/records" + (f"/{rid}" if rid else "")


def _mk(client, zid, **body):
    return client.post(_url(zid), json={"ttl": 300, **body})


def test_requires_auth(client):
    assert client.get("/api/hosted-zones/ZX/records").status_code == 401


def test_unknown_zone_404(auth_client):
    assert auth_client.get(_url("ZNOPE")).status_code == 404


def test_new_zone_lists_ns_and_soa_apex_first(auth_client):
    zid = _zone(auth_client, "listing.example")
    _mk(auth_client, zid, name="aaa", type="A", values=["1.2.3.4"])
    items = auth_client.get(_url(zid)).json()["items"]
    assert [(r["name"], r["type"]) for r in items] == [
        ("listing.example.", "NS"), ("listing.example.", "SOA"), ("aaa.listing.example.", "A")]


@pytest.mark.parametrize("rtype,values,expected", [
    ("A", ["1.2.3.4", "5.6.7.8"], ["1.2.3.4", "5.6.7.8"]),
    ("AAAA", ["2001:DB8::1"], ["2001:db8::1"]),
    ("CNAME", ["Target.Example.COM"], ["target.example.com."]),
    ("MX", ["10 Mail.example.com"], ["10 mail.example.com."]),
    ("TXT", ["hello world", '"quoted"'], ['"hello world"', '"quoted"']),
    ("SRV", ["1 2 5060 sip.example.com"], ["1 2 5060 sip.example.com."]),
    ("CAA", ['0 issue "letsencrypt.org"'], ['0 issue "letsencrypt.org"']),
    ("PTR", ["host.example.com"], ["host.example.com."]),
    ("NS", ["ns1.example.com"], ["ns1.example.com."]),
])
def test_create_each_type_normalizes(auth_client, rtype, values, expected):
    zid = _zone(auth_client, f"t-{rtype.lower()}.example")
    r = _mk(auth_client, zid, name="host", type=rtype, values=values)
    assert r.status_code == 201, r.text
    assert r.json()["values"] == expected
    assert r.json()["name"] == f"host.t-{rtype.lower()}.example."


@pytest.mark.parametrize("rtype,values", [
    ("A", ["999.1.1.1"]), ("A", ["::1"]), ("AAAA", ["1.2.3.4"]), ("MX", ["mail.example.com"]),
    ("MX", ["99999 mail.example.com"]), ("SRV", ["1 2 3"]), ("CAA", ["0 issue letsencrypt.org"]),
    ("CNAME", ["a.example.com", "b.example.com"]), ("NS", ["not a host"]), ("A", ["  "]),
])
def test_invalid_values_rejected(auth_client, rtype, values):
    zid = _zone(auth_client, f"invalid-{uuid.uuid4().hex[:8]}.example")
    assert _mk(auth_client, zid, name="x", type=rtype, values=values).status_code == 422


def test_invalid_ttl_and_type(auth_client):
    zid = _zone(auth_client, "ttl.example")
    assert _mk(auth_client, zid, name="x", type="A", values=["1.1.1.1"], ttl=-1).status_code == 422
    assert _mk(auth_client, zid, name="x", type="SOA", values=["x"]).status_code == 422


def test_name_resolution(auth_client):
    zid = _zone(auth_client, "names.example")
    assert _mk(auth_client, zid, name="", type="TXT", values=["apex"]).json()["name"] == "names.example."
    assert _mk(auth_client, zid, name="www.names.example", type="A", values=["1.1.1.1"]).json()["name"] == "www.names.example."
    assert _mk(auth_client, zid, name="*.WILD", type="A", values=["1.1.1.1"]).json()["name"] == "*.wild.names.example."


def test_duplicate_and_cname_conflicts(auth_client):
    zid = _zone(auth_client, "conflict.example")
    assert _mk(auth_client, zid, name="a", type="A", values=["1.1.1.1"]).status_code == 201
    assert _mk(auth_client, zid, name="a", type="A", values=["2.2.2.2"]).status_code == 409
    assert _mk(auth_client, zid, name="a", type="CNAME", values=["x.example.com"]).status_code == 409
    assert _mk(auth_client, zid, name="", type="CNAME", values=["x.example.com"]).status_code == 409
    assert _mk(auth_client, zid, name="c", type="CNAME", values=["x.example.com"]).status_code == 201
    assert _mk(auth_client, zid, name="c", type="TXT", values=["nope"]).status_code == 409


def test_update_ttl_and_values_only(auth_client):
    zid = _zone(auth_client, "update.example")
    rid = _mk(auth_client, zid, name="a", type="A", values=["1.1.1.1"]).json()["id"]
    r = auth_client.put(_url(zid, rid), json={"ttl": 60, "values": ["9.9.9.9"]})
    assert r.status_code == 200 and r.json()["ttl"] == 60 and r.json()["values"] == ["9.9.9.9"]
    assert auth_client.put(_url(zid, rid), json={"ttl": 60, "values": ["bad"]}).status_code == 422
    assert auth_client.put(_url(zid, 99999), json={"ttl": 60, "values": ["9.9.9.9"]}).status_code == 404


def test_get_single_record(auth_client):
    zid = _zone(auth_client, "single.example")
    rid = _mk(auth_client, zid, name="a", type="A", values=["1.1.1.1"]).json()["id"]
    r = auth_client.get(_url(zid, rid))
    assert r.status_code == 200 and r.json()["values"] == ["1.1.1.1"]
    assert auth_client.get(_url(zid, 99999)).status_code == 404
    assert auth_client.get(_url(_zone(auth_client, "other-single.example"), rid)).status_code == 404


def test_record_of_other_zone_is_404(auth_client):
    z1, z2 = _zone(auth_client, "one.example"), _zone(auth_client, "two.example")
    rid = _mk(auth_client, z1, name="a", type="A", values=["1.1.1.1"]).json()["id"]
    assert auth_client.delete(_url(z2, rid)).status_code == 404


def test_delete_record_and_protect_apex(auth_client):
    zid = _zone(auth_client, "delete.example")
    rid = _mk(auth_client, zid, name="a", type="A", values=["1.1.1.1"]).json()["id"]
    assert auth_client.delete(_url(zid, rid)).status_code == 204
    items = auth_client.get(_url(zid)).json()["items"]
    assert [r["type"] for r in items] == ["NS", "SOA"]
    assert all(auth_client.delete(_url(zid, r["id"])).status_code == 409 for r in items)
    # Zone is deletable again with only default records left.
    assert auth_client.delete(f"/api/hosted-zones/{zid}").status_code == 204


def test_search_filter_sort_paginate(auth_client):
    zid = _zone(auth_client, "search.example")
    for i in range(12):
        _mk(auth_client, zid, name=f"h{i:02d}", type="A", values=[f"10.0.0.{i}"], ttl=100 + i)
    _mk(auth_client, zid, name="mail", type="MX", values=["10 mx.example.com"])
    base = _url(zid)
    assert auth_client.get(base, params={"type": "A"}).json()["total"] == 12
    assert auth_client.get(base, params={"q": "10.0.0.3"}).json()["items"][0]["name"] == "h03.search.example."
    assert auth_client.get(base, params={"q": "MX.EXAMPLE"}).json()["total"] == 1
    page2 = auth_client.get(base, params={"type": "A", "page": 2, "page_size": 5}).json()
    assert len(page2["items"]) == 5 and page2["total"] == 12
    top = auth_client.get(base, params={"type": "A", "sort_by": "ttl", "desc": True}).json()["items"][0]
    assert top["ttl"] == 111


def test_filter_by_routing_policy_and_alias(auth_client):
    zid = _zone(auth_client, "filters.example")
    _mk(auth_client, zid, name="a", type="A", values=["1.1.1.1"])
    base = _url(zid)
    total = auth_client.get(base).json()["total"]
    assert auth_client.get(base, params={"routing_policy": "Simple"}).json()["total"] == total
    assert auth_client.get(base, params={"routing_policy": "Weighted"}).json()["total"] == 0
    assert auth_client.get(base, params={"alias": "no"}).json()["total"] == total
    assert auth_client.get(base, params={"alias": "yes"}).json()["total"] == 0
    assert auth_client.get(base, params={"alias": "maybe"}).status_code == 422
