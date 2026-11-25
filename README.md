# InstAlert Frontend

InstAlert helps business administrators and operational employees manage incidents, nearby risks, emergency contacts and notifications. This repository contains the Vue application. It connects to the separate InstAlert ASP.NET Core API and does not run a database itself.

## Requirements

- Node.js 22.12 or later in the 22.x line, or a newer supported LTS, with npm.
- The InstAlert backend running with IAM and its database migrations applied.
- A public Mapbox access token for the map screens.
- A PayPal Sandbox application Client ID matching the backend, to complete subscription checkout.
- Brevo configured on the backend to deliver employee invitations.

Run commands from this repository's root, where `package.json` is located.

## 1. Install dependencies

```powershell
node --version
npm --version
npm ci
```

`npm ci` installs the versions recorded in `package-lock.json`. No JSON Server process is required for the authenticated application.

## 2. Configure local development

Create or edit `.env.development.local` in the repository root:

```dotenv
VITE_INSTALERT_PLATFORM_API_URL=http://localhost:5221/api/v1
VITE_PAYPAL_ENVIRONMENT=sandbox
VITE_PAYPAL_CLIENT_ID=<PUBLIC_SANDBOX_CLIENT_ID>
VITE_MAPBOX_API_KEY=<PUBLIC_MAPBOX_TOKEN>
```

Replace the placeholders with your own values. The API URL must include `/api/v1`; it is not the Scalar documentation URL. Use the same public Sandbox Client ID as the backend's `PayPal:ClientId`. Restrict the public Mapbox token to the origins used by your application as appropriate.

Vite loads the base environment files and then the selected mode's files. A mode-specific `.local` file overrides its corresponding committed file; terminal environment variables take precedence. Restart Vite after editing environment values. If `.env.development` already exists, review its values rather than assuming they point to your local API.

Every `VITE_*` value can be exposed to the browser. Never put a database password, JWT signing key, PayPal Client Secret or Brevo API key here. Those belong in the backend. The application also reads `VITE_PRIME_UI_LICENSE_KEY` if your UI package setup requires a license; provide your own applicable value rather than borrowing a credential.

## 3. Start the application

Start the backend first, following its README. Its default HTTP profile uses port 5221. Then run:

```powershell
npm run dev -- --port 5173 --strictPort
```

Open `http://localhost:5173`. Strict port mode stops if 5173 is already occupied, avoiding an unexpected origin change. The backend must allow this exact origin in CORS. If you choose another hostname or port, update backend CORS accordingly.

You can check backend readiness at `http://localhost:5221/health/ready` and inspect its endpoints at `http://localhost:5221/scalar/`. A successful health response confirms database readiness, not external email or payment credentials.

## 4. Create accounts and try the flow

### Administrator

1. Open the application and register using an email and password. Passwords require at least ten characters, a letter and a digit, within the backend's 72 UTF-8 byte limit.
2. Register your single business. Enter its details and select its position on the map.
3. Complete your personal profile.
4. Choose Essential, Professional or Business and approve the subscription with a PayPal Sandbox personal buyer account.
5. Wait for server verification. Buyer approval alone does not grant access; the backend must confirm the subscription and paid period.
6. Open the dashboard and business staff management to invite employees.

Leaving during setup does not require starting again: after sign-in, the app resumes the step reported by the server. Public registration creates administrators only. There is no demonstration role selector or shared seeded account.

### Employee

1. Receive an invitation from the administrator. The backend must have workers and Brevo email delivery enabled.
2. Sign in with the invited email and temporary password received by email. The temporary password lasts 24 hours.
3. Replace it with a personal password, complete the profile and accept the invitation.
4. Use the operational dashboard, alerts, map, notifications and your own emergency contacts.

Each employee belongs to one business. A deactivated membership retains that association. Administrators can deactivate or reactivate access subject to subscription and available capacity; they cannot edit an incorporated employee's credentials. If the temporary password expires, the administrator can resend the pending invitation.

## Main features

| Area | What it does |
| --- | --- |
| Account and profile | Sign-in, administrator registration, onboarding, personal data and password changes. |
| Business | Business profile, map location, staff, invitations and plan capacity. |
| Alerts | Panic countdown, confirmation, resolution, report details and history. Cancelling the countdown creates no alert. |
| Mapping | Nearby incidents, active alerts, registered businesses, risk zones and search filters. |
| Emergency contacts | Employees create, edit and delete their own contacts. |
| Notifications | Periodically refreshed inbox, unread state, nearby-alert preferences and navigation to the alert on the map. |
| Payments | Sandbox checkout, verification, subscription status, plan changes, cancellation, renewal and billing history. |
| Dashboard | Indicators and reports using data supplied by the API. |

The backend validates identity, ownership, membership, subscription and transitions. The frontend's route guards guide navigation; they do not replace server authorization. Signing out clears account-scoped frontend state. English and Latin American Spanish are supported.

## Production build

Create or edit `.env.production.local` with the public configuration for the deployment:

```dotenv
VITE_INSTALERT_PLATFORM_API_URL=https://instalert-backend-yqe9.onrender.com/api/v1
VITE_PAYPAL_ENVIRONMENT=sandbox
VITE_PAYPAL_CLIENT_ID=<PUBLIC_SANDBOX_CLIENT_ID>
VITE_MAPBOX_API_KEY=<PUBLIC_MAPBOX_TOKEN>
```

Use the backend address you actually intend to publish against. The API must already serve the IAM version and allow the frontend origin in CORS. This URL alone does not prove which backend release is currently deployed.

```powershell
npm run build
npm run preview -- --port 4173 --strictPort
```

The build output is `dist/`. Production builds reject missing/invalid API URLs, URLs without HTTPS or the `/api/v1` suffix, and missing Sandbox configuration. Vite embeds these values at build time: changing them requires another build. `npm run preview` serves the built files locally; it does not publish them. To test API calls from port 4173, allow `http://localhost:4173` in backend CORS.

## Firebase Hosting

The repository is configured for the Firebase project `instalert-c3f7f`. Before publishing, verify this is the intended project or select your own project using Firebase CLI. You need access to the target Firebase project.

```powershell
npm install --global firebase-tools
firebase login
firebase use
npm run build
firebase deploy --only hosting
```

The final command publishes the contents of `dist/` to the selected project. Build and verify the API configuration first. The configured project uses `https://instalert-c3f7f.web.app/`.

`firebase.json` serves `dist`, rewrites application routes to `index.html`, and configures caching. General responses are revalidated; versioned assets under `/assets/` may be cached for a year. Check direct navigation and refresh on sign-in, onboarding and protected routes after publication. Firebase Hosting serves the frontend only; the API and MySQL are hosted separately.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| API requests fail | Confirm the API is running, its URL ends in `/api/v1`, and restart Vite after changing variables. |
| Browser reports CORS | Verify API connectivity, then allow the exact frontend scheme, hostname and port in backend CORS. |
| Map does not load | Check the Mapbox token, its allowed origins and browser network errors. |
| PayPal checkout is unavailable | Configure Sandbox in both applications and match the public Client ID and provider plan IDs. |
| Account returns to setup | Check the incomplete step in the session; the profile and verified subscription are required. |
| Invitation email is missing | Check backend workers, Email/Brevo configuration, delivery status and the recipient's spam folder. |
| Notifications are missing | Check backend event workers, active membership, subscription, nearby radius and notification preferences. |
| A protected request returns 401 | Sign in again; the token may be expired or revoked. |
| A protected request returns 403 | Check role, onboarding, membership and paid access. |
| Production build uses old configuration | Review `.env.production`, `.env.production.local` and terminal overrides, then rebuild and publish again. |

## Project structure

```text
src/
  iam/
  business/
  profiles/
  alert/
  contacts/
  notifications/
  payments/
  mapping/
  dashboard/
  shared/
  router.js
  main.js
```

Feature folders separate domain models, application state/use cases, API adapters and presentation. Shared contains reusable components and HTTP/session infrastructure. Vue Router composes role-specific navigation; Pinia manages state; Axios communicates with the backend; PrimeVue provides UI components; Mapbox GL renders maps; Chart.js renders dashboard charts.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server. |
| `npm run build` | Production build in `dist/`. |
| `npm run preview` | Local preview of the production build. |
