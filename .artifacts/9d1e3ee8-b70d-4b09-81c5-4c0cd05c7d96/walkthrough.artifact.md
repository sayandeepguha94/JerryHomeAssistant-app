# Walkthrough: Gateway Portal & Mode-Based Security

I have transformed the application into a secure gateway portal that allows you to choose between three specialized access modes, each protected by its own password.

## Key Features

### 1. Unified Gateway Portal
When you visit the main URL (`/`), you are now greeted by a selection screen:
- **Home Dashboard**: Restricted view for controlling physical devices.
- **Household List**: Restricted view for the shopping list.
- **Admin Gateway**: Full access to all features, including system configuration.

### 2. Mode-Specific Passwords
Each mode is protected by a dedicated password:
- **Home**: `home0466`
- **List**: `list0466`
- **Admin**: `admin0466` (Master access)

### 3. Dynamic Security Management
In the **Setup** (Settings) page (when accessed via `/admin`), you can now:
- **Manage Passwords**: View and update the passwords for all three modes in real-time.
- **Access Direct URLs**: See and copy the exact URLs for each mode for easy sharing.
- **Logout**: Securely clear your current session tokens to return to the portal.

### 4. Robust Mode Protection
The application router now enforces specific "Session Tokens" for each mode. Even if someone tries to type `/admin` or `/list` directly in the browser, they will be redirected to the portal to enter the correct password.

## How to Verify

1.  **Clean Rebuild**:
    ```bash
    sudo docker compose down --remove-orphans
    sudo docker compose up -d --build
    ```
2.  **Test the Portal**:
    - Visit `http://192.168.29.112:3000`.
    - Select "Home Dashboard" and enter `home0466`.
    - Verify you land on the dashboard and **cannot** navigate to the shopping list or settings.
3.  **Test Admin Mode**:
    - Return to the portal (or visit `/admin`).
    - Enter `admin0466`.
    - Verify you have full navigation and can access **Settings**.
4.  **Manage Passwords**:
    - While in `/admin`, go to **Setup**.
    - Find the **"Security & Passwords"** section.
    - Change a password and verify it takes effect immediately.
