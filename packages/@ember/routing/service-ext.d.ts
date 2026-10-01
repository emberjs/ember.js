// An 'extension' to the `@ember/service` module from the `@ember/routing` package.
// It lets users rely on `@service('router')` type checking
// and on `Owner.lookup('service:router')` returning `RouterService`.
// Our type publishing infrastructure will pass it through unchanged,
// so end users will get this extension.

import '@ember/service';
import type RouterService from '@ember/routing/router-service';

declare module '@ember/service' {
  export interface Registry {
    router: RouterService;
  }
}
