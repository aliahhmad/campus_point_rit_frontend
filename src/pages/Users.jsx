import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/context";
import { api } from "../lib/api";
import { useResource } from "../lib/hooks";
import {
  Alert,
  Loading,
  Modal,
  PageHeading,
  ResourceError,
  Submit,
} from "../components/UI";
import { ProfileForm } from "./Profile";

const actionCopy = {
  ban: [
    "Ban user?",
    "This user will lose access to their account.",
    "Ban user",
  ],
  unban: [
    "Unban user?",
    "This user will be able to access their account again.",
    "Unban user",
  ],
  "make-admin": [
    "Make administrator?",
    "This user will be able to manage other users and resolve conflicted requests.",
    "Make administrator",
  ],
  delete: [
    "Delete user?",
    "The account will be permanently deleted. This cannot be undone.",
    "Delete user",
  ],
};

function UserAction({ action, onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [title, description, button] = actionCopy[action.type];
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        `/users/${action.user.id}${action.type === "delete" ? "" : `/${action.type}`}`,
        { method: action.type === "delete" ? "DELETE" : "POST" },
      );
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return (
    <Modal title={title} onClose={onClose} busy={busy}>
      <Alert>{error}</Alert>
      <p className="fw-semibold text-break mb-2">
        {action.user.first_name} {action.user.last_name} · {action.user.email}
      </p>
      <p className="text-secondary">{description}</p>
      <form onSubmit={submit}>
        <div className="d-flex justify-content-end gap-2 mt-4">
          <button
            className="btn btn-outline-secondary"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <Submit
            busy={busy}
            className={
              ["delete", "ban"].includes(action.type)
                ? "btn-danger"
                : "btn-primary"
            }
          >
            {button}
          </Submit>
        </div>
      </form>
    </Modal>
  );
}

export default function Users() {
  const [params, setParams] = useSearchParams();
  const [action, setAction] = useState(null);
  const [message, setMessage] = useState("");
  const { user, reloadUser, logout } = useAuth();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const term = params.get("q") || "";
  const field = params.get("field") || "all";
  const exact = params.get("exact") === "true";
  const query = new URLSearchParams({ page: String(page), size: "10" });
  if (term) {
    query.set("search_term", term);
    query.set("field", field);
    query.set("exact_match", String(exact));
  }
  const path = `${term ? "/users/search" : "/users/"}?${query}`;
  function search(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setParams({
      q: data.q.trim(),
      field: data.field,
      exact: String(data.exact === "on"),
      page: "1",
    });
  }
  async function saved() {
    const changedSelf = action.user.id === user.id;
    if (changedSelf && action.type === "delete") {
      logout();
      return;
    }
    setMessage(
      action.type === "edit"
        ? "User details updated."
        : "User updated successfully.",
    );
    setAction(null);
    if (changedSelf && action.type === "edit") await reloadUser();
  }
  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION"
        title="Manage users"
        description="Look after your CampusPoint community."
      />
      <Alert type="success">{message}</Alert>
      <section className="card mb-4">
        <div className="card-body p-4">
          <form
            onSubmit={search}
            className="row g-3 align-items-end"
            key={`${term}-${field}-${exact}`}
          >
            <div className="col-lg-5">
              <label htmlFor="user-search" className="form-label">
                Search users
              </label>
              <input
                className="form-control"
                id="user-search"
                type="search"
                name="q"
                placeholder="Search by name or email…"
                defaultValue={term}
                maxLength={100}
              />
            </div>
            <div className="col-sm-5 col-lg-3">
              <label htmlFor="search-field" className="form-label">
                Search in
              </label>
              <select
                className="form-select"
                id="search-field"
                name="field"
                defaultValue={field}
              >
                <option value="all">All fields</option>
                <option value="email">Email</option>
                <option value="first_name">First name</option>
                <option value="last_name">Last name</option>
              </select>
            </div>
            <div className="col-sm-7 col-lg-4">
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <button className="btn btn-primary" type="submit">
                  Search
                </button>
                <div className="form-check mb-0">
                  <input
                    className="form-check-input"
                    id="exact-match"
                    name="exact"
                    type="checkbox"
                    defaultChecked={exact}
                  />
                  <label
                    htmlFor="exact-match"
                    className="form-check-label small"
                  >
                    Exact match
                  </label>
                </div>
                {term && (
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0"
                    onClick={() => setParams({})}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </section>
      <UserResults
        key={`${path}-${message}`}
        path={path}
        page={page}
        term={term}
        onPage={(next) => {
          const nextParams = new URLSearchParams(params);
          nextParams.set("page", String(next));
          setParams(nextParams);
        }}
        onAction={(next) => {
          setMessage("");
          setAction(next);
        }}
        currentUserId={user.id}
      />
      {action?.type === "edit" ? (
        <Modal
          title={`Edit user #${action.user.id}`}
          onClose={() => setAction(null)}
        >
          <ProfileForm account={action.user} admin onSaved={saved} />
        </Modal>
      ) : (
        action && (
          <UserAction
            action={action}
            onClose={() => setAction(null)}
            onSaved={saved}
          />
        )
      )}
    </>
  );
}

function UserResults({ path, page, term, onPage, onAction, currentUserId }) {
  const { data, loading, error, reload } = useResource(path);
  if (loading) return <Loading label="Loading users…" />;
  if (error) return <ResourceError error={error} retry={reload} />;
  const users = data?.items || [];
  return (
    <section className="card">
      <div className="card-header bg-white p-4 d-flex justify-content-between align-items-center gap-3">
        <div className="d-flex align-items-center gap-2">
          <h2 className="h5 mb-0">{term ? "Search results" : "All users"}</h2>
          <span className="badge rounded-pill text-bg-light border">
            {data?.total || 0}
          </span>
        </div>
        <button className="btn btn-sm btn-outline-secondary" onClick={reload}>
          Refresh
        </button>
      </div>
      {users.length ? (
        <>
          <div className="small text-secondary d-md-none px-4 py-2 border-bottom">
            Scroll sideways to see all columns and actions.
          </div>
          <div
            className="table-responsive"
            tabIndex={0}
            role="region"
            aria-label="Users table"
          >
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">User</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <div className="fw-semibold">
                        {account.first_name} {account.last_name}
                        {account.id === currentUserId && (
                          <span className="badge text-bg-light border ms-2">
                            You
                          </span>
                        )}
                      </div>
                      <div className="small text-secondary text-break">
                        {account.email}
                      </div>
                      <div className="key-id mt-1">#{account.id}</div>
                    </td>
                    <td>
                      <span
                        className={`badge ${account.role === "admin" ? "role-admin" : "text-bg-light border"}`}
                      >
                        {account.role === "admin" ? "Administrator" : "Member"}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-1 flex-wrap">
                        <span
                          className={`badge ${account.banned ? "text-bg-danger" : "text-bg-success"}`}
                        >
                          {account.banned ? "Banned" : "Active"}
                        </span>
                        {!account.verified && (
                          <span className="badge text-bg-warning">
                            Unverified
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="d-flex justify-content-end gap-2 flex-wrap">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          aria-label={`Edit ${account.email}`}
                          onClick={() =>
                            onAction({ type: "edit", user: account })
                          }
                        >
                          Edit
                        </button>
                        {account.role !== "admin" && (
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() =>
                              onAction({ type: "make-admin", user: account })
                            }
                            aria-label={`Make ${account.email} administrator`}
                          >
                            Make admin
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          disabled={account.id === currentUserId}
                          title={
                            account.id === currentUserId
                              ? "You cannot ban or unban yourself"
                              : undefined
                          }
                          aria-label={`${account.banned ? "Unban" : "Ban"} ${account.email}`}
                          onClick={() =>
                            onAction({
                              type: account.banned ? "unban" : "ban",
                              user: account,
                            })
                          }
                        >
                          {account.banned ? "Unban" : "Ban"}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          aria-label={`Delete ${account.email}`}
                          onClick={() =>
                            onAction({ type: "delete", user: account })
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-footer bg-white p-3 d-flex justify-content-between align-items-center gap-3 flex-wrap">
            <span className="small text-secondary">
              Page {page} of {Math.max(1, data.pages)} · {data.total} users
            </span>
            <nav aria-label="User list pagination" className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => onPage(page - 1)}
              >
                ← Previous
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= data.pages}
                onClick={() => onPage(page + 1)}
              >
                Next →
              </button>
            </nav>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <h3 className="h5">No users found</h3>
          <p className="text-secondary">
            {term
              ? "Try a different name, email, or search filter."
              : "There are no users on this page."}
          </p>
          {page > 1 && (
            <button className="btn btn-primary" onClick={() => onPage(1)}>
              Back to first page
            </button>
          )}
        </div>
      )}
    </section>
  );
}
