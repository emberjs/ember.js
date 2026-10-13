/**
 * `@glimmer/component-gxt/reactive` — the GXT reactive core this package is
 * built against.
 *
 * This subpath re-exports the reactive-runtime symbols that an npm-installed
 * `@glimmer/component` would otherwise pull from its own copies of
 * `@glimmer/reference` / `@glimmer/manager` / `@glimmer/tracking`. By
 * importing them from the modules the GXT rollup build resolves for every
 * other consumer in the bundle — the `@ember/-internals/gxt-backend/validator`
 * shim and metal's `tracked` / `cached` (what `@glimmer/tracking` re-exports)
 * — we guarantee that the `Tag`-related symbols (`createTag`, `CURRENT_TAG`)
 * and the `@tracked` / `@cached` decorators reachable "through
 * `@glimmer/component-gxt`" are IDENTITY-EQUAL (`===`) to the ones the rest of
 * the GXT build uses. That is the property the identity test
 * (`__tests__/identity.test.ts`) asserts: the reactive fork is closed on the
 * GXT side.
 *
 * Note on the named-symbol surface: of the four symbols the RFC §6 calls out
 * (`Tag`, `createTag`, `CURRENT_TAG`, `getCustomTagFor`), `createTag` and
 * `CURRENT_TAG` are exported by the lightweight `@glimmer/validator` shim and
 * re-exported here. `Tag` is a TypeScript interface, not a runtime value.
 * `getCustomTagFor` lives in the heavyweight `@glimmer/manager` shim
 * (`manager.ts`), which transitively pulls Ember's renderer graph; it is not
 * re-exported from this thin reactive surface and is therefore out of scope
 * for the lightweight identity test (documented in that test).
 *
 * These imports use bare `@ember/-internals/*` specifiers — the alias
 * contract the GXT build provides — rather than relative paths, so the wiring
 * is honest about the shipping form. The package is excluded from
 * the classic root `tsconfig.json` type-check for the same reason the
 * `gxt-backend` shims themselves are: it is GXT-build-only machinery and the
 * specifiers only resolve under the GXT alias map (see `rollup.config.mjs`).
 */

// Tag-related reactive primitives (RFC §6 named symbols reachable via the
// lightweight shim).
export { createTag, CURRENT_TAG } from '@ember/-internals/gxt-backend/validator';

// @tracked / @cached: metal's, as `@glimmer/tracking` re-exports them (their
// GXT path keeps a tracked property in its gxt cell). The cache primitives are
// the validator shim's, as `@glimmer/tracking/primitives/cache` re-exports
// them.
export { tracked } from '@ember/-internals/metal/lib/tracked';
export { cached } from '@ember/-internals/metal/lib/cached';
export { createCache, getValue } from '@ember/-internals/gxt-backend/validator';
