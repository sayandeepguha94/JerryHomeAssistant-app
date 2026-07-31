# Implementation Plan: Direct Admin Access (No Accounts)

This plan removes the multi-user account system and configures the application to open directly into the Admin dashboard.

## User Review Required

> [!IMPORTANT]
> **No More Security**: This change removes the login screen. Anyone who has the IP address of your server will have immediate access to control your home devices.
>
> **Feature Removal**: The "Users" management page and all "Logout" functionality will be completely deleted from the UI.

## Proposed Changes

### Frontend Core (`src/lib/auth.jsx`)

#### [MODIFY] [auth.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/lib/auth.jsx)
- Hardcode the `admin` user as the default initial state.
- Disable the `login` and `logout` functions as they are no longer needed.

### Frontend Routing (`src/App.js`)

#### [MODIFY] [App.js](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/App.js)
- Delete the `/login` and `/users` routes.
- Simplify the `Protected` component to act as a pass-through, since a user is always present.

### Frontend UI (`src/components/` & `src/pages/`)

#### [MODIFY] [BottomNav.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/components/BottomNav.jsx)
- Remove the "Users" navigation item.

#### [MODIFY] [Settings.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/pages/Settings.jsx)
- Remove the Profile Card (Name, Role) and the "Logout" button.

### Backend (`_original_node_ref/server.ts`)

#### [MODIFY] [server.ts](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/_original_node_ref/server.ts)
- Remove user persistence logic (`users.json`).
- Keep the `devices` and `shopping` features as-is.

## Verification Plan

### Manual Verification
1.  **Deploy**: `sudo docker compose up -d --build`.
2.  **Initial Access**: Open `http://192.168.29.112:3000`.
    - **Expected**: The Dashboard should open immediately without asking for a password.
3.  **Navigation Check**:
    - Verify that only "Home", "List", and "Setup" appear in the bottom bar.
    - Verify that the "Users" page is gone.
4.  **Settings Check**:
    - Go to Settings.
    - Verify the top profile section is gone and there is no way to log out.
