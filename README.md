# InstAlert (`instalert`)

## Overview
InstAlert is a Vue 3 + Vite application organized with a domain-driven design (DDD) style. The project models operational safety for businesses by bounded context and keeps business concepts separated from UI and infrastructure concerns.

The app has two roles (`administrator`, `employee`) with separate `/admin/*` and `/employee/*` route trees. The current implementation actively uses Alert, Business, Contacts, Mapping, Payments, Profiles, Notifications and Dashboard contexts on top of a Shared kernel.

## Goals
- Show a practical front-end architecture with DDD-inspired layering.
- Keep domain concepts explicit (`entity`, `assembler`, `api`, `store`).
- Provide a clean base for CRUD use cases, localization (EN/ES), routing by role, and map-based visualization.

## Tech Stack
- Vue 3
- Vite
- Pinia
- Vue Router
- Vue I18n
- PrimeVue + PrimeFlex + PrimeIcons + `@primeuix/themes`
- Axios
- Mapbox GL (`mapbox-gl`) for risk maps
- Chart.js for dashboard charts
- `json-server` for local mock API

## Project Structure (DDD-Oriented)
```text
src/
  alert/                       # Alert bounded context
    domain/model/              # Core entities (AlertRecord, AlertPreferences)
    application/               # Use-case orchestration (alert.store.js)
    infrastructure/            # API gateway and assemblers
    presentation/              # Views and route declarations

  business/                    # Business / personnel bounded context
    domain/model/              # BusinessMember, StaffInvitation entities
    application/               # business.store.js
    infrastructure/            # business-api.js, assemblers
    presentation/              # personnel-list, invitation-form + routes

  contacts/                    # Emergency contacts bounded context
    domain/model/              # EmergencyContact entity
    application/               # contacts.store.js
    infrastructure/            # contacts-api.js, assembler
    presentation/              # contacts-list, contact-form + routes

  mapping/                     # Mapping / risk-zone bounded context
    domain/model/              # RiskZone, IncidentMarker, BusinessLocation
    application/               # mapping.store.js
    infrastructure/            # mapping-api.js, assemblers
    presentation/              # risk-map-page, risk-map, tactical-inspector, zone-detail

  payments/                    # Payments / subscription bounded context
    domain/model/              # Plan, Subscription, Invoice, PaymentMethod
    application/               # payments.store.js
    infrastructure/            # payments-api.js, assemblers
    presentation/              # subscription-page, plan-card, billing-history, etc.

  profiles/                    # Personal data and general preferences
    domain/model/              # UserProfile, UserPreferences
    application/               # profiles.store.js
    infrastructure/            # profiles-api.js, assemblers
    presentation/              # user-profile + routes

  notifications/               # Received notices and delivery preferences
    domain/model/              # Notification, NotificationPreferences
    application/               # notifications.store.js
    infrastructure/            # notifications-api.js, assemblers
    presentation/              # notifications, notification-notice + routes

  dashboard/                   # Current-month read projections and saved monthly reports
    domain/model/              # DashboardSummary, MonthlyReport
    application/               # dashboard.store.js
    infrastructure/            # dashboard-api.js, dashboard.assembler.js
    presentation/              # dashboard-page, monthly-reports, dashboard-chart + routes

  shared/                      # Shared cross-context concerns
    infrastructure/            # BaseApi, BaseEndpoint
    presentation/              # Layout and shared views/components
```

## Bounded Contexts

### Alert Context
- Manages safety alerts and employee alert preferences.
- Uses `AlertRecord` and `AlertPreferences` entities in the domain layer.
- Uses `useAlertStore` to orchestrate panic activation, grace-period countdown, report drafts and history queries.
- Routes: base `alert-routes.js` (`alerts`) remapped to `/employee/*` in `src/router.js`, plus `/admin/alerts/history`.

### Business Context
- Owns the business profile, operational memberships and staff invitations.
- Uses `Business`, `BusinessMember` and `StaffInvitation` entities.
- Uses `useBusinessStore` for invitation create/delete and membership toggle use cases.
- Routes in `business-routes.js`: `/admin/business`, `/admin/personnel`, `/admin/personnel/invitations/new`.

### Contacts Context
- Manages employee emergency contacts.
- Uses `EmergencyContact` entity and `useContactsStore` for fetch/create/update/delete.
- Routes in `contacts-routes.js`: `/employee/contacts`, `/employee/contacts/new`, `/employee/contacts/:id/edit`.

### Mapping Context
- Manages risk polygons, incident markers and business locations on a Mapbox map.
- Uses `RiskZone`, `IncidentMarker` and `BusinessLocation` entities.
- Uses `useMappingStore` to load zones/incidents and keep selection state.
- Presentation splits container (`risk-map-page.vue`) from map primitives (`risk-map.vue`, `tactical-inspector.vue`, `zone-detail.vue`).

### Payments Context
- Owns the plan catalog, subscriptions, transactions and employee limits associated with each plan.
- Uses `Plan`, `Subscription` and `usePaymentsStore` for catalog and subscription workflows.
- Presents monthly plans, PayPal Sandbox checkout, subscription status and payment history.
- Routes in `payments-routes.js`: `/admin/subscription`.

### Profiles Context
- Owns personal data and general application preferences. Credentials belong to IAM; notification delivery and reception-radius preferences belong to Notifications.
- Uses `UserProfile`, `UserPreferences`, `ProfilesApi`, assemblers and `useProfilesStore`.
- Personal data includes names, DNI stored as text and optional phone. DNI validation requires eight digits and preserves initial zeros.
- Application language is edited in profile preferences: `en_US` by default and `es_419` as the alternative.
- Routes in `profiles-routes.js`: `/admin/profile` and `/employee/profile`.

### Notifications Context
- Owns received notifications, recipient/read state and notification-delivery preferences. The original alert belongs to Alert.
- Uses `Notification`, `NotificationPreferences`, `NotificationsApi`, assemblers and `useNotificationsStore`.
- The header bell opens the inbox with an unread count, all/unread filters and read-state actions. A gear opens preferences in a modal dialog.
- Nearby-alert preferences use radii of 100, 500 or 1000 meters (initially 500), measured from the business's saved location.
- The current JSON Server flow refreshes in-app notices while the application is visible.
- Routes in `notifications-routes.js`: `/admin/notifications` and `/employee/notifications`.

### Dashboard Context
- Owns read projections and monthly report snapshots; source records remain with their original contexts.
- Uses DashboardSummary, MonthlyReport, DashboardApi, DashboardAssembler and useDashboardStore.
- Provides current-month summaries by role with accessible charts, current alert state and team capacity where applicable.
- The administrator opens saved monthly reports from Dashboard; each detail preserves its closing counts, charts and previous-month comparison.
- Its infrastructure adapter composes JSON Server resources for local development; views consume store actions.
- Routes in dashboard-routes.js: /admin/dashboard, /employee/dashboard, /admin/monthly-reports and /admin/monthly-reports/:reportId.

### Shared Context
Provides reusable infrastructure and presentation utilities.

- `BaseApi` centralizes Axios configuration.
- `BaseEndpoint` centralizes CRUD endpoint behavior.
- Shared UI structure (`layout.vue`) and `page-not-found.vue` live under `shared/presentation`. Language settings are presented by Profiles.

## Layer Responsibilities

### Domain Layer
- Defines business concepts and invariants as plain JavaScript classes.
- Should stay framework-agnostic (no Vue/HTTP code).

### Application Layer
- Coordinates behavior and state transitions through Pinia stores.
- Uses domain objects plus infrastructure services to execute workflows.

### Infrastructure Layer
- Talks to external services/APIs.
- Maps external payloads to internal models via assemblers.

### Presentation Layer
- Renders UI and handles user interactions.
- Calls store actions and reacts to state.

## Running the Project

### Prerequisites
- Node.js + npm installed (use versions compatible with Vite 8).

### 1) Install dependencies
```bash
npm install
```

### 2) Start mock API server (`json-server`)
From the project root:
```bash
npm run dev:api
```

This command works in PowerShell and starts JSON Server with the resource routes required by the frontend. Stop any existing JSON Server on port 3000 before running it. Starting with only `--watch db.json` omits the `/api/v1/*` rewrite and makes individual resource URLs fail.

The server reads:
- `server/db.json`
- `server/routes.json` (maps `/api/v1/*` to root resources)

Default local API base used by development env:
- `http://localhost:3000/api/v1`

### 3) Start the Vue app
In a separate terminal, from the project root:
```bash
npm run dev
```

### 4) Build for production
```bash
npm run build
```

### 5) Preview production build
```bash
npm run preview
```

## Environment Variables
Environment files included:
- `.env.development`
- `.env.production`

Main variables:
- `VITE_INSTALERT_PLATFORM_API_URL`
- `VITE_MAPBOX_API_KEY`
- `VITE_PRIME_UI_LICENSE_KEY`
- `VITE_PAYPAL_ENVIRONMENT`, `VITE_PAYPAL_CLIENT_ID` and the monthly PayPal plan ID variables configure Sandbox checkout.
API resource paths are configured in both environment files:

| Variable | Configured resource path |
|---|---|
| `VITE_ALERTS_ENDPOINT_PATH` | `alerts` |
| `VITE_ALERT_PREFERENCES_ENDPOINT_PATH` | `alertPreferences` |
| `VITE_BUSINESS_MEMBERS_ENDPOINT_PATH` | `business-members` |
| `VITE_STAFF_INVITATIONS_ENDPOINT_PATH` | `staff-invitations` |
| `VITE_BUSINESSES_ENDPOINT_PATH` | `businesses` |
| `VITE_RISK_ZONES_ENDPOINT_PATH` | `risk_zones` |
| `VITE_INCIDENTS_ENDPOINT_PATH` | `incidents` |
| `VITE_PLANS_ENDPOINT_PATH` | `plans` |
| `VITE_SUBSCRIPTIONS_ENDPOINT_PATH` | `subscriptions` |
| `VITE_PAYMENT_METHODS_ENDPOINT_PATH` | `payment-methods` |
| `VITE_INVOICES_ENDPOINT_PATH` | `invoices` |
| `VITE_USER_PROFILES_ENDPOINT_PATH` | `user-profiles` |
| `VITE_USER_PREFERENCES_ENDPOINT_PATH` | `user-preferences` |
| `VITE_NOTIFICATIONS_ENDPOINT_PATH` | `notifications` |
| `VITE_NOTIFICATION_PREFERENCES_ENDPOINT_PATH` | `notification-preferences` |
| `VITE_DASHBOARD_ENDPOINT_PATH` | `dashboard` |
| `VITE_MONTHLY_REPORTS_ENDPOINT_PATH` | `monthly-reports` |
| `VITE_EMERGENCY_CONTACTS_ENDPOINT_PATH` | `emergency-contacts` |

The API base URL includes the API prefix when required; resource paths are relative to it. Development uses the local JSON Server at `http://localhost:3000/api/v1`; production uses the configured hosted mock URL.

Missing API configuration raises an error rather than falling back to hard-coded resource names. Restart Vite after changing environment variables, or rebuild for production. All `VITE_*` values are exposed to the browser.

Tip: if your API is running on a different port, update `VITE_INSTALERT_PLATFORM_API_URL` in `.env.development`.

VITE_DASHBOARD_DATA_SOURCE=mock selects the local resource-composition adapter for Dashboard.

## Routing Notes
- Router exposes role-scoped trees: `/admin/*` (`administrator`) and `/employee/*` (`employee`). `/` shows the demonstration profile selector; `/admin` and `/employee` redirect to their respective dashboards.
- Feature modules export their own routes (`alert-routes.js`, `business-routes.js`, `contacts-routes.js`, `payments-routes.js`, `profiles-routes.js`, `notifications-routes.js`) and `src/router.js` composes them; employee alert routes are derived by prefixing `alertRoutes` with `/employee/`.
- Global `beforeEach` sets the document title from route metadata (`InstAlert | <translated title>`).

## API and Data Notes
- JSON Server provides mock resources for local frontend development.
- Mock role and resource identifiers do not implement authentication or authorization.

### Frontend integration boundaries

The current frontend consumes the following adapter projections. HTTP access and mock resource composition stay in infrastructure adapters; contexts collaborate through DTOs and IDs.

| Consumer | Source owner | Adapter result consumed by the frontend |
|---|---|---|
| Business | Payments | `BusinessApi.getPlanLimits(businessId)` returns `{ maxEmployees, planName, subscriptionActive }`. |
| Payments | Business | `PaymentsApi.getSeatUsage(businessId)` returns `{ activeEmployees, reservedSeats }`; administrators are excluded and pending invitations reserve seats. |
| Mapping | Business | Business location assemblers map `{ id, name, address, isVerified, latitude, longitude }` into Mapping's own location model. |

JSON Server supplies raw collections; infrastructure adapters compose the snapshots consumed by their contexts. These frontend data shapes describe the current mock integration.

The Business profile currently uses the following mock operations through `VITE_BUSINESSES_ENDPOINT_PATH`:

| Operation | Current mock contract |
|---|---|
| Load profile | `GET businesses/:id` returns a business resource. Only a `404` enables registration; connection/server failures show an error. |
| Register | `POST businesses` sends the synthetic commerce ID, `taxId` as text, name, address, numeric coordinates and mock metadata. |
| Edit | `PATCH businesses/:id` sends name, address, coordinates and `updatedAt`; it preserves the registered RUC, verification flag and unrelated stored fields. |

The demonstration context uses `bus-1` and `demo-employee` as identifiers, which do not provide authentication or authorization. Address entry does not perform geocoding: the user selects the map point, and Business stores its coordinates for geographic projections.

## Documentation
- Domain and architecture references:
  - `docs/class_diagram.puml`
  - `docs/user-stories.md`
- Project history and release notes:
  - `CHANGELOG.md`

## Recommended Development Practices
- Keep each feature inside its bounded context first; move to `shared` only when truly cross-context.
- Preserve layer boundaries (presentation does not call raw HTTP clients directly).
- Prefer explicit domain language in naming and docs.
- Add or update docs when introducing new entities or use cases.
