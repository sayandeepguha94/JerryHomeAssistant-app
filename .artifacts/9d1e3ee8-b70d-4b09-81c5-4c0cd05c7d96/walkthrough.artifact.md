# Walkthrough: Robust Gateway & Localized Security

I have finalized the security refactor to ensure all authentication is handled strictly on your local machine (**192.168.29.112**), and I have improved the resilience of the portal.

## Key Fixes

### 1. Hardened Local Authentication
Previously, the app was getting confused between which server should handle passwords. I have refactored the internal routing logic:
- **Strict Mapping**: All password verifications and security settings are now hardcoded to hit the **Dashboard Server (Python)** address.
- **Relative Pathing**: If you are accessing the dashboard from the same machine (localhost), the app now uses relative paths (`/api`) automatically. This bypasses browser security blocks and ensures a reliable connection.

### 2. Robust Password Persistence
Updated the local Node server to handle its data files more reliably:
- **Merged Passwords**: When the server starts, it now carefully merges your saved passwords from `passwords.json` with the default values. This ensures that even if a single password is missing from the file, you aren't locked out of the other modes.
- **Terminal Feedback**: Added clear status messages to the server log so you can see exactly when passwords are loaded or when a verification attempt is made.

### 3. Smart Token Management
Fixed a session bug where logging into one mode (like "Home") might clear your access to another mode (like "Admin"). The app now manages three distinct session tokens, allowing you to have different access levels active on the same device if needed.

### 4. Admin Recovery
Ensured that the default `admin / admin0466` account is always present and active on the local machine for emergency recovery.

## How to Verify

1.  **Restart with a Clean Build**:
    ```bash
    sudo docker compose down --remove-orphans
    sudo docker compose build --no-cache
    sudo docker compose up -d
    ```
2.  **Access the Portal**: Open `http://192.168.29.112:3000`.
3.  **Test Access**:
    - Select **Admin Gateway** and enter `admin0466`.
    - Select **Home Dashboard** and enter `home0466`.
4.  **Confirm Routing**: Open your browser console (F12) and toggle a device. You should see:
    `[API] POST -> /api/devices/control` (Relative path, ensuring local machine handling).
