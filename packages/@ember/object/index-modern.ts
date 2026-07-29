/*
  The modern replacement for the `@ember/object` entrypoint, swapped in at
  the build level for variants without the classic object model. It keeps the
  APIs that work on native/tracked objects — `action`, `get`/`set` and
  friends — and drops `EmberObject` (the default export), `computed`, and
  `observer`.
*/

export { action } from '@ember/object/-action';
export { notifyPropertyChange } from '@ember/-internals/metal/lib/property_events';
export { defineProperty } from '@ember/-internals/metal/lib/properties';
export { get } from '@ember/-internals/metal/lib/property_get';
export { set, trySet } from '@ember/-internals/metal/lib/property_set';
export { default as getProperties } from '@ember/-internals/metal/lib/get_properties';
export { default as setProperties } from '@ember/-internals/metal/lib/set_properties';
