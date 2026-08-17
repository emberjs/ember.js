/**
 * Classes Glimmer constructs itself declare this slot, so that
 * `@glimmer/destroyable` can hold their meta directly rather than in its
 * `WeakMap`. It lives here so packages below `@glimmer/destroyable` can declare
 * the slot without depending on it.
 *
 * Never write this onto an object Glimmer did not construct. Destroyables are
 * public through `@ember/destroyable` and can be any object a user hands in.
 */
export const DESTROYABLE_META_SLOT = Symbol('DESTROYABLE_META_SLOT');

export interface HasDestroyableMetaSlot {
  [DESTROYABLE_META_SLOT]?: object | undefined;
}
