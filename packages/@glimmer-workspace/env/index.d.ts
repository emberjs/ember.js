/**
 * Declare import.meta.env in state, since it's the root package.
 */

interface ImportMetaEnv {
  [key: string]: any;
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
