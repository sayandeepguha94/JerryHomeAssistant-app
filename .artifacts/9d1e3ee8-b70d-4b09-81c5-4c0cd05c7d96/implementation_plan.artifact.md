# Implementation Plan: Fix Connection Refused & Finalize Auth

The goal is to resolve the `ERR_CONNECTION_REFUSED` error by fixing missing dependencies in the backend and ensuring the authentication logic is robust.

## User Review Required

> [!IMPORTANT]
> **Rebuild Required**: I have identified that critical libraries (`bcryptjs`, `jsonwebtoken`) were missing from the backend configuration. You **must** perform a clean rebuild to apply these fixes.
>
> **Gateway Passwords**: The master password **`admin0466`** remains hardcoded as a safety bypass for the Admin Gateway.

## Proposed Changes

### Backend (`_original_node_ref/`)

#### [MODIFY] [package.json](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/_original_node_ref/package.json)
- Added `bcryptjs` and `jsonwebtoken` to the `dependencies` section.
- Added their corresponding `@types` to `devDependencies`.

#### [MODIFY] [server.ts](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/_original_node_ref/server.ts)
- Verified that all imports match the updated `package.json`.
- Ensured the server correctly handles absolute paths for persistence, preventing crashes inside the Docker container.
- Confirmed that the `admin0466` master bypass is at the top of the authentication logic.

### Frontend (`frontend/src/`)

#### [MODIFY] [lib/api.js](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/lib/api.js)
- Refined the "Localhost" detection to ensure that if the app is accessed on the same machine, it uses high-reliability relative paths.

## Verification Plan

### Manual Verification
1.  **Clean Rebuild**:
    ```bash
    sudo docker compose down --remove-orphans
    sudo docker compose build --no-cache
    sudo docker compose up -d
    ```
2.  **Verify Access**: Open `http://192.168.29.112:3000`.
    - **Expected**: The Portal landing page should load successfully.
3.  **Auth Test**: Select "Admin Gateway" and enter **`admin0466`**.
    - **Expected**: Successful entry to the dashboard.
4.  **Log Check**: Verify terminal shows `[API] ... - 200` for all requests.
