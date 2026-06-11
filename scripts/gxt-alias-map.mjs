/**
 * Canonical GXT wiring table — single source of truth for the build-time
 * `@glimmer/* | @ember/* | ember-template-compiler` → gxt-backend shim
 * redirects, the externalized/dropped package lists, plus the "is the GXT
 * backend enabled" boolean. It is consumed by BOTH build pipelines AND the
 * packaging script so the lists can no longer drift apart:
 *
 *   - rollup.config.mjs   (EMBER_RENDER_BACKEND=gxt) → an exact-key object map
 *                                                       merged into resolvePackages,
 *                                                       plus externals + entry drops
 *   - vite.config.mjs     (GXT_MODE=true)            → a resolve.alias[] array
 *   - scripts/build-gxt-package.mjs                  → leak checks + addon-main
 *                                                       patching off GXT_DROPPED_ENTRIES
 *
 * The rebase onto upstream main proved the sync-fragility this module removes:
 * upstream's vendored `@glimmer/*` migration introduced deep-path imports
 * (e.g. `@glimmer/validator/lib/tracking`) that the vite dev tree must collapse
 * onto the single shim file, while the prefix-string aliases that existed in
 * only one config silently broke. Keeping both derivations off ONE table makes
 * that class of skew impossible.
 */

// Directory (repo-relative) holding the compat shims.
export const GXT_SHIM_DIR = 'packages/@ember/-internals/gxt-backend';

/**
 * The canonical specifier → shim-basename table.
 *
 * `subpathTolerant: true` marks specifiers whose DEEP-PATH imports must also
 * collapse onto the single shim file. This matters only for the vite dev tree,
 * which bundles the test sources that use those deep paths
 * (`@glimmer/manager/lib/public/template`, `@glimmer/validator/lib/validators`,
 * `@glimmer/reference/lib/iterable`, …). The rollup GXT build does not need it:
 * deep `@glimmer/*` imports there resolve to the real vendored in-repo source,
 * and nothing reachable from the GXT rollup entry graph imports them.
 *
 * ORDER IS SIGNIFICANT for the vite alias array (first match wins, and Vite
 * string aliases match on a `find + '/'` prefix): keep
 * `@glimmer/tracking/primitives/cache` ahead of `@glimmer/tracking`.
 */
export const GXT_SHIM_ALIASES = [
  { find: 'ember-template-compiler', shim: 'ember-template-compiler' },
  { find: '@ember/template-compilation', shim: 'compile' },
  { find: '@ember/-internals/deprecations', shim: 'deprecate' },
  { find: '@glimmer/application', shim: 'glimmer-application' },
  { find: '@glimmer/utils', shim: 'glimmer-util' },
  { find: '@glimmer/manager', shim: 'manager', subpathTolerant: true },
  { find: '@glimmer/tracking/primitives/cache', shim: 'glimmer-tracking' },
  { find: '@glimmer/tracking', shim: 'glimmer-tracking' },
  { find: '@glimmer/validator', shim: 'validator', subpathTolerant: true },
  { find: '@glimmer/destroyable', shim: 'destroyable' },
  { find: '@glimmer/reference', shim: 'reference', subpathTolerant: true },
];

/**
 * Packages that the shims import and that the GXT rollup build should treat
 * as external rather than trying to bundle. These are resolved at runtime by
 * the host (vite dev / the published gxt package). Only applied when the
 * rollup build runs with EMBER_RENDER_BACKEND=gxt, so the classic build is
 * unaffected.
 */
export const GXT_EXTERNAL_PACKAGES = new Set([
  '@lifeart/gxt',
  '@lifeart/gxt/glimmer-compatibility',
  '@lifeart/gxt/runtime-compiler',
  '@lifeart/gxt/compiler',
]);

/**
 * The Glimmer VM packages dropped from the rollup top-level entry map in GXT
 * mode. They remain resolvable via exposedDependencies() (so stray imports
 * still succeed), but are no longer emitted as their own
 * dist/packages/@glimmer/* chunks; anything not reachable from the remaining
 * entry points gets tree-shaken. build-gxt-package.mjs uses the SAME list for
 * its leak checks (a dropped package present in the assembled dist means a
 * stale classic build leaked through — the §1.3 hazard) and for patching the
 * addon-main implicit-modules list, so the two sides cannot drift.
 */
export const GXT_DROPPED_ENTRIES = new Set([
  '@glimmer/runtime',
  '@glimmer/opcode-compiler',
  '@glimmer/program',
  '@glimmer/wire-format',
  '@glimmer/encoder',
  '@glimmer/vm',
  '@glimmer/util',
  '@glimmer/global-context',
  '@glimmer/node',
  '@glimmer/owner',
]);

/**
 * Anchored regex that also matches deep-path imports of `find`, e.g.
 * `gxtSubpathRegExp('@glimmer/validator')` matches both `@glimmer/validator`
 * and `@glimmer/validator/lib/tracking`. Used by the vite alias derivation for
 * `subpathTolerant` entries.
 */
export function gxtSubpathRegExp(find) {
  const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^' + escaped + '(/.*)?$');
}

/**
 * The single "is the GXT backend enabled" predicate. Honors BOTH historical
 * flags so either spelling turns GXT on for the readers that can safely accept
 * both: `GXT_MODE=true` (the vite dev/test harness) and `EMBER_RENDER_BACKEND=gxt`
 * (the rollup production build).
 *
 * NOTE on the deliberate asymmetry: `rollup.config.mjs` intentionally keys its
 * `USE_GXT_BACKEND` off `EMBER_RENDER_BACKEND` ALONE and must NOT use this OR
 * helper. vite.config.mjs imports `exposedDependencies()`/`resolvePackages()`
 * from rollup.config.mjs at GXT_MODE time; if `USE_GXT_BACKEND` also flipped on
 * `GXT_MODE`, those rollup helpers would start externalizing the `@lifeart/gxt`
 * dist paths and inject the rollup gxtOverrides — both wrong for the vite dev
 * server (which serves those files and applies its own resolve.alias). The
 * vite/babel readers, by contrast, never run under bare `EMBER_RENDER_BACKEND`
 * in CI, so honoring both there is purely additive.
 */
export function isGxtEnabled(env = process.env) {
  return env.GXT_MODE === 'true' || env.EMBER_RENDER_BACKEND === 'gxt';
}
