import { defineConfig } from 'vite';
import { babel } from '@rollup/plugin-babel';
import { resolve, dirname, relative } from 'node:path';
import { realpathSync, statSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { compiler } from '@lifeart/gxt/compiler';

import {
  version,
  resolvePackages,
  exposedDependencies,
  hiddenDependencies,
} from './rollup.config.mjs';
import {
  GXT_SHIM_DIR,
  GXT_SHIM_ALIASES,
  GXT_SUBPATH_REDIRECTS,
  GXT_NATIVE_ALIASES,
  GXT_NATIVE_DIR,
  NATIVE_FLAGS,
  gxtNativeAliasMatcher,
  gxtNativeSpecifierForPath,
  gxtSubpathRegExp,
  isGxtEnabled,
  isGxtNative,
  matchGxtNativeAlias,
} from './scripts/gxt-alias-map.mjs';
import { templateTag } from '@embroider/vite';
import { replaceBuildConstant } from './scripts/replace-build-constant.mjs';
import { withDecoratorRuntime } from './scripts/gxt-native-package/decorator-runtime.mjs';

const localRequire = createRequire(import.meta.url);
const projectRoot = dirname(fileURLToPath(import.meta.url));
const { packageName: getPackageName, PackageCache } = localRequire('@embroider/shared-internals');
// Helper to resolve symlinks for GXT dist files so aliases match the dedup plugin's output
function resolveGxtPath(relativePath) {
  const symlinkPath = fileURLToPath(new URL(relativePath, import.meta.url));
  try {
    return realpathSync(symlinkPath);
  } catch {
    return symlinkPath;
  }
}
const owerrideRoot = import.meta.url;
// `@glimmer/component` is published as its own v2 addon and is only built
// (into `dist/`) by `rollup.config.mjs`. Tests run straight off source, so
// point the bare specifier at the TypeScript entrypoint instead.
const GLIMMER_COMPONENT_SOURCE_ALIAS = {
  find: /^@glimmer\/component$/,
  replacement: resolve(projectRoot, 'packages/@glimmer/component/src/index.ts'),
};
export default defineConfig(({ mode }) => {
  process.env.EMBER_ENV = mode;

  // Use GXT_MODE=true to enable glimmer-next integration. `isGxtEnabled` also
  // honors EMBER_RENDER_BACKEND=gxt (additive — the vite harness only ever sets
  // GXT_MODE in CI, but the benchmark vite configs set both, and this keeps a
  // bare `EMBER_RENDER_BACKEND=gxt npx vite` working). See scripts/gxt-alias-map.mjs
  // for why rollup's USE_GXT_BACKEND must NOT symmetrically honor GXT_MODE.
  //
  // EMBER_RENDER_BACKEND=gxt-native selects the gxt NATIVE layer instead:
  // classic Ember source with `__GXT_MODE__ = false`, the GXT_NATIVE_ALIASES boundary swapping
  // only the VM-touching modules for gxt-backend/native/*, the gxt compiler with
  // NATIVE_FLAGS, NO gxtEmberWrapperRedirect, and a separate prebundle cacheDir.
  // It wins over GXT_MODE. Classic and compat configs are untouched by it.
  const useNative = isGxtNative();
  if (useNative) return nativeConfig(mode);
  const useGxt = isGxtEnabled();

  // GXT builds: single-chunk output. preserveModules' ~1000 module files blew
  // past testem's 120s `browser_start_timeout` on the GXT Basic Test job
  // (fetch+parse before testem.js could connect), so the GXT pipeline bundles.
  //
  // Classic builds: keep upstream's `preserveModules: true` (one emitted file
  // per source module). This is correctness-relevant, not just layout: the
  // suite contains direct-eval implicit-scope tests (RFC931 `template(...,
  // { eval() { return eval(arguments[0]); } })` and the jit keyword suites)
  // whose `eval('helper')`/`eval('element')` must throw ReferenceError so the
  // compiler falls back to the keyword/builtin. A merged chunk hoists every
  // module's top-level bindings into ONE shared scope, so the eval resolves
  // arbitrary same-named internals (e.g. -in-element-null-check's `let
  // helper`) and the keyword path silently breaks — dist-only, invisible on
  // the dev server. Upstream CI runs testem against the preserveModules
  // output, which bounds the module-count load time for the classic set.
  const build = useGxt
    ? {
        minify: mode === 'production',
      }
    : {
        rollupOptions: {
          preserveEntrySignatures: 'strict',
          input: ['index.html'],
          output: {
            preserveModules: true,
          },
          treeshake: false,
        },
        minify: mode === 'production',
      };

  return {
    plugins: [
      // Replace the bare `__GXT_MODE__` identifier with the boolean literal at
      // transform time. Vite's `define` option does NOT cover source code here
      // because this config sets `esbuild: false` — `define` would normally
      // run via esbuild's source transformer. (The `define` block elsewhere in
      // this config still works for node_modules dep prebundling because
      // optimizeDeps uses esbuild independently of the source-transform
      // pipeline.) The rollup build uses the same plugin, so source files using
      // the bare identifier work in both bundlers. See types/gxt-ambient.d.ts
      // for the TS declaration.
      replaceBuildConstant('__GXT_MODE__', () => useGxt, 'pre'),
      // Inline the build-time `__GXT_CLASSIC_COMPONENTS__` flag (default true),
      // as the rollup build does, so the test harness keeps full
      // classic-component support unless a run sets GXT_NATIVE=1 /
      // EMBER_GXT_CLASSIC=0. See types/gxt-ambient.d.ts.
      replaceBuildConstant('__GXT_CLASSIC_COMPONENTS__', () => GXT_CLASSIC_COMPONENTS, 'pre'),
      // `virtual:gxt-test-setup` / `virtual:gxt-tests` (imported by
      // index.html): GXT-only test-page modules, empty in classic builds.
      gxtTestSetup(useGxt),
      // Deduplicate GXT internal modules so they share one reactive core.
      // Vite's dev server already follows symlinks for /@fs/ serving, but
      // this plugin ensures consistency in environments where that doesn't work.
      ...(useGxt ? [gxtModuleDedup()] : []),
      // Use gxt compiler for glimmer-next or templateTag for standard Ember.
      // The decorators it lowers import decorator-transforms' runtime, as the
      // babel pass makes plain modules do (no `dt7948` global).
      ...(useGxt
        ? isolateTestCompileErrors(
            withDecoratorRuntime(
              compiler(mode, {
                flags: {
                  WITH_EMBER_INTEGRATION: true,
                  WITH_HELPER_MANAGER: true,
                  WITH_MODIFIER_MANAGER: true,
                  TRY_CATCH_ERROR_HANDLING: false,
                },
              })
            )
          )
        : [templateTag()]),
      // Give GXT-compiled templates the Ember wrappers of $_tag,
      // $_maybeHelper and $_dc: imported straight from GXT they would bypass
      // Ember's container-based helper/component resolution.
      ...(useGxt ? [gxtEmberWrapperRedirect()] : []),
      ...(process.env.VITE_STABLE_DECORATORS === 'typescript' ? [typescriptEmit()] : []),
      ...(useGxt
        ? isolateTestCompileErrors(
            babel({
              babelHelpers: 'bundled',
              extensions: ['.js', '.ts', '.gjs', '.gts'],
              configFile: resolve(
                dirname(fileURLToPath(import.meta.url)),
                './babel.test.config.mjs'
              ),
            })
          )
        : [
            babel({
              babelHelpers: 'bundled',
              extensions: ['.js', '.ts', '.gjs', '.gts'],
              configFile: resolve(
                dirname(fileURLToPath(import.meta.url)),
                './babel.test.config.mjs'
              ),
            }),
          ]),
      resolvePackages(
        {
          ...exposedDependencies(),
          ...hiddenDependencies(),
          // @glimmer/component is published separately and gets its own rollup
          // build, so it's not part of ember-source's build graph. Point the
          // test suite at its source, so tests exercise what's in git instead
          // of whatever happens to be sitting in its dist/ directory.
          '@glimmer/component': resolve(projectRoot, 'packages/@glimmer/component/src/index.ts'),
          // GXT subpath exports need explicit entries for resolvePackages
          '@lifeart/gxt/glimmer-compatibility': '@lifeart/gxt',
          '@lifeart/gxt/runtime-compiler': '@lifeart/gxt',
          // `decorator-transforms` (bare and /runtime) resolves to real file
          // paths via hiddenDependencies: a bare-string mapping here makes vite
          // 404 on /@id/decorator-transforms.
          // GXT compile chunk externals — only used at build time by the compiler plugin
          '@babel/core': '@lifeart/gxt',
          typescript: '@lifeart/gxt',
          'content-tag': '@lifeart/gxt',
        },
        { enableLocalDebug: true, viteDevFallthrough: true }
      ),
      viteResolverBug(),
      version(),
    ],
    optimizeDeps: {
      noDiscovery: true,
      include: ['expect-type', 'qunit'],
      // Exclude GXT entrypoints from dep pre-bundling so their imports of
      // shared dom/vm chunks resolve to the SAME module instances as the
      // aliased `@lifeart/gxt` import. Without this, Vite pre-bundles
      // `@lifeart/gxt/runtime-compiler` and produces a SECOND copy of the
      // dom chunk with its own `xt`/`Symbol()` state — causing
      // `GxtRehydrationDelegate.renderServerSide` to render into a root
      // created via a `createRoot` from one module while `$_tag` reads from
      // another, producing "Cannot read properties of null (reading 'element')".
      exclude: [
        '@lifeart/gxt',
        '@lifeart/gxt/runtime-compiler',
        '@lifeart/gxt/glimmer-compatibility',
      ],
    },
    publicDir: 'tests/public',
    server: {
      hmr: {
        overlay: false,
      },
    },
    // In classic mode the gxt compiler plugin doesn't run, but glimmer-next
    // runtime code is still bundled (statically imported by
    // @ember/-internals/glimmer). That code references build-time constants
    // (WITH_CONTEXT_API, IS_DEV_MODE, etc.) which would otherwise survive as
    // free identifiers and crash at runtime. Define them here so the bundled
    // gxt code behaves correctly. In GXT mode the compiler plugin inlines
    // these itself, so `define:` is omitted to avoid double-replacement.
    //
    // NOTE on `__GXT_MODE__`: it is NOT in this `define:` block because the
    // identifier appears in this repo's TypeScript source, not in prebuilt
    // node_modules dist chunks. Vite's `define:` runs through esbuild on
    // source code, but this config sets `esbuild: false` (see below), so
    // `define:` only covers what Vite's dep prebundler (optimizeDeps) walks
    // — i.e. node_modules. Source-level replacement of `__GXT_MODE__` is
    // performed by the `replaceBuildConstant` plugin above.
    ...(useGxt
      ? {}
      : {
          define: {
            IS_GLIMMER_COMPAT_MODE: 'true',
            WITH_EMBER_INTEGRATION: 'true',
            WITH_HELPER_MANAGER: 'true',
            WITH_MODIFIER_MANAGER: 'true',
            WITH_CONTEXT_API: 'true',
            TRY_CATCH_ERROR_HANDLING: 'false',
            IS_DEV_MODE: mode === 'development' ? 'true' : 'false',
            // The remaining gxt compiler-plugin flags (defaults the GXT-mode
            // pipeline inlines). Any flag left out survives as a bare
            // identifier in the bundled gxt dist chunks and throws
            // ReferenceError when its code path runs — e.g. the Firefox CI
            // classic build crashed on SUPPORT_SHADOW_DOM in the
            // ember-outlet custom element path.
            SUPPORT_SHADOW_DOM: 'true',
            REACTIVE_MODIFIERS: 'true',
            RUN_EVENT_DESTRUCTORS_FOR_SCOPED_NODES: 'false',
            ASYNC_COMPILE_TRANSFORMS: 'true',
            WITH_DYNAMIC_EVAL: 'false',
            WITH_TYPE_CHECKER_HINTS: 'false',
            // Native-layer flags (gxt-native only). EMBER_NATIVE is also a gxt
            // RUNTIME build constant (the host helper manager, curried values
            // and Ember keyword-helper branches in the gxt dom / helpers / list
            // chunks): `false` folds them away here, like the WITH_* flags
            // above.
            EMBER_NATIVE: 'false',
            EMBER_OUTLET: 'false',
            EMBER_PROPERTY_TAGS: 'false',
            EMBER_SELF: 'false',
            EMBER_LOOSE_COMPONENTS: 'false',
          },
        }),
    build,
    esbuild: false,
    envPrefix: ['VM_', 'VITE_'],
    resolve: useGxt
      ? {
          // Force all importers to resolve to the same @lifeart/gxt module instance.
          // Prevents split-instance bugs (distinct cellsMap/currentTracker) that
          // arise when any importer sneaks in a direct dist-path import.
          dedupe: [
            '@lifeart/gxt',
            '@lifeart/gxt/glimmer-compatibility',
            '@lifeart/gxt/runtime-compiler',
          ],
          alias: [
            GLIMMER_COMPONENT_SOURCE_ALIAS,
            // The `@glimmer/* | @ember/* | ember-template-compiler` → shim
            // redirects are derived from the SAME table the rollup build uses
            // (scripts/gxt-alias-map.mjs), so the two pipelines cannot drift.
            // `subpathTolerant` entries become anchored regexes so deep-path
            // imports introduced by upstream's vendored @glimmer/* migration
            // (e.g. `@glimmer/manager/lib/public/template`,
            // `@glimmer/validator/lib/tracking`, `@glimmer/reference/lib/iterable`)
            // collapse onto the single shim file. A bare string `find` would
            // prefix-rewrite the subpath onto a nonexistent shim PATH; the shims
            // are complete package replacements that re-export the full surface.
            // Deep-path redirects (the test-only `…/lib/{collections,iterable}`
            // subtrees → the `-vm-compat` module) MUST precede the package
            // aliases below so the more-specific subtree wins (Vite alias array
            // is first-match-wins). These mirror rollup's GXT_SUBPATH_REDIRECTS.
            ...GXT_SUBPATH_REDIRECTS.map(({ find, shim }) => ({
              find: gxtSubpathRegExp(find),
              replacement: fileURLToPath(new URL(`./${GXT_SHIM_DIR}/${shim}`, owerrideRoot)),
            })),
            ...GXT_SHIM_ALIASES.map(({ find, shim, entryShim, subpathTolerant }) => ({
              find: subpathTolerant ? gxtSubpathRegExp(find) : find,
              // The vite test tree resolves the FULL classic surface: a split
              // package (`entryShim` set) aliases to its full-surface entry
              // facade (runtime shim + `-vm-compat`); others to the single shim.
              replacement: fileURLToPath(
                new URL(`./${GXT_SHIM_DIR}/${entryShim ?? shim}`, owerrideRoot)
              ),
            })),
            // Alias internal-test-helpers compile to use gxt compilation
            // (vite test harness only — not part of the shared shim table).
            {
              find: /^internal-test-helpers\/lib\/compile$/,
              replacement: fileURLToPath(
                new URL(`./packages/@ember/-internals/gxt-backend/test-compile`, owerrideRoot)
              ),
            },
            {
              find: '@lifeart/gxt/runtime-compiler',
              replacement: resolveGxtPath(
                `./node_modules/@lifeart/gxt/dist/gxt.runtime-compiler.es.js`
              ),
            },
            {
              find: 'decorator-transforms/runtime',
              replacement: fileURLToPath(
                new URL(`./node_modules/decorator-transforms/dist/runtime.js`, owerrideRoot)
              ),
            },
            {
              find: '@lifeart/gxt/glimmer-compatibility',
              replacement: resolveGxtPath(
                `./node_modules/@lifeart/gxt/dist/gxt.glimmer-compat.es.js`
              ),
            },
            {
              find: '@lifeart/gxt',
              replacement: resolveGxtPath(`./node_modules/@lifeart/gxt/dist/gxt.index.es.js`),
            },
          ],
        }
      : {
          alias: [GLIMMER_COMPONENT_SOURCE_ALIAS],
        },
  };
});

// Compiles our sources with TypeScript's own emit (with standard decorators)
// before babel sees them, so we can test Ember against TypeScript's decorator
// implementation rather than babel's.
function typescriptEmit() {
  const ts = localRequire('typescript');
  return {
    name: 'typescript-emit',
    // TypeScript's emit only provides decorator metadata if `Symbol.metadata`
    // exists, which it doesn't in browsers yet. Ember relies on that metadata,
    // so apps using TypeScript's emit must polyfill it, as we do here.
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          children: `Symbol.metadata ??= Symbol('Symbol.metadata');`,
          injectTo: 'head-prepend',
        },
      ];
    },
    transform(code, id) {
      let [file] = id.split('?');
      if (file.includes('/node_modules/') || !/\.(js|ts|gjs|gts)$/.test(file)) {
        return;
      }
      let { outputText, sourceMapText } = ts.transpileModule(code, {
        // TypeScript doesn't know about .gjs/.gts, which templateTag() has
        // already turned into plain JS/TS by now.
        fileName: file.replace(/\.gjs$/, '.js').replace(/\.gts$/, '.ts'),
        compilerOptions: {
          // ES2022 rather than ESNext, since for ESNext TypeScript leaves
          // decorators as-is instead of compiling them.
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          experimentalDecorators: false,
          allowJs: true,
          sourceMap: true,
        },
      });
      return {
        code: outputText.replace(/^\/\/# sourceMappingURL=.*$/m, ''),
        map: sourceMapText,
      };
    },
  };
}

/**
 * GXT test pages load every test module eagerly (index.html's
 * `import.meta.glob(..., { eager: true })`), so a single test module that the
 * gxt compiler cannot compile would fail the whole page. This wraps the
 * transform of the gxt compiler and babel plugins: a TEST module whose
 * transform throws is replaced by a module that registers one failing test
 * naming the file and the error. Non-test modules still fail the build.
 */
function isolateTestCompileErrors(plugins) {
  return [plugins].flat().map((plugin) => {
    if (!plugin || !plugin.transform) return plugin;
    const hook = plugin.transform;
    const handler = typeof hook === 'function' ? hook : hook.handler;
    async function transform(code, id, options) {
      try {
        return await handler.call(this, code, id, options);
      } catch (error) {
        if (!isTestModuleId(id)) throw error;
        return { code: compileErrorTestModule(id, error), map: null };
      }
    }
    return {
      ...plugin,
      transform: typeof hook === 'function' ? transform : { ...hook, handler: transform },
    };
  });
}

function isTestModuleId(id) {
  const file = id.split('?')[0];
  return (
    file.includes('/packages/') &&
    /\/(tests?|__tests__)\//.test(file) &&
    /\.(js|ts|gjs|gts)$/.test(file)
  );
}

function compileErrorTestModule(id, error) {
  const file = relative(projectRoot, id.split('?')[0]);
  const reason = String((error && error.message) || error).split('\n')[0];
  const message = `GXT could not compile ${file}: ${reason}`;
  return `QUnit.module(${JSON.stringify(`[gxt] compile error: ${file}`)}, function () {
  QUnit.test('the test module compiles', function (assert) {
    assert.ok(false, ${JSON.stringify(message)});
  });
});
`;
}

/**
 * The compat test page's (index.html) two GXT-only modules:
 * - `virtual:gxt-test-setup`, the first import of the setup script: the gxt
 *   runtime template compiler, which must register before any template module
 *   loads;
 * - `virtual:gxt-tests`, imported by the test script: gxt-backend's own QUnit
 *   tests (`gxt-backend/__tests__/*-test.ts`).
 * In classic builds both are empty modules, so the classic test page loads no
 * gxt-backend code.
 */
function gxtTestSetup(useGxt) {
  const compiler = resolve(
    projectRoot,
    'packages/@ember/-internals/gxt-backend/ember-template-compiler.ts'
  );
  const modules = {
    'virtual:gxt-test-setup': `import ${JSON.stringify(compiler)};\n`,
    'virtual:gxt-tests':
      "import.meta.glob('/packages/@ember/-internals/gxt-backend/__tests__/*-test.ts', { eager: true });\n",
  };
  return {
    name: 'gxt-test-setup',
    // Before resolvePackages, which rejects every specifier it does not know.
    enforce: 'pre',
    resolveId(source) {
      return Object.hasOwn(modules, source) ? '\0' + source : null;
    },
    load(id) {
      if (!id.startsWith('\0virtual:gxt-test')) return null;
      const name = id.slice(1);
      if (!Object.hasOwn(modules, name)) return null;
      return useGxt ? modules[name] : 'export {};\n';
    },
  };
}

/**
 * Vite plugin that redirects $_tag, $_maybeHelper, $_dc imports from @lifeart/gxt
 * to the Ember wrapper module. Without this, GXT-compiled templates call the native
 * GXT primitives directly, bypassing Ember's container-based helper/component
 * resolution (e.g., helpers registered via owner.register('helper:foo', ...) are
 * invisible to the native primitives).
 */
function gxtEmberWrapperRedirect() {
  const FACADE = '\0gxt-ember-runtime';
  const isGxtEntry = (source) =>
    source === '@lifeart/gxt' || /\/gxt\.index\.es\.js$/.test(source.split('?')[0]);
  return {
    name: 'gxt-ember-wrapper-redirect',
    enforce: 'pre',
    // `@lifeart/gxt` imported by a compiled template, or by any other module
    // outside gxt-backend's own sources, resolves to a facade that re-exports
    // the runtime with the Ember wrappers of `$_tag` / `$_maybeHelper` /
    // `$_dc` in place of gxt's (an explicit export shadows `export *`).
    // gxt-backend's .ts modules (ember-gxt-wrappers wraps the originals) and
    // the facade itself get the real runtime.
    resolveId(source, importer) {
      if (!importer || !isGxtEntry(source)) return null;
      const file = importer.split('?')[0];
      if (file === FACADE || file.includes('/node_modules/')) return null;
      if (file.includes('/gxt-backend/') && !/\.(gts|gjs|hbs)$/.test(file)) return null;
      return FACADE;
    },
    load(id) {
      if (id !== FACADE) return null;
      return (
        "export * from '@lifeart/gxt';\n" +
        "export { $_tag, $_maybeHelper, $_dc } from '@ember/-internals/gxt-backend/ember-gxt-wrappers';\n"
      );
    },
  };
}

/**
 * Vite config for `EMBER_RENDER_BACKEND=gxt-native` (the gxt NATIVE layer).
 * Kept as a separate function so the classic / compat configs above stay
 * byte-for-byte what they were. Shares the gxt-alias-map table with rollup
 * and the native runtime compiler.
 */
function nativeConfig(mode) {
  return {
    plugins: [
      // `__GXT_MODE__` is false for Ember source, but TRUE for the test harness
      // in packages/internal-test-helpers: there it only selects the gxt
      // rendering-artifact normalization (gxt anchor comments are markers;
      // equalTokens / equalInnerHTML strip them), which applies to the native
      // renderer exactly as to the compat one. Its other two `__GXT_MODE__`
      // branches (lib/compile.ts, lib/test-cases/rendering.ts) are replaced
      // wholesale by native aliases (runtime-compile, test-support).
      replaceBuildConstant(
        '__GXT_MODE__',
        (id) => id.includes('/packages/internal-test-helpers/'),
        'pre'
      ),
      // Irrelevant in native (only the compat manager.ts reads it, and that file
      // is never loaded) — kept so a stray reference still const-folds.
      replaceBuildConstant('__GXT_CLASSIC_COMPONENTS__', () => GXT_CLASSIC_COMPONENTS, 'pre'),
      gxtModuleDedup(),
      gxtNativeRelativeRedirect(),
      gxtNativeTestModules(),
      gxtNativeTestHelpersTemplates(),
      ...isolateTestCompileErrors(
        withDecoratorRuntime(compiler(mode, { flags: { ...NATIVE_FLAGS } }))
      ),
      // NO gxtEmberWrapperRedirect: AOT templates import the gxt runtime directly.
      ...isolateTestCompileErrors(
        babel({
          babelHelpers: 'bundled',
          extensions: ['.js', '.ts', '.gjs', '.gts'],
          configFile: resolve(dirname(fileURLToPath(import.meta.url)), './babel.test.config.mjs'),
        })
      ),
      resolvePackages(
        {
          ...exposedDependencies(),
          ...hiddenDependencies(),
          '@glimmer/component': resolve(projectRoot, 'packages/@glimmer/component/src/index.ts'),
          '@lifeart/gxt/glimmer-compatibility': '@lifeart/gxt',
          '@lifeart/gxt/runtime-compiler': '@lifeart/gxt',
          '@babel/core': '@lifeart/gxt',
          typescript: '@lifeart/gxt',
          'content-tag': '@lifeart/gxt',
        },
        { enableLocalDebug: true, viteDevFallthrough: true }
      ),
      viteResolverBug(),
      version(),
    ],
    // Separate prebundle cache so compat (.vite) and native prebundles can never
    // cross-contaminate.
    cacheDir: 'node_modules/.vite-native',
    optimizeDeps: {
      noDiscovery: true,
      include: ['expect-type', 'qunit'],
      exclude: [
        '@lifeart/gxt',
        '@lifeart/gxt/runtime-compiler',
        '@lifeart/gxt/glimmer-compatibility',
      ],
    },
    publicDir: 'tests/public',
    server: { hmr: { overlay: false } },
    // The gxt compiler plugin inlines NATIVE_FLAGS (+ IS_DEV_MODE) via its own
    // `define`, so no classic `define:` block here.
    build: { minify: mode === 'production' },
    esbuild: false,
    envPrefix: ['VM_', 'VITE_'],
    resolve: {
      dedupe: [
        '@lifeart/gxt',
        '@lifeart/gxt/glimmer-compatibility',
        '@lifeart/gxt/runtime-compiler',
      ],
      alias: [
        GLIMMER_COMPONENT_SOURCE_ALIAS,
        // The native boundary (scripts/gxt-alias-map.mjs), deep paths first.
        ...GXT_NATIVE_ALIASES.map((entry) => ({
          find: gxtNativeAliasMatcher(entry),
          replacement: fileURLToPath(new URL(`./${entry.target}`, owerrideRoot)),
        })),
        {
          find: '@lifeart/gxt/runtime-compiler',
          replacement: resolveGxtPath(
            `./node_modules/@lifeart/gxt/dist/gxt.runtime-compiler.es.js`
          ),
        },
        {
          find: 'decorator-transforms/runtime',
          replacement: fileURLToPath(
            new URL(`./node_modules/decorator-transforms/dist/runtime.js`, owerrideRoot)
          ),
        },
        {
          find: '@lifeart/gxt/glimmer-compatibility',
          replacement: resolveGxtPath(`./node_modules/@lifeart/gxt/dist/gxt.glimmer-compat.es.js`),
        },
        {
          find: '@lifeart/gxt',
          replacement: resolveGxtPath(`./node_modules/@lifeart/gxt/dist/gxt.index.es.js`),
        },
      ],
    },
  };
}

/**
 * Native-build resolved-path guard. Vite aliases only see the import
 * SPECIFIER, so a RELATIVE edge inside `packages/` (the vendored collections'
 * `../tracking`, LinkTo's `../templates/link-to`, …) would bypass the native
 * boundary and pull the real VM module back in. This maps such an edge back to
 * its package specifier and applies the SAME GXT_NATIVE_ALIASES table.
 */
function gxtNativeRelativeRedirect() {
  const packagesDir = resolve(projectRoot, 'packages') + '/';
  const EXTENSIONS = ['.ts', '.gts', '.js', '.gjs', '/index.ts', '/index.js'];
  return {
    name: 'gxt-native-relative-redirect',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) return null;
      const importerPath = importer.split('?')[0].split('#')[0];
      if (!importerPath.startsWith(packagesDir)) return null;
      // Shared with the native rollup dist (rollup.config.mjs gxtNativeResolve):
      // null outside packages/ and inside a package's own test tree.
      const specifier = gxtNativeSpecifierForPath(
        resolve(dirname(importerPath), source),
        packagesDir
      );
      if (!specifier) return null;
      const hit = matchGxtNativeAlias(specifier);
      if (!hit || hit.entry.match === 'prefix') return null;
      const base = resolve(projectRoot, hit.target);
      for (const ext of EXTENSIONS) {
        if (existsSync(base + ext)) return base + ext;
      }
      throw new Error(
        `[gxt-native] ${source} (from ${importerPath}) maps to ${hit.target}, which does not exist`
      );
    },
  };
}

/**
 * Native test pages: `@ember/test-helpers` (a node_modules dist the gxt compiler
 * does not process) gets `@ember/template-compilation` from
 * native/test-support/test-helpers-template-compilation.ts, which compiles its
 * module-level template strings with the native runtime compiler.
 */
function gxtNativeTestHelpersTemplates() {
  const nativeEntry = fileURLToPath(
    new URL(`./${GXT_NATIVE_DIR}/template-compilation`, owerrideRoot)
  );
  const target = fileURLToPath(
    new URL(`./${GXT_NATIVE_DIR}/test-support/test-helpers-template-compilation.ts`, owerrideRoot)
  );
  return {
    name: 'gxt-native-test-helpers-templates',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !importer.split('?')[0].includes('/@ember/test-helpers/')) return null;
      if (source === '@ember/template-compilation' || source === nativeEntry) return target;
      return null;
    },
  };
}

/**
 * Native test page support (`native.html`). Serves
 * `virtual:gxt-native-tests`: the test-module loaders selected by the allow-list
 * `scripts/gxt-test-runner/native-modules.json` (root-relative globs, expanded
 * by vite's own `import.meta.glob`) and the skip map `native-skip.json`
 * ("module :: test" → reason). Both JSON files are the single source of truth;
 * they are re-read on every load so an edit + reload is enough.
 */
function gxtNativeTestModules() {
  const ID = 'virtual:gxt-native-tests';
  const RESOLVED = '\0' + ID;
  const listPath = resolve(projectRoot, 'scripts/gxt-test-runner/native-modules.json');
  const skipPath = resolve(projectRoot, 'scripts/gxt-test-runner/native-skip.json');
  return {
    name: 'gxt-native-test-modules',
    // Before resolvePackages, which rejects every specifier it does not know.
    enforce: 'pre',
    resolveId(source) {
      return source === ID ? RESOLVED : null;
    },
    load(id) {
      if (id !== RESOLVED) return null;
      this.addWatchFile(listPath);
      this.addWatchFile(skipPath);
      const globs = JSON.parse(readFileSync(listPath, 'utf8')).modules.map((g) => '/' + g);
      const skips = JSON.parse(readFileSync(skipPath, 'utf8')).skips;
      return (
        `export const modules = import.meta.glob(${JSON.stringify(globs)});\n` +
        `export const skips = ${JSON.stringify(skips)};\n`
      );
    },
  };
}

// `__GXT_CLASSIC_COMPONENTS__` (see rollup.config.mjs): true unless a run sets
// GXT_NATIVE=1 / EMBER_GXT_CLASSIC=0 to exercise the compat build with the
// classic-component emulation DCE'd. Unrelated to
// `EMBER_RENDER_BACKEND=gxt-native` (see nativeConfig(), where only the
// never-loaded manager.ts would read this flag).
const GXT_CLASSIC_COMPONENTS = !(
  process.env.GXT_NATIVE === '1' || process.env.EMBER_GXT_CLASSIC === '0'
);

function gxtModuleDedup() {
  // Ensure all GXT internal module imports resolve to the same real filesystem
  // path. Vite's dev server already follows symlinks for /@fs/ serving, so in
  // most cases this is a no-op. It provides a safety net for environments where
  // symlink resolution doesn't happen automatically.
  const gxtDistDir = resolve(projectRoot, 'node_modules/@lifeart/gxt/dist');
  let gxtRealDistDir;
  try {
    gxtRealDistDir = realpathSync(gxtDistDir);
  } catch {
    gxtRealDistDir = gxtDistDir;
  }
  // If dist dir and real dir are the same, no symlinks to resolve
  const isSymlinked = gxtDistDir !== gxtRealDistDir;
  return {
    name: 'gxt-module-dedup',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!isSymlinked) return; // No-op when not symlinked
      if (!importer || (!source.startsWith('./') && !source.startsWith('../'))) return;
      if (importer.startsWith('\0')) return;
      const importerPath = importer.split('?')[0].split('#')[0];
      let importerReal;
      try {
        importerReal = realpathSync(importerPath);
      } catch {
        importerReal = importerPath;
      }
      const resolvedPath = resolve(dirname(importerReal), source);
      let resolvedReal;
      try {
        resolvedReal = realpathSync(resolvedPath);
      } catch {
        resolvedReal = resolvedPath;
      }
      if (!resolvedReal.startsWith(gxtRealDistDir)) return;
      try {
        statSync(resolvedReal);
      } catch {
        return;
      }
      return resolvedReal;
    },
  };
}

function viteResolverBug() {
  const packageCache = new PackageCache(projectRoot);
  // https://github.com/vitejs/vite/issues/9731
  return {
    name: 'vite-resolver-bug',
    resolveId(imported, importer) {
      let packageName = getPackageName(imported);
      if (packageName && importer) {
        let owner = packageCache.ownerOfFile(importer);
        if (owner?.name === packageName) {
          // The workaround for a vite bug also hits an actual node bug:
          // passing `paths` to require.resolve to do the self-reference
          // resolution does not work.
          // https://github.com/nodejs/node/issues/47681
          //
          // So instead, a minimalist and incomplete implementation that's just
          // good enough for the features used here.
          let hit = owner.packageJSON.exports?.['.' + imported.slice(packageName.length)];
          if (hit) {
            return {
              id: resolve(owner.root, hit),
            };
          }
        }
      }
    },
  };
}
