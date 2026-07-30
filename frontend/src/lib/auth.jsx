import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const AuthCtx = createContext(null);
const USER_KEY = "jerry_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    try {
      const res = await axios.post("/api/login", { username, password });
      if (res.data.success) {
        setUser(res.data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
        return res.data.user;
      }
      throw new Error("Login failed");
    } catch (err) {
      throw err.response?.data?.error || err.message;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_KEY);
  };

  const refresh = async () => {
    // Basic refresh from storage
    const saved = localStorage.getItem(USER_KEY);
    if (saved) setUser(JSON.parse(saved));
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
