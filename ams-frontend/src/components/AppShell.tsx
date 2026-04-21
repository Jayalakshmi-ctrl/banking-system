import { Link, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AppShell() {
  const { user, logout, loading } = useAuth();
  if (loading) {
    return (
      <p className="centered" role="status" aria-live="polite">
        Loading…
      </p>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="top" role="banner">
        <Link to="/" className="brand">
          Apartment Maintenance
        </Link>
        <nav className="top-nav" aria-label="Primary">
          {user.role === "resident" && (
            <Link to="/resident">My complaints</Link>
          )}
          {user.role === "admin" && (
            <>
              <Link to="/admin">Complaints</Link>
              <Link to="/admin/staff">Staff</Link>
              <Link to="/admin/residents">Residents</Link>
            </>
          )}
          {user.role === "maintenance_staff" && (
            <Link to="/staff">Assigned work</Link>
          )}
          <span className="who">
            <span className="sr-only">Signed in as </span>
            {user.full_name}
            <span className="role-badge">{user.role.replace("_", " ")}</span>
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={logout}
          >
            Sign out
          </button>
        </nav>
      </header>
      <main id="main-content" className="main-region" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
