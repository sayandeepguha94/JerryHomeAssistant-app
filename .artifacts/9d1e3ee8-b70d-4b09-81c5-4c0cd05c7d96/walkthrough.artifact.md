# Walkthrough: Exact Trigger Mechanism Replication

I have updated the Node server to use the **exact** triggering mechanism from your working "Frontend Server" (`App.tsx`). This ensures the Python Hub receives commands in the precise format it expects.

## Changes Made

### 1. Replicated Payload & Dispatch
I modified the `executeHubAction` function to mirror the `App.tsx` logic exactly:
- **Root Path**: Commands are now sent to the root `/` of your Python Hub.
- **Timestamp**: Every `POST` request now includes a fresh `timestamp` field.
- **Awaited Completion**: The Node server now waits for the Python Hub to confirm the trigger before responding to your dashboard.

### 2. Fixed Room-Wide Actions
Resolved a bug where clicking "ALL ON" or "ALL OFF" for a room would update the dashboard UI but wouldn't actually send the command to your hardware. Now, both individual toggles and room actions trigger the Python backend.

### 3. Integrated Bridge Logging
Added high-visibility logging to the Node server. You can now see exactly when a trigger is dispatched and whether it succeeded:
- `[Control] Received turn_on for bedroom/ambient light`
- `[Bridge] Sending command to Python Hub: http://192.168.29.112:8000/`
- `[Bridge] Trigger dispatched successfully!`

## How to Verify

1.  **Restart with a Clean Build**:
    ```bash
    sudo docker compose down --remove-orphans
    sudo docker compose up -d --build
    ```
2.  **Verify Settings**:
    - Access the dashboard at `http://192.168.29.112:3000`.
    - Go to **Settings**.
    - Ensure **Dashboard Server (Node)** is `http://192.168.29.179:3000`.
    - Ensure **IoT Hub (Python Backend)** is `http://192.168.29.112:8000`.
3.  **Test Individual Toggles**: Click a light button. You should see `POST /` logs immediately on your Python terminal.
4.  **Test Room Toggles**: Click "ALL ON" for a room. This should now also result in `POST /` logs.
5.  **Monitor Node Logs**:
    ```bash
    sudo docker compose logs -f jerry-home-assistant
    ```
