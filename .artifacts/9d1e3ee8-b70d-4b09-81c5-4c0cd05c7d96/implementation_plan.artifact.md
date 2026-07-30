# Implementation Plan: Centralized IoT Bridge (No Automations)

Transform the Node server into the central manager for your home assistant. It will sync state with your physical hardware and handle all triggers, ensuring the dashboard is always accurate and persistent.

## User Review Required

> [!IMPORTANT]
> **Hardware Sync**: The server will background-poll `http://192.168.29.112:8000/` to ensure it always knows the real state of your devices. This means toggling a physical switch will eventually (within seconds) reflect on the dashboard.

## Proposed Changes

### Backend (`_original_node_ref/server.ts`)

#### [MODIFY] [server.ts](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/_original_node_ref/server.ts)
- **State Synchronization**:
  - Implement a background loop that polls the physical IoT Hub (`192.168.29.112`) for live states.
  - Map the hardware states (e.g., `on/off`, speed values) back into the server's `devices` array.
- **Robust Triggering**:
  - Align `applyBackendControl` payload structure with the original dashboard's hardware-direct logic.
  - Ensure every dashboard command is immediately forwarded to the hardware.
- **Enhanced Persistence**:
  - Use `device_state.json` to keep the UI state "sticky" even through restarts.

### Frontend (`frontend/src/`)

#### [MODIFY] [Dashboard.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/pages/Dashboard.jsx)
- Simplify the control logic to strictly trust the Node server.
- Remove the browser-side "Reliability Loop" (verification) since the Node server now handles synchronization reliably in the background.

---

## Verification Plan

### Manual Verification
1. **Rebuild**: `sudo docker compose up -d --build`.
2. **State Sync**:
   - Observe server logs: `[Sync] Fetched states from IoT Hub`.
   - Toggle a physical light and verify the dashboard updates.
3. **Triggering**:
   - Toggle a device on the dashboard.
   - Verify the physical device responds immediately.
4. **Persistence**:
   - Change a device state, restart the container, and verify it stays as set.
