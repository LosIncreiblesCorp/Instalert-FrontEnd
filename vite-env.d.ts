interface ImportMetaEnv {
    readonly VITE_PRIME_UI_LICENSE_KEY: string;
    readonly VITE_INSTALERT_PLATFORM_API_URL: string;
    readonly VITE_MAPBOX_API_KEY: string;
    readonly VITE_ALERTS_ENDPOINT_PATH: string;
    readonly VITE_ALERT_PREFERENCES_ENDPOINT_PATH: string;
    readonly VITE_BUSINESS_MEMBERS_ENDPOINT_PATH: string;
    readonly VITE_STAFF_INVITATIONS_ENDPOINT_PATH: string;
    readonly VITE_BUSINESSES_ENDPOINT_PATH: string;
    readonly VITE_RISK_ZONES_ENDPOINT_PATH: string;
    readonly VITE_INCIDENTS_ENDPOINT_PATH: string;
    readonly VITE_PLANS_ENDPOINT_PATH: string;
    readonly VITE_SUBSCRIPTIONS_ENDPOINT_PATH: string;
    readonly VITE_PAYMENT_METHODS_ENDPOINT_PATH: string;
    readonly VITE_INVOICES_ENDPOINT_PATH: string;
    readonly VITE_EMERGENCY_CONTACTS_ENDPOINT_PATH: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}