# Walkthrough: Simplified Architecture (No Backend)

I have successfully removed the Python backend and MongoDB dependencies, simplifying the project to a direct Frontend-to-NodeServer architecture.

## Changes Made

### Infrastructure
- **[docker-compose.yml](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/docker-compose.yml)**: Removed `python-backend` and `mongodb` services. The system now only runs the `frontend` and `node-server`.
- **[nginx.conf](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/nginx.conf)**: Removed the `/api/` proxy block that was forwarding requests to the Python backend.
- **Cleanup**: Deleted the entire `backend/` directory.

### Frontend Logic
- **[lib/api.js](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/lib/api.js)**: Stripped out all references to the Python backend. The `api` instance now points directly to the Node.js server.
- **[lib/auth.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/lib/auth.jsx)**: Implemented a mock "admin" user to bypass the login requirement while maintaining compatibility with UI components that expect a user object.
- **[App.js](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/App.js)**: Removed `/login` and `/users` routes. The app now flows directly from **Server Setup** to the **Dashboard**.

### Feature Updates
- **[pages/Dashboard.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/pages/Dashboard.jsx)**: Removed dual-fetching logic. It now fetches device states directly from the Node.js server.
- **[pages/Voice.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/pages/Voice.jsx)**: Updated the voice loop to use the Node.js server's `/api/parse-command` and `/api/parse-audio` endpoints directly.
- **[pages/Shopping.jsx](file:///Users/sayandeepguha/AndroidStudioProjects/JerryHomeAssistant-app/frontend/src/pages/Shopping.jsx)**: Simplified the shopping list management, removing backend-specific "Quick Items" and suggestions.

## How to Run

1.  Navigate to the project root.
2.  Run `docker-compose up --build`.
3.  Open the app in your browser.
4.  Enter your Node.js server's IP (e.g., `http://192.168.29.112:3000`) in the setup screen.
5.  You will be redirected straight to the Dashboard.

> [!NOTE]
> All data (device states and shopping items) are now stored in the **in-memory state of your Node.js server**. Restarting the Node server will reset this data.
