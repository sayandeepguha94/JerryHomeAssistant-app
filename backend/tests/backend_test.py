"""Backend tests for Voice Home Client Backend."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://3cfeb970-15d2-4881-a88c-a26f130d1e55.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_USER = "admin"
ADMIN_PASS = "admin0466"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def created_user(admin_headers):
    """Create a temp user for tests that need one, cleanup after."""
    uname = f"test_{uuid.uuid4().hex[:8]}"
    body = {
        "username": uname,
        "password": "pass1234",
        "name": "Test User",
        "allowed_pages": ["dashboard"],
        "allowed_devices": ["living room.ambient light"],
    }
    r = requests.post(f"{API}/users", json=body, headers=admin_headers, timeout=10)
    assert r.status_code == 200, f"create failed: {r.status_code} {r.text}"
    user = r.json()
    yield {"user": user, "password": "pass1234", "username": uname}
    # cleanup
    requests.delete(f"{API}/users/{user['id']}", headers=admin_headers, timeout=10)


# ---------- Auth ----------
class TestAuth:
    def test_admin_login_success(self):
        r = requests.post(f"{API}/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 20
        u = data["user"]
        assert u["username"] == "admin"
        assert u["role"] == "admin"
        assert "password_hash" not in u
        for p in ["dashboard", "voice", "shopping", "settings", "users"]:
            assert p in u["allowed_pages"], f"missing allowed page: {p}"

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"username": ADMIN_USER, "password": "wrong"}, timeout=10)
        assert r.status_code == 401

    def test_login_unknown_user(self):
        r = requests.post(f"{API}/auth/login", json={"username": "nobody_xx", "password": "x"}, timeout=10)
        assert r.status_code == 401

    def test_me_with_token(self, admin_headers):
        r = requests.get(f"{API}/auth/me", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        u = r.json()
        assert u["username"] == "admin"
        assert u["role"] == "admin"
        assert "password_hash" not in u

    def test_me_without_token(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401

    def test_me_with_invalid_token(self):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer garbage.token.here"}, timeout=10)
        assert r.status_code == 401


# ---------- Settings ----------
class TestSettings:
    def test_get_settings_default(self, admin_headers):
        r = requests.get(f"{API}/settings", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        assert "server_url" in r.json()

    def test_get_settings_unauthorized(self):
        r = requests.get(f"{API}/settings", timeout=10)
        assert r.status_code == 401

    def test_put_settings_admin_normalizes_http(self, admin_headers):
        # missing http:// prefix
        r = requests.put(f"{API}/settings", json={"server_url": "192.168.1.100:3000"}, headers=admin_headers, timeout=10)
        assert r.status_code == 200
        assert r.json()["server_url"].startswith("http://")
        # verify persistence
        g = requests.get(f"{API}/settings", headers=admin_headers, timeout=10)
        assert g.json()["server_url"] == "http://192.168.1.100:3000"

        # restore default
        requests.put(f"{API}/settings", json={"server_url": "http://127.0.0.1:3000"}, headers=admin_headers, timeout=10)


# ---------- Device Catalog ----------
class TestDeviceCatalog:
    def test_catalog_admin_returns_19(self, admin_headers):
        r = requests.get(f"{API}/device-catalog", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 19
        # spot check structure
        first = data[0]
        for k in ("id", "name", "room", "category"):
            assert k in first

    def test_catalog_no_auth(self):
        r = requests.get(f"{API}/device-catalog", timeout=10)
        assert r.status_code == 401


# ---------- User CRUD ----------
class TestUserCRUD:
    def test_list_users_admin(self, admin_headers):
        r = requests.get(f"{API}/users", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        users = r.json()
        assert any(u["username"] == "admin" for u in users)

    def test_create_get_update_delete(self, admin_headers):
        uname = f"test_{uuid.uuid4().hex[:8]}"
        body = {
            "username": uname,
            "password": "pass1234",
            "name": "Foo Bar",
            "allowed_pages": ["dashboard", "shopping"],
            "allowed_devices": ["living room.ambient light"],
        }
        c = requests.post(f"{API}/users", json=body, headers=admin_headers, timeout=10)
        assert c.status_code == 200, c.text
        created = c.json()
        assert created["username"] == uname
        assert created["role"] == "user"
        assert created["allowed_pages"] == ["dashboard", "shopping"]
        uid = created["id"]

        # verify list
        lst = requests.get(f"{API}/users", headers=admin_headers, timeout=10).json()
        assert any(u["id"] == uid for u in lst)

        # PATCH
        p = requests.patch(f"{API}/users/{uid}", json={"name": "Renamed", "allowed_pages": ["dashboard"]}, headers=admin_headers, timeout=10)
        assert p.status_code == 200
        assert p.json()["name"] == "Renamed"
        assert p.json()["allowed_pages"] == ["dashboard"]

        # DELETE
        d = requests.delete(f"{API}/users/{uid}", headers=admin_headers, timeout=10)
        assert d.status_code == 200
        # confirm gone
        lst2 = requests.get(f"{API}/users", headers=admin_headers, timeout=10).json()
        assert not any(u["id"] == uid for u in lst2)

    def test_duplicate_username_returns_409(self, admin_headers, created_user):
        uname = created_user["username"]
        r = requests.post(f"{API}/users", json={"username": uname, "password": "abcd"}, headers=admin_headers, timeout=10)
        assert r.status_code == 409

    def test_cannot_delete_admin(self, admin_headers):
        users = requests.get(f"{API}/users", headers=admin_headers, timeout=10).json()
        admin = next(u for u in users if u["username"] == "admin")
        r = requests.delete(f"{API}/users/{admin['id']}", headers=admin_headers, timeout=10)
        assert r.status_code == 400


# ---------- RBAC (non-admin) ----------
class TestRBAC:
    @pytest.fixture
    def user_token(self, created_user):
        r = requests.post(f"{API}/auth/login", json={"username": created_user["username"], "password": created_user["password"]}, timeout=10)
        assert r.status_code == 200
        return r.json()["token"]

    @pytest.fixture
    def user_headers(self, user_token):
        return {"Authorization": f"Bearer {user_token}"}

    def test_user_cannot_list_users(self, user_headers):
        r = requests.get(f"{API}/users", headers=user_headers, timeout=10)
        assert r.status_code == 403

    def test_user_cannot_create_users(self, user_headers):
        r = requests.post(f"{API}/users", json={"username": "x", "password": "yyyy"}, headers=user_headers, timeout=10)
        assert r.status_code == 403

    def test_user_cannot_put_settings(self, user_headers):
        r = requests.put(f"{API}/settings", json={"server_url": "http://x"}, headers=user_headers, timeout=10)
        assert r.status_code == 403

    def test_user_cannot_access_device_catalog(self, user_headers):
        r = requests.get(f"{API}/device-catalog", headers=user_headers, timeout=10)
        assert r.status_code == 403

    def test_user_me_works(self, user_headers, created_user):
        r = requests.get(f"{API}/auth/me", headers=user_headers, timeout=10)
        assert r.status_code == 200
        u = r.json()
        assert u["role"] == "user"
        assert u["username"] == created_user["username"]


# ---------- Proxy ----------
class TestProxy:
    def test_proxy_status_shape(self, admin_headers):
        r = requests.get(f"{API}/proxy/status", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        for key in ("online", "status", "server_url"):
            assert key in data, f"missing key {key} in {data}"
        assert isinstance(data["online"], bool)

    def test_proxy_status_no_auth(self):
        r = requests.get(f"{API}/proxy/status", timeout=10)
        assert r.status_code == 401
