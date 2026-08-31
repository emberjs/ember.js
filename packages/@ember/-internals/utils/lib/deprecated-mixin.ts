/**
  Registry of the deprecation notice that belongs to a single framework mixin.

  `Mixin.create` deprecates the act of authoring a mixin. A framework mixin
  such as `Observable` is built through `INTERNAL_MIXIN_CREATE`, so it stays
  silent while Ember applies it. Application code that applies the same mixin
  must still get a notice for that specific mixin, so the public entry points
  (`Mixin.create`, `CoreObject.extend`, `CoreObject.reopen`) look the mixin up
  here and call its notice.

  The registry is a `WeakMap`, so the association is not visible on the mixin.

  @private
*/
const NOTICES = new WeakMap<object, () => void>();

/**
  Records the deprecation notice for a framework mixin and returns the mixin.

  @private
*/
export function deprecatedMixin<T extends object>(mixin: T, notice: () => void): T {
  NOTICES.set(mixin, notice);
  return mixin;
}

/**
  Calls the deprecation notice of every value that is a deprecated framework
  mixin. Other values are ignored.

  @private
*/
export function deprecateAppliedMixins(mixins: ArrayLike<unknown>): void {
  for (let i = 0; i < mixins.length; i++) {
    let mixin = mixins[i];
    if (typeof mixin !== 'object' || mixin === null) {
      continue;
    }
    let notice = NOTICES.get(mixin);
    if (notice !== undefined) {
      notice();
    }
  }
}
