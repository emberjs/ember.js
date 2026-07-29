/*
  The modern replacement for the `@ember/controller` entrypoint, swapped in
  at the build level for variants without the classic object model. The
  Controller class and `inject` come from `-base`; the classic
  `ControllerMixin` value (a Mixin) is not included.
*/

export {
  default,
  inject,
  type ControllerMixin,
  type ControllerQueryParam,
  type ControllerQueryParamType,
} from './-base';

// Type-only, so the classic barrel is not pulled into the modern build. Note
// that app registrations still augment the '@ember/controller' module, which
// is this module in the modern build; the published types (generated from the
// classic barrel) are what TypeScript resolves either way.
export type { Registry } from './index';
