import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./lib/auth";
import { getServerUrl } from "./lib/api";
import ServerSetup from "./pages/ServerSetup";
import Dashboard from "./pages/Dashboard";
import Shopping from "./pages/Shopping";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import BottomNav from "./components/BottomNav";

import Users from "./pages/Users";

function Protected({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreen>Loading…</FullScreen>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

function FullScreen({ children }) {
  return (
    <div className="fixed inset-0 grid place-items-center text-white/60 font-body bg-[#0B0C10]">{children}</div>
  );
}

function AppShell() {
  const { user, loading } = useAuth();
  console.log("[Jerry] AppShell render", { user: !!user, loading });
  if (loading) return <FullScreen>Loading…</FullScreen>;
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/server-setup" element={<Protected><ServerSetup /></Protected>} />
        <Route path="/" element={<Protected><Dashboard /></Protected>} />
        <Route path="/shopping" element={<Protected><Shopping /></Protected>} />
        <Route path="/users" element={<Protected adminOnly><Users /></Protected>} />
        <Route path="/settings" element={<Protected><Settings /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {user && <BottomNav />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
        <Toaster
          position="top-center"
          theme="dark"
          toastOptions={{
            style: {
              background: "rgba(20,20,22,0.9)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "white",
              backdropFilter: "blur(12px)",
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
