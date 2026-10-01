// `@ember/routing/location` extends the `@ember/owner` types through this file.
// Our type publishing infrastructure passes it through unchanged,
// so end users get this extension.

import type { Registry } from '@ember/routing/location';

declare module '@ember/owner' {
  export interface DIRegistry {
    location: Registry;
  }
}
