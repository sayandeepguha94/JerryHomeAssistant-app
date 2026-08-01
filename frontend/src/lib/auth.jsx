import React, { createContext, useContext, useState } from "react";
import { api } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  // Store tokens for different modes
  const [tokens, setTokens] = useState({
    home: localStorage.getItem("jerry_home_token"),
    list: localStorage.getItem("jerry_list_token"),
    admin: localStorage.getItem("jerry_admin_token")
  });

  const validateGateway = async (mode, password) => {
    try {
      const res = await api.post("/auth/verify", { mode, password });
      if (res.data.success) {
        const { token } = res.data;
        localStorage.setItem(`jerry_${mode}_token`, token);
        setTokens(prev => ({ ...prev, [mode]: token }));
        return true;
      }
      return false;
    } catch (err) {
      throw err.response?.data?.error || "Validation failed";
    }
  };

  const logout = () => {
    localStorage.removeItem("jerry_home_token");
    localStorage.removeItem("jerry_list_token");
    localStorage.removeItem("jerry_admin_token");
    setTokens({ home: null, list: null, admin: null });
  };

  // Mock user object for existing code compatibility
  const user = tokens.admin ? { role: "admin", name: "System Admin" } : null;

  return (
    <AuthCtx.Provider value={{ tokens, validateGateway, logout, user }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
