# Walkthrough: Single Container & Authentication

I have successfully consolidated the project into a single Docker container and implemented a mandatory login screen. The application now runs entirely on port **3000**.

## Changes Made

### 1. Consolidated Docker Infrastructure
- **[docker-compose.yml](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/docker-compose.yml)**: Simplified to a single service (`jerry-app`) running on port `3000`.
- **[_original_node_ref/Dockerfile](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/_original_node_ref/Dockerfile)**: Implemented a multi-stage build:
  - **Stage 1**: Builds the `frontend/` React dashboard.
  - **Stage 2**: Bundles the Node server and embeds the frontend build into the `dist` folder.

### 2. Backend Authentication
- **[server.ts](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/_original_node_ref/server.ts)**: Added a `POST /api/login` endpoint that validates the default credentials (`admin` / `admin0466`).

### 3. Mandatory Login Flow
- **[App.js](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/App.js)**: Integrated the Login page into the routing. All other pages are now "Protected" and will redirect to `/login` if no session is found.
- **[auth.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/lib/auth.jsx)**: Converted from mock state to real authentication. It now calls the backend API and persists the user session in `localStorage`.

### 4. Single-Origin Optimization
- **[api.js](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/lib/api.js)**: Simplified the URL logic to automatically use the current origin. This ensures the frontend and backend communicate perfectly within the same container.

## How to Deploy and Verify

1.  **Build and Run**:
    ```bash
    sudo docker compose up -d --build
    ```
2.  **Access the App**:
    Visit `http://<your-server-ip>:3000` in your browser.
3.  **Login**:
    Use the following credentials:
    - **Username**: `admin`
    - **Password**: `admin0466`
4.  **Verification**:
    - You should land on the **Dashboard** after a successful login.
    - All IoT commands and voice features will continue to function via the same container.

> [!TIP]
> The separate `frontend/` Dockerfile and Nginx configuration are no longer used. The Node server now handles both the API and serving the static UI files.
