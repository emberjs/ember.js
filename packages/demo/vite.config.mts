import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// GXT's core module references build-time flags and browser globals at the top level.
// Set defaults before dynamic import so it can be loaded in Node during config.
(globalThis as any).IS_DEV_MODE ??= false;
(globalThis as any).IS_GLIMMER_COMPAT_MODE ??= true;
(globalThis as any).WITH_EMBER_INTEGRATION ??= true;
(globalThis as any).location ??= { pathname: '', search: '', hash: '', href: '' };
(globalThis as any).document ??= {
  createElement: () => ({ style: {} }),
  createTextNode: () => ({}),
  createComment: () => ({}),
  querySelector: () => null,
  querySelectorAll: () => [],
  head: { appendChild: () => {} },
  body: { appendChild: () => {} },
  addEventListener: () => {},
};
(globalThis as any).window ??= globalThis;
(globalThis as any).requestAnimationFrame ??= (cb: any) => setTimeout(cb, 0);

const { compiler } = await import('@lifeart/gxt/compiler');
const { default: esbuildDecoratorsPlugin } = await import(
  '../@ember/-internals/gxt-backend/esbuild-decorators-plugin.mjs'
);

const projectRoot = import.meta.url;

// GXT's core bundle incorrectly includes compiler code that imports build-time-only
// dependencies (content-tag, @babel/core, typescript). Stub them in both Vite's
// dev server and its esbuild-based dep optimizer.
function stubBuildDeps() {
  const buildOnlyDeps = ['content-tag', '@babel/core', 'typescript', '@babel/parser'];
  return {
    name: 'stub-gxt-build-deps',
    enforce: 'pre' as const,
    resolveId(id: string, importer: string | undefined, options: any) {
      // Only stub these imports when they're requested for browser (SSR=false).
      // The GXT compiler plugin needs the real modules on the server side.
      if (buildOnlyDeps.includes(id) && !options?.ssr) {
        return { id: '\0stub:' + id, moduleSideEffects: false };
      }
    },
    load(id: string) {
      if (id.startsWith('\0stub:')) {
        return 'export default {}; export const Preprocessor = class {}; export const transformAsync = () => {}; export const transformSync = () => {};';
      }
    },
  };
}

// esbuild plugin for optimizeDeps to stub the same build-only deps
function esbuildStubPlugin() {
  const buildOnlyDeps = ['content-tag', '@babel/core', 'typescript', '@babel/parser'];
  return {
    name: 'stub-gxt-build-deps',
    setup(build: any) {
      const filter = new RegExp(
        '^(' + buildOnlyDeps.map((d) => d.replace('/', '\\/')).join('|') + ')$'
      );
      build.onResolve({ filter }, (args: any) => ({
        path: args.path,
        namespace: 'stub-build-dep',
      }));
      build.onLoad({ filter: /.*/, namespace: 'stub-build-dep' }, () => ({
        contents:
          'export default {}; export const Preprocessor = class {}; export const transformAsync = () => {}; export const transformSync = () => {};',
        loader: 'js',
      }));
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    esbuildDecoratorsPlugin(),
    stubBuildDeps(),
    compiler(mode, {
      flags: {
        WITH_EMBER_INTEGRATION: true,
        WITH_HELPER_MANAGER: false,
        WITH_MODIFIER_MANAGER: true,
      },
    }),
  ],
  base: '',
  rollupOptions: {
    input: {
      main: 'index.html',
      tests: 'tests.html',
    },
  },
  optimizeDeps: {
    exclude: [
      '@glimmer/syntax',
      '@glimmer/compiler',
      '@lifeart/gxt',
      '@lifeart/gxt/glimmer-compatibility',
    ],
    esbuildOptions: {
      plugins: [esbuildStubPlugin()],
    },
  },
  resolve: {
    preserveSymlinks: true,
    alias: [
      { find: /^@\/(.+)/, replacement: '/src/$1' },
      {
        find: '@ember/template-compilation',
        replacement: fileURLToPath(
          new URL(`../@ember/-internals/gxt-backend/compile`, projectRoot)
        ),
      },
      {
        find: '@ember/-internals/deprecations',
        replacement: fileURLToPath(
          new URL(`../@ember/-internals/gxt-backend/deprecate`, projectRoot)
        ),
      },
      {
        find: '@glimmer/application',
        replacement: fileURLToPath(
          new URL(`../@ember/-internals/gxt-backend/glimmer-application`, projectRoot)
        ),
      },
      {
        find: '@glimmer/utils',
        replacement: fileURLToPath(
          new URL(`../@ember/-internals/gxt-backend/glimmer-util`, projectRoot)
        ),
      },
      {
        find: '@glimmer/manager',
        replacement: fileURLToPath(
          new URL(`../@ember/-internals/gxt-backend/manager`, projectRoot)
        ),
      },
      {
        find: '@glimmer/validator',
        replacement: fileURLToPath(
          new URL(`../@ember/-internals/gxt-backend/validator`, projectRoot)
        ),
      },
      {
        find: '@glimmer/destroyable',
        replacement: fileURLToPath(
          new URL(`../@ember/-internals/gxt-backend/destroyable`, projectRoot)
        ),
      },
      {
        find: '@glimmer/reference',
        replacement: fileURLToPath(
          new URL(`../@ember/-internals/gxt-backend/reference`, projectRoot)
        ),
      },
      {
        find: '@glimmer/env',
        replacement: fileURLToPath(
          new URL(`../@ember/-internals/gxt-backend/glimmer-env`, projectRoot)
        ),
      },
      {
        find: '@glimmer/syntax',
        replacement: fileURLToPath(
          new URL(`../@ember/-internals/gxt-backend/glimmer-syntax`, projectRoot)
        ),
      },
    ],
  },
}));
