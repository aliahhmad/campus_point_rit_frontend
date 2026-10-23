import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../auth/context";
import { api } from "../lib/api";
import { validatePassword } from "../lib/hooks";
import { Alert, Field, Loading, PasswordField, Submit } from "../components/UI";

function AuthFrame({
  title,
  description,
  children,
  step = "YOUR CAMPUS CONNECTION",
}) {
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <div className="eyebrow text-white-50">CAMPUSPOINT / RIT</div>
        <div className="auth-story-main">
          <div className="story-symbol" aria-hidden="true">
            ↗
          </div>
          <h2>
            A little closer
            <br />
            to your campus.
          </h2>
          <p>
            Your account is the starting point.
            <br />
            Make yourself at home.
          </p>
        </div>
        <div className="story-bottom">
          <span className="story-dot" /> Built for the RIT community
        </div>
        <div className="campus-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
      <section className="auth-form-area">
        <div className="auth-form">
          <div className="eyebrow mb-3">{step}</div>
          <h1>{title}</h1>
          <p className="text-secondary mb-4">{description}</p>
          {children}
        </div>
      </section>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError("");
    try {
      await login({ email: values.email.trim(), password: values.password });
      const from = location.state?.from;
      navigate(
        typeof from === "string" &&
          from.startsWith("/") &&
          !from.startsWith("//")
          ? from
          : "/profile",
        { replace: true },
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      title="Welcome back."
      description="Sign in to your CampusPoint account."
    >
      <Alert>{error}</Alert>
      <Alert type="success">{location.state?.message}</Alert>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <Field
            label="Email address"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="you@rit.edu"
            required
          />
          <PasswordField
            name="password"
            autoComplete="current-password"
            required
          />
          <div className="text-end mb-4">
            <Link className="small" to="/forgot-password">
              Forgot your password?
            </Link>
          </div>
          <Submit busy={busy} className="btn-primary w-100">
            Sign in <span aria-hidden="true">→</span>
          </Submit>
        </fieldset>
      </form>
      <div className="auth-divider" />
      <p className="small text-secondary">
        New to CampusPoint? <Link to="/register">Create an account</Link>
      </p>
      <p className="small text-secondary mb-0">
        Have a verification code? <Link to="/verify">Verify your email</Link>
      </p>
    </AuthFrame>
  );
}

export function Register() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    const { confirmation, ...values } = Object.fromEntries(
      new FormData(event.currentTarget),
    );
    setError("");
    try {
      validatePassword(values.password, confirmation);
      setBusy(true);
      await api("/register/", {
        method: "POST",
        body: {
          ...values,
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          email: values.email.trim(),
        },
        auth: false,
      });
      navigate("/verify", { state: { email: values.email }, replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      title="Make yourself at home."
      description="Create your account to get started."
      step="JOIN THE COMMUNITY"
    >
      <Alert>{error}</Alert>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <div className="row">
            <div className="col-sm-6">
              <Field
                label="First name"
                name="first_name"
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
            type="email"
            autoComplete="email"
            placeholder="you@rit.edu"
            required
          />
          <PasswordField
            name="password"
            autoComplete="new-password"
            minLength={8}
            hint="At least 8 characters; maximum 72 bytes."
            required
          />
          <PasswordField
            label="Confirm password"
            name="confirmation"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <Submit busy={busy} className="btn-primary w-100 mt-2">
            Create account <span aria-hidden="true">→</span>
          </Submit>
        </fieldset>
      </form>
      <p className="small text-secondary mt-4 mb-0">
        Already have an account? <Link to="/signin">Sign in</Link>
      </p>
    </AuthFrame>
  );
}

export function ForgotPassword() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email").trim();
    setBusy(true);
    setError("");
    try {
      await api("/forgot-password/", {
        method: "POST",
        body: { email },
        auth: false,
      });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      title={sent ? "Check your inbox." : "Let’s get you back in."}
      description={
        sent
          ? "If an account exists for that email, a password reset link is on its way."
          : "Enter your email and we’ll send a link to reset your password."
      }
    >
      <Alert>{error}</Alert>
      {sent ? (
        <>
          <Alert type="success">
            The reset link expires after 30 minutes. Check your spam folder if
            you don’t see it.
          </Alert>
          <button
            className="btn btn-outline-secondary w-100"
            onClick={() => setSent(false)}
          >
            Try another email
          </button>
        </>
      ) : (
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            <Field
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
            <Submit busy={busy} className="btn-primary w-100 mt-2">
              Send reset link
            </Submit>
          </fieldset>
        </form>
      )}
      <Link className="d-inline-block mt-4 small" to="/signin">
        ← Back to sign in
      </Link>
    </AuthFrame>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const code = params.get("code") || "";
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setError("");
    try {
      validatePassword(values.password, values.confirmation);
      setBusy(true);
      await api("/reset-password/", {
        method: "POST",
        body: {
          code: code || values.code.trim(),
          new_password: values.password,
        },
        auth: false,
      });
      logout();
      navigate("/signin", {
        state: {
          message:
            "Your password has been reset. Sign in with your new password.",
        },
        replace: true,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      title="A fresh start."
      description="Choose a new password for your account."
    >
      <Alert>{error}</Alert>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          {!code && (
            <Field
              label="Reset code"
              name="code"
              autoComplete="off"
              hint="Open the link in your reset email or paste its code here."
              required
            />
          )}
          <PasswordField
            label="New password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            hint="At least 8 characters; maximum 72 bytes."
            required
          />
          <PasswordField
            label="Confirm new password"
            name="confirmation"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <Submit busy={busy} className="btn-primary w-100 mt-2">
            Reset password
          </Submit>
        </fieldset>
      </form>
      <p className="small mt-4 text-secondary mb-0">
        Link expired? <Link to="/forgot-password">Request a new one</Link>
      </p>
      <Link className="d-inline-block mt-3 small" to="/signin">
        ← Back to sign in
      </Link>
    </AuthFrame>
  );
}

// StrictMode mounts effects twice in development. Reuse an in-flight check so a
// valid one-time code is never immediately submitted a second time.
const verifications = new Map();
function verifyCode(code) {
  if (!verifications.has(code)) {
    const request = api(`/verify/?code=${encodeURIComponent(code)}`, {
      auth: false,
    });
    verifications.set(code, request);
    request.then(
      () => {
        verifications.delete(code);
      },
      () => {
        verifications.delete(code);
      },
    );
  }
  return verifications.get(code);
}

export function VerifyEmail() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const code = params.get("code") || "";
  const [result, setResult] = useState({ code: "", success: false, error: "" });
  const [attempt, setAttempt] = useState(0);
  const busy = Boolean(code && result.code !== code);
  useEffect(() => {
    let active = true;
    if (code)
      verifyCode(code)
        .then(() => {
          if (active) setResult({ code, success: true, error: "" });
        })
        .catch((err) => {
          if (active) setResult({ code, success: false, error: err.message });
        });
    return () => {
      active = false;
    };
  }, [code, attempt]);
  function submit(event) {
    event.preventDefault();
    setParams({ code: new FormData(event.currentTarget).get("code").trim() });
    setResult({ code: "", success: false, error: "" });
    setAttempt((value) => value + 1);
  }
  return (
    <AuthFrame
      title={result.success ? "You’re all set." : "Verify your email."}
      description={
        result.success
          ? "Your email is verified. You can now sign in to CampusPoint."
          : location.state?.email
            ? `We’ve sent a verification link to ${location.state.email}. Open it to activate your account.`
            : "Open the link in your verification email to activate your account, or enter its code below."
      }
    >
      {busy ? (
        <Loading label="Verifying your email…" />
      ) : result.success ? (
        <>
          <Alert type="success">Email verified successfully.</Alert>
          <Link className="btn btn-primary w-100" to="/signin">
            Continue to sign in →
          </Link>
        </>
      ) : (
        <>
          <Alert>{result.error}</Alert>
          <form onSubmit={submit}>
            <Field
              label="Verification code"
              name="code"
              defaultValue={code}
              autoComplete="off"
              hint="You can also paste the code from your verification link."
              required
            />
            <Submit busy={busy} className="btn-primary w-100">
              Verify email
            </Submit>
          </form>
          <p className="small text-secondary mt-4">
            The link expires after 10 minutes. Check your spam folder if the
            email hasn’t arrived.
          </p>
          <Link className="small" to="/signin">
            ← Back to sign in
          </Link>
        </>
      )}
    </AuthFrame>
  );
}
