# Implementation Plan: Direct Dual-Server Routing

Refactor the frontend architecture to talk directly to two separate backend servers: a Python Hub for device controls and a Node Server for data persistence (Household runs, users).

## User Review Required

> [!IMPORTANT]
> **No More Proxying**: Device commands will now go directly from your browser to the Python Hub (`.112`).
>
> **Endpoint Paths**:
> - **Python Hub**: All requests will hit the root (`/`) as expected by `bridge.py`.
> - **Node Server**: All requests will use the `/api` prefix (e.g., `/api/shopping-list`).

## Proposed Changes

### Frontend Core (`src/lib/api.js`)

#### [MODIFY] [api.js](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/lib/api.js)
- **Two Separate API Clients**:
  - `pythonApi`: Targets the Python backend on port 8000. No `/api` prefix.
  - `nodeApi` (aliased as `api`): Targets the Node backend on port 3000. Uses `/api` prefix.
- **Removed Failover**: Delete the auto-failover logic between URLs.

### Frontend Pages

#### [MODIFY] [Settings.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/pages/Settings.jsx)
- **Renamed Fields**:
  - "Dashboard Server (Python)" -> Targets the physical hardware hub.
  - "Dashboard Server (Node)" -> Targets the data persistence server.
- **Removed IoT Hub Field**: Consolidating into the two main server fields.

#### [MODIFY] [Dashboard.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/pages/Dashboard.jsx)
- Update to use `pythonApi`.
- Change all `get("/devices")` to `get("/")`.
- Change `post("/devices/control")` to `post("/")`.

#### [MODIFY] [Shopping.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/pages/Shopping.jsx)
- Ensure it continues to use the Node-based API for persistence.

## Verification Plan

### Manual Verification
1.  **Configure Settings**:
    - Dashboard Server (Python): `http://192.168.29.112:8000`
    - Dashboard Server (Node): `http://192.168.29.179:3000`
2.  **Verify Device Control**: Toggle a light on the dashboard and verify the Python hub logs show a `POST /` request.
3.  **Verify Status Polling**: Check Python hub logs for `GET /` requests every 4 seconds.
4.  **Verify Shopping List**: Add an item to Household runs and verify the Node server logs show a `POST /api/shopping-list` request.
