import React, { createContext, useContext, useState } from "react";

const AuthCtx = createContext(null);

const ADMIN_USER = {
  id: "admin-1",
  name: "System Admin",
  username: "admin",
  role: "admin",
  allowed_pages: ["dashboard", "shopping", "settings"],
  allowed_devices: []
};

export function AuthProvider({ children }) {
  // Always initialize as Admin
  const [user] = useState(ADMIN_USER);
  const [loading] = useState(false);

  const login = async () => {
    return ADMIN_USER;
  };

  const logout = () => {
    // No-op for direct access mode
  };

  const refresh = async () => {
    // No-op
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

export function hasPage(user, page) {
  return true; // Full access for Admin mode
}

export function canDevice(user, deviceId) {
  return true; // Full control for Admin mode
}
