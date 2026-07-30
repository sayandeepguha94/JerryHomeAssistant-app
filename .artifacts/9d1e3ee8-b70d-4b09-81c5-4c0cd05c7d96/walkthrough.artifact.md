# Walkthrough: Dual-Server Reliability & IoT Configuration

I have refined the communication logic to support your dual-server setup, where the **Python Backend** handles hardware triggers and the **Node Server** handles user management and household runs.

## Changes Made

### 1. Dedicated IoT Hub Configuration
- **New Field**: Added **\"IoT Hub (Python Backend)\"** to the Settings page. This allows you to explicitly define where your hardware controller is located (e.g., `http://192.168.29.112:8000`).
- **Persistence**: This address is now saved on the Node server in `hub_config.json` and survives restarts.
- **Dynamic Bridge**: The Node server now uses this saved address for all background synchronization and device triggering.

### 2. Reliable Dashboard Sync (Relative Paths)
- **Problem**: Manually entering full IPs (like `192.168...`) in the browser settings often causes caching and cross-origin issues, leading to the \"flip-flop\" behavior you saw.
- **Solution**: Refactored the dashboard to use **relative paths** (`/api`) by default.
- **Auto-Detect**: You can now leave the \"Dashboard Server\" field **EMPTY**. The app will automatically talk to the correct server IP that served the page.

### 3. High-Visibility Terminal Logging
- **Request Logger**: Added a middleware to the Node server that logs every incoming API request:
  - `[API] GET /api/devices - 200 (5ms)`
- **Bridge Logger**: Added explicit logs for outgoing hardware triggers:
  - `[Bridge] Forwarding -> http://192.168.29.112:8000/...`
  - This allows you to verify in real-time that the Node server is successfully hitting the Python backend.

### 4. Robust Docker Networking
- **Host Gateway**: Updated `docker-compose.yml` to allow the Node container to reliably resolve local host machine addresses.

## How to Verify

1.  **Rebuild and Start**:
    ```bash
    sudo docker compose up -d --build
    ```
2.  **Access the Dashboard**: Use your LAN IP: `http://192.168.29.179:3000`.
3.  **Configure Hub**:
    - Go to **Settings**.
    - In the **\"IoT Hub (Python Backend)\"** field, enter: `http://192.168.29.112:8000`.
    - Clear the **\"Dashboard Server (Node)\"** field (leave it empty).
    - Click **Save**.
4.  **Test Connectivity**:
    - **Trigger**: Toggle a device and verify the physical hardware responds.
    - **Sync**: Add a shopping list item and verify it persists after a refresh.
    - **Terminal**: Run `sudo docker compose logs -f jerry-home-assistant` to see the internal communication logs.

> [!TIP]
> By keeping the \"Dashboard Server\" field empty, you ensure the browser never has to deal with cross-origin IP mismatches.
