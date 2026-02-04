/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUI_PACKAGE_ID: string;
    readonly VITE_SUI_NETWORK: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
