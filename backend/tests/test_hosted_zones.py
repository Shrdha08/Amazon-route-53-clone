def _create(client, **over):
    body = {"name": "Created.Test", "comment": "hello", **over}
    return client.post("/api/hosted-zones", json=body)


def test_requires_auth(client):
    assert client.get("/api/hosted-zones").status_code == 401


def test_list_seeded_zones_with_counts(auth_client):
    data = auth_client.get("/api/hosted-zones").json()
    assert data["total"] >= 3
    example = next(z for z in data["items"] if z["name"] == "example.com.")
    assert example["record_count"] >= 10
    assert example["is_private"] is False


def test_search_filter_paginate(auth_client):
    r = auth_client.get("/api/hosted-zones", params={"q": "INTERNAL"}).json()
    assert [z["name"] for z in r["items"]] == ["internal.corp."]
    private = auth_client.get("/api/hosted-zones", params={"type": "private"}).json()
    assert all(z["is_private"] for z in private["items"])
    page = auth_client.get("/api/hosted-zones", params={"page_size": 1, "page": 2}).json()
    assert len(page["items"]) == 1 and page["total"] >= 3


def test_create_normalizes_and_adds_ns_soa(auth_client):
    r = _create(auth_client, name="Alpha-Zone.Example", tags=[{"key": "env", "value": "dev"}])
    assert r.status_code == 201
    zone = r.json()
    assert zone["name"] == "alpha-zone.example."
    assert zone["id"].startswith("Z") and len(zone["id"]) == 20
    assert zone["record_count"] == 2
    assert zone["tags"] == [{"key": "env", "value": "dev"}]


def test_create_duplicate_and_invalid(auth_client):
    assert _create(auth_client, name="dup.example").status_code == 201
    assert _create(auth_client, name="dup.example").status_code == 409
    assert _create(auth_client, name="not a domain").status_code == 422
    assert _create(auth_client, name="nodots").status_code == 422
    assert _create(auth_client, name="priv.example", is_private=True).status_code == 422
    ok = _create(auth_client, name="priv.example", is_private=True, vpc_region="us-east-1", vpc_id="vpc-1")
    assert ok.status_code == 201


def test_same_name_public_and_private_allowed(auth_client):
    assert _create(auth_client, name="split.example").status_code == 201
    r = _create(auth_client, name="split.example", is_private=True, vpc_region="us-east-1", vpc_id="vpc-1")
    assert r.status_code == 201


def test_update_comment_only(auth_client):
    zid = _create(auth_client, name="edit.example").json()["id"]
    r = auth_client.patch(f"/api/hosted-zones/{zid}", json={"comment": "updated"})
    assert r.status_code == 200 and r.json()["comment"] == "updated"
    assert auth_client.get(f"/api/hosted-zones/{zid}").json()["comment"] == "updated"


def test_delete_empty_zone_and_404(auth_client):
    zid = _create(auth_client, name="gone.example").json()["id"]
    assert auth_client.delete(f"/api/hosted-zones/{zid}").status_code == 204
    assert auth_client.get(f"/api/hosted-zones/{zid}").status_code == 404
    assert auth_client.delete(f"/api/hosted-zones/{zid}").status_code == 404


def test_delete_zone_with_records_is_blocked(auth_client):
    example = next(z for z in auth_client.get("/api/hosted-zones", params={"q": "example.com"}).json()["items"]
                   if z["name"] == "example.com.")
    r = auth_client.delete(f"/api/hosted-zones/{example['id']}")
    assert r.status_code == 409
