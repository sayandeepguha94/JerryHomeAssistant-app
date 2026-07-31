# Implementation Plan: Exact Replication of Frontend Server Trigger Mechanism

The goal is to update the Node server's `applyBackendControl` function to use the exact triggering logic and payload structure found in the working "frontend server" (`App.tsx`).

## User Review Required

> [!IMPORTANT]
> **Mechanism Change**: Instead of a separate bridge helper, I will inline the triggering logic into `applyBackendControl` to match the "frontend server" style exactly. This includes using the `timestamp` field and the same payload structure.
>
> **Endpoint Path**: I will continue using the **ROOT path (`/`)** of the Python Hub, as confirmed by your successful manual trigger logs.

## Proposed Changes

### Backend (`_original_node_ref/server.ts`)

#### [MODIFY] [server.ts](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/_original_node_ref/server.ts)
- **Exact Payload Replication**:
  ```typescript
  const payload = {
    deviceId: deviceKey ? `${room}.${deviceKey}` : null,
    room,
    device: deviceKey,
    action,
    value,
    timestamp: new Date().toISOString()
  };
  ```
- **Direct Dispatch**: Use `fetch(IOT_HUB_URL, { method: "POST", ... })` inside `applyBackendControl` immediately after the local state update, matching the sequential flow in `App.tsx`.
- **Enhanced Logging**: Log the outgoing request and the Hub's response status to the Node terminal for visibility.

## Verification Plan

### Manual Verification
1.  **Deploy**: `sudo docker compose up -d --build`.
2.  **Access Dashboard**: Access via `http://192.168.29.112:3000`.
3.  **Settings**:
    - **Dashboard Server**: `http://192.168.29.179:3000`.
    - **IoT Hub**: `http://192.168.29.112:8000`.
4.  **Individual Trigger**: Click a light button.
    - Verify physical device response.
    - Verify Node terminal shows `[Bridge] Trigger success`.
5.  **Room Trigger**: Click "ALL ON" for a room and verify physical response.
