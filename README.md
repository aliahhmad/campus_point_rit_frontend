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
| `/api-keys`                 | Create, rename, activate/deactivate, and delete personal API keys      |
| `/admin/users`              | Paginated user list, search, editing, promotion, banning, and deletion |
| `/admin/users/:userId/keys` | List, rename, activate/deactivate, and delete another user's keys      |

`/` opens the profile or redirects to sign in. Unknown routes display a 404 page.
Admin routes require an administrator account. Their actions remain protected by
backend authorization.

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
