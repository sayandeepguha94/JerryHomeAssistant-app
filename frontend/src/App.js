import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./lib/auth";
import { getServerUrl } from "./lib/api";
import ServerSetup from "./pages/ServerSetup";
import Dashboard from "./pages/Dashboard";
import Shopping from "./pages/Shopping";
import Settings from "./pages/Settings";
import BottomNav from "./components/BottomNav";

function Protected({ children }) {
  const { loading } = useAuth();
  if (!getServerUrl()) return <Navigate to="/server-setup" replace />;
  if (loading) return <FullScreen>Loading…</FullScreen>;
  return children;
}

function FullScreen({ children }) {
  return (
    <div className="fixed inset-0 grid place-items-center text-white/60 font-body">{children}</div>
  );
}

function AppShell() {
  const { user, loading } = useAuth();
  const hasServer = !!getServerUrl();
  if (loading) return <FullScreen>Loading…</FullScreen>;
  return (
    <>
      <Routes>
        <Route path="/server-setup" element={<ServerSetup />} />
        <Route path="/" element={<Protected><Dashboard /></Protected>} />
        <Route path="/shopping" element={<Protected><Shopping /></Protected>} />
        <Route path="/settings" element={<Protected><Settings /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {user && hasServer && <BottomNav />}
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
