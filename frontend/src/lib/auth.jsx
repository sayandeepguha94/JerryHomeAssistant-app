import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking; false = logged out; obj = logged in
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = localStorage.getItem("jerry_token");
      if (!t) { setUser(false); setLoading(false); return; }
      try {
        const r = await api.get("/auth/me");
        setUser(r.data);
      } catch {
        localStorage.removeItem("jerry_token");
        setUser(false);
      }
      setLoading(false);
    })();
  }, []);

  const login = async (username, password) => {
    const r = await api.post("/auth/login", { username, password });
    localStorage.setItem("jerry_token", r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const logout = () => {
    localStorage.removeItem("jerry_token");
    setUser(false);
  };

  const refresh = async () => {
    const r = await api.get("/auth/me");
    setUser(r.data);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

export function hasPage(user, page) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return (user.allowed_pages || []).includes(page);
}

export function canDevice(user, deviceId) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return (user.allowed_devices || []).includes(deviceId);
}
