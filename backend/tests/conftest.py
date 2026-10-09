import os
import tempfile

# Must be set before the app (and its engine) is imported.
_db_dir = tempfile.mkdtemp(prefix="r53-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_dir}/test.db"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def auth_client(client):
    r = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200
    return client
