// An 'extension' to the `@ember/owner` module, from `@ember/controller`.
// Our type publishing infrastructure passes it through unchanged,
// so end users get this extension.

import type { Registry } from '@ember/controller';

declare module '@ember/owner' {
  export interface DIRegistry {
    controller: Registry;
  }
}
