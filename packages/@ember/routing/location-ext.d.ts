// An 'extension' to the `@ember/routing/location` module from the `@ember/routing` package.
// With it, users can rely on `owner.lookup('location:hash')` to type check and return `HashLocation`.
// The other location types work the same way.
// Our type publishing infrastructure passes it through unchanged, so end users get this extension.

import '@ember/routing/location';
import type HashLocation from '@ember/routing/hash-location';
import type HistoryLocation from '@ember/routing/history-location';
import type NoneLocation from '@ember/routing/none-location';

declare module '@ember/routing/location' {
  interface Registry {
    hash: HashLocation;
    history: HistoryLocation;
    none: NoneLocation;
  }
}
