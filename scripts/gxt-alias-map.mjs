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
 * Separate lists drift: upstream's vendored `@glimmer/*` migration introduced
 * deep-path imports (e.g. `@glimmer/validator/lib/tracking`) that the vite dev
 * tree must collapse onto the single shim file, while prefix-string aliases
 * that existed in only one config silently broke. Keeping both derivations off
 * ONE table makes that class of skew impossible.
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
 * `entryShim`: marks a package whose `@glimmer/<pkg>` shim is SPLIT into a lean
 * runtime module (`shim`) and a full-surface package-entry facade (`entryShim`,
 * which re-exports `shim` PLUS a `<pkg>-vm-compat` test-only module). The split
 * keeps the test-only VM-emulation OUT of the precompiled-app closure: in the
 * rollup GXT build the app's own bare/`…/lib/*` `@glimmer/<pkg>` imports resolve
 * to the lean `shim` (which the app's shared chunk pulls), while the published
 * `@glimmer/<pkg>` package ENTRY is emitted from `entryShim` (its own chunk,
 * NOT in the app closure). The vite test tree, by contrast, aliases the whole
 * `@glimmer/<pkg>` (bare + subpaths) to `entryShim` so the suites still see the
 * complete surface. The `<pkg>/lib/collections/*` and `<pkg>/lib/iterable` deep
 * paths used by `@ember/reactive/collections` and the (purged) VM opcode core
 * route to the `-vm-compat` module via GXT_SUBPATH_REDIRECTS below.
 *
 * ORDER IS SIGNIFICANT for the vite alias array (first match wins, and Vite
 * string aliases match on a `find + '/'` prefix).
 *
 * `@glimmer/tracking` is not shimmed: its in-repo package re-exports metal's
 * `tracked` / `cached` (which have their own GXT path) and the validator's
 * cache primitives, and those resolve to the validator shim above.
 */
export const GXT_SHIM_ALIASES = [
  { find: 'ember-template-compiler', shim: 'ember-template-compiler' },
  { find: '@ember/template-compilation', shim: 'compile' },
  { find: '@glimmer/application', shim: 'glimmer-application' },
  { find: '@glimmer/utils', shim: 'glimmer-util' },
  { find: '@glimmer/manager', shim: 'manager', subpathTolerant: true },
  {
    find: '@glimmer/validator',
    shim: 'validator',
    entryShim: 'validator-entry',
    subpathTolerant: true,
  },
  { find: '@glimmer/destroyable', shim: 'destroyable' },
  {
    find: '@glimmer/reference',
    shim: 'reference',
    entryShim: 'reference-entry',
    subpathTolerant: true,
  },
];

/**
 * DEEP-PATH-only redirects layered ON TOP of GXT_SHIM_ALIASES. They route a
 * subtree of an already-shimmed package onto a DIFFERENT shim file — used to
 * send the test-only `@glimmer/<pkg>/lib/{collections,iterable}` deep paths to
 * the `-vm-compat` module instead of the lean runtime shim, so the standalone
 * `@ember/reactive/collections` entry (and any value-importer) still resolves
 * the moved exports while the bare specifier stays lean.
 *
 * Consumed ONLY by the resolver collapse in rollup.config.mjs::resolvePackages
 * and the vite resolve.alias array — NEVER by the entry-emission / exposed-
 * dependency maps (these are not real package entrypoints, so they must not
 * spawn `packages/.../index` entry chunks). They are checked BEFORE the
 * GXT_SHIM_ALIASES subpath collapse so the more-specific subtree wins.
 */
export const GXT_SUBPATH_REDIRECTS = [
  { find: '@glimmer/validator/lib/collections', shim: 'validator-vm-compat' },
  { find: '@glimmer/reference/lib/iterable', shim: 'reference-vm-compat' },
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
 * Classic-VM modules stubbed out of the GXT ROLLUP DIST (and only there —
 * the vite test pipeline keeps the real VM for the [integration] jit suite).
 * These ids resolve to gxt-backend/glimmer-runtime-stubs.ts, whose unused
 * exports tree-shake per importer. They are the module-level importers of the
 * VM opcode/append core that survived GXT_DROPPED_ENTRIES because the
 * ember-side classic fallback branches import them at top level; under the
 * inlined `__GXT_MODE__ = true` those branches are unreachable. See the stub
 * file header for the keep-real rationale per neighbour module.
 */
export const GXT_DIST_VM_STUBS = {
  shim: 'glimmer-runtime-stubs',
  ids: new Set([
    // The bare index: only reached by ember-gxt-wrappers' dynamic
    // `import('@glimmer/runtime')` (the UpdatingVM.execute revalidation
    // patch for the in-repo jit test harness). The stub exports
    // `UpdatingVM: undefined`, which that site's `if (UVM && ...)` guard
    // treats as a no-op — correct for the dist, where no VM runs.
    '@glimmer/runtime',
    '@glimmer/runtime/lib/render',
    // The dev-time stack-check catalogue: its checker VALUES import the
    // opcode REGISTRAR modules (ComponentElementOperations instanceof
    // checks), so one `CheckReference` import from the kept vm/arguments
    // module dragged the whole APPEND_OPCODES registration cascade (~80KB)
    // into the dist. The stub ships permissive checkers.
    '@glimmer/runtime/lib/compiled/opcodes/-debug-strip',
    '@glimmer/runtime/lib/vm/element-builder',
    '@glimmer/runtime/lib/vm/rehydrate-builder',
    '@glimmer/runtime/lib/dom/api',
    '@glimmer/runtime/lib/dom/helper',
    // SSR builders re-exported by glimmer/lib/dom.ts — FastBoot/SSR is out of
    // scope for the GXT backend.
    '@glimmer/node/lib/node-dom-helper',
    '@glimmer/node/lib/serialize-builder',
    // The Glimmer wire-format template compiler behind `template()` from
    // `@ember/template-compiler`: in GXT mode that function compiles through
    // the gxt pipeline (compile.ts) and has no Glimmer-compiler fallback (a
    // wire-format template cannot render without the VM), but the classic
    // fallback's top-level import kept @glimmer/compiler + @glimmer/syntax +
    // @handlebars/parser + simple-html-tokenizer (~310 KB of the prod dist).
    '@glimmer/compiler/lib/compiler',
    // The VM evaluation-context constructors the classic renderer imports at
    // top level for `createContext` (renderer.ts), which is a thrower under
    // `__GXT_MODE__`: the opcode compiler stdlib/encoder + program artifacts.
    '@glimmer/opcode-compiler/lib/program-context',
    '@glimmer/program/lib/helpers',
    '@glimmer/program/lib/opcode',
  ]),
};

/**
 * The Glimmer VM packages dropped from the rollup top-level entry map in GXT
 * mode. They remain resolvable via exposedDependencies() (so stray imports
 * still succeed), but are no longer emitted as their own
 * dist/packages/@glimmer/* chunks; anything not reachable from the remaining
 * entry points gets tree-shaken. build-gxt-package.mjs uses the SAME list for
 * its leak checks (a dropped package present in the assembled dist means a
 * stale classic build leaked through) and for patching the addon-main
 * implicit-modules list, so the two sides cannot drift.
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
 * The single "is the GXT COMPAT backend enabled" predicate. Honors BOTH
 * historical flags so either spelling turns GXT on for the readers that can
 * safely accept both: `GXT_MODE=true` (the vite dev/test harness) and
 * `EMBER_RENDER_BACKEND=gxt` (the rollup production build).
 *
 * `EMBER_RENDER_BACKEND=gxt-native` is NOT the compat backend any more: it
 * selects the native layer (see `isGxtNative` / GXT_NATIVE_ALIASES below), which
 * compiles classic Ember source with `__GXT_MODE__ = false` and never loads the
 * compat bridge. Readers must test `isGxtNative()` FIRST (native wins even when
 * `GXT_MODE=true` is also set).
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

// ---------------------------------------------------------------------------
// gxt NATIVE layer
// ---------------------------------------------------------------------------
//
// `EMBER_RENDER_BACKEND=gxt-native` builds CLASSIC Ember source with
// `__GXT_MODE__ = false` (so every `if (__GXT_MODE__)` bridge branch is dead)
// and swaps ONLY the modules where classic Ember touches the Glimmer VM for
// `packages/@ember/-internals/gxt-backend/native/*`. The compat bridge
// (compile.ts / manager.ts / ember-gxt-wrappers.ts / validator.ts / reference.ts
// / destroyable.ts / gxt-bridge.ts) is never loaded. AOT templates import the gxt
// runtime directly (no gxtEmberWrapperRedirect).
//
// The older "compat bridge + `__GXT_CLASSIC_COMPONENTS__ = false`" build is a
// different thing: it is reachable as `GXT_MODE=true GXT_NATIVE=1` (vite) /
// `EMBER_RENDER_BACKEND=gxt GXT_NATIVE=1` (rollup) for comparison only, and
// nothing in CI builds it.

// Directory (repo-relative) holding the native layer.
export const GXT_NATIVE_DIR = 'packages/@ember/-internals/gxt-backend/native';

/**
 * The single "is the gxt NATIVE layer selected" predicate. Readers check this
 * BEFORE `isGxtEnabled()`.
 */
export function isGxtNative(env = process.env) {
  return env.EMBER_RENDER_BACKEND === 'gxt-native';
}

/**
 * gxt compiler flags for the native build. ONE constant shared by the vite
 * plugin (AOT) and `native/runtime-compile.ts`, so AOT and runtime-compiled
 * templates cannot drift.
 *
 * Only flags that the pinned gxt (`plugins/flags.ts` defaultFlags())
 * understands may be keys here. A key gxt does not know would be inlined by
 * the compiler plugin's `define` as a dead identifier at best and silently
 * ignored at worst; a new flag must ALSO be added to gxt `defaultFlags()` and
 * to the classic `define:` block in vite.config.mjs.
 */
export const NATIVE_FLAGS = Object.freeze({
  WITH_EMBER_INTEGRATION: true,
  WITH_HELPER_MANAGER: true,
  WITH_MODIFIER_MANAGER: true,
  TRY_CATCH_ERROR_HANDLING: false,
  ASYNC_COMPILE_TRANSFORMS: false,
  FORCE_SYNC_LIST: true,
  EMBER_ATTR_CONCAT: true,
  EMBER_IN_ELEMENT: true,
  EMBER_TRUSTED_HTML: true,
  WITH_DYNAMIC_EVAL: false,
  // A compile flag AND a gxt runtime build constant:
  //   compile: template-only templates get the `$_tpl` brand and block-param
  //   member taps emit the non-defining `$__tag`; helper / modifier / curry
  //   call sites use literal-or-thunk arguments,
  //   `$_maybeHelper(ref, args, named, ctx, site)` / `$_maybeModifier(…, ctx)`,
  //   unbound `{{on}}` = Ember's modifier, `<@comp />` = `$_dc`;
  //   `{{#each-in}}` lowers to `$__eachIn`, whose entries come from the
  //   `eachInEntries` host hook (native/content.ts);
  //   runtime: `$_maybeHelper` hands every helper to the host helper manager,
  //   curried `(component …)` / `(helper …)` / `(modifier …)` values, Ember
  //   keyword-helper semantics, `$_dc` nullish / definition objects, list
  //   entanglement with Ember tracked collections.
  EMBER_NATIVE: true,
  // Compile-only: `{{outlet}}` emits `$_outlet(ctx)`, which renders the
  // native outlet component (native/outlet.ts, registered as the gxt
  // `outletComponent` host hook). A block param / lexical binding named
  // `outlet` shadows the keyword.
  EMBER_OUTLET: true,
  // Compile-only: `this` path heads read the template SELF
  // (`const $s = $_self(this)`) while `this` stays the gxt render node — a
  // loose route template renders with self = its controller, a
  // RenderingTestCase template with self = the test context, and gxt never
  // writes args / tree ids onto either.
  EMBER_SELF: true,
  // Compile-only: every member segment of a `this.*` / `@arg.*` /
  // block-param / let-binding path reads through `$__tag(obj, "key")` = the
  // host `getProp` hook (metal `_getProp`, native/install.ts): `set()` /
  // `notifyPropertyChange()` on untracked properties re-render (Glimmer
  // global-context getProp parity).
  EMBER_PROPERTY_TAGS: true,
  // Compile-only: in a LOOSE template (`precompileTemplate(…)` with
  // `strictMode: false` — compiled at build time under EMBER_NATIVE — or a
  // runtime-compiled loose template) free names resolve BY NAME through the
  // host (native/resolver.ts):
  // `<FooBar>` / `<Foo::Bar>` / `{{#foo-bar}}` / `{{component "foo-bar"}}` →
  // `$_c("foo-bar", …)`, a content `{{foo-bar …}}` → `$_looseAppend(…)`
  // (component or helper). Strict templates are unaffected.
  EMBER_LOOSE_COMPONENTS: true,
});

const nativeTarget = (name) => `${GXT_NATIVE_DIR}/${name}`;

/**
 * The native alias boundary: specifier → native module (repo-relative path,
 * no extension). ORDERED, first match wins — deep-path redirects come FIRST.
 *
 * `match`:
 *   - 'exact'    only the bare specifier (e.g. `@ember/component` must NOT
 *                swallow `@ember/component/helper`);
 *   - 'tolerant' the specifier AND every deep path below it collapse onto the
 *                single target file (the native module re-exports the full
 *                surface those deep paths provide);
 *   - 'prefix'   directory remap (`find/x` → `target/x`): used to keep a VM-free
 *                vendored subtree REAL while its package is otherwise aliased.
 *
 * The same table also drives the resolved-path guard in vite.config.mjs
 * (`gxtNativeRelativeRedirect`): a RELATIVE import inside `packages/` whose
 * resolved path spells one of these specifiers (e.g. the vendored collections'
 * `../tracking`, LinkTo's `../templates/link-to`) is redirected identically, so
 * intra-package edges cannot bypass the boundary.
 *
 * `inc` is bookkeeping only; no build step reads it.
 */
export const GXT_NATIVE_ALIASES = [
  // ---- deep-path redirects (more specific; must precede package aliases) ----
  // VM-free vendored tracked collections stay REAL; their
  // relative `../tracking` / `../validators` edges reach native/validator via
  // the resolved-path guard.
  {
    find: '@glimmer/validator/lib/collections',
    target: 'packages/@glimmer/validator/lib/collections',
    match: 'prefix',
  },
  // The VM-free standalone reactive value (`trackedValue`) stays REAL too; its
  // relative `./tracking` / `./validators` edges reach native/validator the
  // same way.
  {
    find: '@glimmer/validator/lib/tracked-value',
    target: 'packages/@glimmer/validator/lib/tracked-value',
    match: 'exact',
  },
  // @ember/-internals/glimmer: the VM-touching modules only.
  {
    find: '@ember/-internals/glimmer/lib/renderer',
    target: nativeTarget('renderer'),
    match: 'exact',
    inc: 4,
  },
  // Upstream split the renderer: `renderComponent` / `renderSettled` (what
  // `@ember/renderer` re-exports) live in base-renderer, the VM render loop.
  {
    find: '@ember/-internals/glimmer/lib/base-renderer',
    target: nativeTarget('renderer'),
    match: 'exact',
  },
  {
    find: '@ember/-internals/glimmer/lib/setup-registry',
    target: nativeTarget('setup-registry'),
    match: 'exact',
    inc: 4,
  },
  {
    find: '@ember/-internals/glimmer/lib/views/outlet',
    target: nativeTarget('outlet'),
    match: 'exact',
    inc: 4,
  },
  // Upstream's route-manager outlet (a RootOutlet component rendered through
  // Glimmer VM internal component managers): native renders the router's
  // outlet chain with its own outlet (native/root-outlet.ts, native/outlet.ts).
  {
    find: '@ember/-internals/routing/route-managers/root-outlet',
    target: nativeTarget('root-outlet'),
    match: 'exact',
  },
  {
    find: '@ember/-internals/routing/route-managers/classic/outlet-component',
    target: nativeTarget('stubs/outlet-component'),
    match: 'exact',
  },
  // Upstream's route-manager registry asserts through `@glimmer/global-context`
  // (a Glimmer VM package, kept out of the native app); the native twin asserts
  // through `@ember/debug`.
  {
    find: '@ember/-internals/routing/route-managers/registry',
    target: nativeTarget('route-manager-registry'),
    match: 'exact',
  },
  // The classic route manager wraps each route template in a `RouteTemplate`, a
  // Glimmer VM internal component; native renders classic routes from their
  // template directly (native/root-outlet.ts), so the wrapper is a plain record.
  {
    find: '@ember/-internals/glimmer/lib/component-managers/route-template',
    target: nativeTarget('stubs/route-template'),
    match: 'exact',
  },
  {
    find: '@ember/-internals/glimmer/lib/component',
    target: nativeTarget('stubs/component'),
    match: 'exact',
  },
  {
    find: '@ember/-internals/glimmer/lib/components/input',
    target: nativeTarget('stubs/input'),
    match: 'exact',
  },
  {
    find: '@ember/-internals/glimmer/lib/components/textarea',
    target: nativeTarget('stubs/textarea'),
    match: 'exact',
  },
  {
    find: '@ember/-internals/glimmer/lib/templates/link-to',
    target: nativeTarget('templates/link-to'),
    match: 'exact',
    inc: 6,
  },
  {
    find: '@ember/-internals/views/lib/system/event_dispatcher',
    target: nativeTarget('stubs/event-dispatcher'),
    match: 'exact',
  },
  // @glimmer/runtime deep imports used by @ember/{helper,modifier,component}.
  {
    find: '@glimmer/runtime/lib/helpers',
    target: nativeTarget('runtime-helpers'),
    match: 'tolerant',
    inc: 5,
  },
  {
    find: '@glimmer/runtime/lib/modifiers/on',
    target: nativeTarget('runtime-helpers'),
    match: 'exact',
    inc: 5,
  },
  {
    find: '@glimmer/runtime/lib/component/template-only',
    target: nativeTarget('runtime-helpers'),
    match: 'exact',
    inc: 4,
  },
  {
    find: '@glimmer/opcode-compiler/lib/template',
    target: nativeTarget('template-factory'),
    match: 'exact',
    inc: 4,
  },
  // The BARE `@glimmer/runtime` entry: its public surface (`on`,
  // `hash` / `array` / `concat` / `get` / `fn`, `invokeHelper`,
  // `templateOnlyComponent`) is exactly native/runtime-helpers. Ember source
  // never imports the bare entry in the native closure (`--assert-native`);
  // classic test modules do.
  {
    find: '@glimmer/runtime',
    target: nativeTarget('runtime-helpers'),
    match: 'exact',
    inc: 8,
  },
  // ---- package-level ----
  { find: '@glimmer/validator', target: nativeTarget('validator'), match: 'tolerant', inc: 3 },
  { find: '@glimmer/reference', target: nativeTarget('reference'), match: 'tolerant', inc: 3 },
  { find: '@glimmer/destroyable', target: nativeTarget('destroyable'), match: 'tolerant', inc: 3 },
  { find: '@glimmer/manager', target: nativeTarget('manager-api'), match: 'tolerant', inc: 4 },
  {
    find: '@ember/template-compilation',
    target: nativeTarget('template-compilation'),
    match: 'exact',
    inc: 8,
  },
  // The RUNTIME template compiler: the gxt runtime compiler under the
  // SAME NATIVE_FLAGS as the AOT vite plugin. Only tests and explicit runtime
  // compilation reach it — never an app closure (`--assert-native` forbids the
  // gxt compiler chunks, @glimmer/syntax, @handlebars, simple-html-tokenizer).
  {
    find: '@ember/template-compiler/runtime',
    target: nativeTarget('runtime-compile'),
    match: 'exact',
    inc: 7,
  },
  // `template()` from `@ember/template-compiler` (the explicit `<template>`
  // form; classic test modules call it at module / test time): the same
  // runtime `template()` (strict by default, `scope` / `eval`). Test pages
  // only in practice — an app closure importing it would carry the runtime
  // compiler, which `--assert-native` rejects.
  {
    find: '@ember/template-compiler',
    target: nativeTarget('runtime-compile'),
    match: 'exact',
    inc: 8,
  },
  // internal-test-helpers (vite test pages only — rollup never builds them):
  // the runtime compile entry and the native RenderingTestCase. Relative
  // imports inside internal-test-helpers (`../compile`, `./test-cases/rendering`)
  // reach these through the resolved-path guard (gxtNativeRelativeRedirect).
  {
    find: 'internal-test-helpers/lib/compile',
    target: nativeTarget('runtime-compile'),
    match: 'exact',
    inc: 7,
  },
  {
    find: 'internal-test-helpers/lib/test-cases/rendering',
    target: nativeTarget('test-support/rendering-test-case'),
    match: 'exact',
    inc: 7,
  },
  // Native barrel: cuts @glimmer/component -> @ember/component -> classic
  // Component/CoreView/curly without editing shared source.
  { find: '@ember/component', target: nativeTarget('component'), match: 'exact' },
];

/**
 * Anchored matcher for one GXT_NATIVE_ALIASES entry (vite alias `find`).
 * 'prefix' entries return the plain string (vite string aliases already match
 * `find` exactly or as a `find + '/'` prefix and remap the prefix).
 */
export function gxtNativeAliasMatcher({ find, match }) {
  if (match === 'prefix') return find;
  if (match === 'tolerant') return gxtSubpathRegExp(find);
  const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^' + escaped + '$');
}

/**
 * Resolve a bare specifier against GXT_NATIVE_ALIASES (first match wins).
 * Returns `{ entry, target }` with `target` repo-relative (no extension), or
 * null. Used by the resolved-path guard for relative edges.
 */
export function matchGxtNativeAlias(specifier) {
  for (const entry of GXT_NATIVE_ALIASES) {
    if (entry.match === 'prefix') {
      if (specifier === entry.find) return { entry, target: entry.target };
      if (specifier.startsWith(entry.find + '/')) {
        return { entry, target: entry.target + specifier.slice(entry.find.length) };
      }
      continue;
    }
    if (gxtNativeAliasMatcher(entry).test(specifier)) return { entry, target: entry.target };
  }
  return null;
}

/**
 * The package specifier an ABSOLUTE source path inside `packagesDir` spells
 * (`<packagesDir>/@glimmer/validator/lib/tracking.ts` →
 * `@glimmer/validator/lib/tracking`), or null when the path is outside
 * `packagesDir` or inside a package's own test tree (a test helper is never a
 * runtime deep path of the aliased package). The resolved-path guard of the
 * native rollup dist feeds the result to matchGxtNativeAlias, so a RELATIVE
 * edge (the vendored collections' `../tracking`, LinkTo's
 * `../templates/link-to`) is redirected exactly like the bare specifier.
 */
export function gxtNativeSpecifierForPath(absPath, packagesDir) {
  if (!absPath.startsWith(packagesDir)) return null;
  const specifier = absPath
    .slice(packagesDir.length)
    .replace(/\.(ts|js|gts|gjs)$/, '')
    .replace(/\/index$/, '');
  if (/\/(test|tests|__tests__)\//.test(specifier + '/')) return null;
  return specifier;
}

/**
 * Modules an app closure of the native build must not ship — the Glimmer VM, its tag-revision
 * protocol, the gxt COMPAT bridge, the classic VM renderer, and the template
 * compilers. `[pattern, reason]`; patterns match absolute module ids / sourcemap
 * sources (vite harness, scripts/bundle-modern-app.mjs --assert-native) AND the
 * repo-relative module ids of the rollup native dist manifest
 * (scripts/assert-native-dist.mjs).
 */
export const GXT_NATIVE_FORBIDDEN = [
  [
    // Except `@glimmer/runtime/lib/dom/{sanitized-values,normalize,props}`:
    // Glimmer's URL sanitization of attribute values, the string normalization
    // it uses and `normalizeProperty`, DOM-value code with no VM dependency. The
    // native attribute hook (native/host-hooks.ts) calls them, so native
    // sanitizes and chooses attribute or property exactly as Glimmer.
    /packages\/@glimmer\/(?:runtime\/(?!lib\/dom\/(?:sanitized-values|normalize|props)\.ts$)|(?:opcode-compiler|program|vm|wire-format|encoder|node|global-context|reference|destroyable|manager)\/)/,
    'Glimmer VM package',
  ],
  [
    /packages\/@glimmer\/validator\/lib\/(tracking|validators|meta)\.ts$/,
    'Glimmer VM tag protocol',
  ],
  [
    /gxt-backend\/(compile|manager|ember-gxt-wrappers|validator|reference|destroyable|gxt-bridge|helper-manager)\.ts$/,
    'gxt compat bridge',
  ],
  [
    /-internals\/glimmer\/lib\/(renderer|component-managers\/[^/]+|templates\/(root|outlet)|component)\.ts$/,
    'classic VM renderer',
  ],
  [
    /(packages|node_modules)\/(@glimmer\/(syntax|compiler)|@handlebars|simple-html-tokenizer)\//,
    'template compiler',
  ],
  [
    // `flags-*`: the shared compiler chunk (gxt.compiler + gxt.runtime-compiler)
    // is named after its first module; it was `compile-*` up to 0.0.81.
    /(glimmer-next|@lifeart\/gxt)\/dist\/(compile-|flags-|gxt\.runtime-compiler|rehydration-)/,
    'gxt runtime compiler / rehydration',
  ],
];

/**
 * Glimmer VM packages with NO native meaning: dropped from the rollup
 * `gxt-native` dist ENTRY map (no `dist/<mode>/packages/<pkg>/index.js` is
 * published). Their code still lands in a shared chunk when a kept non-app
 * entry reaches it (the `ember` barrel, the build-time template compiler) —
 * `scripts/assert-native-dist.mjs` proves no app-facing entry does. The
 * VM packages that DO have a native meaning keep their entry, re-pointed at the
 * native module (`@glimmer/{validator,reference,destroyable,manager,runtime}` →
 * GXT_NATIVE_ALIASES), so an addon importing them gets the same module the
 * framework uses (no split-brain registry).
 */
export const GXT_NATIVE_DIST_DROPPED_ENTRIES = new Set([
  '@glimmer/opcode-compiler',
  '@glimmer/program',
  '@glimmer/wire-format',
  '@glimmer/encoder',
  '@glimmer/vm',
  '@glimmer/node',
  '@glimmer/global-context',
]);
