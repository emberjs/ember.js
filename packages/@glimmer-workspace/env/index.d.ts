/**
 * The types for import.meta.env live here because this is the root package.
 */

interface ImportMetaEnv {
  BASE_URL: string;
  MODE: string;
  DEV: boolean;
  PROD: boolean;
  SSR: boolean;
}

interface ImportMeta {
  url: string;

  readonly env: ImportMetaEnv;
}
