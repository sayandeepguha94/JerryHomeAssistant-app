# Implementation Plan: Fix All (Backend Removal & Deployment Cleanup)

This plan ensures the project is 100% clean and ready for deployment without any Python backend dependencies or Docker build errors.

## Proposed Changes

### Docker & Infrastructure

#### [MODIFY] [frontend/Dockerfile](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/Dockerfile)
- Explicitly set `RUN npm run build` (fixing the `npm run dev` error seen on the server).
- Ensure it uses the correct Nginx configuration.

#### [MODIFY] [_original_node_ref/Dockerfile](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/_original_node_ref/Dockerfile)
- Use `node server.ts` or similar via `tsx` (already present but will ensure consistency).

#### [MODIFY] [docker-compose.yml](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/docker-compose.yml)
- Double-check service definitions for accuracy.

### Frontend Configuration

#### [MODIFY] [frontend/.env](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/.env)
- Remove `REACT_APP_PYTHON_BACKEND_URL`.
- Comment out or remove `REACT_APP_SERVER_URL` to allow dynamic host discovery.

#### [MODIFY] [frontend/src/lib/api.js](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/lib/api.js)
- Ensure it's robust against missing configuration by defaulting to the current origin.

---

## Verification Plan

### Automated Tests
- None (deployment focus).

### Manual Verification
1. **Docker Build**: The user should run `sudo docker compose up -d --build` on the server.
2. **Dashboard**: Verify devices are loaded from the Node server.
3. **Voice**: Verify voice commands work via the Node server.
