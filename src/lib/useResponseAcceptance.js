import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

function restoreSelection(storageKey) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey));
    return typeof saved?.key === "string" &&
      Number.isInteger(saved.responseId) &&
      saved.responseId > 0
      ? saved
      : null;
  } catch {
    return null;
  }
}

function failureMessage(code, fallback) {
  return (
    {
      request_owner_required: "Only the request owner can accept a response.",
      request_already_accepted:
        "A response has already been accepted. Refresh to see it.",
      request_expired:
        "This request has expired. Responses can no longer be accepted.",
      request_not_open:
        "This request is closed. Responses can no longer be accepted.",
      request_not_visible: "Publish this request before accepting a response.",
      response_not_found:
        "This response is no longer available for acceptance.",
      recipient_wallet_missing:
        "The contributor’s points account is unavailable. Please try again later.",
      escrow_already_settled:
        "This request’s reward has already been settled. Refresh to check the request.",
      idempotency_conflict:
        "This selection conflicts with an earlier attempt. Refresh to check the request.",
    }[code] ||
    fallback ||
    "The response could not be accepted. Please try again."
  );
}

export default function useResponseAcceptance({
  requestId,
  userId,
  enabled,
  onSettled,
}) {
  const storageKey = `campuspoint.response-acceptance.${userId}.${requestId}`;
  const [pending, setPending] = useState(() =>
    enabled ? restoreSelection(storageKey) : null,
  );
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const remember = useCallback(
    (selection) => {
      setPending(selection);
      try {
        if (selection)
          sessionStorage.setItem(storageKey, JSON.stringify(selection));
        else sessionStorage.removeItem(storageKey);
      } catch {
        // Keep the in-memory selection. The original stored key can still be
        // replayed after a reload if saving the operation ID failed.
      }
    },
    [storageKey],
  );

  const checkSelection = useCallback(
    async (selection) => {
      if (!enabled || inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      setError("");
      try {
        const response = selection.operationId
          ? await api(`/operations/${selection.operationId}`)
          : await api(
              `/requests/${requestId}/responses/${selection.responseId}/accept`,
              {
                method: "POST",
                headers: { "Idempotency-Key": selection.key },
              },
            );
        if (
          response?.operation !== "accept_response" ||
          !["processing", "completed", "aborted"].includes(response.status) ||
          (response.status === "processing" && !response.operation_id) ||
          (response.status === "completed" &&
            (response.request?.id !== requestId ||
              response.request?.accepted_response_id !== selection.responseId ||
              response.accepted_response?.id !== selection.responseId ||
              response.recipient_id !==
                response.accepted_response?.contributor_id))
        ) {
          throw new Error(
            "We could not confirm this selection. Please check its status again.",
          );
        }
        if (response.status === "processing") {
          remember({ ...selection, operationId: response.operation_id });
        } else {
          remember(null);
          if (response.status === "completed") setResult(response);
          else setError(failureMessage(response.error_code));
          onSettled();
        }
      } catch (err) {
        setError(failureMessage(err.detail?.code, err.message));
        if (err.detail?.operation_id) {
          remember({ ...selection, operationId: err.detail.operation_id });
        } else if (
          !selection.operationId &&
          [400, 403, 404, 409, 422].includes(err.status)
        ) {
          // A definite rejection allows another attempt. Uncertain failures
          // retain the same response and key until the outcome is confirmed.
          remember(null);
          onSettled();
        }
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [enabled, requestId, remember, onSettled],
  );

  useEffect(() => {
    if (!pending?.operationId || busy || error) return;
    const timer = setTimeout(() => checkSelection(pending), 5000);
    return () => clearTimeout(timer);
  }, [pending, busy, error, checkSelection]);

  function accept(responseId) {
    if (!enabled || pending || result || inFlight.current) return;
    const selection = { key: crypto.randomUUID(), responseId };
    try {
      // Persist before sending so a reload cannot turn a lost reply into a
      // new selection with a different idempotency key.
      sessionStorage.setItem(storageKey, JSON.stringify(selection));
    } catch {
      setError(
        "Allow browser session storage so your selection can be safely retried.",
      );
      return;
    }
    setPending(selection);
    return checkSelection(selection);
  }

  return {
    pending,
    result,
    error,
    busy,
    accept,
    retry: () => pending && checkSelection(pending),
  };
}
