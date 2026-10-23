import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/context";
import { api } from "../lib/api";
import { formatDate, useResource } from "../lib/hooks";
import { Alert, Loading, Panel, ResourceError, Submit } from "./UI";

function restoreSubmission(storageKey) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey));
    return saved?.key && typeof saved.payload?.answer === "string"
      ? saved
      : null;
  } catch {
    return null;
  }
}

function failureMessage(code, fallback) {
  return (
    {
      duplicate_response: "You have already responded to this request.",
      self_response_forbidden:
        "Only other contributors can answer your request.",
      request_not_found: "This request is no longer available to you.",
      request_not_open: "This request is no longer accepting responses.",
      request_expired:
        "This request has expired and is no longer accepting responses.",
      idempotency_conflict:
        "This submission conflicts with an earlier one. Refresh the page to check your response.",
    }[code] ||
    fallback ||
    "Your response could not be saved. Please try again."
  );
}

function visibilityMessage(status) {
  if (status === "hidden")
    return "Your response is hidden from other users. Only you can see it.";
  if (status === "pending")
    return "The moderation check could not finish. Your response is pending and visible only to you.";
  return "Everyone who can view this request can read your response.";
}

export default function ResponseForm({ request, expired, onSubmitted }) {
  const { user } = useAuth();
  const storageKey = `campuspoint.response-submission.${user.id}.${request.id}`;
  const {
    data: ownData,
    loading: ownLoading,
    error: ownError,
    reload: reloadOwn,
  } = useResource(`/requests/${request.id}/responses?mine=true&size=1`);
  const [pending, setPending] = useState(() => restoreSubmission(storageKey));
  const [answer, setAnswer] = useState(() => pending?.payload.answer || "");
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
          : await api(`/requests/${request.id}/responses`, {
              method: "POST",
              headers: { "Idempotency-Key": submission.key },
              body: submission.payload,
            });
        if (response.status === "processing") {
          savePending({ ...submission, operationId: response.operation_id });
        } else {
          savePending(null);
          if (response.status === "completed") setResult(response.response);
          else setError(failureMessage(response.error_code));
          reloadOwn({ background: true });
          onSubmitted();
        }
      } catch (err) {
        setError(failureMessage(err.detail?.code, err.message));
        if (err.detail?.operation_id) {
          savePending({ ...submission, operationId: err.detail.operation_id });
        } else if (
          !submission.operationId &&
          [400, 403, 404, 409, 422].includes(err.status)
        ) {
          // These errors confirm rejection. Network failures keep the same key
          // and exact answer, so an uncertain outcome can be safely retried.
          savePending(null);
        }
        if (err.detail?.code === "duplicate_response") {
          reloadOwn({ background: true });
          onSubmitted();
        }
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [request.id, savePending, reloadOwn, onSubmitted],
  );

  useEffect(() => {
    if (!pending?.operationId || busy || error) return;
    const timer = setTimeout(() => checkSubmission(pending), 5000);
    return () => clearTimeout(timer);
  }, [pending, busy, error, checkSubmission]);

  useEffect(() => {
    const timer = setInterval(() => reloadOwn({ background: true }), 5000);
    return () => clearInterval(timer);
  }, [reloadOwn]);

  async function submit(event) {
    event.preventDefault();
    if (pending || inFlight.current || ownLoading || ownError) return;
    const text = answer.trim();
    if (!text) {
      setError("Enter an answer before posting your response.");
      return;
    }
    const submission = { key: crypto.randomUUID(), payload: { answer: text } };
    try {
      savePending(submission);
    } catch {
      setError(
        "Allow browser session storage so your response can be safely retried.",
      );
      return;
    }
    await checkSubmission(submission);
  }

  const existing = result || ownData?.items[0];
  let unavailable = "";
  if (request.status === "conflicted")
    unavailable =
      "This request is conflicted. You can still read its responses.";
  else if (request.moderation_status !== "visible")
    unavailable =
      "This request is not accepting responses while it is unpublished.";
  else if (expired)
    unavailable = "This request has expired. You can still read its responses.";
  else if (request.status !== "open")
    unavailable =
      "This request is no longer accepting responses. You can still read its responses.";

  if (existing && !pending) {
    return (
      <Panel title="Your response" className="mb-4">
        {result && <Alert type="success">Your response was saved.</Alert>}
        <p className="request-content">{existing.answer}</p>
        <p className="small text-secondary mb-2">
          Posted {formatDate(existing.created_at)}
        </p>
        <Alert
          type={existing.moderation_status === "visible" ? "info" : "warning"}
        >
          {visibilityMessage(existing.moderation_status)}
        </Alert>
        <p className="small text-secondary mb-0">
          You can submit one response per request.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Add your response"
      description="Share what you know with your campus."
      className="mb-4"
    >
      <Alert>{error}</Alert>
      {pending && (
        <Alert type="info">
          <p className="mb-2">
            {busy
              ? "Saving your response…"
              : error
                ? "We could not confirm the outcome. Check this submission before trying another."
                : pending.operationId
                  ? "Your response is being saved. We will check again in 5 seconds."
                  : "This submission is awaiting confirmation. Retry it to check the outcome."}
          </p>
          <p className="small mb-2">
            You can leave and return to this request in the same browser tab to
            resume.
          </p>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            disabled={busy}
            onClick={() => checkSubmission(pending)}
          >
            {pending.operationId ? "Check status" : "Retry response"}
          </button>
        </Alert>
      )}
      {!pending && ownLoading ? (
        <Loading label="Checking your responses…" />
      ) : !pending && ownError ? (
        <ResourceError error={ownError} retry={reloadOwn} />
      ) : !pending && unavailable ? (
        <Alert type="info">{unavailable}</Alert>
      ) : (
        <form onSubmit={submit}>
          <fieldset disabled={busy || Boolean(pending)}>
            <label className="form-label" htmlFor="response-answer">
              Your answer
            </label>
            <textarea
              id="response-answer"
              name="answer"
              className="form-control"
              rows={5}
              required
              maxLength={5000}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="For example, where to find an available study table…"
              aria-describedby="response-answer-hint"
            />
            <div id="response-answer-hint" className="form-text mb-3">
              {answer.length.toLocaleString()} / 5,000 characters. You can
              submit one response per request.
            </div>
            <Submit busy={busy}>Post response</Submit>
          </fieldset>
        </form>
      )}
    </Panel>
  );
}
