# Walkthrough: Universal Logout & Smart Admin Security

I have implemented a more robust security model that ensures you are never locked out of your system while providing easy navigation for restricted users.

## Key Improvements

### 1. Conditional Admin Bypass
I have refined the Admin Gateway security logic:
- **Default State**: If you haven't set a custom Admin password yet, the hardcoded **`admin0466`** will grant you access.
- **Custom State**: Once you set a specific password for the Admin Gateway in the **Setup** page, the hardcoded `admin0466` will be **disabled**. This ensures your system is only accessible via your chosen secret.
- **Self-Healing**: If you clear the Admin password in Setup (leave it empty), the master `admin0466` bypass will automatically reactivate.

### 2. Universal Logout Buttons
Added a red **Logout** icon to the top-right of every major page:
- **Home Dashboard**: Restricted users can now exit and return to the Portal selection screen without refreshing.
- **Household List**: Users in shopping mode have a quick exit button.
- **Admin View**: Provides a consistent way to clear all sessions and return to the main gate.

### 3. Streamlined Settings
Updated the **Setup** page to allow the Admin password to be cleared easily. This gives you full control over when the "Master Bypass" is active.

## How to Verify

1.  **Restart with a Clean Build**:
    ```bash
    sudo docker compose down --remove-orphans
    sudo docker compose build --no-cache
    sudo docker compose up -d
    ```
2.  **Test Admin Bypass**:
    - Access the Portal.
    - Select **Admin Gateway**.
    - Enter `admin0466`.
    - **Expected**: Successful entry (assuming no password was previously saved).
3.  **Test Custom Password**:
    - Go to **Setup**.
    - Set Admin Password to `mypass123`.
    - Save and click the Logout icon in the header.
    - Try `admin0466` again.
    - **Expected**: Validation Failed.
    - Enter `mypass123`.
    - **Expected**: Success.
4.  **Test Universal Logout**:
    - Access `/home` with `home0466`.
    - Click the red Logout icon in the top-right.
    - Verify you are returned to the Portal.
