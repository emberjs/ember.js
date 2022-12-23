// This module provides an 'extension' to the `@ember/owner` module from the
// `@ember/service` module. Our type publishing infrastructure will pass it
// through unchanged, so end users will get this extension.

declare module '@ember/owner' {
  import type { Registry } from '@ember/service';

  export interface DIRegistry {
    service: Registry;
  }
}
