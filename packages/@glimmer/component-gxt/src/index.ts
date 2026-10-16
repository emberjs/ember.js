/**
 * `@glimmer/component-gxt` — a GXT-backed sibling of `@glimmer/component`.
 *
 * ## Why this package exists
 *
 * `@glimmer/component` is published independently of Ember and directly
 * imports `@glimmer/manager` + `@glimmer/reference`. If a consumer app
 * installs `@glimmer/component@2.x` from npm alongside a GXT build, two
 * copies of the reactive runtime co-exist and the symbol identity of
 * `Tag` / `createTag` / `CURRENT_TAG` / `getCustomTagFor` forks across the
 * two copies (the npm package bypasses the GXT shims that the gxt build
 * alias-injects).
 *
 * There are two remedies. The target is to extract a Glimmer-team-owned
 * protocol package. The fallback — implemented here — is to ship a sibling
 * that "re-exports the same named symbols but implements them against GXT's
 * reactive core" so its symbols are identity-equal with the GXT build's
 * shims.
 *
 * ## Public surface
 *
 * `@glimmer/component` 2.x's public API is exactly its default export (the
 * `Component` base class). This package mirrors that surface 1:1 by
 * re-exporting it. The base class itself carries no reactive-runtime
 * imports — the fork risk lives in the reactive primitives `@tracked`,
 * the component manager, and the `createTag`/`CURRENT_TAG` machinery use.
 * Those are pinned to the GXT shims via the `./reactive` subpath (see
 * `./reactive.ts`), which is what the identity test asserts.
 *
 * ## Delegation, not reimplementation
 *
 * In the GXT rollup build `@glimmer/component` is the in-repo workspace
 * package whose `@glimmer/manager` / `@glimmer/reference` / `@glimmer/tracking`
 * imports are alias-injected to `@ember/-internals/gxt-backend/*`. So
 * re-exporting its default here yields a `Component` already wired to the
 * GXT reactive core. When the real `ember-source-gxt` packaging exists,
 * this re-export targets the GXT-wired component bundled there
 * instead of the npm copy.
 */
export { default } from '@glimmer/component';
