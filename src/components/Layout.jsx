import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../auth/context";
import { Loading, ResourceError } from "./UI";

export function ProtectedRoute({ admin = false }) {
  const { user, loading, error, retry, logout } = useAuth();
  const location = useLocation();
  if (loading) return <Loading label="Opening your workspace…" />;
  if (error)
    return (
      <>
        <ResourceError error={error} retry={retry} />
        <button className="btn btn-outline-secondary" onClick={logout}>
          Return to sign in
        </button>
      </>
    );
  if (!user)
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  if (admin && !user.isAdmin)
    return (
      <div className="empty-state">
        <h1 className="h3">Administrator access required</h1>
        <p className="text-secondary">
          Your account doesn’t have access to this page.
        </p>
        <Link to="/profile" className="btn btn-primary">
          Back to my profile
        </Link>
      </div>
    );
  return <Outlet />;
}

export function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const heading = document.querySelector("main h1");
    document.title = `${heading?.textContent || "Your workspace"} | CampusPoint`;
    window.scrollTo(0, 0);
  }, [location.pathname, user]);
  function signOut() {
    logout();
    setOpen(false);
    navigate("/login", { replace: true });
  }
  function closeMenu() {
    setOpen(false);
  }
  const initials = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`
    : "CP";
  return (
    <div className="app-shell">
      <a className="visually-hidden-focusable skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="topbar navbar navbar-expand-md">
        <div className="container-fluid px-3 px-lg-4">
          <Link className="navbar-brand brand" to="/" onClick={closeMenu}>
            <span className="brand-mark" aria-hidden="true">
              <img src="/campuspoint.svg" alt="CampusPoint" className="brand-icon" />
            </span>
            CampusPoint<span className="brand-campus">RIT</span>
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={open}
            aria-controls="main-nav"
            onClick={() => setOpen(!open)}
          >
            <span className="navbar-toggler-icon" />
          </button>
          <nav
            id="main-nav"
            aria-label="Main navigation"
            className={`collapse navbar-collapse ${open ? "show" : ""}`}
          >
            <div className="navbar-nav ms-auto align-items-md-center gap-2">
              {user ? (
                <>
                  <span className="small text-secondary me-md-3">
                    {user.first_name} {user.last_name}
                  </span>
                  <span className="avatar d-none d-md-grid" aria-hidden="true">
                    {initials}
                  </span>
                  <button
                    className="btn btn-sm btn-outline-secondary ms-md-2"
                    onClick={signOut}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <NavLink className="nav-link" to="/login" onClick={closeMenu}>
                    Sign in
                  </NavLink>
                  <Link
                    className="btn btn-primary btn-sm px-3"
                    to="/register"
                    onClick={closeMenu}
                  >
                    Create account <span aria-hidden="true">↗</span>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>
      <div className={`workspace ${user ? "has-sidebar" : ""}`}>
        {user && (
          <aside className="sidebar">
            <div className="eyebrow mb-3">WORKSPACE</div>
            <nav
              aria-label="Workspace navigation"
              className="nav flex-column gap-1"
            >
              <NavLink to="/profile" className="nav-link" onClick={closeMenu}>
                <span aria-hidden="true">◉</span> My profile
              </NavLink>
              <NavLink to="/api-keys" className="nav-link" onClick={closeMenu}>
                <span aria-hidden="true">⌘</span> API keys
              </NavLink>
              {user.isAdmin && (
                <>
                  <div className="eyebrow mt-4 mb-2">ADMINISTRATION</div>
                  <NavLink
                    to="/admin/users"
                    className="nav-link"
                    onClick={closeMenu}
                  >
                    <span aria-hidden="true">▦</span> Manage users
                  </NavLink>
                </>
              )}
            </nav>
            <div className="sidebar-bottom">
              <div className="small fw-semibold">Your CampusPoint account</div>
              <div className="small text-secondary text-break mt-1">
                {user.email}
              </div>
              <span className="badge text-bg-light border mt-3">
                {user.isAdmin ? "Administrator" : "Member"}
              </span>
            </div>
          </aside>
        )}
        <main
          id="main-content"
          className={user ? "workspace-main" : "public-main"}
        >
          <Outlet key={location.pathname} />
        </main>
      </div>
      <footer className="app-footer">
        <span>
          CampusPoint <span className="text-secondary">/</span> Rochester
          Institute of Technology
        </span>
        <span>Your campus. Your connection.</span>
      </footer>
    </div>
  );
}
