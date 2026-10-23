const STORAGE_KEY = "campuspoint.session";
// Leave the URL blank to use the local Vite proxy. Set it before building
// to send requests directly to a hosted backend instead.
const API_BASE = (import.meta.env.VITE_API_BASE_URL?.trim() || "/api").replace(
  /\/+$/,
  "",
);
let refreshRequest;

export class ApiError extends Error {
  constructor(message, status, detail = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

export function saveSession(session) {
  if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else sessionStorage.removeItem(STORAGE_KEY);
}

export function sessionUserId() {
  try {
    const part = getSession()
      .token.split(".")[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const { sub } = JSON.parse(atob(part));
    const id = Number(sub);
    if (!Number.isSafeInteger(id) || id <= 0)
      throw new Error("Invalid user ID");
    return id;
  } catch {
    throw new ApiError("Your session is invalid. Please sign in again.", 401);
  }
}

function errorMessage(data, status) {
  if (Array.isArray(data?.detail))
    return data.detail
      .map(
        ({ loc, msg }) =>
          `${loc?.filter((x) => x !== "body").join(" · ") || "Input"}: ${msg}`,
      )
      .join(". ");
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.detail?.message === "string") return data.detail.message;
  if (status === 429)
    return "Too many attempts. Please wait a moment and try again.";
  if (status === 403) return "You don’t have permission to do that.";
  return data?.message || `The request failed (${status}). Please try again.`;
}

async function send(
  path,
  { method = "GET", body, token, signal, headers = {} } = {},
) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      signal,
      cache: "no-store",
      headers: {
        ...headers,
        Accept: "application/json",
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(
      "Cannot reach CampusPoint. Check your connection and try again.",
      0,
    );
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* Handle non-JSON errors below. */
  }
  if (!response.ok)
    throw new ApiError(
      errorMessage(data, response.status),
      response.status,
      data?.detail,
    );
  if (text && data === null)
    throw new ApiError(
      "The server returned an unexpected response. Please try again.",
      response.status,
    );
  return data;
}

async function refreshSession() {
  const original = getSession();
  if (!original?.refresh) throw new ApiError("Please sign in again.", 401);
  const data = await send("/refresh/", {
    method: "POST",
    body: { refresh: original.refresh },
  });
  // A late refresh must never restore a session after logout or another login.
  if (getSession()?.refresh !== original.refresh)
    throw new ApiError("Your session has changed. Please sign in again.", 401);
  saveSession({ ...original, token: data.token });
  return data.token;
}

export async function api(path, { auth = true, ...options } = {}) {
  const session = auth ? getSession() : null;
  try {
    return await send(path, { ...options, token: session?.token });
  } catch (error) {
    if (!auth || error.status !== 401 || !session) throw error;
    try {
      const current = getSession();
      if (current?.refresh !== session.refresh)
        throw new ApiError(
          "Your session has changed. Please sign in again.",
          401,
        );
      // Another request may have already refreshed this token while the
      // original response was in flight.
      let token = current.token;
      if (token === session.token) {
        if (!refreshRequest)
          refreshRequest = refreshSession().finally(() => {
            refreshRequest = null;
          });
        token = await refreshRequest;
      }
      return await send(path, { ...options, token });
    } catch (refreshError) {
      if (refreshError.status === 401 || refreshError.status === 403) {
        if (getSession()?.refresh === session.refresh) {
          saveSession(null);
          window.dispatchEvent(new Event("campuspoint:session-expired"));
        }
      }
      throw refreshError;
    }
  }
}

export async function loadAccount() {
  const profile = await api("/users/me");
  const id = sessionUserId();
  let isAdmin = false;
  try {
    const user = await api(`/users/?user_id=${id}`);
    isAdmin = user.role === "admin";
  } catch (error) {
    if (error.status !== 403) throw error;
  }
  return { ...profile, id, isAdmin };
}
