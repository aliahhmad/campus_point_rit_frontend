import { useEffect, useId, useRef, useState } from "react";

export function Alert({ children, type = "danger" }) {
  return children ? (
    <div
      className={`alert alert-${type}`}
      role={type === "danger" ? "alert" : "status"}
    >
      {children}
    </div>
  ) : null;
}

export function Loading({ label = "Loading…" }) {
  return (
    <div className="py-5 text-center text-secondary" role="status">
      <span
        className="spinner-border spinner-border-sm me-2"
        aria-hidden="true"
      />
      {label}
    </div>
  );
}

export function Field({ label, hint, ...props }) {
  const id = useId();
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <input
        className="form-control"
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...props}
      />
      {hint && (
        <div id={`${id}-hint`} className="form-text">
          {hint}
        </div>
      )}
    </div>
  );
}

export function PasswordField({ label = "Password", hint, ...props }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <div className="input-group">
        <input
          className="form-control"
          id={id}
          type={visible ? "text" : "password"}
          aria-describedby={hint ? `${id}-hint` : undefined}
          {...props}
        />
        <button
          className="btn btn-outline-secondary"
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          aria-pressed={visible}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {hint && (
        <div id={`${id}-hint`} className="form-text">
          {hint}
        </div>
      )}
    </div>
  );
}

export function Submit({
  busy,
  children,
  className = "btn-primary",
  ...props
}) {
  return (
    <button
      type="submit"
      className={`btn ${className}`}
      disabled={busy}
      {...props}
    >
      {busy && (
        <span
          className="spinner-border spinner-border-sm me-2"
          aria-hidden="true"
        />
      )}
      {busy ? "Please wait…" : children}
    </button>
  );
}

export function PageHeading({
  eyebrow = "YOUR WORKSPACE",
  title,
  description,
  children,
}) {
  return (
    <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
      <div>
        <div className="eyebrow mb-2">{eyebrow}</div>
        <h1 className="page-title">{title}</h1>
        <p className="text-secondary mb-0">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, description, children, className = "" }) {
  return (
    <section className={`card ${className}`}>
      <div className="card-body p-4">
        {title && <h2 className="h5 mb-2">{title}</h2>}
        {description && <p className="text-secondary mb-4">{description}</p>}
        {children}
      </div>
    </section>
  );
}

export function Modal({ title, children, onClose, busy = false }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="app-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
        <h2 className="h5 mb-0" id={titleId}>
          {title}
        </h2>
        <button
          type="button"
          className="btn-close"
          aria-label="Close dialog"
          disabled={busy}
          onClick={onClose}
        />
      </div>
      {children}
    </dialog>
  );
}

export function ResourceError({ error, retry }) {
  return (
    <Alert>
      <div>{error}</div>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger mt-2"
        onClick={retry}
      >
        Try again
      </button>
    </Alert>
  );
}
