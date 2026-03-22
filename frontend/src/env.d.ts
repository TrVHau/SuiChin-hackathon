/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUI_PACKAGE_ID: string;
    readonly VITE_SUI_NETWORK: string;
    readonly VITE_BACKEND_REST_URL?: string;
    readonly VITE_BACKEND_WS_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
