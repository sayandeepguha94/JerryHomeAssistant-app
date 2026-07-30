# Walkthrough: Reliability & Networking Fixes

I have resolved the Docker build errors and fixed the synchronization inconsistencies between the Node server and Python backend.

## Changes Made

### 1. Fixed Build & Syntax Errors
- **server.ts**: Resolved a syntax error (extra closing brace) that was crashing the `esbuild` process.
- **Settings.jsx**: Fixed a JSX syntax error and ensured all necessary imports (like `api`) are present. The frontend will now build successfully.

### 2. Dual-Sync Architecture
- **Devices & Shopping**: The Node server now correctly synchronizes both the **Device States** and the **Shopping List** (Household runs) with your Python backend.
- **Configurable Hub**: Added a dedicated field in Settings for the **"IoT Hub (Python Backend)"**. This address is saved on the server (`hub_config.json`) and used for all background sync and triggering logic.

### 3. IP-Agnostic Dashboard
- **Relative Networking**: Refactored the dashboard to use relative paths (`/api`) by default.
- **Eliminated Flip-Flops**: By leaving the "Dashboard Server (Node)" field **EMPTY**, the app will automatically use the correct address. This fixes the issue where `0.0.0.0` worked for some features but not others.

### 4. Background Reliability
- **Non-blocking Bridge**: Commands are forwarded to the Python hub in the background. This ensures the dashboard UI remains snappy and persistent even if the hub is slow to respond.
- **Robust Persistence**: All states (Devices, Shopping, Hub Config) are saved to disk on the Node server, surviving refreshes and container restarts.

## How to Verify

1.  **Restart with a Clean Build**:
    ```bash
    sudo docker compose down --remove-orphans
    sudo docker compose up -d --build
    ```
2.  **Access the Dashboard**: Use your LAN IP: `http://192.168.29.179:3000`.
3.  **Setup the Bridge**:
    - Go to **Settings**.
    - Enter `http://192.168.29.112:8000/` in the **IoT Hub (Python Backend)** field.
    - Clear the **Dashboard Server (Node)** field.
    - Click **Save**.
4.  **Verification**:
    - Add an item to "Household runs" and refresh; it should persist.
    - Toggle a device and verify the physical response.
    - Check terminal logs (`docker compose logs -f`) to see the `[API]` and `[Bridge]` activity.
