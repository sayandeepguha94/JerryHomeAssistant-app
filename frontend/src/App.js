import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./lib/auth";
import ServerSetup from "./pages/ServerSetup";
import Dashboard from "./pages/Dashboard";
import Shopping from "./pages/Shopping";
import Settings from "./pages/Settings";
import Portal from "./pages/Portal";
import BottomNav from "./components/BottomNav";

function Protected({ children, mode }) {
  const { tokens } = useAuth();
  const location = useLocation();

  // If we have the admin token, we can see everything
  if (tokens.admin) return children;

  // Otherwise check for specific mode token
  if (mode && tokens[mode]) return children;

  // No valid token for this route, go to portal
  return <Navigate to="/" state={{ from: location }} replace />;
}

function FullScreen({ children }) {
  return (
    <div className="fixed inset-0 grid place-items-center text-white/60 font-body bg-[#0B0C10]">{children}</div>
  );
}

function AppShell() {
  return (
    <>
      <Routes>
        {/* Gateway Portal */}
        <Route path="/" element={<Portal />} />

        {/* Isolated Home Access */}
        <Route path="/home" element={<Protected mode="home"><Dashboard /></Protected>} />

        {/* Isolated List Access */}
        <Route path="/list" element={<Protected mode="list"><Shopping /></Protected>} />

        {/* Admin Gateway (Full Access) */}
        <Route path="/admin">
          <Route index element={<Protected mode="admin"><Dashboard /></Protected>} />
          <Route path="shopping" element={<Protected mode="admin"><Shopping /></Protected>} />
          <Route path="settings" element={<Settings />} /> {/* Settings stays open as requested */}
          <Route path="server-setup" element={<ServerSetup />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
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
