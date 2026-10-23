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
        to="/signin"
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
  const isHomepage = location.pathname === "/";
  const showSidebar = Boolean(user) && !isHomepage;
  useEffect(() => {
    const heading = document.querySelector("main h1");
    document.title = isHomepage
      ? "CampusPoint | Your campus. Your connection."
      : `${heading?.textContent || "Your workspace"} | CampusPoint`;
    window.scrollTo(0, 0);
  }, [location.pathname, user, isHomepage]);
  function signOut() {
    logout();
    setOpen(false);
    navigate("/signin", { replace: true });
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
      <header className="topbar navbar navbar-expand-lg">
        <div className="container-fluid px-3 px-lg-4">
          <Link className="navbar-brand brand" to="/" onClick={closeMenu}>
            <span className="brand-mark" aria-hidden="true">
              <img
                src="/campuspoint.svg"
                alt="CampusPoint"
                className="brand-icon"
              />
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
            <div className="topbar-nav">
              <div className="navbar-nav topbar-links">
                {isHomepage ? (
                  <>
                    <a
                      className="nav-link"
                      href="#how-it-works"
                      onClick={closeMenu}
                    >
                      How it works
                    </a>
                    <a
                      className="nav-link"
                      href="#technology"
                      onClick={closeMenu}
                    >
                      The technology
                    </a>
                  </>
                ) : (
                  <NavLink className="nav-link" to="/" onClick={closeMenu}>
                    Home
                  </NavLink>
                )}
              </div>
              <div className="topbar-actions">
                {user ? (
                  <>
                    {isHomepage && (
                      <Link
                        className="btn btn-primary btn-sm"
                        to="/requests"
                        onClick={closeMenu}
                      >
                        Open workspace <span aria-hidden="true">↗</span>
                      </Link>
                    )}
                    <div className="topbar-account">
                      <span className="topbar-name small text-secondary">
                        {user.first_name} {user.last_name}
                      </span>
                      <span className="avatar" aria-hidden="true">
                        {initials}
                      </span>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={signOut}
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <NavLink className="nav-link" to="/signin" onClick={closeMenu}>
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
            </div>
          </nav>
        </div>
      </header>
      <div className={`workspace ${showSidebar ? "has-sidebar" : ""}`}>
        {showSidebar && (
          <aside className="sidebar">
            <div className="eyebrow mb-3">WORKSPACE</div>
            <nav
              aria-label="Workspace navigation"
              className="nav flex-column gap-1"
            >
              <NavLink to="/requests" className="nav-link" onClick={closeMenu}>
                <span aria-hidden="true">▤</span> Campus requests
              </NavLink>
              <NavLink to="/profile" className="nav-link" onClick={closeMenu}>
                <span aria-hidden="true">◉</span> My profile
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
                  <NavLink
                    to="/admin/conflicted-requests"
                    className="nav-link"
                    onClick={closeMenu}
                  >
                    <span aria-hidden="true">⚑</span> Conflicted requests
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
          className={isHomepage ? "landing-main" : user ? "workspace-main" : "public-main"}
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
