import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth, hasPage } from "./lib/auth";
import { getServerUrl } from "./lib/api";
import Login from "./pages/Login";
import ServerSetup from "./pages/ServerSetup";
import Dashboard from "./pages/Dashboard";
import Shopping from "./pages/Shopping";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import BottomNav from "./components/BottomNav";

function Protected({ page, adminOnly, children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (!getServerUrl()) return <Navigate to="/server-setup" replace />;
  if (loading) return <FullScreen>Loading…</FullScreen>;
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;
  if (page && !hasPage(user, page)) return <Navigate to="/" replace />;
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
        <Route path="/login" element={
          !hasServer
            ? <Navigate to="/server-setup" replace />
            : user ? <Navigate to="/" replace /> : <Login />
        } />
        <Route path="/" element={<Protected page="dashboard"><Dashboard /></Protected>} />
        <Route path="/shopping" element={<Protected page="shopping"><Shopping /></Protected>} />
        <Route path="/settings" element={<Protected page="settings"><Settings /></Protected>} />
        <Route path="/users" element={<Protected adminOnly><Users /></Protected>} />
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
