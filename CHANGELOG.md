# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-04

### Added
- **Project Configuration:**
  - Vue 3 + Vite setup with Pinia, Vue Router, Vue I18n, PrimeVue + PrimeFlex + PrimeIcons + Material preset.
  - Development and production environments (`.env.development`, `.env.production`) with `VITE_INSTALERT_PLATFORM_API_URL`, `VITE_MAPBOX_API_KEY`, `VITE_PRIME_UI_LICENSE_KEY`.
  - `json-server` local mock backend with `server/db.json`, `server/routes.json` (`/api/v1/*` mapping) and `server/start.sh`.
- **Shared Bounded Context:**
  - Reusable HTTP client `BaseApi` and CRUD abstraction `BaseEndpoint` using Axios.
  - Application layout with role navigation (`administrator` / `employee`), language switcher with persisted locale, and `PageNotFound` view.
  - Role-scoped router (`/admin/*`, `/employee/*`) with lazy-loaded routes and document-title `beforeEach` guard.
- **Mapping Bounded Context:**
  - Domain models: `RiskZone`, `IncidentMarker` and `BusinessLocation` entities.
  - Application store: `useMappingStore` for risk-zone / incident / verified-business loading and selection state.
  - Infrastructure: `MappingApi` gateway and `RiskZoneAssembler`, `IncidentMarkerAssembler`, `BusinessLocationAssembler`.
  - Presentation: `RiskMapPage`, `RiskMap` (Mapbox GL), `TacticalInspector`, `ZoneDetail` components and mapping routes.
  - Mock data: `risk_zones` (48), `incidents` (159), `businesses` (105) collections.
- **Business Bounded Context:**
  - Domain models: `BusinessMember` and `StaffInvitation` entities.
  - Application store: `useBusinessStore` for invitation create/cancel/resend/delete, membership toggle/update and seat-limit (`occupied/reserved/available`) management.
  - Infrastructure: `BusinessApi` gateway (members, invitations, `getPlanLimits` from `subscriptions`/`plans`) and assemblers.
  - Presentation: `PersonnelList`, `InvitationForm` views and business routes.
  - Mock data: `business-members` (4), `staff-invitations` (3) collections.
- **Payments Bounded Context:**
  - Domain models: `Plan`, `Subscription`, `Invoice` and `PaymentMethod` entities.
  - Application store: `usePaymentsStore` for plans/subscription/billing fetch and select/cancel flows with seat-usage validation.
  - Infrastructure: `PaymentsApi` gateway and assemblers; helpers in `payments-format.js` (`annualPrice`, `planPrice`, `formatMoney`, `formatDate`).
  - Presentation: `SubscriptionPage`, `PlanCard`, `SubscriptionSummary`, `PaymentMethodCard`, `BillingHistory` components and payments routes.
  - Mock data: `plans` (3), `subscriptions` (1) collections; `payment-methods` / `invoices` use simulated fallbacks until backend exists.
- **Alert Bounded Context:**
  - Domain models: `AlertRecord` (panic / suspicious-activity / past-incident / other-situation lifecycle) and `AlertPreferences` (grace period 1-60s) entities.
  - Application store: `useAlertStore` for panic countdown, report drafts with autosave, history queries and preference management.
  - Infrastructure: `AlertApi` gateway and `AlertRecordAssembler`, `AlertPreferencesAssembler`.
  - Presentation: `EmployeeAlerts` view for employee flow plus administrator history (`historyOnly`), and alert routes.
  - Mock data: `alerts` (5), `alertPreferences` (1) collections.
- **Contacts Bounded Context:**
  - Domain model: `EmergencyContact` entity with phone/email validation.
  - Application store: `useContactsStore` for contact fetch/create/update/delete.
  - Infrastructure: `ContactsApi` gateway and `EmergencyContactAssembler`.
  - Presentation: `ContactsList`, `ContactForm` views and contacts routes.
  - Mock data: `emergency-contacts` (1) collection.
- **Internationalization (i18n):**
  - Integrated `vue-i18n` with English (`en`) and Spanish (`es`) catalogs for shell, business, payments, alerts, contacts and mapping.
- **Documentation:**
  - `README.md` with setup guides, DDD architecture overview and running instructions.
  - `docs/user-stories.md` with Sprint 1 scope and Requirement Traceability Matrix (RTM).
  - Standardized JSDoc annotations across domain entities, stores, and infrastructure classes.
  - Mapbox API keys configured for development and production.
