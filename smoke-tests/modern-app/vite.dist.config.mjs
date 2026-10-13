// Modern reference app built against the ROLLUP DIST of ember-source — the way
// an app actually consumes ember (`npx rollup --config` → dist/prod), instead of
// the repo-root vite pipeline over packages/ source (vite.config.mjs).
//
// Same app (strict `app/` or loose `app-loose/`), two ember flavors:
//
//   classic     the classic rollup dist; templates compiled at build time by
//               ember's own path: content-tag (`templateTag()`, .gjs → `template()`)
//               + babel-plugin-ember-template-compilation with the dist's
//               `ember-template-compiler` entry (wire format).
//   gxt-native  the `EMBER_RENDER_BACKEND=gxt-native` rollup dist; templates
//               compiled by the gxt vite plugin under the SAME NATIVE_FLAGS the
//               dist itself was built with (.gjs + G10 build-time
//               `precompileTemplate`); `@lifeart/gxt` resolved from node_modules
//               (the app's own dependency, deduped).
//
// Env: MODERN_APP_DIST_FLAVOR = classic | gxt-native, MODERN_APP_EMBER_DIST = a
// snapshot of one rollup build (`<dir>/prod/packages/**`, `<dir>/glimmer-component/`),
// MODERN_APP_FLAVOR = strict | loose, MODERN_APP_OUT_DIR. Driven by
// `node scripts/bundle-modern-app.mjs --from-dist` (which builds the snapshots).
//
// Everything else matches the source harness so the two measurements compare:
// terser, hidden sourcemaps (byte inventory), no modulepreload polyfill,
// `esbuild: false` (no target lowering of the bundle), and the app's own code
// through babel with decorator-transforms + preset-env at the production
// browser targets (config/targets.cjs). Like a real vite app, the ember dist and
// gxt are consumed as shipped (not re-transpiled).
import { existsSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { babel } from '@rollup/plugin-babel';
import { templateTag } from '@embroider/vite';
import { compiler } from '@lifeart/gxt/compiler';
import { NATIVE_FLAGS } from '../../scripts/gxt-alias-map.mjs';
import { EMBER_ROOT, bundleStats, strictResolverEntry } from './harness-shared.mjs';

const APP_DIR = join(EMBER_ROOT, 'smoke-tests/modern-app');
const require = createRequire(join(EMBER_ROOT, 'package.json'));

const FLAVORS = new Set(['classic', 'gxt-native']);

// Bare imports in the ember module namespace → the dist's
// `<mode>/packages/<specifier>{/index,}.js` (what ember-source's
// `"./*": "./dist/<mode>/packages/*"` export map plus Embroider's renamed-modules
// do for a real app; v2-app-gxt-template uses the same resolver).
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

function emberDistResolver(distDir, mode) {
  const packagesDir = join(distDir, mode, 'packages');
  return {
    name: 'ember-dist-resolver',
    enforce: 'pre',
    resolveId(source) {
      // @glimmer/component is its own published package (its dist imports
      // `@ember/component`, `@ember/destroyable`, … which land back here).
      if (source === '@glimmer/component') return join(distDir, 'glimmer-component/prod/index.js');
      const inNamespace =
        EMBER_NAMESPACE_PREFIXES.some((p) => source.startsWith(p)) ||
        EMBER_NAMESPACE_PACKAGES.has(source);
      if (!inNamespace) return null;
      for (const candidate of [`${source}/index.js`, `${source}.js`]) {
        const path = join(packagesDir, candidate);
        if (existsSync(path)) return path;
      }
      throw new Error(`[modern-app dist] ${source} is not published by ${packagesDir}`);
    },
  };
}

const pkgDir = (name) => realpathSync(join(EMBER_ROOT, 'node_modules', name));

/**
 * The from-dist vite config for one app dir (used by the default export below).
 *
 *   appDir     the app root (vite `root`; its `app*` source dirs go through babel)
 *   input      the HTML entry
 *   outDir     build output
 *   statsDir   where bundle-stats.json lands (the boot-set walk)
 *   flavor     classic | gxt-native
 *   distDir    a rollup dist snapshot (`<dir>/prod/packages/**`, `<dir>/glimmer-component/`)
 */
export function distAppConfig({ mode, appDir, input, outDir, statsDir, flavor, distDir, include }) {
  if (!FLAVORS.has(flavor)) {
    throw new Error(`MODERN_APP_DIST_FLAVOR must be classic | gxt-native, got ${flavor}`);
  }
  if (!distDir || !existsSync(join(distDir, 'prod/packages'))) {
    throw new Error(`MODERN_APP_EMBER_DIST (${distDir}) is not a rollup dist snapshot`);
  }
  const nativeDist = existsSync(join(distDir, 'prod/gxt-native-manifest.json'));
  if (nativeDist !== (flavor === 'gxt-native')) {
    throw new Error(
      `MODERN_APP_EMBER_DIST ${distDir} is ${nativeDist ? 'a gxt-native' : 'a classic'} dist, flavor is ${flavor}`
    );
  }
  const distMode = mode === 'production' ? 'prod' : 'dev';
  const targets = require('./config/targets.cjs');
  const decoratorTransforms = pkgDir('decorator-transforms');

  const appBabel = babel({
    babelHelpers: 'bundled',
    extensions: ['.js', '.gjs'],
    // App sources only: the ember dist snapshot lives under <appDir>/dist.
    include,
    configFile: false,
    babelrc: false,
    cwd: EMBER_ROOT,
    presets: [['@babel/preset-env', { targets }]],
    plugins: [
      ...(flavor === 'classic'
        ? [
            [
              'babel-plugin-ember-template-compilation',
              {
                compilerPath: join(distDir, distMode, 'packages/ember-template-compiler/index.js'),
              },
            ],
          ]
        : []),
      [
        'module:decorator-transforms',
        { runtime: { import: join(decoratorTransforms, 'dist/runtime.js') } },
      ],
    ],
  });

  return {
    root: appDir,
    publicDir: false,
    base: './',
    logLevel: 'warn',
    esbuild: false,
    plugins: [
      emberDistResolver(distDir, distMode),
      ...(flavor === 'classic'
        ? [templateTag()]
        : [compiler(mode, { flags: { ...NATIVE_FLAGS }, disableHMR: true })]),
      appBabel,
      bundleStats(statsDir),
    ],
    resolve: {
      dedupe: ['@lifeart/gxt'],
      alias: [
        { find: /^ember-strict-application-resolver$/, replacement: strictResolverEntry() },
        {
          find: /^decorator-transforms\/globals$/,
          replacement: join(decoratorTransforms, 'dist/globals.js'),
        },
      ],
    },
    build: {
      outDir,
      emptyOutDir: true,
      target: 'esnext',
      minify: 'terser',
      sourcemap: 'hidden',
      modulePreload: { polyfill: false },
      reportCompressedSize: false,
      rollupOptions: { input },
    },
  };
}

export default ({ mode }) => {
  const flavor = process.env.MODERN_APP_DIST_FLAVOR;
  const loose = process.env.MODERN_APP_FLAVOR === 'loose';
  const tag = `${flavor}-dist${loose ? '-loose' : ''}`;
  const outDir = process.env.MODERN_APP_OUT_DIR || resolve(APP_DIR, 'dist', tag);
  return distAppConfig({
    mode,
    appDir: APP_DIR,
    input: resolve(APP_DIR, loose ? 'loose.html' : 'index.html'),
    outDir,
    statsDir: resolve(outDir, '..', `${tag}-stats`),
    flavor,
    distDir: process.env.MODERN_APP_EMBER_DIST,
    include: [`${APP_DIR}/app/**`, `${APP_DIR}/app-loose/**`],
  });
};
