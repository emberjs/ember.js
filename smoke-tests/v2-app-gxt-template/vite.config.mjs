import { defineConfig } from 'vite';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { compiler } from '@lifeart/gxt/compiler';

// The GXT template intentionally does NOT use `@embroider/vite`'s
// `classicEmberSupport()` / `ember()` pipeline: Embroider compiles templates
// to Glimmer wire-format, while the GXT-backend `ember-source` compiles
// templates at runtime through its own `@ember/template-compilation` shim
// (which drives `@lifeart/gxt/runtime-compiler`). The two pipelines are
// mutually exclusive (RFC 0000-gxt-dual-backend §5.5).
//
// Without Embroider there is also no `renamed-modules` machinery, so this
// small resolver does that one job: any bare import from the Ember module
// namespace (`@ember/*`, `@glimmer/*`, `ember`, `rsvp`, …) — whether written
// in app code or emitted between the prebuilt `ember-source` dist modules —
// resolves to the linked `ember-source` package's `dist/{dev,prod}/packages/*`
// files. `@lifeart/gxt` itself is NOT in this list: it is a real (pinned)
// dependency of the GXT package and resolves through node_modules.
const require = createRequire(import.meta.url);
const emberSourceDir = dirname(require.resolve('ember-source/package.json'));

const EMBER_NAMESPACE_PREFIXES = ['@ember/', '@glimmer/', '@simple-dom/'];
const EMBER_NAMESPACE_PACKAGES = new Set([
  'ember',
  'ember-testing',
  'ember-template-compiler',
  'rsvp',
  'router_js',
  'route-recognizer',
  'backburner.js',
  'dag-map',
]);

function emberSourceResolver() {
  let distVariant = 'dev';
  return {
    name: 'ember-source-gxt-resolver',
    enforce: 'pre',
    configResolved(config) {
      distVariant = config.mode === 'production' ? 'prod' : 'dev';
    },
    resolveId(source) {
      const inNamespace =
        EMBER_NAMESPACE_PREFIXES.some((p) => source.startsWith(p)) ||
        EMBER_NAMESPACE_PACKAGES.has(source);
      if (!inNamespace) return null;
      const packagesDir = join(emberSourceDir, 'dist', distVariant, 'packages');
      for (const candidate of [`${source}/index.js`, `${source}.js`]) {
        const path = join(packagesDir, candidate);
        if (existsSync(path)) return path;
      }
      return null;
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    // Build-time GXT template compilation for .gjs/.gts (<template> tags).
    // The plugin also `define`s the GXT build-flag identifiers
    // (WITH_CONTEXT_API, IS_DEV_MODE, …) that the prebuilt @lifeart/gxt dist
    // chunks reference, so no manual define block is needed.
    compiler(mode, {
      flags: {
        WITH_EMBER_INTEGRATION: true,
        WITH_HELPER_MANAGER: true,
        WITH_MODIFIER_MANAGER: true,
        TRY_CATCH_ERROR_HANDLING: false,
      },
    }),
    emberSourceResolver(),
  ],
  resolve: {
    // The GXT reactive graph is a per-module-instance singleton: if the app's
    // own @lifeart/gxt copy and the one nested under ember-source-gxt resolve
    // to two different files (an npm nested-install layout can do this), the
    // build ships two runtimes whose cells/trackers silently fork. Force every
    // importer onto the app-level copy. ember-source-gxt pins the exact same
    // version, and the gxt-backend boot guard throws loudly if two instances
    // ever load anyway.
    dedupe: ['@lifeart/gxt'],
  },
  optimizeDeps: {
    // The ember-source dist is a large preserveModules graph reached through
    // a custom resolver; let it be served as-is instead of prebundled.
    noDiscovery: true,
  },
}));
