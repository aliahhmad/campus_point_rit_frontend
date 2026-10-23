import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/context";
import { formatDate, useResource } from "../lib/hooks";
import {
  Loading,
  PageHeading,
  Panel,
  RequestStatusBadge,
  ResourceError,
} from "../components/UI";

const statuses = ["open", "under_review", "completed", "expired", "conflicted"];

function label(value) {
  const text = value.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function Requests() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const locations = useResource("/locations");
  const { data, loading, error, reload } = useResource(`/requests?${params}`);
  const page = data?.page || Number(params.get("page")) || 1;

  useEffect(() => {
    const timer = setInterval(() => reload({ background: true }), 5000);
    return () => clearInterval(timer);
  }, [reload]);

  function filter(name, value) {
    const next = new URLSearchParams(params);
    next.delete("page");
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next);
  }

  function changePage(value) {
    const next = new URLSearchParams(params);
    next.set("page", String(value));
    setParams(next);
  }

  return (
    <>
      <PageHeading
        title="Campus requests"
        description="Browse campus questions and keep track of your own submissions."
      >
        <Link to="/requests/new" className="btn btn-primary">
          + New request
        </Link>
      </PageHeading>
      <Panel className="mb-4">
        <form
          className="row g-3 align-items-end"
          onSubmit={(event) => {
            event.preventDefault();
            filter(
              "search",
              new FormData(event.currentTarget).get("search").trim(),
            );
          }}
        >
          <div className="col-lg-5">
            <label htmlFor="request-search" className="form-label">
              Search titles
            </label>
            <div className="input-group">
              <input
                id="request-search"
                name="search"
                type="search"
                className="form-control"
                maxLength={200}
                key={params.get("search") || ""}
                defaultValue={params.get("search") || ""}
                placeholder="What are you looking for?"
              />
              <button className="btn btn-outline-secondary" type="submit">
                Search
              </button>
            </div>
          </div>
          <div className="col-sm-6 col-lg-3">
            <label htmlFor="request-location" className="form-label">
              Location
            </label>
            <select
              id="request-location"
              className="form-select"
              value={params.get("location_id") || ""}
              onChange={(event) => filter("location_id", event.target.value)}
              disabled={locations.loading || Boolean(locations.error)}
            >
              <option value="">All locations</option>
              {locations.data?.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-sm-6 col-lg-2">
            <label htmlFor="request-status" className="form-label">
              Status
            </label>
            <select
              id="request-status"
              className="form-select"
              value={params.get("status") || ""}
              onChange={(event) => filter("status", event.target.value)}
            >
              <option value="">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {label(status)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-lg-2">
            <div className="form-check mb-2">
              <input
                id="request-mine"
                type="checkbox"
                className="form-check-input"
                checked={params.get("mine") === "true"}
                onChange={(event) =>
                  filter("mine", event.target.checked ? "true" : "")
                }
              />
              <label htmlFor="request-mine" className="form-check-label">
                My requests
              </label>
            </div>
          </div>
        </form>
        {locations.error && (
          <div className="mt-3">
            <ResourceError error={locations.error} retry={locations.reload} />
          </div>
        )}
      </Panel>
      <div className="d-flex justify-content-between align-items-center mb-3 gap-3">
        <p className="small text-secondary mb-0">
          Updates every 5 seconds. Your unpublished requests are visible only to
          you.
        </p>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={reload}
          disabled={loading}
        >
          Refresh
        </button>
      </div>
      {loading ? (
        <Loading label="Loading campus requests…" />
      ) : error ? (
        <ResourceError error={error} retry={reload} />
      ) : (
        <>
          {!data.items.length ? (
            <Panel>
              <div className="text-center py-4">
                <h2 className="h5">
                  {params.get("status") === "conflicted"
                    ? "No conflicted requests found"
                    : "No requests found"}
                </h2>
                <p className="text-secondary">
                  {params.get("status") === "conflicted"
                    ? "Requests that expire with visible responses and no accepted answer appear here."
                    : "Try different filters or ask a new campus question."}
                </p>
                <Link to="/requests/new" className="btn btn-primary">
                  Create a request
                </Link>
              </div>
            </Panel>
          ) : (
            <div className="row g-3">
              {data.items.map((request) => (
                <div className="col-12 col-xxl-6" key={request.id}>
                  <Panel className="h-100 request-card">
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      <span className="badge text-bg-light border">
                        {request.location_name} · {request.building_code}
                      </span>
                      <RequestStatusBadge status={request.status} />
                      {request.requester_id === user.id && (
                        <span className="badge text-bg-primary">
                          Your request
                        </span>
                      )}
                      {request.moderation_status !== "visible" && (
                        <span className="badge text-bg-warning">
                          {request.moderation_status === "pending"
                            ? "Pending moderation"
                            : "Hidden"}
                        </span>
                      )}
                    </div>
                    <h2 className="h5 text-break">
                      <Link
                        to={`/requests/${request.id}`}
                        state={{
                          from: `/requests${params.size ? `?${params}` : ""}`,
                        }}
                        className="request-title-link"
                      >
                        {request.title}
                      </Link>
                    </h2>
                    <p
                      className="text-break"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {request.description}
                    </p>
                    <div className="d-flex flex-wrap justify-content-between gap-2 small text-secondary border-top pt-3">
                      <span className="fw-semibold text-primary">
                        {request.reward_points}
                        {request.status === "conflicted"
                          ? " points held"
                          : " point reward"}
                      </span>
                      <span>Request #{request.id}</span>
                    </div>
                    <p className="small text-secondary mt-2 mb-0">
                      Created {formatDate(request.created_at)}
                      <br />
                      {request.status === "conflicted" ||
                      request.status === "expired"
                        ? "Expired"
                        : "Expires"}{" "}
                      {formatDate(request.expires_at)}
                    </p>
                    <Link
                      to={`/requests/${request.id}`}
                      state={{
                        from: `/requests${params.size ? `?${params}` : ""}`,
                      }}
                      className="btn btn-sm btn-outline-secondary mt-3"
                    >
                      View request &amp; responses{" "}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </Panel>
                </div>
              ))}
            </div>
          )}
          <nav
            aria-label="Request pages"
            className="d-flex justify-content-between align-items-center mt-4"
          >
            <button
              className="btn btn-outline-secondary"
              disabled={page <= 1}
              onClick={() => changePage(page - 1)}
            >
              Previous
            </button>
            <span className="small text-secondary">Page {page}</span>
            <button
              className="btn btn-outline-secondary"
              disabled={!data.has_more}
              onClick={() => changePage(page + 1)}
            >
              Next
            </button>
          </nav>
        </>
      )}
    </>
  );
}
