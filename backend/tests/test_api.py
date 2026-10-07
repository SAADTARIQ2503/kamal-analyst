import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app import db
from app.config import Settings
from app.main import create_app


@pytest.fixture
def settings(tmp_path):
    return Settings(
        db_user="u",
        db_password=SecretStr("p"),
        db_dsn="x/y",
        instant_client_dir=tmp_path,
        app_username="analyst",
        app_password_hash=SecretStr(PasswordHasher().hash("correct-horse")),
        session_secret=SecretStr("t" * 48),
        session_https_only=False,
        db_row_limit=2,
        _env_file=None,
    )


@pytest.fixture
def client(settings, monkeypatch):
    monkeypatch.setattr(db, "init_pool", lambda s: None)
    monkeypatch.setattr(db, "close_pool", lambda: None)
    return TestClient(create_app(settings))


def login(client):
    r = client.post("/api/login", json={"username": "analyst", "password": "correct-horse"})
    assert r.status_code == 200


def test_health_is_public(client):
    assert client.get("/api/health").status_code == 200


def test_data_routes_require_session(client):
    assert client.get("/api/costing/grey-issuance").status_code == 401
    assert client.post("/api/query", json={"sql": "select 1 from dual"}).status_code == 401


def test_wrong_password_rejected(client):
    r = client.post("/api/login", json={"username": "analyst", "password": "nope"})
    assert r.status_code == 401


def test_security_headers_present(client):
    r = client.get("/api/health")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert "frame-ancestors 'none'" in r.headers["Content-Security-Policy"]


def test_query_rejects_writes_before_db(client, monkeypatch):
    login(client)
    r = client.post("/api/query", json={"sql": "delete from t"})
    assert r.status_code == 400


def test_query_applies_row_limit(client, monkeypatch):
    login(client)
    monkeypatch.setattr(db, "run_select", lambda *a, **k: (["A"], [(1,), (2,), (3,)]))
    r = client.post("/api/query", json={"sql": "select a from t"})
    body = r.json()
    assert r.status_code == 200
    assert body["rows"] == [[1], [2]]
    assert body["row_limit_reached"] is True


def test_grey_issuance_summary_matches_rows(client, monkeypatch):
    login(client)
    cols = ["CNTRCT_NO", "MNGR", "P_VALUE", "I_VALUE"]
    data = [("KTM-1", "A", 100, 70), ("KTM-2", "B", 50, None)]
    monkeypatch.setattr(db, "run_select", lambda *a, **k: (cols, data))
    r = client.get("/api/costing/grey-issuance")
    body = r.json()
    assert r.status_code == 200
    assert body["summary"]["po_count"] == 2
    assert body["summary"]["unknown"] == 1
    assert body["summary"]["saving_pkr"] == "30"
