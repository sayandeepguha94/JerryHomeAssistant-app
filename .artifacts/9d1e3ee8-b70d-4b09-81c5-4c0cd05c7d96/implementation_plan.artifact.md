# Implementation Plan: Localized Authentication (.112)

Refactor the routing logic to store and validate all credentials (passwords and users) strictly on the local machine (192.168.29.112), while maintaining the remote server (.179) strictly for household data.

## User Review Required

> [!IMPORTANT]
> **Authentication Move**: Authentication requests (/auth/verify) will now target the **Dashboard Server (Python)** address (.112) instead of the Node address (.179).
>
> **Data Split**:
> - **Machine .112**: Master for Passwords, Users, and Ecosystem Devices.
> - **Machine .179**: Master for Household Runs (Shopping List) only.

## Proposed Changes

### Frontend Core (`src/lib/api.js`)

#### [MODIFY] [api.js](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/lib/api.js)
- Update the request interceptor to route `/auth` and `/users` requests to the **Python Server** URL (.112).
- Ensure `/shopping-list` and `/shopping-suggestions` continue to hit the **Node Server** URL (.179).

### Backend (`_original_node_ref/server.ts`)

#### [MODIFY] [server.ts](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/_original_node_ref/server.ts)
- Confirm that the local Node server correctly loads and saves `passwords.json` and `users.json` to its current directory.
- Ensure the recovery admin and default passwords are seeded correctly on the `.112` machine.

## Verification Plan

### Manual Verification
1.  **Deploy**: `sudo docker compose up -d --build` on the .112 machine.
2.  **Configuration**:
    - Dashboard Server (Python): `http://localhost:3000` (Local bridge).
    - Dashboard Server (Node): `http://192.168.29.179:3000` (Remote list).
3.  **Auth Test**:
    - Enter `admin0466` in the portal.
    - Verify via browser logs (F12) that the request hits **localhost:3000/api/auth/verify**.
    - This confirms it is using the credentials on the .112 machine.
4.  **Sync Test**:
    - Verify that the Household List is still pulling from .179.
