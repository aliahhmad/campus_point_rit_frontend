# CampusPoint frontend

CampusPoint's React application for campus requests, responses, profiles, and
administration. Built with Vite, React Router, and Bootstrap.

## Requirements

- Node.js 24.x (recommended) and npm.
- The Campus API running locally or at a public HTTPS address.
- The backend's Points service and databases running for operations that hold,
  award, or refund points. The frontend calls only the Campus API.

## Run locally

Run these commands from the directory containing this README:

```sh
npm ci
```

On first setup, copy the environment template. Keep your existing `.env.local`
if you already configured it:

```sh
cp .env.example .env.local
```

Start the frontend:

```sh
npm run dev
```

Open <http://localhost:5173>. The development server uses port 5173 and stops
with an error if that port is already occupied.

With `VITE_API_BASE_URL` blank, Vite forwards `/api/*` to the local Campus API
at `http://127.0.0.1:8001`, removing `/api` from the forwarded path. For example,
`/api/requests` reaches `http://127.0.0.1:8001/requests`. To change the local
backend port, edit `server.proxy` in [vite.config.js](vite.config.js) and restart
`npm run dev`.

## Configure the backend address

The API base URL is read in [src/lib/api.js](src/lib/api.js). The only frontend
environment setting is `VITE_API_BASE_URL`.

### Local backend through the development proxy

In `.env.local`, leave the setting blank:

```env
VITE_API_BASE_URL=
```

This is the default configuration. A hosted backend override is disabled while
the value is blank.

### Hosted backend or HTTPS tunnel

Set `.env.local` to the backend's public address:

```env
VITE_API_BASE_URL=https://your-backend.example.com
```

The frontend then sends `/requests` to
`https://your-backend.example.com/requests`. Include the backend's `API_ROOT`
prefix when one is configured:

```env
VITE_API_BASE_URL=https://your-backend.example.com/v1
```

Use the Campus API address, not the frontend website address or the Points API
address. A deployed website cannot reach your computer through `localhost`.
If the backend runs on your computer, use its public HTTPS tunnel address and
keep the computer, backend services, and tunnel running during the demo.

After changing the value, restart `npm run dev`. For deployment, rebuild and
redeploy: Vite embeds this value into the frontend during the build. To disable
the override, clear the value and restart or rebuild.

`.env.local` is ignored by Git. Build hosts need the variable configured in
their environment settings. `VITE_*` values are public in the generated frontend;
never put passwords, database credentials, or service tokens in them.

### Backend settings for the frontend

Configure these in the backend environment:

| Setting        | Value                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `CORS_ORIGINS` | The allowed frontend origin, such as `http://localhost:5173` or `https://your-site.vercel.app`; separate multiple origins with commas |
| `FRONTEND_URL` | The frontend website address used in verification and password-reset emails                                                           |

Restart the backend after updating its environment. With Docker Compose,
recreate the service to load changed environment values. Email flows also
require working backend SMTP settings.

## Pages and access

| Route                                 | Purpose                                                                      | Access        |
| ------------------------------------- | ---------------------------------------------------------------------------- | ------------- |
| `/`                                   | Project homepage, how it works, and technology overview                       | Public        |
| `/signin`, `/register`, `/verify`     | Sign in, register, and verify email                                          | Public        |
| `/login`                              | Redirect to `/signin` for existing links                                     | Public        |
| `/forgot-password`, `/reset-password` | Request and complete a password reset                                        | Public        |
| `/profile`                            | Edit profile and password; view points and reputation                        | Signed in     |
| `/requests`                           | Browse, search, and filter requests                                          | Signed in     |
| `/requests/new`                       | Create a request                                                             | Signed in     |
| `/requests/:requestId`                | Read a request and its responses, answer, or accept a response when eligible | Signed in     |
| `/admin/users`                        | Manage user accounts                                                         | Administrator |
| `/admin/conflicted-requests`          | Browse conflicted requests and open their detail pages                       | Administrator |

`/` opens the public homepage, including for signed-in visitors. Protected pages
redirect signed-out visitors to `/signin` and return them to their requested page
after sign-in. The homepage links signed-in members to their workspace.
The backend enforces permissions for every action.

Creating a request holds five points for one hour. Requests cannot be edited
or deleted through this frontend. Other contributors can submit one response
while a request is open and unexpired. The owner can accept one visible response
before expiry; acceptance awards the contributor five points and one reputation
point.

Overdue, unaccepted requests without visible responses are refunded by the
backend. Requests with visible responses and no accepted answer become
`conflicted`. Administrators can open a conflicted request and accept a visible
response to resolve it. Hidden and pending responses cannot be selected.

Request and response lists refresh every five seconds. Pending submissions and
acceptances retain their idempotency keys in browser session storage so they
can be checked or safely retried in the same tab. A processing operation is
shown as successful only after the backend confirms completion. Access and
refresh tokens are also stored in session storage; sign out clears the session.

## Commands

| Command           | Purpose                                                |
| ----------------- | ------------------------------------------------------ |
| `npm ci`          | Install the dependency versions in `package-lock.json` |
| `npm run dev`     | Start the development server on port 5173              |
| `npm run lint`    | Run ESLint                                             |
| `npm run build`   | Generate the production frontend in `dist/`            |
| `npm run preview` | Preview the production build locally                   |

Run lint and build before deployment. Preview serves the built frontend; it
does not provide the development `/api` proxy. Build with a reachable API URL
or provide a separate reverse proxy when testing the production build.

## Deploy to Vercel

1. Import the frontend repository. Set **Root Directory** to the directory
   containing this README and `package.json`: the repository root for a
   frontend-only repository, or `frontend` if importing the parent project.
2. Use the following build settings:

   | Setting          | Value           |
   | ---------------- | --------------- |
   | Framework preset | Vite            |
   | Node.js version  | 24.x            |
   | Install command  | `npm ci`        |
   | Build command    | `npm run build` |
   | Output directory | `dist`          |

3. Add `VITE_API_BASE_URL` with the public HTTPS Campus API address to each
   deployment environment you will use, such as Production and Preview.
   A local `.env.local` file is not uploaded through Git. Changes require a
   new deployment. See [Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables).
4. Keep the included [vercel.json](vercel.json) next to `package.json`. Its SPA
   fallback lets direct visits and refreshes on paths such as `/requests/3` load the React application
   instead of returning a hosting 404. See [Vercel's Vite routing guide](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas).

   Commit and deploy this file with the frontend. Existing deployments need a
   new deployment for the routing change to take effect.

5. Configure the backend's `CORS_ORIGINS` and `FRONTEND_URL` for the deployed
   frontend address, then confirm the backend is reachable before testing login
   and request actions.

This setup calls the backend URL directly. Vite's `server.proxy` does not run
on Vercel. Leaving `VITE_API_BASE_URL` blank on a static deployment requires a
separate `/api` reverse proxy; the SPA fallback above is not an API proxy.

For another static host, publish `dist/` and configure the equivalent fallback
to `index.html` for application routes.

## Troubleshooting

| Problem                                                            | Check                                                                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Requests target the frontend domain or return HTML instead of JSON | Set `VITE_API_BASE_URL` before building, or configure an `/api` reverse proxy                                 |
| Cannot reach the backend                                           | Check its public URL, API prefix, running services, and tunnel; use HTTPS from an HTTPS website               |
| Browser reports a CORS error                                       | Allow the exact frontend origin in backend `CORS_ORIGINS`, including scheme and local port                    |
| API address changed but the site still uses the old one            | Restart development, or rebuild and redeploy the hosted frontend                                              |
| Refreshing `/requests/3` returns a hosting 404                     | Add the host's SPA fallback to `index.html`                                                                   |
| Admin links do not appear                                          | Use an account with the backend `admin` role; a 403 from the admin-role lookup is expected for ordinary users |
| Verification or reset emails open the wrong site                   | Update backend `FRONTEND_URL` and restart or recreate its service                                             |
