# Walkthrough: URL-Based Access Model & Admin Default

I have restructured the application into three specialized access channels: **Home**, **List**, and **Admin Gateway**, and configured the system to land on the **Admin Gateway** by default.

## Key Access Channels

### 1. Admin Gateway (`/admin`) - [DEFAULT]
- **URL**: `http://192.168.29.112:3000/admin` (or simply `http://192.168.29.112:3000/`)
- **Experience**: The full master interface.
- **Features**:
  - Full bottom navigation bar (Home, List, Setup).
  - Access to the **Server Setup** and configuration.
  - **Access URLs**: A dedicated section in Settings that displays all three URLs for easy sharing and reference.

### 2. Public Home Access (`/home`)
- **URL**: `http://192.168.29.112:3000/home`
- **Focus**: Strictly the Ecosystem Dashboard.
- **Experience**: The navigation bar is hidden, preventing users from accessing the shopping list or settings. This is perfect for wall-mounted tablets or family members who only need device control.

### 3. Public List Access (`/list`)
- **URL**: `http://192.168.29.112:3000/list`
- **Focus**: Strictly the Household runs (Shopping List).
- **Experience**: Only the shopping list is visible. No device control or setup options are available.

## Technical Improvements

- **Intelligent Routing**: Updated `App.js` to automatically redirect any visit to the root (`/`) straight to `/admin`.
- **Resilient Navigation**: The `BottomNav` component now dynamically hides itself unless you are explicitly in the `/admin` path.

## How to Verify

1.  **Restart the System**:
    ```bash
    sudo docker compose down --remove-orphans
    sudo docker compose up -d --build
    ```
2.  **Test Default Access**: Visit `http://192.168.29.112:3000/`. You should land on the dashboard with the **FULL navigation bar** visible (redirected to `/admin`).
3.  **Test Public Home**: Visit `/home`. You should see only the dashboard with **NO navigation bar**.
4.  **Test Public List**: Visit `/list`. You should see only the shopping list with **NO navigation bar**.
5.  **Check Settings**: While in `/admin`, go to **Setup** (Settings). Verify the **"Access URLs"** section appears and contains the correctly labeled links.
