// One flag per shakable deprecation, named identically to its entry in the
// DEPRECATIONS registry (@ember/-internals/deprecations). All flags are true
// in the standard build; a shaken build sets flags to false, which both
// strips the guarded legacy code paths and makes the deprecation report
// itself as removed at runtime (so unguarded reaches throw).
//
// Guard convention: reference the imported const directly (no destructuring,
// renaming, or property access — babel-plugin-debug-macros can only fold
// direct references), keep the deprecation call inside the guarded branch,
// and put the post-removal behavior in the other branch.

/** id: deprecate-comparable-mixin, since: 7.2.0/7.2.0, until: 7.5.0 */
export const DEPRECATE_COMPARABLE_MIXIN = true;

/** id: importing-inject-from-ember-service, since: 6.2.0/6.3.0, until: 7.0.0 */
export const DEPRECATE_IMPORT_INJECT = true;
