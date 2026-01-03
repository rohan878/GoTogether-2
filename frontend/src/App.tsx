import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./context/AuthContext";

import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChatPage from "./pages/ChatPage";
import CreateRidePage from "./pages/CreateRidePage";
import OtpPage from "./pages/OtpPage";
import UploadDocs from "./pages/UploadDocs";
import Verification from "./pages/Verification";
import AdminPanel from "./pages/AdminPanel";
import RideMonitoringPage from "./pages/RideMonitoringPage";
import RateRidePage from "./pages/RateRidePage";

function RequireAuth({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="p-6">Loading…</div>;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { token, loading } = useAuth();

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <Routes>
      <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/otp" element={<OtpPage />} />
      <Route path="/upload-docs" element={<UploadDocs />} />
      <Route path="/verification" element={<Verification />} />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/create-ride"
        element={
          <RequireAuth>
            <CreateRidePage />
          </RequireAuth>
        }
      />
      <Route
        path="/chat/:rideId"
        element={
          <RequireAuth>
            <ChatPage />
          </RequireAuth>
        }
      />
      <Route
        path="/monitoring"
        element={
          <RequireAuth>
            <RideMonitoringPage />
          </RequireAuth>
        }
      />

      <Route
        path="/rate/:rideId"
        element={
          <RequireAuth>
            <RateRidePage />
          </RequireAuth>
        }
      />

      <Route
        path="/settings"
        element={
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminPanel />
          </RequireAuth>
        }
      />

      <Route path="*" element={<div className="p-6">404 Not Found</div>} />
    </Routes>
  );
}
