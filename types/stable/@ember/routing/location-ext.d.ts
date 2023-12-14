// This module provides an 'extension' to the `@ember/routing/location` module
// from the `@ember/routing` package, so that users can rely on
// `owner.lookup('location:hash')` type checking and returning `HashLocation`
// (and the same for other location types). Our type publishing infrastructure
// will pass it through unchanged, so end users will get this extension.

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
