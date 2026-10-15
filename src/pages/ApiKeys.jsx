import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatDate, useResource } from "../lib/hooks";
import {
  Alert,
  Field,
  Loading,
  Modal,
  PageHeading,
  ResourceError,
  Submit,
} from "../components/UI";

function KeyDialog({ action, base, onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const deleting = action.type === "delete";
  const creating = action.type === "create";
  async function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError("");
    try {
      let result;
      if (deleting)
        result = await api(`${base}/${action.key.id}`, { method: "DELETE" });
      else {
        const body = creating
          ? {
              name: values.name.trim(),
              scopes:
                values.scopes
                  ?.split(",")
                  .map((value) => value.trim())
                  .filter(Boolean) || [],
            }
          : { name: values.name.trim() };
        result = await api(creating ? base : `${base}/${action.key.id}`, {
          method: creating ? "POST" : "PATCH",
          body,
        });
      }
      onSaved(result);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        deleting
          ? "Delete API key?"
          : creating
            ? "Create an API key"
            : "Rename API key"
      }
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit}>
        <Alert>{error}</Alert>
        <fieldset disabled={busy}>
          {deleting ? (
            <p>
              Delete <strong>{action.key.name}</strong>? Applications using this
              key will lose access. This cannot be undone.
            </p>
          ) : (
            <>
              <Field
                label="Key name"
                name="name"
                defaultValue={action.key?.name || ""}
                maxLength={50}
                minLength={1}
                pattern=".*\S.*"
                placeholder="e.g. My campus project"
                required
              />
              {creating && (
                <Field
                  label="Scopes (optional)"
                  name="scopes"
                  hint="Separate scopes with commas. Leave blank for no specific scopes."
                  placeholder="read, write"
                />
              )}
            </>
          )}
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <Submit
              busy={busy}
              className={deleting ? "btn-danger" : "btn-primary"}
            >
              {deleting ? "Delete key" : creating ? "Create key" : "Save name"}
            </Submit>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

function SecretDialog({ secret, onClose }) {
  const [message, setMessage] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setMessage("Copied to clipboard.");
    } catch {
      setMessage("Select and copy the key below manually.");
    }
  }
  return (
    <Modal title="Your new API key" onClose={onClose}>
      <Alert type="warning">
        Copy this key now. You won’t be able to see it again after closing this
        window.
      </Alert>
      <label htmlFor="new-api-key" className="form-label">
        API key
      </label>
      <textarea
        id="new-api-key"
        className="form-control font-monospace mb-3"
        rows={3}
        readOnly
        value={secret}
        onFocus={(event) => event.target.select()}
      />
      <div className="small text-secondary mb-3" role="status">
        {message}
      </div>
      <div className="d-flex justify-content-end gap-2">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={copy}
        >
          Copy key
        </button>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          I’ve saved my key
        </button>
      </div>
    </Modal>
  );
}

export default function ApiKeys({ admin = false }) {
  const { userId } = useParams();
  if (admin && !/^[1-9]\d*$/.test(userId || ""))
    return (
      <Alert>
        That user ID is invalid. <Link to="/admin/users">Back to users</Link>
      </Alert>
    );
  return (
    <KeyList key={admin ? userId : "mine"} admin={admin} userId={userId} />
  );
}

function KeyList({ admin, userId }) {
  const base = admin ? `/users/keys/by-user/${userId}` : "/users/keys";
  const { data: keys, loading, error, reload } = useResource(base);
  const [action, setAction] = useState(null);
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);
  async function toggle(key) {
    setBusyId(key.id);
    setActionError("");
    setMessage("");
    try {
      await api(`${base}/${key.id}`, {
        method: "PATCH",
        body: { is_active: !key.is_active },
      });
      setMessage(`${key.name} ${key.is_active ? "deactivated" : "activated"}.`);
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  }
  function saved(result) {
    setMessage(
      action.type === "delete"
        ? "API key deleted."
        : action.type === "create"
          ? "API key created."
          : "API key renamed.",
    );
    setAction(null);
    if (result?.key) setSecret(result.key);
    reload();
  }
  return (
    <>
      {admin && (
        <Link className="small d-inline-block mb-3" to="/admin/users">
          ← Back to users
        </Link>
      )}
      <PageHeading
        eyebrow={admin ? "ADMINISTRATION" : undefined}
        title={admin ? `API keys · User #${userId}` : "API keys"}
        description={
          admin
            ? "Manage application access for this account."
            : "Connect your projects to CampusPoint."
        }
      >
        {!admin && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setActionError("");
              setAction({ type: "create" });
            }}
          >
            + Create API key
          </button>
        )}
      </PageHeading>
      <Alert type="success">{message}</Alert>
      <Alert>{actionError}</Alert>
      {error ? (
        <ResourceError error={error} retry={reload} />
      ) : loading ? (
        <Loading label="Loading API keys…" />
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-sm-6">
              <div className="stat-card">
                <span className="text-secondary small">Total keys</span>
                <strong>{keys?.length || 0}</strong>
              </div>
            </div>
            <div className="col-sm-6">
              <div className="stat-card">
                <span className="text-secondary small">Active keys</span>
                <strong>
                  {keys?.filter((key) => key.is_active).length || 0}
                </strong>
              </div>
            </div>
          </div>
          <section className="card">
            <div className="card-header bg-white p-4 d-flex justify-content-between align-items-center">
              <h2 className="h5 mb-0">
                {admin ? "User’s API keys" : "Your API keys"}
              </h2>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={reload}
              >
                Refresh
              </button>
            </div>
            {keys?.length ? (
              <div
                className="table-responsive"
                tabIndex={0}
                role="region"
                aria-label="API keys table; scroll sideways to see all columns and actions"
              >
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Name & scopes</th>
                      <th scope="col">Status</th>
                      <th scope="col">Created</th>
                      <th scope="col">Last used</th>
                      <th scope="col" className="text-end">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((key) => (
                      <tr key={key.id}>
                        <td>
                          <div className="fw-semibold text-break">
                            {key.name}
                          </div>
                          <div className="small text-secondary text-break">
                            {key.scopes?.length
                              ? key.scopes.join(", ")
                              : "No specific scopes"}
                          </div>
                          <div className="key-id mt-1">{key.id}</div>
                        </td>
                        <td>
                          <span
                            className={`badge ${key.is_active ? "text-bg-success" : "text-bg-secondary"}`}
                          >
                            {key.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="small text-secondary">
                          {formatDate(key.created_at)}
                        </td>
                        <td className="small text-secondary">
                          {formatDate(key.last_used_at)}
                        </td>
                        <td>
                          <div className="d-flex justify-content-end gap-2 flex-wrap">
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              aria-label={`Rename ${key.name}`}
                              disabled={Boolean(busyId)}
                              onClick={() => setAction({ type: "rename", key })}
                            >
                              Rename
                            </button>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              disabled={Boolean(busyId)}
                              aria-label={`${key.is_active ? "Deactivate" : "Activate"} ${key.name}`}
                              onClick={() => toggle(key)}
                            >
                              {busyId === key.id
                                ? "Saving…"
                                : key.is_active
                                  ? "Deactivate"
                                  : "Activate"}
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              disabled={Boolean(busyId)}
                              aria-label={`Delete ${key.name}`}
                              onClick={() => setAction({ type: "delete", key })}
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
            ) : (
              <div className="empty-state">
                <div className="empty-symbol" aria-hidden="true">
                  ⌘
                </div>
                <h3 className="h5">No API keys yet</h3>
                <p className="text-secondary">
                  {admin
                    ? "This user hasn’t created any API keys."
                    : "Create a key when you’re ready to connect an application."}
                </p>
                {!admin && (
                  <button
                    className="btn btn-primary"
                    onClick={() => setAction({ type: "create" })}
                  >
                    Create your first key
                  </button>
                )}
              </div>
            )}
          </section>
        </>
      )}
      {action && (
        <KeyDialog
          action={action}
          base={base}
          onClose={() => setAction(null)}
          onSaved={saved}
        />
      )}
      {secret && <SecretDialog secret={secret} onClose={() => setSecret("")} />}
    </>
  );
}
