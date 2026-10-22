import { useState } from "react";
import { useAuth } from "../auth/context";
import { api } from "../lib/api";
import { useResource, validatePassword } from "../lib/hooks";
import {
  Alert,
  Field,
  Loading,
  PageHeading,
  Panel,
  PasswordField,
  ResourceError,
  Submit,
} from "../components/UI";

export function ProfileForm({ account, onSaved, admin = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setError("");
    setMessage("");
    try {
      if (new TextEncoder().encode(values.password).length > 72)
        throw new Error("Your password must be no more than 72 bytes.");
      setBusy(true);
      const data = await api(`/users/${account.id}`, {
        method: "PUT",
        body: {
          ...values,
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          email: values.email.trim(),
        },
      });
      form.elements.password.value = "";
      setMessage("Profile updated successfully.");
      await onSaved?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <Alert>{error}</Alert>
      <Alert type="success">{message}</Alert>
      <fieldset disabled={busy}>
        <div className="row">
          <div className="col-sm-6">
            <Field
              label="First name"
              name="first_name"
              defaultValue={account.first_name}
              autoComplete="given-name"
              maxLength={30}
              pattern=".*\S.*"
              required
            />
          </div>
          <div className="col-sm-6">
            <Field
              label="Last name"
              name="last_name"
              defaultValue={account.last_name}
              autoComplete="family-name"
              maxLength={50}
              pattern=".*\S.*"
              required
            />
          </div>
        </div>
        <Field
          label="Email address"
          name="email"
          defaultValue={account.email}
          type="email"
          autoComplete="email"
          required
        />
        <PasswordField
          label={admin ? "Account password" : "Password"}
          name="password"
          autoComplete={admin ? "new-password" : "current-password"}
          required
          hint={
            admin
              ? "Enter the password this account should use after saving."
              : "Enter your existing password to keep it, or a new password to replace it."
          }
        />
        <div className="d-flex justify-content-end pt-2">
          <Submit busy={busy}>Save changes</Submit>
        </div>
      </fieldset>
    </form>
  );
}

function ChangePassword({ userId }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const { password, confirmation } = Object.fromEntries(new FormData(form));
    setError("");
    setMessage("");
    try {
      validatePassword(password, confirmation);
      setBusy(true);
      await api(`/users/${userId}/password`, {
        method: "POST",
        body: { password },
      });
      form.reset();
      setMessage("Your password has been changed.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <Alert>{error}</Alert>
      <Alert type="success">{message}</Alert>
      <fieldset disabled={busy}>
        <PasswordField
          label="New password"
          name="password"
          minLength={8}
          autoComplete="new-password"
          hint="At least 8 characters; maximum 72 bytes."
          required
        />
        <PasswordField
          label="Confirm new password"
          name="confirmation"
          minLength={8}
          autoComplete="new-password"
          required
        />
        <Submit busy={busy} className="btn-outline-dark">
          Update password
        </Submit>
      </fieldset>
    </form>
  );
}

function ProfileWallet() {
  const { data, loading, error, reload } = useResource("/wallet/me");

  return (
    <Panel title="My points and reputation" className="mt-4">
      {loading ? (
        <Loading label="Loading your points and reputation…" />
      ) : error ? (
        <ResourceError error={error} retry={reload} />
      ) : (
        <div role="status" aria-live="polite">
          <p className="display-5 fw-semibold text-primary mb-1">
            {data.available_points.toLocaleString()}
          </p>
          <p className="fw-semibold mb-2">Available points</p>
          <p className="text-secondary small">
            Creating a request reserves 5 points.
          </p>
          <hr />
          <p className="display-5 fw-semibold text-success mb-1">
            {data.reputation.toLocaleString()}
          </p>
          <p className="fw-semibold mb-3">Reputation</p>
        </div>
      )}
      {!error && (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={reload}
          disabled={loading}
        >
          Refresh
        </button>
      )}
    </Panel>
  );
}

export default function Profile() {
  const { user, reloadUser } = useAuth();
  return (
    <>
      <PageHeading
        title="My profile"
        description="A few details that make this account yours."
      />
      <div className="row g-4">
        <div className="col-xl-8">
          <Panel
            title="Personal information"
            description="Keep your name and contact information up to date."
          >
            <ProfileForm account={user} onSaved={reloadUser} />
          </Panel>
          <Panel
            title="Change password"
            description="Choose a strong password you don’t use elsewhere."
            className="mt-4"
          >
            <ChangePassword userId={user.id} />
          </Panel>
        </div>
        <div className="col-xl-4">
          <Panel>
            <div className="profile-avatar mb-3" aria-hidden="true">
              {user.first_name?.[0]}
              {user.last_name?.[0]}
            </div>
            <h2 className="h5">
              {user.first_name} {user.last_name}
            </h2>
            <p className="text-secondary text-break small">{user.email}</p>
            <hr />
            <dl className="profile-details mb-0">
              <div>
                <dt>Account ID</dt>
                <dd>#{user.id}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{user.isAdmin ? "Administrator" : "Member"}</dd>
              </div>
              <div>
                <dt>Workspace</dt>
                <dd>CampusPoint</dd>
              </div>
            </dl>
          </Panel>
          <ProfileWallet />
        </div>
      </div>
    </>
  );
}
