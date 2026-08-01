import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./lib/auth";
import ServerSetup from "./pages/ServerSetup";
import Dashboard from "./pages/Dashboard";
import Shopping from "./pages/Shopping";
import Settings from "./pages/Settings";
import BottomNav from "./components/BottomNav";

function AppShell() {
  return (
    <>
      <Routes>
        {/* Isolated Home Access */}
        <Route path="/home" element={<Dashboard />} />

        {/* Isolated List Access */}
        <Route path="/list" element={<Shopping />} />

        {/* Admin Gateway (Full Access) */}
        <Route path="/admin">
          <Route index element={<Dashboard />} />
          <Route path="shopping" element={<Shopping />} />
          <Route path="settings" element={<Settings />} />
          <Route path="server-setup" element={<ServerSetup />} />
        </Route>

        {/* Default Redirects */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
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
