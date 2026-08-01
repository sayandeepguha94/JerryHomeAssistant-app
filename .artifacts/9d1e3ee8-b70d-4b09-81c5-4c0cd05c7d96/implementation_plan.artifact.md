# Implementation Plan: URL-Based Access Control

Restructure the application into three primary access URLs: `/home`, `/list`, and `/admin`, with varying visibility of features and navigation.

## User Review Required

> [!IMPORTANT]
> **Access URLs**:
> - `/home`: Grants access strictly to the home devices dashboard.
> - `/list`: Grants access strictly to the household shopping list.
> - `/admin`: Master access to all features (Home, List, Setup).
>
> **Navigation**:
> - In `/home` and `/list` modes, the bottom navigation will only show the single relevant icon.
> - In `/admin` mode, the full navigation bar will be visible.

## Proposed Changes

### Frontend Core (`src/lib/auth.jsx`)

#### [MODIFY] [auth.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/lib/auth.jsx)
- No major changes needed since we are operating in "no user" mode with a hardcoded admin.

### Frontend Routing (`src/App.js`)

#### [MODIFY] [App.js](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/App.js)
- Update routes to handle the new URL structure:
  - `/home` -> Dashboard
  - `/list` -> Shopping
  - `/admin` -> Dashboard (Admin mode)
  - `/admin/shopping` -> Shopping (Admin mode)
  - `/admin/settings` -> Settings (Admin mode)
  - `/admin/server-setup` -> ServerSetup (Admin mode)
- Add a default redirect from `/` to `/home`.

### Frontend Components

#### [MODIFY] [BottomNav.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/components/BottomNav.jsx)
- Update to detect the current mode from the URL.
- Filter visible navigation items based on the mode:
  - `home` mode -> Show only Dashboard icon (or hide nav if preferred).
  - `list` mode -> Show only Shopping icon.
  - `admin` mode -> Show all icons.

#### [MODIFY] [Settings.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/pages/Settings.jsx)
- Add a "Quick Links" section that only appears when in `admin` mode.
- List the other access URLs (`/home`, `/list`, `/admin`) for easy copy-pasting.

## Verification Plan

### Manual Verification
1.  **Visit `/home`**:
    - Verify Dashboard is visible.
    - Verify Bottom Nav shows only the "Home" icon (or no nav).
2.  **Visit `/list`**:
    - Verify Shopping List is visible.
    - Verify Bottom Nav shows only the "List" icon.
3.  **Visit `/admin`**:
    - Verify Dashboard is visible.
    - Verify full Bottom Nav is visible.
    - Navigate to Settings and verify "Quick Links" are shown.
