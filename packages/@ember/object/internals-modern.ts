/*
  The modern replacement for the `@ember/object/internals` entrypoint,
  swapped in at the build level for variants without the classic object
  model. `cacheFor` (computed-property cache inspection) is gone along with
  computed properties.
*/

export { guidFor } from '@ember/-internals/utils/lib/guid';
