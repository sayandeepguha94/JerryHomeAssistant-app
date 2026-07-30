# Implementation Plan: Remove Backend Dependency

This plan outlines the steps to remove the Python backend and MongoDB dependency, allowing the frontend to communicate directly with the Node.js server (the "frontend server address").

## User Review Required

> [!IMPORTANT]
> **Authentication Removal**: Since the Node.js server does not have an authentication layer, the login screen will be removed, and the app will operate in a "public" mode where anyone with access to the UI can control devices. A mock "admin" user will be used internally to maintain compatibility with existing components.

> [!WARNING]
> **Data Loss**: The MongoDB database will be removed. Any persistent user accounts, custom room permissions, or backend-stored settings will be lost. The app will rely solely on the Node.js server's in-memory state and the browser's `localStorage`.

## Proposed Changes

### Core Logic & API

#### [MODIFY] [lib/api.js](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/lib/api.js)
- Remove `pythonApi` and `getPythonBackendUrl`.
- Simplify the `api` instance to focus solely on the Node.js server.
- Update `pingServer` and other utilities to only interact with the Node server.

#### [MODIFY] [lib/auth.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/lib/auth.jsx)
- Replace actual authentication logic with a mock admin user.
- Remove all `api` calls related to `/auth/login` and `/auth/me`.

### Navigation & Routing

#### [MODIFY] [App.js](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/App.js)
- Remove the `/login` and `/users` routes.
- Simplify the `Protected` wrapper to only ensure a server URL is configured.
- Update redirects to point to the Dashboard (`/`) instead of Login.

### Feature Pages

#### [MODIFY] [pages/Dashboard.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/pages/Dashboard.jsx)
- Remove all `pythonApi` calls.
- Simplify device loading and control to use the Node server exclusively.
- Remove redundant state merging logic.

#### [MODIFY] [pages/Voice.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/pages/Voice.jsx)
- Remove the `/proxy` call to the Python backend.
- Update the voice processing loop to call Node's `/api/parse-command` or use the result of `/api/parse-audio` directly.

#### [MODIFY] [pages/Shopping.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/pages/Shopping.jsx)
- Remove calls to `/shopping-suggestions` as this endpoint was backend-dependent.

#### [MODIFY] [pages/ServerSetup.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/pages/ServerSetup.jsx)
- Redirect to the Dashboard (`/`) after successful server configuration.

### Infrastructure

#### [MODIFY] [docker-compose.yml](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/docker-compose.yml)
- Delete the `python-backend` and `mongodb` service definitions.
- Remove volumes and networks specific to the backend.

#### [DELETE] [backend/](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/backend)
- Remove the entire Python backend source code.

#### [MODIFY] [frontend/nginx.conf](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/nginx.conf)
- Remove the `/api/` location block that proxied to the Python backend.

---

## Verification Plan

### Manual Verification
1. **Server Setup**: Open the app, configure the Node server URL, and ensure it redirects to the Dashboard.
2. **Device Control**: Toggle devices on the Dashboard and verify the Node server logs/state change.
3. **Voice Control**: Send a voice command and verify that the Node server parses it and returns a response/audio.
4. **Shopping List**: Add items to the shopping list and verify persistence on the Node server.
5. **Deployment**: Run `docker-compose up` and verify only the frontend and node-server containers are started.
