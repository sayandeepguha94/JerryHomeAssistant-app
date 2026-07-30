"""FastAPI backend: JWT auth + role-based access + proxy to user's Node.js voice-assistant server."""
from dotenv import load_dotenv
load_dotenv()

import os
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import bcrypt
import jwt
import httpx
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Request, Response, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response as FastResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

# --- Config ---
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin0466")
DEFAULT_NODE_URL = os.environ.get("DEFAULT_NODE_SERVER_URL", "http://127.0.0.1:3000")
JWT_ALGO = "HS256"
ACCESS_TOKEN_TTL_MIN = 60 * 24 * 7  # 7 days

# --- App ---
app = FastAPI(title="Voice Home Client Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# --- Helpers ---
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(user_id: str, username: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_TTL_MIN),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def user_to_public(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "username": u["username"],
        "name": u.get("name", u["username"]),
        "role": u["role"],
        "allowed_pages": u.get("allowed_pages", []),
        "allowed_devices": u.get("allowed_devices", []),
        "created_at": u.get("created_at").isoformat() if u.get("created_at") else None,
    }

async def get_current_user(request: Request) -> dict:
    token = None
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def get_node_server_url() -> str:
    doc = await db.app_settings.find_one({"_id": "global"})
    if doc and doc.get("server_url"):
        return doc["server_url"].rstrip("/")
    return DEFAULT_NODE_URL.rstrip("/")

def check_page_allowed(user: dict, page: str):
    if user.get("role") == "admin":
        return
    if page not in (user.get("allowed_pages") or []):
        raise HTTPException(status_code=403, detail=f"You don't have access to '{page}'")

def check_device_allowed(user: dict, device_id: str):
    if user.get("role") == "admin":
        return
    if device_id not in (user.get("allowed_devices") or []):
        raise HTTPException(status_code=403, detail=f"You don't have access to this device")

# --- Startup: seed admin + indexes ---
@app.on_event("startup")
async def startup():
    await db.users.create_index("username", unique=True)
    existing_admin = await db.users.find_one({"username": ADMIN_USERNAME})
    if existing_admin is None:
        await db.users.insert_one({
            "username": ADMIN_USERNAME,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Administrator",
            "role": "admin",
            "allowed_pages": ["dashboard", "voice", "shopping", "settings", "users"],
            "allowed_devices": [],
            "created_at": datetime.now(timezone.utc),
        })
    elif not verify_password(ADMIN_PASSWORD, existing_admin["password_hash"]):
        await db.users.update_one(
            {"_id": existing_admin["_id"]},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}},
        )
    # Global settings default
    if not await db.app_settings.find_one({"_id": "global"}):
        await db.app_settings.insert_one({"_id": "global", "server_url": DEFAULT_NODE_URL})

# ============================================================
#                      AUTH ENDPOINTS
# ============================================================
class LoginBody(BaseModel):
    username: str
    password: str

@app.post("/api/auth/login")
async def login(body: LoginBody):
    user = await db.users.find_one({"username": body.username.strip().lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token(str(user["_id"]), user["username"], user["role"])
    return {"token": token, "user": user_to_public(user)}

@app.get("/api/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user_to_public(user)

@app.post("/api/auth/logout")
async def logout():
    return {"ok": True}

# ============================================================
#                   USER MANAGEMENT (admin)
# ============================================================
class UserCreateBody(BaseModel):
    username: str
    password: str
    name: Optional[str] = None
    allowed_pages: List[str] = Field(default_factory=lambda: ["dashboard"])
    allowed_devices: List[str] = Field(default_factory=list)

class UserUpdateBody(BaseModel):
    password: Optional[str] = None
    name: Optional[str] = None
    allowed_pages: Optional[List[str]] = None
    allowed_devices: Optional[List[str]] = None

@app.get("/api/users")
async def list_users(_: dict = Depends(require_admin)):
    users = await db.users.find({}).sort("created_at", -1).to_list(500)
    return [user_to_public(u) for u in users]

@app.post("/api/users")
async def create_user(body: UserCreateBody, _: dict = Depends(require_admin)):
    uname = body.username.strip().lower()
    if not uname or len(body.password) < 4:
        raise HTTPException(status_code=400, detail="Invalid username/password")
    if await db.users.find_one({"username": uname}):
        raise HTTPException(status_code=409, detail="Username already exists")
    doc = {
        "username": uname,
        "password_hash": hash_password(body.password),
        "name": body.name or body.username,
        "role": "user",
        "allowed_pages": body.allowed_pages,
        "allowed_devices": body.allowed_devices,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return user_to_public(doc)

@app.patch("/api/users/{user_id}")
async def update_user(user_id: str, body: UserUpdateBody, _: dict = Depends(require_admin)):
    update = {}
    if body.password:
        update["password_hash"] = hash_password(body.password)
    if body.name is not None:
        update["name"] = body.name
    if body.allowed_pages is not None:
        update["allowed_pages"] = body.allowed_pages
    if body.allowed_devices is not None:
        update["allowed_devices"] = body.allowed_devices
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = await db.users.find_one_and_update(
        {"_id": ObjectId(user_id)}, {"$set": update}, return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return user_to_public(result)

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    target = await db.users.find_one({"_id": ObjectId(user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete the admin user")
    await db.users.delete_one({"_id": ObjectId(user_id)})
    return {"ok": True}

# ============================================================
#                      APP SETTINGS
# ============================================================
class SettingsBody(BaseModel):
    server_url: str

@app.get("/api/settings")
async def get_settings(user: dict = Depends(get_current_user)):
    doc = await db.app_settings.find_one({"_id": "global"}) or {}
    return {"server_url": doc.get("server_url", DEFAULT_NODE_URL)}

@app.put("/api/settings")
async def update_settings(body: SettingsBody, _: dict = Depends(require_admin)):
    url = body.server_url.strip()
    if not url.startswith("http"):
        url = "http://" + url
    await db.app_settings.update_one(
        {"_id": "global"}, {"$set": {"server_url": url}}, upsert=True
    )
    return {"server_url": url}

# ============================================================
#              NODE.JS SERVER PROXY (permission-gated)
# ============================================================

async def _forward(method: str, path: str, **kwargs) -> httpx.Response:
    base = await get_node_server_url()
    url = f"{base}{path}"
    async with httpx.AsyncClient(timeout=30.0) as hc:
        return await hc.request(method, url, **kwargs)

@app.get("/api/proxy/status")
async def proxy_status(_: dict = Depends(get_current_user)):
    """Ping the configured node server."""
    base = await get_node_server_url()
    try:
        async with httpx.AsyncClient(timeout=5.0) as hc:
            r = await hc.get(f"{base}/api/devices")
        return {"online": r.status_code < 500, "status": r.status_code, "server_url": base}
    except Exception as e:
        return {"online": False, "status": 0, "server_url": base, "error": str(e)}

@app.get("/api/proxy/devices")
async def proxy_devices(user: dict = Depends(get_current_user)):
    check_page_allowed(user, "dashboard")
    node_devices = None
    try:
        r = await _forward("GET", "/api/devices")
        if r.status_code == 200:
            try:
                data = r.json()
                if isinstance(data, list):
                    node_devices = data
            except Exception:
                node_devices = None
    except Exception:
        node_devices = None

    if user.get("role") == "admin":
        # Admin ALWAYS sees the full catalog grouped by room.
        # Merge in live state from the node server if reachable.
        by_id = {d.get("id"): d for d in (node_devices or []) if isinstance(d, dict)}
        merged = []
        for base in STATIC_DEVICE_CATALOG:
            live = by_id.get(base["id"])
            if live:
                merged.append(live)
            else:
                device_key = base["id"].split(".", 1)[1] if "." in base["id"] else base["id"]
                merged.append({
                    **base,
                    "deviceKey": device_key,
                    "entityId": "",
                    "on": False,
                    "statusText": "Off",
                })
        return merged

    # Non-admin: only devices in allowed_devices, and only if node server returned them.
    allowed = set(user.get("allowed_devices") or [])
    return [d for d in (node_devices or []) if d.get("id") in allowed]

class DeviceControlBody(BaseModel):
    room: str
    device: Optional[str] = None
    action: str
    value: Optional[int] = None

@app.post("/api/proxy/devices/control")
async def proxy_device_control(body: DeviceControlBody, user: dict = Depends(get_current_user)):
    check_page_allowed(user, "dashboard")
    device_id = f"{body.room}.{body.device}" if body.device else None
    if device_id:
        check_device_allowed(user, device_id)
    elif user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can do room-wide actions")
    try:
        r = await _forward("POST", "/api/devices/control", json=body.model_dump())
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Node server unreachable: {e}")
    if r.status_code >= 400:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    return r.json()

@app.get("/api/proxy/shopping-list")
async def proxy_shopping_get(user: dict = Depends(get_current_user)):
    check_page_allowed(user, "shopping")
    try:
        r = await _forward("GET", "/api/shopping-list")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Node server unreachable: {e}")
    return r.json()

class ShoppingAddBody(BaseModel):
    text: str

@app.post("/api/proxy/shopping-list/add")
async def proxy_shopping_add(body: ShoppingAddBody, user: dict = Depends(get_current_user)):
    check_page_allowed(user, "shopping")
    try:
        r = await _forward("POST", "/api/shopping-list/add", json=body.model_dump())
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Node server unreachable: {e}")
    if r.status_code >= 400:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    return r.json()

class ShoppingSyncBody(BaseModel):
    items: List[dict]

@app.post("/api/proxy/shopping-list")
async def proxy_shopping_sync(body: ShoppingSyncBody, user: dict = Depends(get_current_user)):
    check_page_allowed(user, "shopping")
    try:
        r = await _forward("POST", "/api/shopping-list", json=body.model_dump())
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Node server unreachable: {e}")
    return r.json()

class ParseCommandBody(BaseModel):
    text: str

@app.post("/api/proxy/parse-command")
async def proxy_parse_command(body: ParseCommandBody, _: dict = Depends(require_admin)):
    try:
        r = await _forward("POST", "/api/parse-command", json=body.model_dump())
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Node server unreachable: {e}")
    if r.status_code >= 400:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    return r.json()

@app.post("/api/proxy/parse-audio")
async def proxy_parse_audio(audio: UploadFile = File(...), _: dict = Depends(require_admin)):
    content = await audio.read()
    files = {"audio": (audio.filename or "recording.webm", content, audio.content_type or "audio/webm")}
    try:
        r = await _forward("POST", "/api/parse-audio", files=files)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Node server unreachable: {e}")
    if r.status_code >= 400:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    return r.json()

class TTSBody(BaseModel):
    text: str

@app.post("/api/proxy/tts")
async def proxy_tts(body: TTSBody, _: dict = Depends(require_admin)):
    try:
        r = await _forward("POST", "/api/tts", json=body.model_dump())
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Node server unreachable: {e}")
    if r.status_code >= 400:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    return r.json()

@app.get("/api/proxy/audio/{audio_id}")
async def proxy_audio(audio_id: str, _: dict = Depends(require_admin)):
    try:
        r = await _forward("GET", f"/api/audio/{audio_id}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Node server unreachable: {e}")
    if r.status_code >= 400:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    return FastResponse(
        content=r.content,
        media_type=r.headers.get("content-type", "audio/wav"),
    )

# ============================================================
#                    STATIC DEVICE CATALOG
# (mirrors the Node server's default devices so admin can pick
#  device IDs to assign when creating a user, even offline)
# ============================================================
STATIC_DEVICE_CATALOG = [
    {"id": "living room.ambient light", "name": "Ambient Light", "room": "living room", "category": "lighting"},
    {"id": "living room.party light", "name": "Party Light", "room": "living room", "category": "lighting"},
    {"id": "living room.passage light", "name": "Passage Light", "room": "living room", "category": "lighting"},
    {"id": "living room.spot light", "name": "Spot Light", "room": "living room", "category": "lighting"},
    {"id": "living room.fan", "name": "Ceiling Fan", "room": "living room", "category": "fan"},
    {"id": "living room.ac", "name": "Air Conditioner", "room": "living room", "category": "ac"},
    {"id": "living room.tv", "name": "Television", "room": "living room", "category": "media"},
    {"id": "dine-in.ambient light", "name": "Ambient Light", "room": "dine-in", "category": "lighting"},
    {"id": "dine-in.spot light", "name": "Spot Light", "room": "dine-in", "category": "lighting"},
    {"id": "dine-in.low spot light", "name": "Low Spot Light", "room": "dine-in", "category": "lighting"},
    {"id": "dine-in.fan", "name": "Fan Switch", "room": "dine-in", "category": "fan"},
    {"id": "bedroom.ambient light", "name": "Ambient Light", "room": "bedroom", "category": "lighting"},
    {"id": "bedroom.bedside light", "name": "Bedside Light", "room": "bedroom", "category": "lighting"},
    {"id": "bedroom.fan", "name": "Fan Switch", "room": "bedroom", "category": "fan"},
    {"id": "bedroom.spot light", "name": "Spot Light", "room": "bedroom", "category": "lighting"},
    {"id": "bedroom 2.low ambient light", "name": "Low Ambient Light", "room": "bedroom 2", "category": "lighting"},
    {"id": "bedroom 2.fan", "name": "Fan Switch", "room": "bedroom 2", "category": "fan"},
    {"id": "bedroom 2.spot light", "name": "Spot Light", "room": "bedroom 2", "category": "lighting"},
    {"id": "bedroom 2.high ambient light", "name": "High Ambient Light", "room": "bedroom 2", "category": "lighting"},
]

@app.get("/api/device-catalog")
async def device_catalog(_: dict = Depends(require_admin)):
    """Return the live device list from the Node.js server if reachable,
    otherwise fall back to the built-in static catalog. This lets admins
    see any devices they add to their server.ts automatically."""
    try:
        r = await _forward("GET", "/api/devices")
        if r.status_code == 200:
            data = r.json()
            if isinstance(data, list) and len(data) > 0:
                # Reduce to catalog shape (id, name, room, category)
                return [
                    {
                        "id": d.get("id"),
                        "name": d.get("name"),
                        "room": d.get("room"),
                        "category": d.get("category"),
                    }
                    for d in data
                    if d.get("id")
                ]
    except Exception:
        pass
    return STATIC_DEVICE_CATALOG

# ============================================================
@app.get("/api/health")
async def health():
    return {"status": "ok"}
