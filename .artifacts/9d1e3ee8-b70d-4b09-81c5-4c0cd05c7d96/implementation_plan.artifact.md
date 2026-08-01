# Implementation Plan: Gateway Portal & Localized Security

Restore the password-protected entry portal and ensure all authentication/passwords are managed strictly on the local machine (192.168.29.112), while keeping household data on the remote server (192.168.29.179).

## User Review Required

> [!IMPORTANT]
> **Authentication Move**: All password validation (`/auth/verify`) will target the **Dashboard Server (Python)** address (.112).
>
> **Security Cleanup**: Hardcoded admin credentials and the "Users" management page will be removed from the UI.
>
> **Access Model**: Visiting the root URL (`/`) will show the Portal where you must select a mode and enter the relevant password:
> - Home: `home0466`
> - List: `list0466`
> - Admin: `admin0466`

## Proposed Changes

### Frontend Core (`src/lib/`)

#### [MODIFY] [auth.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/lib/auth.jsx)
- Restore `validateGateway` to check passwords via the API.
- Remove hardcoded `admin` state.
- Store session tokens in `localStorage`.

#### [MODIFY] [api.js](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/lib/api.js)
- Ensure `/auth` and `/admin/passwords` requests route to the **Python Server** (.112).
- Ensure `/shopping-list` requests route to the **Node Server** (.179).
- Refine "Localhost" detection to use relative paths for easier browser access on the same machine.

### Frontend Routing (`src/App.js`)

#### [MODIFY] [App.js](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/App.js)
- Re-enable the `Portal` at path `/`.
- Restore `Protected` routes for `/home`, `/list`, and `/admin`.

### Frontend UI

#### [MODIFY] [Settings.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/pages/Settings.jsx)
- Restore the **"Security & Passwords"** section (visible when in Admin mode).
- Remove the "Users" icon and page link.
- Remove hardcoded credential text.

### Backend (`_original_node_ref/server.ts`)

#### [MODIFY] [server.ts](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/_original_node_ref/server.ts)
- Ensure `passwords.json` is loaded/saved in `process.cwd()`.
- Confirm `/api/auth/verify` uses the local `passwords` state.

## Verification Plan

### Manual Verification
1.  **Initial Visit**: Open `http://192.168.29.112:3000`.
    - Verify selection portal appears.
2.  **Auth Test**:
    - Select "Admin Gateway" and enter `admin0466`.
    - Verify entry to full dashboard.
3.  **Data Test**:
    - Verify Household List pulls from `.179`.
    - Verify Devices trigger via `.112`.
4.  **Admin Test**:
    - Go to Setup in Admin mode.
    - Change the "Home" password.
    - Logout and verify the new password works for "Home Dashboard".
