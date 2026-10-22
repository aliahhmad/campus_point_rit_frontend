import { useCallback, useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../auth/context";
import { formatDate, useResource } from "../lib/hooks";
import ResponseForm from "../components/ResponseForm";
import {
  Alert,
  Loading,
  PageHeading,
  Panel,
  ResourceError,
} from "../components/UI";

function Responses({ requestId, page, onPageChange, version }) {
  const { user } = useAuth();
  const { data, loading, error, reload } = useResource(
    `/requests/${requestId}/responses?page=${page}&size=20`,
  );

  useEffect(() => {
    const timer = setInterval(() => reload({ background: true }), 5000);
    return () => clearInterval(timer);
  }, [reload]);

  useEffect(() => {
    if (version) reload({ background: true });
  }, [version, reload]);

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
                  className="card response-card"
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
    request.status === "open" && expired ? "expired" : request.status;

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
              <span
                className={`badge text-capitalize ${status === "open" ? "text-bg-success" : "text-bg-light border"}`}
              >
                {status.replaceAll("_", " ")}
              </span>
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
          {request.moderation_status !== "visible" && (
            <Alert type="warning">
              {request.moderation_status === "hidden"
                ? "This request is hidden from the campus feed. Only you can view it."
                : "The moderation check could not finish. This request is pending and visible only to you."}
            </Alert>
          )}
          {ownRequest ? (
            <Alert type="info">
              This is your request. Only other contributors can answer it.
            </Alert>
          ) : (
            <ResponseForm
              key={`${user.id}:${request.id}`}
              request={request}
              expired={expired}
              onSubmitted={onSubmitted}
            />
          )}
          <Responses
            requestId={request.id}
            page={page}
            onPageChange={changePage}
            version={version}
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
                <dd className="text-primary">{request.reward_points} points</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(request.created_at)}</dd>
              </div>
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
