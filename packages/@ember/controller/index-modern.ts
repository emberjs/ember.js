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
  type Registry,
} from './-base';
