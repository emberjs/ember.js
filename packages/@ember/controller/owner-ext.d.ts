// This module provides an 'extension' to the `@ember/owner` module from the
// `@ember/controller` module. Our type publishing infrastructure will pass it
// through unchanged, so end users will get this extension.

import type { Registry } from './-base';

declare module '@ember/owner' {
  export interface DIRegistry {
    controller: Registry;
  }
}
