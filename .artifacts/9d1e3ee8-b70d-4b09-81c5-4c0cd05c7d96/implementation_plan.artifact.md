# Implementation Plan: Universal Logout & Conditional Admin Bypass

Add logout functionality to all views and implement a dynamic admin bypass logic that disables the default password once a custom one is set.

## User Review Required

> [!IMPORTANT]
> **Admin Password Logic**:
> - **Initial State**: The hardcoded `admin0466` works by default.
> - **Custom State**: Once you set a custom Admin password in Settings, the hardcoded `admin0466` will **stop working**.
> - **Recovery**: If you clear the Admin password in Settings, `admin0466` will become active again.

> [!NOTE]
> **Logout Button**: A logout icon will be added to the top-right of every page (Home, List, and Admin) to allow immediate return to the Portal.

## Proposed Changes

### Backend (`_original_node_ref/server.ts`)

#### [MODIFY] [server.ts](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/_original_node_ref/server.ts)
- **Password Verification**:
  - Update `/api/auth/verify` for `mode === "admin"`:
    - If `passwords.admin` is empty/unset, only allow `admin0466`.
    - If `passwords.admin` is set, only allow the custom password (`admin0466` will fail).
- **Default State**: Initialize `passwords.admin` as an empty string in memory and ensure `loadAllState` respects this.

### Frontend Pages

#### [MODIFY] [Dashboard.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/pages/Dashboard.jsx)
- Add `LogOut` icon button in the header.
- On click: Clear tokens and redirect to `/`.

#### [MODIFY] [Shopping.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/pages/Shopping.jsx)
- Add `LogOut` icon button in the header.
- On click: Clear tokens and redirect to `/`.

#### [MODIFY] [Settings.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/pages/Settings.jsx)
- Ensure the Admin password field can be saved as empty to re-enable the bypass.

## Verification Plan

### Manual Verification
1. **Initial Admin Access**:
   - Access `/` (Portal).
   - Enter `admin0466` for Admin Gateway.
   - **Expected**: Success.
2. **Set Custom Admin Password**:
   - Go to Settings.
   - Set Admin Password to `newpass123`.
   - Save and Logout.
3. **Verify Bypass Disabled**:
   - Return to Portal.
   - Try `admin0466` for Admin Gateway.
   - **Expected**: Failure.
   - Try `newpass123`.
   - **Expected**: Success.
4. **Universal Logout**:
   - Test the logout button on `/home` and `/list` views.
   - Verify immediate return to the Portal.
