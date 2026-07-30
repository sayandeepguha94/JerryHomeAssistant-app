# Implementation Plan: Reliability Pass (Line by Line Fix)

Fix the "black screen" and "sync inconsistencies" by making the application IP-agnostic and ensuring the static assets are served reliably from the Docker container.

## Proposed Changes

### Backend (`_original_node_ref/server.ts`)

#### [MODIFY] [server.ts](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/_original_node_ref/server.ts)
- **Robust Static Serving**: Use `path.resolve(__dirname)` for all static file operations. This is the most reliable way when running a bundled Node script in Docker.
- **Diagnostic Endpoint**: Add `GET /api/health` to verify that the container is reachable and responding.
- **Request Logging**: Log every incoming API request with its method and status code to ensure we have visibility in the terminal.

### Frontend (`frontend/src/`)

#### [MODIFY] [lib/api.js](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/lib/api.js)
- **IP-Agnostic Defaults**: Refactor the URL detection. If the saved server URL is empty or invalid (like `0.0.0.0`), strictly default to `window.location.origin`.
- **Automatic Fallback**: If the app is being served by the Node server, it should use relative paths (`/api`) by default to avoid CORS and caching issues.

#### [MODIFY] [App.js](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/App.js)
- **State Logging**: Add console logs during the initialization phase to see exactly where the boot process is hanging (if at all).

---

## Verification Plan

### Manual Verification
1. **Build**: `sudo docker compose up -d --build`.
2. **Health Check**: Visit `http://localhost:3000/api/health`. It should return "OK".
3. **Login**: Verify you can log in and reach the Dashboard.
4. **Console Check**: Open browser console and verify "React mounting..." and "AppShell render" logs appear.
5. **Sync Test**: Toggle a device and verify the terminal logs show the `[API] POST /api/devices/control` request.
