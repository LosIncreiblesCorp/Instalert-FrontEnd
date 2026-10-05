interface ImportMetaEnv {
    readonly VITE_PRIME_UI_LICENSE_KEY: string;
    readonly VITE_INSTALERT_PLATFORM_API_URL: string;
    readonly VITE_MAPBOX_API_KEY: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}