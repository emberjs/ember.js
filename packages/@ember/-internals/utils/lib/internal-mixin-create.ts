/**
  Key for the internal Mixin constructor.

  Ember's own internals are built on mixins, so they need a way to construct
  one without triggering the mixin deprecation that `Mixin.create` emits. This
  is deliberately a Symbol so that it does not show up as a discoverable
  property name and cannot be reached by name from application code.

  @private
*/
export const INTERNAL_MIXIN_CREATE = Symbol('__internal__mixin__');
