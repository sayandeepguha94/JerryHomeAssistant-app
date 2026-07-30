# Jerry — Voice Home PWA · PRD

## Original Problem Statement
> Build a mobile app: given github repo that is having a node js package. i want to make an app from it, just that, will provide the node server ip, port in that app.

Source repo (reference only): [light_client_voice_assistant](https://github.com/sayandeepguha94/light_client_voice_assistant) — a Node.js smart-home voice-assistant server exposing REST endpoints for IoT device control, shopping list, and voice (STT + Gemini + TTS).

## Architecture
- **Frontend**: React 18 PWA (installable on Android home screen), Tailwind + framer-motion, dark theme.
- **Backend**: FastAPI + MongoDB — JWT auth, RBAC, permission-gated proxy to the user's Node.js server.
- **Rationale for proxy**: The PWA is served over HTTPS but the Node server usually lives on a private LAN IP (e.g. 192.168.29.112:3000). Direct HTTP from HTTPS PWA is blocked by browsers. Our backend proxies the calls and simultaneously enforces per-user device/page permissions.

## User Personas
- **Admin (username `admin`, password `admin0466`)** — full access to all pages and all devices; manages the household's users and the Node server URL.
- **Household members** — created by admin with limited access to specific pages (Dashboard / Voice / Shopping / Settings) and specific devices (per-device chip selection).

## Core Requirements
1. Login prompt before any access.
2. Admin with hard-coded password `admin0466` (idempotent seed).
3. Admin can create/delete users, assign allowed pages + allowed devices.
4. Server IP/Port configurable inside the app (admin-only).
5. Dark theme, mobile-first, installable PWA.

## Implemented (2026-07-27)
- **Auth**: JWT (Bearer token in Authorization header), bcrypt hashes, admin auto-seed with idempotent password sync.
- **RBAC**: `role` + `allowed_pages` + `allowed_devices`. All proxy endpoints check page permissions; device control also checks device permissions. Room-wide actions are admin-only.
- **Pages**:
  - Login — immersive blurred backdrop, bold typography, glass form.
  - Dashboard — rooms grouped, device tiles (glass, orange glow on active), fan speed slider, ALL ON/OFF room actions (admin-only), refresh, server-status badge.
  - Voice — hero mic button with pulse rings, hold-to-record (MediaRecorder), text-command input, chat transcript, TTS playback (base64 or blob-fetched from proxy).
  - Shopping — add/toggle/remove items with optimistic updates.
  - Settings — profile card, server URL input (normalized to http://), Test button, logout.
  - Users (admin-only) — list, create-user modal with page & device chips grouped by room, delete guard on admin.
- **PWA**: manifest.json, service worker, install-prompt banner, Android home-screen ready, safe-area padding for notches.
- **Testing**:
  - Backend: 22/22 pytest cases pass (auth, RBAC, user CRUD, settings, proxy shape). Report: `/app/test_reports/iteration_1.json`.
  - Frontend: 40/40 E2E assertions pass (login, routing/RBAC, user creation, settings persistence, logout). Report: `/app/test_reports/iteration_2.json`.

## Backlog (P1)
- **Room detail page** with room hero image and larger controls (bedroom_bg / living_room_bg assets already sourced).
- **Voice waveform visualization** during recording (Web Audio API + canvas).
- **User edit** (PATCH exists in backend; add UI to modify existing users' permissions without deleting).
- **Push notifications** for shopping-list changes (Web Push).
- **AC temperature slider** in DeviceCard (currently only fan speed).

## Backlog (P2)
- Multi-language voice command support (currently English-only rule engine + Gemini fallback).
- Scenes/Routines (e.g. "Movie Night" turns off ambient + spot, keeps party light on, TV on).
- Multi-Node-server support (per-user or per-room server URL).
- Bio/biometric unlock for the PWA (WebAuthn).

## Next Action Items
1. User provides their real Node.js server IP:port (e.g. `http://192.168.29.112:3000`) in Settings after logging in as admin.
2. If they want to open the PWA outside their LAN, they'll need to expose the Node server publicly (or run a tunnel like ngrok / Tailscale Funnel).

## Enhancement Suggestion
Would you like to add **scenes/routines** so a single tap runs multi-device commands (e.g. "Bedtime" → ambient off, bedside light on, fan speed 2)? It'd make the app feel dramatically more premium — I can wire it up in the next iteration.
