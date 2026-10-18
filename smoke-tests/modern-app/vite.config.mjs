// Modern reference app — bundle-size vehicle (classic / gxt compat / gxt-native).
//
// Deliberately REUSES the repo-root vite.config.mjs pipeline wholesale (the exact
// plugin chain the test suite runs: resolvePackages over packages/ source, the
// gxt-alias-map shims, babel.test.config (debug macros stripped when
// EMBER_ENV=production), templateTag()+wire-format precompile for classic, the
// @lifeart/gxt compiler + gxtEmberWrapperRedirect for gxt) and only swaps the
// app root/input/output. Why not consume the rollup dist/: the GXT dist has no
// entry for `@ember/-internals/gxt-backend/ember-gxt-wrappers`, so a dist
// consumer cannot apply gxtEmberWrapperRedirect — the documented GXT consumer
// contract (docs-internal-gxt-packaging-design.md). Building every variant from
// source through the same pipeline keeps the comparison apples-to-apples.
// The classic and gxt-native flavors are ALSO measured from the rollup dist, the
// way apps consume ember-source: vite.dist.config.mjs
// (`scripts/bundle-modern-app.mjs --from-dist`).
//
// Variant is selected by the SAME env vars the root config/rollup read:
//   classic:    (no GXT_MODE, no EMBER_RENDER_BACKEND)
//   gxt:        GXT_MODE=true EMBER_RENDER_BACKEND=gxt
//   gxt-native: EMBER_RENDER_BACKEND=gxt-native (the native layer: root config's
//                nativeConfig() — no compat bridge, no gxtEmberWrapperRedirect)
// and the app flavor by MODERN_APP_FLAVOR (strict .gjs = default | loose).
// Driven by scripts/bundle-modern-app.mjs (run from the repo root: rollup.config
// reads broccoli/ files relative to cwd).
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import rootConfig from '../../vite.config.mjs';
import { resolvePackages, exposedDependencies, hiddenDependencies } from '../../rollup.config.mjs';
import { bundleStats, strictResolverEntry } from './harness-shared.mjs';

const APP_DIR = dirname(fileURLToPath(import.meta.url));

function variantName() {
  const backend = process.env.EMBER_RENDER_BACKEND;
  if (backend === 'gxt-native') return 'gxt-native';
  if (backend === 'gxt' || process.env.GXT_MODE === 'true') return 'gxt';
  return 'classic';
}

// Fidelity with the PUBLISHED prod dist (rollup.config.mjs esmProdConfig): the
// root vite config is a dev/test harness, so two of its choices would inflate a
// production measurement and are reverted here, identically for every variant:
//  1. resolvePackages(..., { enableLocalDebug: true }) -> false, so
//     `@glimmer/local-debug-flags` resolves to disabled.ts (constant-false
//     LOCAL_* flags) exactly like the rollup build;
//  2. rollup's prod `treeshake.moduleSideEffects` (debug-only packages and the
//     gxt-bridge registry are side-effect-free) — without it vite keeps
//     @glimmer/debug (~31 KB min) that the dist never ships.
function prodModuleSideEffects(id) {
  if (id.includes('packages/@glimmer/debug')) return false;
  if (id.includes('packages/@glimmer/env')) return false;
  if (id.includes('packages/@glimmer/local-debug-flags')) return false;
  if (id.includes('packages/@ember/debug')) return false;
  if (id.includes('gxt-backend/gxt-bridge')) return false;
  return true;
}

function prodResolvePackages() {
  // Same dep map as the root vite.config.mjs resolvePackages() call.
  return resolvePackages(
    {
      ...exposedDependencies(),
      ...hiddenDependencies(),
      '@lifeart/gxt/glimmer-compatibility': '@lifeart/gxt',
      '@lifeart/gxt/runtime-compiler': '@lifeart/gxt',
      '@babel/core': '@lifeart/gxt',
      typescript: '@lifeart/gxt',
      'content-tag': '@lifeart/gxt',
    },
    { enableLocalDebug: false, viteDevFallthrough: true }
  );
}

export default async (env) => {
  const base = await rootConfig(env);
  const basePlugins = base.plugins.flat(Infinity).filter(Boolean);
  const swapped = basePlugins.filter((p) => p.name === 'resolve-packages').length;
  if (swapped !== 1) {
    throw new Error(
      `expected exactly one resolve-packages plugin in the root config, found ${swapped}`
    );
  }
  const variant = variantName();
  // MODERN_APP_FLAVOR=loose builds the resolver-mode twin (loose.html ->
  // app-loose/): same app, templates as precompileTemplate strings.
  const loose = process.env.MODERN_APP_FLAVOR === 'loose';
  const tag = loose ? `${variant}-loose` : variant;
  const outDir = process.env.MODERN_APP_OUT_DIR || resolve(APP_DIR, 'dist', tag);
  const statsDir = resolve(outDir, '..', `${tag}-stats`);
  const extraAliases = [
    { find: /^ember-strict-application-resolver$/, replacement: strictResolverEntry() },
  ];
  return {
    ...base,
    root: APP_DIR,
    publicDir: false,
    base: './',
    logLevel: 'warn',
    plugins: [
      ...basePlugins.map((p) => (p.name === 'resolve-packages' ? prodResolvePackages() : p)),
      bundleStats(statsDir),
    ],
    resolve: {
      ...(base.resolve ?? {}),
      alias: [...extraAliases, ...(base.resolve?.alias ?? [])],
    },
    build: {
      outDir,
      emptyOutDir: true,
      // `esbuild: false` (root config) also disables vite's default esbuild
      // minifier, so pick terser explicitly for a genuinely minified bundle.
      minify: 'terser',
      // Hidden maps: no sourceMappingURL comment, so shipped JS bytes are
      // unchanged; the maps drive the per-source byte inventory.
      sourcemap: 'hidden',
      modulePreload: { polyfill: false },
      reportCompressedSize: false,
      rollupOptions: {
        input: resolve(APP_DIR, loose ? 'loose.html' : 'index.html'),
        treeshake: { moduleSideEffects: prodModuleSideEffects },
      },
    },
  };
};
