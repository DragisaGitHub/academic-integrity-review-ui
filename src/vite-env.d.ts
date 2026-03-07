/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  /**
   * Base URL for the backend API (e.g. "http://localhost:8080").
   *
   * Leave unset to default to same-origin (useful when the UI is served by the backend
   * or when using a dev proxy).
   */
  readonly VITE_API_BASE_URL?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
