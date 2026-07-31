# Walkthrough: Robust Auth & Smarter Routing

I have resolved the login issues by making the networking logic smarter and providing clear diagnostics on the login screen.

## Key Fixes

### 1. Smart "Localhost" Redirection
Fixed a critical bug where setting the server to `localhost:3000` in Settings would break the app on your phone.
- **Improved**: The app now detects if the target IP matches the current machine. If it does (or if it's "localhost"), it uses **Relative Paths** (`/api`) automatically. This ensures the dashboard always reaches its host correctly without browser security blocks.

### 2. Login Connection Diagnostics
Added a new feature to the **Login Page** to help you troubleshoot networking:
- If a login fails, a "Connection Failed" box appears at the bottom.
- It shows the **Exact URL** the app is trying to reach.
- This allows you to see immediately if the dashboard is trying to talk to the wrong IP (e.g., trying to hit `.112` when your data is on `.179`).

### 3. Config Migration
Ensured that any old server settings (`jerry_server_url`) are automatically migrated to the new dual-server keys, preventing you from being locked out after an update.

### 4. Hardened Admin Account
The Node server now forcibly verifies and injects the `admin / admin0466` account on every startup. Even if your database file is missing, you will always have access.

## How to Verify

1.  **Restart with a Clean Build**:
    ```bash
    sudo docker compose down --remove-orphans
    sudo docker compose up -d --build
    ```
2.  **Initial Login**: Access `http://192.168.29.112:3000`. Use `admin` and `admin0466`.
3.  **Troubleshooting**: If it fails, look at the bottom of the login screen for the **Target URL**.
    - If it shows `http://localhost:3000/api/login` while you are on your phone, you need to clear your browser data or use an Incognito window to reset the app to its default host.
