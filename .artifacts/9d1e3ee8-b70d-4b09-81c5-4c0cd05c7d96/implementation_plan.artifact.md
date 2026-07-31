# Implementation Plan: Reliable Hub Triggering & Status Polling

The goal is to ensure the Node server correctly forwards manual dashboard triggers (POST) and background status requests (GET) to the Python Hub, while maintaining the full feature set (Users, Shopping List).

## User Review Required

> [!IMPORTANT]
> **Endpoint Paths**: Based on your `bridge.py`, I will configure the Node server to talk to the **ROOT path (`/`)** of the Python Hub for both GET and POST requests.
>
> **Room Actions**: I am fixing a bug where "Room ON/OFF" buttons only updated the UI but didn't actually send commands to the Python backend.

## Proposed Changes

### Backend (`_original_node_ref/server.ts`)

#### [MODIFY] [server.ts](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/_original_node_ref/server.ts)
- **Replicate User Logic**: Re-implement the full-feature code you provided (Users, Shopping suggestions).
- **Corrected Bridge Forwarder**:
  - Update `forwardToIoTHub` to hit the Hub root (`/`).
  - Add `await` to `fetch` calls to ensure requests complete before responding to the browser.
  - Add explicit `console.log` for every manual trigger so you can see it in your terminal.
- **Fixed `applyBackendControl`**:
  - Removed the `return` statement that was preventing "Room" commands from reaching the Python backend.
  - Ensured the `deviceId` payload matches your `room.deviceKey` format.
- **Reliable Persistence**:
  - Standardized JSON storage using `__dirname` to ensure it works correctly inside Docker containers.

## Verification Plan

### Manual Verification
1.  **Deploy**: `sudo docker compose up -d --build`.
2.  **Settings**: Verify **IoT Hub (Python Backend)** is set to `http://192.168.29.112:8000`.
3.  **Individual Trigger**: Click a light button.
    - Check Node logs for: `[Bridge] POST -> http://...`
    - Check Python logs for: `-> Executed turn_on(...)`
4.  **Room Trigger**: Click "ALL ON" for a room.
    - Verify all physical devices in that room respond.
5.  **Polling**: Verify Python logs show `GET /` requests every 5 seconds.
