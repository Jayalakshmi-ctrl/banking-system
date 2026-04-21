import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppShell } from "./components/AppShell";
import { RequireRole } from "./components/RequireRole";
import { AdminPage } from "./pages/AdminPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { ManageResidentsPage } from "./pages/ManageResidentsPage";
import { ManageStaffPage } from "./pages/ManageStaffPage";
import { ResidentPage } from "./pages/ResidentPage";
import { StaffPage } from "./pages/StaffPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomePage />} />
          <Route element={<AppShell />}>
            <Route
              path="/resident"
              element={
                <RequireRole role="resident">
                  <ResidentPage />
                </RequireRole>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireRole role="admin">
                  <AdminPage />
                </RequireRole>
              }
            />
            <Route
              path="/admin/staff"
              element={
                <RequireRole role="admin">
                  <ManageStaffPage />
                </RequireRole>
              }
            />
            <Route
              path="/admin/residents"
              element={
                <RequireRole role="admin">
                  <ManageResidentsPage />
                </RequireRole>
              }
            />
            <Route
              path="/staff"
              element={
                <RequireRole role="maintenance_staff">
                  <StaffPage />
                </RequireRole>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
