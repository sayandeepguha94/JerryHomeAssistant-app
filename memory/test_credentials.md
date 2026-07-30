# Test Credentials — Jerry Voice Home PWA

## Admin (full access)
- **Username:** `admin`
- **Password:** `admin0466`
- **Role:** admin
- Access: all pages (dashboard, voice, shopping, settings, users) + all devices

## Regular users
Created via the Users page (admin only). Sample flow:
- Admin creates user with username `guest`, password `1234`
- Assign allowed_pages: `["dashboard"]`
- Assign allowed_devices: subset from `/api/device-catalog`

## Auth Endpoints
- `POST /api/auth/login` — body: `{"username","password"}` → `{token, user}`
- `GET  /api/auth/me` — header: `Authorization: Bearer <token>`
- `POST /api/auth/logout`

## Proxy Endpoints (require auth)
- `GET  /api/proxy/status` — check node server reachability
- `GET  /api/proxy/devices` — list devices (filtered by permissions)
- `POST /api/proxy/devices/control` — control device
- `GET  /api/proxy/shopping-list` / `POST /api/proxy/shopping-list` / `POST /api/proxy/shopping-list/add`
- `POST /api/proxy/parse-command`
- `POST /api/proxy/parse-audio` (multipart)
- `POST /api/proxy/tts`
- `GET  /api/proxy/audio/{id}`

## Admin-only
- `GET/POST /api/users`, `PATCH/DELETE /api/users/{id}`
- `PUT /api/settings` (server URL)
- `GET /api/device-catalog`

## Notes
- **Node server URL:** stored in `app_settings` (global). Default `http://127.0.0.1:3000`. Admin sets the real value in Settings.
- Regular users can view but cannot edit the server URL.
