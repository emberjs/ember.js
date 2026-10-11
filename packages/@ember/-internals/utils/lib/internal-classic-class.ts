/**
  Keys for the internal versions of the classic class APIs.

  Ember's own classes still apply framework mixins such as `Observable` and
  `ActionHandler`, so they need `extend`, `reopen` and `reopenClass` without
  the classic class deprecation. These are Symbols so that they do not show
  up as discoverable property names and cannot be reached by name from
  application code.

  @private
*/
export const INTERNAL_EXTEND = Symbol('__internal__extend__');
export const INTERNAL_REOPEN = Symbol('__internal__reopen__');
export const INTERNAL_REOPEN_CLASS = Symbol('__internal__reopen_class__');
