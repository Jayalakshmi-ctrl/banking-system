import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function HomePage() {
  const { user, loading } = useAuth();
  if (loading) {
    return <p className="centered">Loading</p>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === "admin") {
    return <Navigate to="/admin" replace />;
  }
  if (user.role === "maintenance_staff") {
    return <Navigate to="/staff" replace />;
  }
  return <Navigate to="/resident" replace />;
}
