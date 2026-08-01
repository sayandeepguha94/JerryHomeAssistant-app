# Walkthrough: Bulletproof Admin Access & Localized Security

I have finalized the security refactor to ensure all authentication is handled strictly on your local machine (**192.168.29.112**), and I have added a guaranteed recovery password for the Admin Gateway.

## Key Fixes

### 1. Bulletproof Admin Password
As requested, I have hardcoded a master bypass for the Admin Gateway.
- **Admin Recovery**: The password **`admin0466`** will **always** work for the "Admin Gateway" mode, regardless of any changes made in settings or what is stored in the `passwords.json` file. This ensures you can never be locked out of your system.

### 2. Hardened Local Authentication
- **Strict Mapping**: All password verifications and security settings are hardcoded to hit the **Dashboard Server (Python)** address.
- **Relative Pathing**: If you are accessing the dashboard from the same machine (localhost), the app now uses relative paths (`/api`) automatically. This bypasses browser security blocks and ensures a reliable connection.

### 3. Robust Password Persistence
Updated the local Node server to handle its data files more reliably:
- **Merged Passwords**: When the server starts, it now carefully merges your saved passwords from `passwords.json` with the default values.
- **Terminal Feedback**: Added clear status messages to the server log so you can see exactly when a verification attempt is made.

### 4. Smart Token Management
Fixed a session bug where logging into one mode (like "Home") might clear your access to another mode (like "Admin"). The app now manages three distinct session tokens.

## How to Verify

1.  **Restart with a Clean Build**:
    ```bash
    sudo docker compose down --remove-orphans
    sudo docker compose build --no-cache
    sudo docker compose up -d
    ```
2.  **Access the Portal**: Open `http://192.168.29.112:3000`.
3.  **Test Access**:
    - Select **Admin Gateway** and enter **`admin0466`**.
    - This will work even if you have never configured anything before.
4.  **Confirm Routing**: Open your browser console (F12) and toggle a device. You should see:
    `[API] POST -> /api/devices/control` (Relative path, ensuring local machine handling).
