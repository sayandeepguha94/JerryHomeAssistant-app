# Implementation Plan: Gateway Portal & Mode Passwords

This plan introduces a central entry portal at the root URL and protects the specialized access channels (/home, /list, /admin) with configurable passwords.

## User Review Required

> [!IMPORTANT]
> **New Passwords**:
> - **Public Home**: `home0466`
> - **Public List**: `list0466`
> - **Admin Gateway**: `admin0466`
>
> **Access Model**: Visiting the root URL (`/`) will now show a selection screen instead of redirecting straight to the dashboard.

## Proposed Changes

### Backend (`_original_node_ref/server.ts`)

#### [MODIFY] [server.ts](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/_original_node_ref/server.ts)
- **New State**: Add `gateways` object to store and persist passwords for the three modes.
- **Persistence**: Save/Load `passwords.json`.
- **API Endpoints**:
  - `POST /api/auth/verify`: Verifies a password for a specific mode and returns a session token.
  - `GET /api/admin/passwords`: Returns current passwords (requires admin token).
  - `POST /api/admin/passwords`: Updates passwords (requires admin token).

### Frontend Core (`src/lib/auth.jsx`)

#### [MODIFY] [auth.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/lib/auth.jsx)
- **Multi-Session Support**: Update to store 3 distinct session tokens in `localStorage` (`jerry_home_token`, `jerry_list_token`, `jerry_admin_token`).
- **Validation**: Add `validateGateway(mode, password)` logic.

### Frontend Routing (`src/App.js`)

#### [MODIFY] [App.js](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/App.js)
- **Portal Page**: Add a new route at `/` for the entry selection screen.
- **Route Protection**: Update the `Protected` component to check for the specific token required by the current path.

### Frontend UI

#### [NEW] [Portal.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/pages/Portal.jsx)
- A clean, immersive landing page with three primary actions: "Home Dashboard", "Household List", and "Admin Gateway".
- Integrated password prompt for each action.

#### [MODIFY] [Settings.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/pages/Settings.jsx)
- Add a **"Security & Passwords"** section (only in `/admin`) to change the 3 gateway passwords.

## Verification Plan

### Manual Verification
1.  **Initial Visit**: Open `http://192.168.29.112:3000`.
    - Verify you see the Portal with 3 choices.
2.  **Home Test**: Click "Home Dashboard", enter `home0466`.
    - Verify redirection to `/home`.
3.  **Admin Test**: Visit `/admin` directly.
    - Verify it asks for a password.
    - Enter `admin0466` and verify full access.
4.  **Config Test**: Go to Settings in Admin mode.
    - Change the "Public Home" password.
    - Verify the new password works at `/home`.
