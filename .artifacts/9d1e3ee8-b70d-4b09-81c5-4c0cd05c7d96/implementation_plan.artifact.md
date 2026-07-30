# Implementation Plan: Single Container Consolidation & Authentication

Merge the `frontend/` dashboard and Node backend into a single Docker container and implement a mandatory login screen.

## User Review Required

> [!IMPORTANT]
> **Consolidated Frontend**: I am using the `frontend/` directory as the source for the UI, as it contains the more comprehensive dashboard. The smaller UI inside `_original_node_ref/src` will be ignored in the final build.

> [!NOTE]
> **Login Redirect**: The app will now land on the Login page by default if no active session is found in `localStorage`.

## Proposed Changes

### Docker & Infrastructure

#### [MODIFY] [docker-compose.yml](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/docker-compose.yml)
- Delete the `frontend` service.
- Update `node-server` to map port `3001:3000`.

#### [MODIFY] [_original_node_ref/Dockerfile](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/_original_node_ref/Dockerfile)
- Convert to a multi-stage build:
  - Stage 1: Build `frontend/` using `node:20-slim`.
  - Stage 2: Build `_original_node_ref/` and copy the `build/` folder from Stage 1 into a `dist/` directory.

### Backend (`_original_node_ref/server.ts`)

#### [MODIFY] [server.ts](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/_original_node_ref/server.ts)
- [NEW] Add `POST /api/login` endpoint for `admin` / `admin0466`.
- Ensure static serving points to the `dist` folder (containing the frontend build).
- Add basic error handling for the login route.

### Frontend (`frontend/src/`)

#### [MODIFY] [App.js](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/App.js)
- Update `Protected` component to check for `user` from `useAuth`.
- Add `<Route path="/login" element={<Login />} />`.
- Auto-redirect to `/login` if `user` is null.

#### [MODIFY] [lib/auth.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/lib/auth.jsx)
- Update `login` to perform a real `POST /api/login`.
- Store user info in `localStorage` for persistence.
- Initialize `user` state from `localStorage`.

#### [MODIFY] [lib/api.js](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/lib/api.js)
- Ensure the `api` instance uses a relative URL (e.g., `/api`) or the current host by default, as everything is now on the same origin.

---

## Verification Plan

### Manual Verification
1. **Build**: Run `docker compose up --build`.
2. **Access**: Open `http://localhost:3001`.
3. **Flow**:
   - Verify landing on Login page.
   - Login with `admin` / `admin0466`.
   - Verify Dashboard loads and devices are visible.
   - Verify commands still work.
