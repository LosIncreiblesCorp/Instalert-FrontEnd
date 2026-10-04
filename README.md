# InstAlert (`instalert`)

## Overview
InstAlert is a Vue 3 + Vite application organized with a domain-driven design (DDD) style. The project models operational safety for businesses by bounded context and keeps business concepts separated from UI and infrastructure concerns.

The app has two roles (`administrator`, `employee`) with separate `/admin/*` and `/employee/*` route trees. The current implementation actively uses Alert, Business, Contacts, Mapping and Payments contexts on top of a Shared kernel.

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
- Manages business members and staff invitations.
- Uses `BusinessMember` and `StaffInvitation` entities.
- Uses `useBusinessStore` for invitation create/delete and membership toggle use cases.
- Routes in `business-routes.js`: `/admin/personnel`, `/admin/personnel/invitations/new`.

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
- Manages plans, subscriptions, invoices and payment methods.
- Uses `Plan`, `Subscription`, `Invoice` and `PaymentMethod` entities.
- Uses `usePaymentsStore` to fetch plans/subscription/billing and select/cancel flows.
- Helpers in `payments-format.js` (`annualPrice`, `planPrice`, `formatMoney`, `formatDate`).
- Routes in `payments-routes.js`: `/admin/subscription`.

### Shared Context
Provides reusable infrastructure and presentation utilities.

- `BaseApi` centralizes Axios configuration.
- `BaseEndpoint` centralizes CRUD endpoint behavior.
- Shared UI structure (`layout.vue`, `language-switcher.vue`) and `page-not-found.vue` live under `shared/presentation`.

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
cd server
sh start.sh
```

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
- `VITE_EMERGENCY_CONTACTS_ENDPOINT_PATH` (with fallback to `emergency-contacts` when unset)

Tip: if your API is running on a different port, update `VITE_INSTALERT_PLATFORM_API_URL` in `.env.development`.

## Routing Notes
- Router exposes role-scoped trees: `/admin/*` (`administrator`) and `/employee/*` (`employee`), with redirects `/` -> `admin-dashboard` and `/admin` -> `admin-dashboard`, `/employee` -> `employee-dashboard`.
- Feature modules export their own routes (`alert-routes.js`, `business-routes.js`, `contacts-routes.js`, `payments-routes.js`) and `src/router.js` composes them; employee alert routes are derived by prefixing `alertRoutes` with `/employee/`.
- Global `beforeEach` sets the document title from route metadata (`InstAlert | <translated title>`).

## API and Data Notes
- Local mock data currently includes `risk_zones` (48), `incidents` (159), `businesses` (105), `alerts`, `alertPreferences`, `business-members`, `staff-invitations`, `plans` (3), `emergency-contacts` and `subscriptions` collections.
- Endpoints follow the shared `BaseApi + BaseEndpoint` convention (`getAll/getById/create/update/delete`); `ContactsApi` shows the env-override pattern for endpoint paths.

## Documentation
- Code-level docs: JSDoc annotations across domain entities, stores, and infrastructure classes (`@class`, `@param`, `@returns`, `@type`), plus per-function JSDoc in `<script setup>` views/components.
- UI strings: `src/locales/en.json`, `src/locales/es.json`.

## Recommended Development Practices
- Keep each feature inside its bounded context first; move to `shared` only when truly cross-context.
- Preserve layer boundaries (presentation does not call raw HTTP clients directly).
- Prefer explicit domain language in naming and docs.
- Add or update docs when introducing new entities or use cases.
