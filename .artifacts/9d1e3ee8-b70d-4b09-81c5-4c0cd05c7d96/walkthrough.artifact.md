# Walkthrough: Specialized Dual-Server Routing

I have updated the system to support your specific networking setup. The dashboard is now a "Multi-Tenant" client that talks to two different servers based on the feature you are using.

## Key Changes

### 1. Dual-Channel API Routing
Refactored `api.js` to automatically route requests:
- **Ecosystem Devices & Voice**: Targeted at the **Dashboard Server (Python)**.
- **Household Runs & Users**: Targeted at the **Dashboard Server (Node)**.

### 2. Cleaned Settings Page
Renamed the fields to match your physical setup and removed the redundant "IoT Hub" field.
- **Dashboard Server (Python)**: Set this to `http://localhost:3000` (The local Node server that bridges to your Python hub).
- **Dashboard Server (Node)**: Set this to `http://192.168.29.179:3000` (The remote Node server where your shopping list data lives).

### 3. Removed Failover Complexity
Removed the automatic URL "switching" logic to ensure the app remains strictly connected to the IPs you provide, preventing accidental data wipes.

## How to Verify

1.  **Restart with a Clean Build**:
    ```bash
    sudo docker compose down --remove-orphans
    sudo docker compose up -d --build
    ```
2.  **Apply Your Configuration**:
    - Access `http://192.168.29.112:3000`.
    - Go to **Settings**.
    - Set **Dashboard Server (Python)** to `http://localhost:3000`.
    - Set **Dashboard Server (Node)** to `http://192.168.29.179:3000`.
    - Click **Save**.
3.  **The Result**:
    - **Trigger Check**: Toggling a light will now hit the local `.112` Node bridge, which hits the physical hub at port 8000.
    - **Sync Check**: The "Household runs" will now stay in sync with your remote `.179` server.
