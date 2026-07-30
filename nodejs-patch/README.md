# Node.js Server Auth Patch

Adds login + user-management endpoints to your `light_client_voice_assistant` Node.js server so the Jerry mobile app can authenticate against it.

## 1. Install new dependencies

From your project root:

```bash
npm install bcryptjs jsonwebtoken
npm install --save-dev @types/bcryptjs @types/jsonwebtoken
```

## 2. Drop in the `auth.ts` file

Copy `auth.ts` (in this folder) into your project alongside `server.ts`.

## 3. Wire it up in `server.ts`

Add near the top of `server.ts`:

```ts
import { registerAuthRoutes, requireAuth, requireAdmin, canControlDevice } from "./auth";
```

Then, **after** `app.use(express.json());`, add:

```ts
registerAuthRoutes(app);
```

That's it — login and user endpoints are live.

## 4. (Recommended) Protect existing endpoints

Update your existing routes to require auth. Example patches:

### Read endpoints — `requireAuth`
```ts
// GET /api/devices
app.get("/api/devices", requireAuth, (req, res) => {
  res.json(devices);
});

// GET /api/shopping-list
app.get("/api/shopping-list", requireAuth, (req, res) => {
  res.json(shoppingList);
});
```

### Device control — check per-user device permissions
```ts
app.post("/api/devices/control", requireAuth, (req: any, res) => {
  const { room, device, action, value } = req.body;
  if (!room || !action) return res.status(400).json({ error: "Missing room or action" });

  // Enforce per-user device permission (admin bypasses)
  if (device) {
    const deviceId = `${room}.${device}`;
    if (!canControlDevice(req.user, deviceId)) {
      return res.status(403).json({ error: "Not allowed for this device" });
    }
  } else if (req.user.role !== "admin") {
    // room_on / room_off requires admin
    return res.status(403).json({ error: "Room-wide actions are admin-only" });
  }

  applyBackendControl(room, device, action, value);
  const updatedDev = devices.find(d =>
    d.room.toLowerCase() === room.toLowerCase() &&
    (!device || d.deviceKey.toLowerCase() === device.toLowerCase())
  );
  res.json({ success: true, device: updatedDev || null });
});
```

### Shopping mutations — `requireAuth`
```ts
app.post("/api/shopping-list",       requireAuth, (req, res) => { /* ...existing code... */ });
app.post("/api/shopping-list/add",   requireAuth, (req, res) => { /* ...existing code... */ });
```

### Voice endpoints — `requireAdmin`
```ts
app.post("/api/parse-command", requireAdmin, ...);
app.post("/api/parse-audio",   requireAdmin, ...);
app.post("/api/tts",           requireAdmin, ...);
app.get ("/api/audio/:id",     requireAdmin, ...);
```

## 5. CORS (so the APK can reach your server)

If not already configured, ensure your Express app allows cross-origin requests from the Android app. Add at the top of `server.ts`:

```ts
import cors from "cors";
app.use(cors({ origin: "*" }));
```

Install: `npm install cors && npm install --save-dev @types/cors`

## 6. Optional: JWT secret via env var

Create `.env` (or extend existing) with:

```
JWT_SECRET=some-long-random-string-here
```

`auth.ts` picks this up automatically via `process.env.JWT_SECRET`.

## 7. Run

```bash
npm run dev
```

On first launch you'll see:

```
[auth] Seeded admin user (admin / admin0466)
```

A file `users.json` will appear in your project root — this is where users are persisted (safe to back up, safe to delete to reset).

## 8. Test with curl

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin0466"}'

# Use the token
TOKEN=eyJhbGci...
curl http://localhost:3000/api/auth/me -H "Authorization: Bearer $TOKEN"
curl http://localhost:3000/api/users     -H "Authorization: Bearer $TOKEN"
```

## Summary of new endpoints

| Method | Path                    | Access  |
|--------|-------------------------|---------|
| POST   | `/api/auth/login`       | public  |
| GET    | `/api/auth/me`          | any user |
| POST   | `/api/auth/logout`      | public  |
| GET    | `/api/users`            | admin   |
| POST   | `/api/users`            | admin   |
| PATCH  | `/api/users/:id`        | admin   |
| DELETE | `/api/users/:id`        | admin   |

The Jerry mobile app expects exactly these paths + response shapes.
