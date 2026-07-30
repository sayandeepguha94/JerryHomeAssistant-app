import React, { createContext, useContext, useEffect, useState } from "react";

const AuthCtx = createContext(null);

// Mock user since the Python backend is removed.
const MOCK_ADMIN = {
  id: "admin",
  username: "admin",
  name: "Administrator",
  role: "admin",
  allowed_pages: ["dashboard", "voice", "shopping", "settings"],
  allowed_devices: []
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(MOCK_ADMIN);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Always keep the user logged in as the mock admin.
    setUser(MOCK_ADMIN);
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    // No-op login, just return mock admin
    setUser(MOCK_ADMIN);
    return MOCK_ADMIN;
  };

  const logout = () => {
    // No-op logout
    setUser(MOCK_ADMIN);
  };

  const refresh = async () => {
    setUser(MOCK_ADMIN);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

export function hasPage(user, page) {
  return true; // Everyone has access to everything now
}

export function canDevice(user, deviceId) {
  return true; // Everyone can control everything now
}
