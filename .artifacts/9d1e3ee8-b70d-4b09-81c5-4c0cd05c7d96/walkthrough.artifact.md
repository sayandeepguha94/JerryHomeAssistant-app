# Walkthrough: Localized Authentication (.112)

I have refactored the system to ensure that all authentication and password validation happen strictly on your local machine (**192.168.29.112**), while keeping the shopping list on your remote server (**192.168.29.179**).

## Changes Made

### 1. Shifted Authentication Hub
Previously, the app was trying to find your credentials on the remote Node server (.179). I have updated the routing logic in `api.js` to send all security-related requests (`/auth/verify`, `/users`) to the **Dashboard Server (Python)** address.
- Since you set this to `localhost:3000` on the local machine, the app will now always use the local `passwords.json` for validation.

### 2. Local File Master (.112)
The Node server running on your local machine is now the "Master" for:
- **Passwords**: `home0466`, `list0466`, `admin0466`.
- **Ecosystem Devices**: Toggles and fan speeds.
- **Voice Commands**: Proxied to your physical hub.

### 3. Remote Data Sync (.179)
The app continues to talk to your remote server for **Household Runs** (Shopping List) and **Suggestions**. This ensures your data is preserved even if the local machine is reset.

### 4. Smart Local Routing
I refined the "Local" detection. If you set a server address to `localhost` or `127.0.0.1`, the app automatically switches to **Relative Paths** (`/api`). This fixes the browser security issue where your phone couldn't "see" the server.

## How to Verify

1.  **Clean Rebuild**:
    ```bash
    sudo docker compose down --remove-orphans
    sudo docker compose build --no-cache
    sudo docker compose up -d
    ```
2.  **Apply Your Configuration**:
    - Access `http://192.168.29.112:3000`.
    - Go to **Settings** (via the "Configure Connection" button on the portal).
    - **Dashboard Server (Python)**: Set to `http://localhost:3000`.
    - **Dashboard Server (Node)**: Set to `http://192.168.29.179:3000`.
    - Click **Save**.
3.  **The Result**:
    - **Auth**: Enter `admin0466` in the portal. It will now correctly hit the local machine for validation.
    - **Shopping**: Your remote list from .179 will appear inside the dashboard.
