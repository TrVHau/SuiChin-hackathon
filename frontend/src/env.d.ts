/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUI_PACKAGE_ID: string;
  readonly VITE_TREASURY_OBJECT_ID?: string;
  readonly VITE_MARKET_OBJECT_ID?: string;
  readonly VITE_CRAFT_CONFIG_OBJECT_ID?: string;
  readonly VITE_RANDOM_OBJECT_ID?: string;
  readonly VITE_SUI_NETWORK: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_BACKEND_REST_URL?: string;
  readonly VITE_BACKEND_WS_URL?: string;
  readonly VITE_ENOKI_PUBLIC_API_KEY?: string;
  readonly VITE_ENOKI_GOOGLE_CLIENT_ID?: string;
  readonly VITE_ENOKI_FACEBOOK_CLIENT_ID?: string;
  readonly VITE_ENOKI_TWITCH_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
