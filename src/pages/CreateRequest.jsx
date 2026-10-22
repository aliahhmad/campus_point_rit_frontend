import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/context";
import { api } from "../lib/api";
import { useResource } from "../lib/hooks";
import {
  Alert,
  Field,
  Loading,
  PageHeading,
  Panel,
  ResourceError,
  Submit,
} from "../components/UI";

function restoreSubmission(key) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key));
    return saved?.key && saved?.payload ? saved : null;
  } catch {
    return null;
  }
}

function failureMessage(code) {
  if (code === "insufficient_points")
    return "You need at least 5 available points to create a request.";
  if (code === "invalid_location")
    return "That location is no longer available. Please choose another location.";
  return "The request could not be created. You can try a new submission.";
}

export default function CreateRequest() {
  const { user } = useAuth();
  const storageKey = `campuspoint.request-submission.${user.id}`;
  const locations = useResource("/locations");
  const [pending, setPending] = useState(() => restoreSubmission(storageKey));
  const [fields, setFields] = useState(
    () =>
      pending?.payload || {
        title: "",
        description: "",
        location_id: "",
      },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const inFlight = useRef(false);

  const savePending = useCallback(
    (submission) => {
      if (submission)
        sessionStorage.setItem(storageKey, JSON.stringify(submission));
      else sessionStorage.removeItem(storageKey);
      setPending(submission);
    },
    [storageKey],
  );

  const checkSubmission = useCallback(
    async (submission) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      setError("");
      try {
        const response = submission.operationId
          ? await api(`/operations/${submission.operationId}`)
          : await api("/requests", {
              method: "POST",
              headers: { "Idempotency-Key": submission.key },
              body: submission.payload,
            });
        setResult(response);
        if (response.status === "processing") {
          savePending({ ...submission, operationId: response.operation_id });
        } else {
          savePending(null);
          if (response.status === "aborted")
            setError(failureMessage(response.error_code));
        }
      } catch (err) {
        setError(
          err.detail?.code === "insufficient_points"
            ? failureMessage("insufficient_points")
            : err.message,
        );
        // These responses confirm that creation failed. Uncertain failures keep
        // the original key and payload so retrying cannot reserve points twice.
        if (err.status === 422 || err.detail?.code === "insufficient_points") {
          savePending(null);
        } else if (err.detail?.operation_id) {
          savePending({ ...submission, operationId: err.detail.operation_id });
        }
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [savePending],
  );

  useEffect(() => {
    if (!pending?.operationId || busy || error) return;
    const timer = setTimeout(() => checkSubmission(pending), 5000);
    return () => clearTimeout(timer);
  }, [pending, busy, error, checkSubmission]);

  async function submit(event) {
    event.preventDefault();
    if (pending || inFlight.current) return;
    const payload = {
      title: fields.title.trim(),
      description: fields.description.trim(),
      location_id: Number(fields.location_id),
    };
    if (!payload.title || !payload.description || !payload.location_id) {
      setError("Choose a location and enter a title and description.");
      return;
    }
    const submission = { key: crypto.randomUUID(), payload };
    try {
      // Save before sending so a reload or a lost response can be retried.
      savePending(submission);
    } catch {
      setError(
        "Allow browser session storage before submitting so your request can be safely retried.",
      );
      return;
    }
    setResult(null);
    await checkSubmission(submission);
  }

  function update(name, value) {
    setFields((current) => ({ ...current, [name]: value }));
  }

  return (
    <>
      <PageHeading
        title="New campus request"
        description="Ask a question about a campus location."
      >
        <Link to="/requests" className="btn btn-outline-secondary">
          ← All requests
        </Link>
      </PageHeading>
      {result?.status === "completed" ? (
        <Panel title="Request created">
          <Alert type="success">
            Your request was created and 5 points are held for its reward.
          </Alert>
          <h3 className="h5 text-break">{result.request.title}</h3>
          <p className="text-secondary">
            {result.request.moderation_status === "visible"
              ? "Your request is visible in the campus feed."
              : result.request.moderation_status === "hidden"
                ? "Your request is hidden from the campus feed. You can see it in your requests."
                : "It is pending moderation. You can see it in your requests now."}
          </p>
          <div className="d-flex flex-wrap gap-2">
            <Link to="/requests?mine=true" className="btn btn-primary">
              View my requests
            </Link>
            <button
              className="btn btn-outline-secondary"
              onClick={() => {
                setResult(null);
                setFields({ title: "", description: "", location_id: "" });
              }}
            >
              Create another request
            </button>
          </div>
        </Panel>
      ) : (
        <div className="row g-4">
          <div className="col-xl-8">
            <Panel title="Request details">
              <Alert>{error}</Alert>
              {pending && (
                <Alert type="info">
                  <p className="mb-2">
                    {busy
                      ? "Checking your submission…"
                      : error
                        ? "We could not confirm the outcome. Retry this submission to continue."
                        : pending.operationId
                          ? "Your request is processing. We will check again in 5 seconds while this page stays open."
                          : "This submission is awaiting confirmation. Retry it to check the outcome."}
                  </p>
                  <p className="small mb-2">
                    You can leave and return to this page in the same browser
                    tab to resume.
                  </p>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    disabled={busy}
                    onClick={() => checkSubmission(pending)}
                  >
                    {pending.operationId ? "Check status" : "Retry submission"}
                  </button>
                </Alert>
              )}
              {locations.loading ? (
                <Loading label="Loading campus locations…" />
              ) : locations.error ? (
                <ResourceError
                  error={locations.error}
                  retry={locations.reload}
                />
              ) : !locations.data.length ? (
                <Alert type="warning">
                  No campus locations are available yet. Please try again later.
                </Alert>
              ) : (
                <form onSubmit={submit}>
                  <fieldset disabled={busy || Boolean(pending)}>
                    <div className="mb-3">
                      <label
                        htmlFor="new-request-location"
                        className="form-label"
                      >
                        Campus location
                      </label>
                      <select
                        id="new-request-location"
                        className="form-select"
                        value={fields.location_id}
                        required
                        onChange={(event) =>
                          update("location_id", event.target.value)
                        }
                      >
                        <option value="">Choose a location</option>
                        {pending &&
                          !locations.data.some(
                            (location) =>
                              location.id === Number(fields.location_id),
                          ) && (
                            <option value={fields.location_id}>
                              Previously selected location
                            </option>
                          )}
                        {locations.data.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name} ({location.building_code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <Field
                      label="Title"
                      name="title"
                      maxLength={200}
                      pattern=".*\S.*"
                      required
                      placeholder="e.g. Are there empty study tables?"
                      value={fields.title}
                      onChange={(event) => update("title", event.target.value)}
                      hint="Up to 200 characters."
                    />
                    <div className="mb-4">
                      <label
                        htmlFor="new-request-description"
                        className="form-label"
                      >
                        Description
                      </label>
                      <textarea
                        id="new-request-description"
                        name="description"
                        className="form-control"
                        rows={6}
                        maxLength={5000}
                        required
                        value={fields.description}
                        aria-describedby="request-description-hint"
                        placeholder="What would you like someone on campus to check?"
                        onChange={(event) =>
                          update("description", event.target.value)
                        }
                      />
                      <div id="request-description-hint" className="form-text">
                        {fields.description.length.toLocaleString()} / 5,000
                        characters
                      </div>
                    </div>
                    <Submit busy={busy}>Create request · 5 points</Submit>
                  </fieldset>
                </form>
              )}
            </Panel>
          </div>
          <div className="col-xl-4">
            <Panel title="A five-point reward">
              <p>
                Creating a request reserves <strong>5 available points</strong>{" "}
                for its reward.
              </p>
              <p>Each request expires one hour after creation.</p>
              <p className="small text-secondary mb-0">
                Requests are checked for abusive words. Requests that pass are
                visible in the campus feed; flagged requests stay pending and
                are visible only to you.
              </p>
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
