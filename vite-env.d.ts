interface ImportMetaEnv {
    readonly VITE_PRIME_UI_LICENSE_KEY: string;
    readonly VITE_INSTALERT_PLATFORM_API_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}