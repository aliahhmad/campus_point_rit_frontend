import { useCallback, useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../auth/context";
import { formatDate, useResource } from "../lib/hooks";
import useResponseAcceptance from "../lib/useResponseAcceptance";
import ResponseForm from "../components/ResponseForm";
import {
  Alert,
  Loading,
  Modal,
  PageHeading,
  Panel,
  RequestStatusBadge,
  ResourceError,
} from "../components/UI";

function Responses({
  request,
  expired,
  page,
  onPageChange,
  version,
  onSettled,
}) {
  const { user } = useAuth();
  const ownRequest = request.requester_id === user.id;
  const [selection, setSelection] = useState(null);
  const acceptance = useResponseAcceptance({
    requestId: request.id,
    userId: user.id,
    enabled: ownRequest,
    onSettled,
  });
  const acceptedId =
    acceptance.result?.request.accepted_response_id ||
    request.accepted_response_id;
  const canAccept =
    ownRequest &&
    !acceptedId &&
    !expired &&
    request.moderation_status === "visible" &&
    ["open", "under_review"].includes(request.status);
  const { data, loading, error, reload } = useResource(
    `/requests/${request.id}/responses?page=${page}&size=20`,
  );

  useEffect(() => {
    const timer = setInterval(() => reload({ background: true }), 5000);
    return () => clearInterval(timer);
  }, [reload]);

  useEffect(() => {
    if (version) reload({ background: true });
  }, [version, reload]);

  function confirmSelection(event) {
    event.preventDefault();
    if (!canAccept || new Date(request.expires_at).getTime() <= Date.now()) {
      setSelection(null);
      onSettled();
      return;
    }
    acceptance.accept(selection.id);
    setSelection(null);
  }

  return (
    <section aria-labelledby="responses-heading">
      <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h2 className="h4 mb-1" id="responses-heading">
            Responses
          </h2>
          <p className="small text-secondary mb-0">
            Oldest first · Updates every 5 seconds
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={reload}
          disabled={loading}
        >
          Refresh responses
        </button>
      </div>
      <Alert>{acceptance.error}</Alert>
      {acceptance.pending ? (
        <Alert type="info">
          <p className="mb-2">
            {acceptance.busy
              ? "Confirming your selection…"
              : acceptance.error
                ? "We could not confirm the outcome. Check this selection before choosing another response."
                : acceptance.pending.operationId
                  ? "Your selection is being processed. We will check again in 5 seconds."
                  : "Your selection is awaiting confirmation. Retry it to check the outcome."}
          </p>
          <p className="small mb-2">
            Response #{acceptance.pending.responseId} · You can return in this
            browser tab to resume.
          </p>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            disabled={acceptance.busy}
            onClick={acceptance.retry}
          >
            {acceptance.pending.operationId
              ? "Check acceptance status"
              : "Retry acceptance"}
          </button>
        </Alert>
      ) : acceptance.result ? (
        <Alert type="success">
          Response #{acceptedId} accepted. {acceptance.result.reward_points}{" "}
          points awarded to Contributor #{acceptance.result.recipient_id}.
        </Alert>
      ) : acceptedId ? (
        <Alert type="success">
          The request owner selected response #{acceptedId}.
        </Alert>
      ) : ownRequest && request.status !== "conflicted" ? (
        <Alert type="info">
          {canAccept
            ? `Accept one response to complete your request and award its contributor ${request.reward_points} points. This selection is final.`
            : expired
              ? "This request has expired. Responses can no longer be accepted."
              : request.moderation_status !== "visible"
                ? "Responses can be accepted once this request is published."
                : "This request is closed. Responses can no longer be accepted."}
        </Alert>
      ) : null}
      {loading ? (
        <Loading label="Loading responses…" />
      ) : error ? (
        <ResourceError error={error} retry={reload} />
      ) : (
        <>
          {data.items.length ? (
            <div className="d-flex flex-column gap-3">
              {data.items.map((response) => (
                <article
                  className={`card response-card ${acceptedId === response.id && !acceptance.pending ? "border-success" : ""}`}
                  key={response.id}
                  id={`response-${response.id}`}
                >
                  <div className="card-body p-4">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                      <h3 className="h6 mb-0">
                        {response.contributor_id === user.id
                          ? "Your response"
                          : `Contributor #${response.contributor_id}`}
                      </h3>
                      {acceptedId === response.id && !acceptance.pending && (
                        <span className="badge text-bg-success">
                          Accepted response
                        </span>
                      )}
                      {response.moderation_status !== "visible" && (
                        <span
                          className={`badge ${response.moderation_status === "hidden" ? "text-bg-danger" : "text-bg-warning"}`}
                        >
                          {response.moderation_status === "hidden"
                            ? "Hidden · Only you"
                            : "Pending moderation · Only you"}
                        </span>
                      )}
                    </div>
                    <p className="request-content">{response.answer}</p>
                    <p className="small text-secondary mb-0">
                      Posted {formatDate(response.created_at)}
                    </p>
                    {canAccept &&
                      response.moderation_status === "visible" &&
                      response.contributor_id !== user.id && (
                        <button
                          type="button"
                          className="btn btn-outline-primary mt-3"
                          disabled={
                            Boolean(acceptance.pending) || acceptance.busy
                          }
                          aria-label={`Accept response from Contributor #${response.contributor_id}`}
                          onClick={() => setSelection(response)}
                        >
                          {acceptance.pending?.responseId === response.id
                            ? "Acceptance pending…"
                            : "Accept response"}
                        </button>
                      )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Panel>
              <div className="text-center py-3">
                <h3 className="h5">
                  {page > 1 ? "No responses on this page" : "No responses yet"}
                </h3>
                <p className="text-secondary mb-0">
                  {page > 1
                    ? "Go back to an earlier page to see more responses."
                    : "Responses will appear here when contributors share an answer."}
                </p>
              </div>
            </Panel>
          )}
          {(page > 1 || data.has_more) && (
            <nav
              aria-label="Response pages"
              className="d-flex justify-content-between align-items-center mt-4"
            >
              <button
                className="btn btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                Previous
              </button>
              <span className="small text-secondary">Page {page}</span>
              <button
                className="btn btn-outline-secondary"
                disabled={!data.has_more}
                onClick={() => onPageChange(page + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
      {selection && (
        <Modal title="Accept this response?" onClose={() => setSelection(null)}>
          <p>
            Complete your request and award {request.reward_points} points to
            Contributor #{selection.contributor_id}. You cannot change the
            selected response afterward.
          </p>
          <blockquote className="request-content border-start ps-3">
            {selection.answer}
          </blockquote>
          {!canAccept && (
            <Alert type="warning">
              This request is no longer available for acceptance.
            </Alert>
          )}
          <form onSubmit={confirmSelection}>
            <div className="d-flex flex-wrap justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setSelection(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  !canAccept || Boolean(acceptance.pending) || acceptance.busy
                }
              >
                Accept &amp; award {request.reward_points} points
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

function RequestPage({ requestId }) {
  const { user } = useAuth();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const {
    data: request,
    loading,
    error,
    reload,
  } = useResource(`/requests/${requestId}`);
  const [version, setVersion] = useState(0);
  const [now, setNow] = useState(Date.now);
  const requestedPage = Number(params.get("page"));
  const page =
    Number.isInteger(requestedPage) &&
    requestedPage > 0 &&
    requestedPage <= 100000
      ? requestedPage
      : 1;
  const from = location.state?.from;
  const backTo =
    typeof from === "string" &&
    (from === "/requests" || from.startsWith("/requests?"))
      ? from
      : "/requests";

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      reload({ background: true });
    }, 5000);
    return () => clearInterval(timer);
  }, [reload]);

  useEffect(() => {
    if (request) document.title = `${request.title} | CampusPoint`;
  }, [request]);

  const onSubmitted = useCallback(() => {
    setVersion((value) => value + 1);
  }, [setVersion]);

  const onAcceptanceSettled = useCallback(() => {
    reload({ background: true });
    setVersion((value) => value + 1);
  }, [reload]);

  function changePage(value) {
    const next = new URLSearchParams(params);
    if (value === 1) next.delete("page");
    else next.set("page", String(value));
    setParams(next, { state: location.state });
  }

  const breadcrumb = (
    <nav aria-label="Breadcrumb" className="mb-4 small">
      <Link to={backTo}>Campus requests</Link>
      <span className="text-secondary mx-2" aria-hidden="true">
        /
      </span>
      <span className="text-secondary" aria-current="page">
        Request #{requestId}
      </span>
    </nav>
  );

  if (loading)
    return (
      <>
        {breadcrumb}
        <Loading label="Loading request…" />
      </>
    );
  if (error)
    return (
      <>
        {breadcrumb}
        <PageHeading
          title="Request unavailable"
          description="We could not open this request."
        />
        <ResourceError error={error} retry={reload} />
        <Link to={backTo} className="btn btn-outline-secondary">
          Back to requests
        </Link>
      </>
    );

  const ownRequest = request.requester_id === user.id;
  const expired = new Date(request.expires_at).getTime() <= now;
  const status =
    ["open", "under_review"].includes(request.status) && expired
      ? "expired"
      : request.status;

  return (
    <>
      {breadcrumb}
      <PageHeading
        eyebrow={`CAMPUS REQUEST #${request.id}`}
        title={request.title}
        description={`${request.location_name} · ${request.building_code}`}
      >
        <Link to={backTo} className="btn btn-outline-secondary">
          ← Back to requests
        </Link>
      </PageHeading>
      <div className="row g-4 align-items-start">
        <div className="col-xl-8">
          <Panel title="Request details" className="mb-4">
            <div className="d-flex flex-wrap gap-2 mb-3">
              <RequestStatusBadge status={status} />
              {ownRequest && (
                <span className="badge text-bg-primary">Your request</span>
              )}
              {request.moderation_status !== "visible" && (
                <span
                  className={`badge ${request.moderation_status === "hidden" ? "text-bg-danger" : "text-bg-warning"}`}
                >
                  {request.moderation_status === "hidden"
                    ? "Hidden"
                    : "Pending moderation"}
                </span>
              )}
            </div>
            <p className="request-content mb-0">{request.description}</p>
          </Panel>
          {request.status === "conflicted" && (
            <Alert type="warning">
              <strong className="d-block mb-1">Conflicted request</strong>
              This request expired with visible responses and no accepted
              answer. Its {request.reward_points}-point reward remains held. You
              can no longer post or accept responses. Existing responses are
              still available to read.
            </Alert>
          )}
          {request.moderation_status !== "visible" && (
            <Alert type="warning">
              {request.moderation_status === "hidden"
                ? "This request is hidden from the campus feed. Only you can view it."
                : "The moderation check could not finish. This request is pending and visible only to you."}
            </Alert>
          )}
          {ownRequest ? (
            request.status !== "conflicted" && (
              <Alert type="info">
                This is your request. Only other contributors can answer it.
              </Alert>
            )
          ) : (
            <ResponseForm
              key={`${user.id}:${request.id}`}
              request={request}
              expired={expired}
              onSubmitted={onSubmitted}
            />
          )}
          <Responses
            key={`responses:${user.id}:${request.id}`}
            request={request}
            expired={expired}
            page={page}
            onPageChange={changePage}
            version={version}
            onSettled={onAcceptanceSettled}
          />
        </div>
        <aside className="col-xl-4">
          <Panel title="Request information" className="request-information">
            <dl className="request-facts mb-0">
              <div>
                <dt>Location</dt>
                <dd>
                  {request.location_name}
                  <span className="d-block small fw-normal text-secondary">
                    {request.building_code}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Requested by</dt>
                <dd>
                  {ownRequest ? "You" : `Member #${request.requester_id}`}
                </dd>
              </div>
              <div>
                <dt>Reward</dt>
                <dd className="text-primary">
                  {request.reward_points} points
                  {request.status === "conflicted" && (
                    <span className="d-block small fw-normal text-secondary">
                      Held for this conflicted request
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(request.created_at)}</dd>
              </div>
              {request.accepted_at && (
                <div>
                  <dt>Accepted</dt>
                  <dd>{formatDate(request.accepted_at)}</dd>
                </div>
              )}
              <div>
                <dt>{expired ? "Expired" : "Expires"}</dt>
                <dd>{formatDate(request.expires_at)}</dd>
              </div>
            </dl>
          </Panel>
        </aside>
      </div>
    </>
  );
}

export default function RequestDetail() {
  const { requestId } = useParams();
  if (!/^[1-9]\d*$/.test(requestId) || Number(requestId) > 2147483647) {
    return (
      <>
        <PageHeading
          title="Request not found"
          description="This request link is invalid."
        />
        <Link to="/requests" className="btn btn-primary">
          Back to requests
        </Link>
      </>
    );
  }
  return <RequestPage key={requestId} requestId={requestId} />;
}
