# CampusPoint frontend

React + Vite frontend styled with Bootstrap and a responsive CampusPoint theme.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:5173. The existing Vite proxy forwards `/api/*` to
`http://127.0.0.1:8001/*`, stripping `/api`. Start your FastAPI backend on port
8001 separately. No backend changes are required by this frontend.

## Pages

| Route                       | Purpose                                                                |
| --------------------------- | ---------------------------------------------------------------------- |
| `/login`                    | Email/password sign in                                                 |
| `/register`                 | Registration and password confirmation                                 |
| `/verify?code=…`            | Email verification; also accepts a pasted code                         |
| `/forgot-password`          | Request a password reset email                                         |
| `/reset-password?code=…`    | Reset password using the email token                                   |
| `/profile`                  | View/edit profile and change password                                  |
| `/requests`                 | Browse and filter campus requests                                      |
| `/requests/new`             | Create a moderated campus request                                      |
| `/requests/:requestId`      | Read request responses, submit an answer, or accept one on your own post |
| `/api-keys`                 | Create, rename, activate/deactivate, and delete personal API keys      |
| `/admin/users`              | Paginated user list, search, editing, promotion, banning, and deletion |
| `/admin/users/:userId/keys` | List, rename, activate/deactivate, and delete another user's keys      |

`/` opens the profile or redirects to sign in. Unknown routes display a 404 page.
Admin routes require an administrator account. Their actions remain protected by
backend authorization.

Request cards and the creation confirmation link to individual request pages.
Detail pages load `GET /requests/{id}` directly, so links also work after reload.
Requests and responses refresh every five seconds. Response pagination is stored
in the page URL, and returning to the feed preserves its filters.

The status filter includes **Conflicted**, sent as `status=conflicted` to the API.
List cards and detail pages share a yellow **Conflicted** badge and explain that
the request expired with responses and no accepted answer, so its reward remains
held. Existing responses stay readable, while new answers and acceptance are
closed. The UI uses the backend's stored status to identify conflicts; a passed
deadline alone does not imply a conflict or confirm a refund.

Other contributors can submit one answer to a visible, open, unexpired request.
The form checks `GET /requests/{id}/responses?mine=true&size=1` for an existing
answer. Hidden and pending answers remain visible only to their contributor.
Unconfirmed submissions keep their original idempotency key and answer in
session storage; users can leave and return in the same tab to resume polling or
safely retry after a network failure. Posting an answer does not involve Points.

Request owners can accept one visible response on a published, unexpired request
with status `open` or `under_review`. Each answer has an **Accept response** button
and a confirmation showing the contributor and reward. Acceptance completes the
request and awards the existing five-point reward. The selected answer displays
an **Accepted response** badge for all viewers.

Acceptance calls `POST /requests/{id}/responses/{responseId}/accept` with an
idempotency key. Processing operations poll `GET /operations/{operationId}` every
five seconds; the UI confirms the reward only after the operation completes.
Pending selections survive reloads in the same tab, retain their original key
for uncertain retries, and prevent another selection until resolved. A confirmed
aborted attempt allows a fresh selection. Expired and closed posts cannot accept
new responses; already-started operations can still be checked or retried.

## API and authentication

- Requests use `/api` by default. Set `VITE_API_BASE_URL` in `.env.local` to use
  another API URL, including any configured backend API prefix. This value is
  public configuration, never a secret. Cross-origin deployments also require
  the frontend origin in the backend's CORS configuration.
- Access and refresh tokens live in `sessionStorage` for the current browser tab.
  Expired access tokens refresh automatically, with one shared refresh request
  for concurrent failures. Sign out clears the local session; the backend has no
  logout/revocation endpoint.
- `/users/me` provides name and email only. The user ID comes from the access
  token's `sub` claim; the backend still authorizes every request. An authenticated
  request to `/users/?user_id=…` checks admin access. An ordinary user's expected
  403 response means their admin navigation stays hidden.
- The profile update API requires all fields, including a password. The form
  asks for the existing password to keep it, or a replacement password. The
  backend does not validate this field as a current-password challenge; it
  saves it as the account password. The separate password form requires a
  matching confirmation.
- API key secrets appear only immediately after creation and are never persisted
  by this UI. Admin endpoints cannot create keys for another user.
- Email delivery requires the backend's SMTP configuration. Set the backend's
  `API_TITLE=CampusPoint` and `FRONTEND_URL=http://localhost:5173` for local use.
  Verification and password reset emails open this frontend at `/verify?code=…`
  and `/reset-password?code=…`. Use the deployed frontend URL in production.
  If `FRONTEND_URL` is unset, email links use the backend's `BASE_URL` instead.
- The backend's resend-verification endpoint is commented out; there is no resend
  button until that API exists.

## Build and checks

```sh
npm run lint
npm run build
npm run preview
```

For production, serve the generated `dist` directory and route non-file frontend
URLs to `index.html` so direct links work. Configure an `/api` reverse proxy to
FastAPI, or set `VITE_API_BASE_URL` before building. Vite's development proxy does
not run in a production static host.
