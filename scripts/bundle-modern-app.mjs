#!/usr/bin/env node
// scripts/bundle-modern-app.mjs — modern-app bundle-size harness + per-source
// byte inventory.
//
// Builds smoke-tests/modern-app (a strict-mode `.gjs` Ember app: @glimmer/component
// class + template-only components, @tracked, trackedArray, a plain-function helper,
// {{on}} + a setModifierManager modifier, each/if/let, a service, router with 2 routes
// + LinkTo + {{outlet}}) three ways through the repo-root vite pipeline:
//
//   classic     classic Glimmer VM (templateTag + wire-format precompile)
//   gxt         GXT compat      (GXT_MODE=true EMBER_RENDER_BACKEND=gxt)
//   gxt-native  gxt NATIVE layer (EMBER_RENDER_BACKEND=gxt-native: classic source
//                                with __GXT_MODE__=false + the GXT_NATIVE_ALIASES
//                                boundary → gxt-backend/native/*; no compat bridge)
//
// and reports the shipped BOOT JS (entry chunk + transitive static imports, i.e.
// everything the page loads before first render; dynamic-import chunks are listed
// separately) as raw / gzip / brotli (Node zlib defaults, same as
// scripts/bundle-size-check.mjs). Every number includes @lifeart/gxt's own runtime
// (resolved from node_modules) and the app's code.
//
// Byte inventory: each boot file's (hidden) sourcemap attributes every MINIFIED
// output byte to its original source file; sources are grouped (gxt runtime chunk,
// @glimmer/<pkg>, gxt-backend file, metal area, runloop, routing, classic object
// model, @ember/component classic, …) and classified MODERN-NEEDED / LEGACY /
// VM-TO-REPLACE. Group brotli = brotli of the concatenation of that group's
// minified bytes (not additive across groups).
//
// Usage (repo root):
//   node scripts/bundle-modern-app.mjs                       # build + measure all 3
//   node scripts/bundle-modern-app.mjs --variants gxt-native  # subset
//   node scripts/bundle-modern-app.mjs --no-build             # measure existing dists
//   node scripts/bundle-modern-app.mjs --boot                 # + boot-check each variant
//   node scripts/bundle-modern-app.mjs --json out.json --inventory
//   node scripts/bundle-modern-app.mjs --variants gxt-native --assert-native
//                                     # fail if the native closure ships
//                                     # any Glimmer-VM / compat-bridge / runtime-
//                                     # template-compiler module (see FORBIDDEN_NATIVE)
//
// FROM-DIST variants (`--from-dist`): the same app built against a ROLLUP dist
// snapshot of ember-source — how apps consume ember — through
// smoke-tests/modern-app/vite.dist.config.mjs:
//
//   classic-dist     classic `npx rollup --config` dist; templates via content-tag
//                    + babel-plugin-ember-template-compilation (the dist's
//                    ember-template-compiler entry), i.e. wire format
//   gxt-native-dist  `EMBER_RENDER_BACKEND=gxt-native npx rollup --config` dist;
//                    templates via the gxt vite plugin under NATIVE_FLAGS;
//                    @lifeart/gxt from node_modules
//
//   node scripts/bundle-modern-app.mjs --from-dist --build-dists --boot [--flavor loose]
//     --build-dists: rm -rf dist + rollup per flavor (gxt-native first, classic
//       LAST so dist/ is left holding the classic build), each snapshotted to
//       smoke-tests/modern-app/dist/ember-dist/<flavor>/ (+ the @glimmer/component
//       package dist); package.json is restored if rollup's packageMeta rewrote it.
//     --assert-native on gxt-native-dist: scripts/assert-native-dist.mjs on the
//       snapshot, plus "every dist chunk the app's bundle pulled is inside the
//       asserted app closure".
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { GXT_NATIVE_FORBIDDEN } from './gxt-alias-map.mjs';

const EMBER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP_DIR = join(EMBER_ROOT, 'smoke-tests/modern-app');
const DIST_ROOT = join(APP_DIR, 'dist');
const VITE_BIN = join(EMBER_ROOT, 'node_modules/.bin/vite');

const SNAPSHOT_ROOT = join(DIST_ROOT, 'ember-dist');
const ROLLUP_BIN = join(EMBER_ROOT, 'node_modules/.bin/rollup');
const VARIANTS = {
  classic: { GXT_MODE: undefined, EMBER_RENDER_BACKEND: undefined },
  gxt: { GXT_MODE: 'true', EMBER_RENDER_BACKEND: 'gxt' },
  'gxt-native': { GXT_MODE: undefined, EMBER_RENDER_BACKEND: 'gxt-native' },
  'classic-dist': {
    GXT_MODE: undefined,
    EMBER_RENDER_BACKEND: undefined,
    MODERN_APP_DIST_FLAVOR: 'classic',
    MODERN_APP_EMBER_DIST: join(SNAPSHOT_ROOT, 'classic'),
  },
  'gxt-native-dist': {
    GXT_MODE: undefined,
    EMBER_RENDER_BACKEND: undefined,
    MODERN_APP_DIST_FLAVOR: 'gxt-native',
    MODERN_APP_EMBER_DIST: join(SNAPSHOT_ROOT, 'gxt-native'),
  },
};
const isDistVariant = (variant) => variant.endsWith('-dist');
// rollup env per dist flavor (EMBER_RENDER_BACKEND; unset = classic)
const ROLLUP_FLAVORS = { classic: undefined, 'gxt-native': 'gxt-native' };

// ---------------------------------------------------------------- CLI
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const fromDist = flag('--from-dist');
const variants = opt(
  '--variants',
  fromDist ? 'classic-dist,gxt-native-dist' : 'classic,gxt,gxt-native'
).split(',');
for (const v of variants) {
  if (!VARIANTS[v]) {
    console.error(`unknown variant ${v}; expected one of ${Object.keys(VARIANTS).join(', ')}`);
    process.exit(2);
  }
}
const doBuild = !flag('--no-build');
const doBuildDists = flag('--build-dists');
const doBoot = flag('--boot');
const showInventory = flag('--inventory');
const assertNativeFlag = flag('--assert-native');
const jsonOut = opt('--json', null);
const buildTimeoutMs = Number(opt('--build-timeout', '900')) * 1000;
// strict (default): app/ — <template> .gjs, build-time compiled on every variant.
// loose: app-loose/ — same app with resolver-mode precompileTemplate() templates
// (wire-format at build time on classic, RUNTIME-compiled on gxt).
const flavor = opt('--flavor', 'strict');
if (flavor !== 'strict' && flavor !== 'loose') {
  console.error(`unknown --flavor ${flavor}; expected strict | loose`);
  process.exit(2);
}
const tagOf = (variant) => (flavor === 'loose' ? `${variant}-loose` : variant);

const log = (msg) => process.stdout.write(`[bundle-modern-app] ${msg}\n`);

// ---------------------------------------------------------------- build
function buildVariant(variant) {
  const env = { ...process.env, EMBER_ENV: 'production', MODERN_APP_FLAVOR: flavor };
  for (const [k, v] of Object.entries(VARIANTS[variant])) {
    if (v === undefined) delete env[k];
    else env[k] = v;
  }
  mkdirSync(DIST_ROOT, { recursive: true });
  const logFile = join(DIST_ROOT, `${tagOf(variant)}-build.log`);
  log(
    `building ${tagOf(variant)} (timeout ${buildTimeoutMs / 1000}s, log ${relative(EMBER_ROOT, logFile)})`
  );
  const t0 = Date.now();
  const config = isDistVariant(variant) ? 'vite.dist.config.mjs' : 'vite.config.mjs';
  const r = spawnSync(
    VITE_BIN,
    ['build', '--config', join(APP_DIR, config), '--mode', 'production'],
    {
      cwd: EMBER_ROOT,
      env,
      encoding: 'utf8',
      timeout: buildTimeoutMs,
      maxBuffer: 256 << 20,
    }
  );
  writeFileSync(logFile, `${r.stdout ?? ''}\n${r.stderr ?? ''}`);
  if (r.error || r.status !== 0) {
    throw new Error(
      `${variant} build failed (status ${r.status}, ${r.error?.code ?? r.signal ?? ''}); see ${logFile}`
    );
  }
  log(`built ${variant} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

// Recursive directory copy (fs.cpSync is experimental before Node 22.3).
function copyDir(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const src = join(from, entry.name);
    const dst = join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else copyFileSync(src, dst);
  }
}

// A snapshot is shaped like a published package's dist (`<mode>/packages/…`,
// `glimmer-component/`). Its package.json carries ember-source's own
// `sideEffects` (the repo package.json's, `./dist/<mode>/…` → `./<mode>/…`), so
// the app bundle tree-shakes the snapshot the way an app tree-shakes the
// installed package. Without it the repo package.json is the nearest one, its
// `./dist/…` patterns match nothing here, and every module (ext/rsvp's RSVP
// run-loop wiring included) would read as side-effect free. @glimmer/component
// declares no `sideEffects`, so all of its modules count.
function snapshotPackageJson(rootPackageJson) {
  const { sideEffects } = JSON.parse(rootPackageJson.toString('utf8'));
  const own = Array.isArray(sideEffects)
    ? sideEffects.map((p) => p.replace(/^\.\/dist\//, './'))
    : sideEffects === false
      ? []
      : null;
  const pkg = {
    name: 'ember-dist-snapshot',
    private: true,
    type: 'module',
    sideEffects: own === null ? true : [...own, './glimmer-component/**'],
  };
  return JSON.stringify(pkg, null, 2) + '\n';
}

// rm -rf dist + `npx rollup --config` per flavor, snapshotted for the from-dist
// variants. gxt-native first, classic LAST (dist/ is left holding the classic
// build). Rollup's packageMeta rewrites package.json `renamed-modules` for
// non-classic entry maps: restore the original bytes afterwards.
function buildDists(requested) {
  const order = [...requested.filter((f) => f !== 'classic'), 'classic'];
  const pkgPath = join(EMBER_ROOT, 'package.json');
  const pkgBefore = readFileSync(pkgPath);
  try {
    for (const flavor of order) {
      const env = { ...process.env };
      delete env.GXT_MODE;
      if (ROLLUP_FLAVORS[flavor]) env.EMBER_RENDER_BACKEND = ROLLUP_FLAVORS[flavor];
      else delete env.EMBER_RENDER_BACKEND;
      rmSync(join(EMBER_ROOT, 'dist'), { recursive: true, force: true });
      mkdirSync(DIST_ROOT, { recursive: true });
      const logFile = join(DIST_ROOT, `rollup-${flavor}.log`);
      log(`rollup ${flavor} dist (log ${relative(EMBER_ROOT, logFile)})`);
      const t0 = Date.now();
      const r = spawnSync(ROLLUP_BIN, ['--config'], {
        cwd: EMBER_ROOT,
        env,
        encoding: 'utf8',
        timeout: buildTimeoutMs,
        maxBuffer: 256 << 20,
      });
      writeFileSync(logFile, `${r.stdout ?? ''}\n${r.stderr ?? ''}`);
      if (r.error || r.status !== 0) {
        throw new Error(`rollup ${flavor} failed (status ${r.status}); see ${logFile}`);
      }
      const snapshot = join(SNAPSHOT_ROOT, flavor);
      rmSync(snapshot, { recursive: true, force: true });
      copyDir(join(EMBER_ROOT, 'dist'), snapshot);
      copyDir(
        join(EMBER_ROOT, 'packages/@glimmer/component/dist'),
        join(snapshot, 'glimmer-component')
      );
      writeFileSync(join(snapshot, 'package.json'), snapshotPackageJson(pkgBefore));
      log(
        `built ${flavor} dist in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${relative(EMBER_ROOT, snapshot)}`
      );
    }
  } finally {
    if (!readFileSync(pkgPath).equals(pkgBefore)) {
      writeFileSync(pkgPath, pkgBefore);
      log('restored package.json (rollup packageMeta rewrote renamed-modules)');
    }
  }
}

function bootCheck(variant) {
  const out = join(DIST_ROOT, `${tagOf(variant)}-boot.json`);
  const r = spawnSync(
    process.execPath,
    [join(APP_DIR, 'boot-check.mjs'), join(DIST_ROOT, tagOf(variant)), '--json', out],
    { cwd: EMBER_ROOT, encoding: 'utf8', timeout: 180_000 }
  );
  if (r.error) throw new Error(`${variant} boot-check did not run: ${r.error.message}`);
  const summary = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : null;
  return {
    ok: r.status === 0,
    passed: summary?.passed ?? 0,
    total: summary?.total ?? 0,
    firstFailure: summary?.checks.find((c) => !c.ok) ?? null,
    firstPageError: summary?.pageErrors[0]?.split('\n')[0] ?? null,
  };
}

// ---------------------------------------------------------------- boot set
function bootFiles(variant) {
  const dir = join(DIST_ROOT, tagOf(variant));
  const stats = JSON.parse(
    readFileSync(join(DIST_ROOT, `${tagOf(variant)}-stats`, 'bundle-stats.json'), 'utf8')
  );
  const byName = new Map(stats.chunks.map((c) => [c.fileName, c]));
  const htmlFile = readdirSync(dir).find((f) => f.endsWith('.html'));
  const html = readFileSync(join(dir, htmlFile), 'utf8');
  const roots = [...html.matchAll(/<script[^>]*type="module"[^>]*src="\.?\/?([^"]+)"/g)].map(
    (m) => m[1]
  );
  const boot = new Set();
  const visit = (name) => {
    if (boot.has(name)) return;
    boot.add(name);
    for (const dep of byName.get(name)?.imports ?? []) visit(dep);
  };
  roots.forEach(visit);
  const lazy = stats.chunks.map((c) => c.fileName).filter((f) => !boot.has(f));
  return { dir, boot: [...boot], lazy, roots };
}

const sizes = (buf) => ({
  raw: buf.byteLength,
  gz: gzipSync(buf).byteLength,
  br: brotliCompressSync(buf).byteLength,
});

// ---------------------------------------------------------------- sourcemaps
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64MAP = new Int8Array(128).fill(-1);
for (let i = 0; i < B64.length; i++) B64MAP[B64.charCodeAt(i)] = i;

// Returns per generated line an array of [genCol, srcIdx] (srcIdx -1 = unmapped).
function decodeMappings(mappings) {
  const lines = [];
  let line = [];
  let srcIdx = 0;
  let i = 0;
  const n = mappings.length;
  let genCol = 0;
  const field = () => {
    let value = 0;
    let shift = 0;
    for (;;) {
      const d = B64MAP[mappings.charCodeAt(i++)];
      if (d < 0) throw new Error(`bad base64 VLQ at ${i - 1}`);
      value += (d & 31) << shift;
      if (!(d & 32)) break;
      shift += 5;
    }
    return value & 1 ? -(value >>> 1) : value >>> 1;
  };
  while (i < n) {
    const c = mappings.charCodeAt(i);
    if (c === 59 /* ; */) {
      lines.push(line);
      line = [];
      genCol = 0;
      i++;
      continue;
    }
    if (c === 44 /* , */) {
      i++;
      continue;
    }
    genCol += field();
    let fields = 1;
    let seg = [genCol, -1];
    while (i < n && mappings.charCodeAt(i) !== 44 && mappings.charCodeAt(i) !== 59) {
      const v = field();
      fields++;
      if (fields === 2) {
        srcIdx += v;
        seg[1] = srcIdx;
      }
      // fields 3/4 (src line/col) and 5 (name) are cumulative but unused here
      // except that they must be consumed; their running values are irrelevant.
    }
    line.push(seg);
  }
  lines.push(line);
  return lines;
}

// Attribute every byte of `code` to a source path (or '(unmapped)').
function attribute(code, map, mapDir) {
  const lines = decodeMappings(map.mappings);
  const sources = map.sources.map((s) => resolve(mapDir, map.sourceRoot || '', s));
  const parts = new Map(); // source -> array of minified substrings
  const push = (src, s) => {
    if (!s) return;
    let arr = parts.get(src);
    if (!arr) parts.set(src, (arr = []));
    arr.push(s);
  };
  const codeLines = code.split('\n');
  for (let ln = 0; ln < codeLines.length; ln++) {
    const text = codeLines[ln];
    const segs = lines[ln] ?? [];
    let cursor = 0;
    if (segs.length === 0 || segs[0][0] > 0) {
      push('(unmapped)', text.slice(0, segs.length ? segs[0][0] : text.length));
    }
    for (let k = 0; k < segs.length; k++) {
      const start = segs[k][0];
      const end = k + 1 < segs.length ? segs[k + 1][0] : text.length;
      push(segs[k][1] >= 0 ? sources[segs[k][1]] : '(unmapped)', text.slice(start, end));
      cursor = end;
    }
    if (ln < codeLines.length - 1) push('(unmapped)', '\n');
    void cursor;
  }
  return parts;
}

// ---------------------------------------------------------------- classification
const GXT_REPO_HINT = /(^|\/)glimmer-next\/|\/@lifeart\/gxt\//;
function normalize(abs) {
  if (abs === '(unmapped)') return abs;
  // from-dist variants: the shipped bytes map to the ember DIST files
  let d = abs.match(/\/ember-dist\/[^/]+\/(?:prod|dev)\/(.*)$/);
  if (d) return `ember-dist:${d[1]}`;
  d = abs.match(/\/ember-dist\/[^/]+\/glimmer-component\/(.*)$/);
  if (d) return `ember-dist:@glimmer/component/${d[1]}`;
  let m = abs.match(/(?:glimmer-next|@lifeart\/gxt)\/(dist\/.*)$/);
  if (m && GXT_REPO_HINT.test(abs)) return `gxt:${m[1]}`;
  m = abs.match(/node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?((?:@[^/]+\/)?[^/]+)\/(.*)$/);
  if (m && !abs.startsWith(EMBER_ROOT + sep + 'packages')) return `npm:${m[1]}/${m[2]}`;
  return relative(EMBER_ROOT, abs);
}

const M = 'MODERN-NEEDED';
const L = 'LEGACY';
const V = 'VM-TO-REPLACE';
// Ordered rules: first match wins. [regex over normalized path, group, class, note]
const RULES = [
  [/^\(unmapped\)$/, 'unmapped (bundle glue / newlines)', M],
  // from-dist variants: dist-chunk granularity (the dist ships no sourcemaps)
  [/^ember-dist:packages\/shared-chunks\//, 'ember dist: shared chunks', M],
  [/^ember-dist:@glimmer\/component\//, 'ember dist: @glimmer/component package', M],
  [/^ember-dist:packages\/((?:@[^/]+\/)?[^/]+)/, (m) => `ember dist: ${m[1]}`, M],
  [/^smoke-tests\/modern-app\//, 'app code', M],
  // ---- @lifeart/gxt runtime (dist chunks; gxt ships no sourcemaps -> chunk granularity)
  [/^gxt:dist\/dom-/, 'gxt: dom chunk (render core, $_tag/$_c/$_if/$_each, list)', M],
  [/^gxt:dist\/vm-/, 'gxt: vm chunk (cells/formulas/opcodes reactivity)', M],
  [
    // The compiler chunk shared by gxt.compiler / gxt.runtime-compiler is named
    // after its first module: `compile-*` up to gxt 0.0.81, `flags-*`
    // (plugins/flags.ts) since 0.0.82.
    /^gxt:dist\/(compile-|flags-|gxt\.runtime-compiler)/,
    'gxt: RUNTIME template compiler (compile chunk + runtime-compiler entry)',
    L,
  ],
  [
    /^gxt:dist\/gxt\.glimmer-compat/,
    'gxt: glimmer-compat kit (validator/reference/destroyable primitives)',
    V,
  ],
  [/^gxt:dist\/rehydration-/, 'gxt: rehydration (SSR)', L],
  [/^gxt:dist\//, 'gxt: other (index, symbols, unique-id, capture-render-tree, suspense-utils)', M],
  // ---- npm deps
  [
    /^npm:@glimmer\/syntax\/|^packages\/@glimmer\/syntax\//,
    'template compiler: @glimmer/syntax',
    L,
  ],
  [
    /^npm:@handlebars\/parser|^packages\/@handlebars\/parser\/|^npm:simple-html-tokenizer/,
    'template compiler: @handlebars/parser + simple-html-tokenizer',
    L,
  ],
  [
    /^npm:backburner\.js|^packages\/@ember\/runloop\//,
    'runloop (@ember/runloop + backburner.js)',
    M,
  ],
  [/^npm:rsvp\/|^packages\/rsvp\//, 'rsvp', M],
  [
    /^npm:(route-recognizer|dag-map)\/|^packages\/router_js\//,
    'routing deps (router_js, route-recognizer, dag-map)',
    M,
  ],
  [/^npm:decorator-transforms\//, 'decorator-transforms runtime', M],
  [/^npm:ember-strict-application-resolver\//, 'app code', M],
  // ---- ember gxt-backend
  [/gxt-backend\/native\//, 'gxt-backend/native: native layer', M],
  [
    /gxt-backend\/compile\.ts$/,
    'gxt-backend: compile.ts (runtime render layer + runtime compile)',
    V,
  ],
  [
    /gxt-backend\/manager\.ts$/,
    'gxt-backend: manager.ts (manager protocol + classic emulation)',
    V,
  ],
  [
    /gxt-backend\/(validator|reference|destroyable)[^/]*\.ts$/,
    'gxt-backend: validator/reference/destroyable shims',
    V,
  ],
  [
    /gxt-backend\/ember-gxt-wrappers\.ts$/,
    'gxt-backend: ember-gxt-wrappers ($_tag/$_c/$_maybeHelper bridge)',
    V,
  ],
  [/gxt-backend\/gxt-bridge\.ts$/, 'gxt-backend: gxt-bridge registry', V],
  [
    /gxt-backend\/(ast-transforms|ember-template-compiler|glimmer-syntax)\.ts$/,
    'gxt-backend: runtime-compile support',
    L,
  ],
  [/gxt-backend\//, 'gxt-backend: other (helper-manager, stubs, outlet .gts, utils)', V],
  // ---- @glimmer/* (in-repo vendored VM)
  [
    /^packages\/@glimmer\/(component|tracking|owner|env)\//,
    '@glimmer/component|tracking|owner|env (public API)',
    M,
  ],
  [
    /^packages\/@glimmer\/validator\/lib\/collections\//,
    'tracked collections (@glimmer/validator/lib/collections, VM-free)',
    M,
  ],
  [/^packages\/@glimmer\/([^/]+)\//, (m) => `@glimmer/${m[1]}`, V],
  // ---- metal
  [
    /^packages\/@ember\/-internals\/metal\/lib\/(tracked|tags|cache|cached|chain-tags|computed_cache)\.ts$/,
    'metal: tracked/tags/cache (VM tag protocol)',
    V,
  ],
  [
    /^packages\/@ember\/-internals\/metal\/lib\/(computed|alias|observer|mixin|events|each_proxy_events|array_events|array|libraries|namespace_search|decorator|expand_properties|dependent_keys)\.ts$/,
    'metal: computed/alias/observers/mixins/events/array (legacy reactivity)',
    L,
  ],
  [/^packages\/@ember\/-internals\/metal\//, 'metal: get/set/property infra + injection', M],
  // ---- classic object model
  [
    /^packages\/@ember\/object\/(core|index)\.ts$/,
    'classic object model: CoreObject/EmberObject (framework base classes)',
    M,
  ],
  [
    /^packages\/@ember\/object\/|^packages\/@ember\/-internals\/runtime\/|^packages\/@ember\/(array|enumerable)\//,
    'classic object model: mixins/Observable/Evented/proxies/EmberArray',
    L,
  ],
  // ---- classic component + views
  [
    /^packages\/@ember\/component\/index\.ts$|^packages\/@ember\/-internals\/views\/|^packages\/@ember\/-internals\/glimmer\/lib\/(component\.ts|component-managers\/curly\.ts|views\/)/,
    '@ember/component classic + views (Component/CoreView/EventDispatcher/curly manager)',
    L,
  ],
  [
    /^packages\/@ember\/-internals\/glimmer\/lib\/(components\/(input|textarea|abstract-input)|templates\/(input|textarea))\.ts$/,
    '@ember/-internals/glimmer: Input/Textarea built-ins',
    L,
  ],
  [
    /^packages\/@ember\/-internals\/glimmer\/lib\/(components\/(link-to|internal)|templates\/link-to)\.ts$/,
    '@ember/-internals/glimmer: LinkTo built-in (+ internal component base)',
    M,
  ],
  [
    /^packages\/@ember\/-internals\/glimmer\/lib\/(helpers|modifiers)\//,
    '@ember/-internals/glimmer: helpers/modifiers',
    M,
  ],
  [
    /^packages\/@ember\/-internals\/glimmer\//,
    '@ember/-internals/glimmer: renderer/resolver/managers/outlet+root templates/syntax/utils',
    V,
  ],
  // ---- routing / app infra
  [/^packages\/@ember\/(routing|-internals\/routing)\//, 'routing (@ember/routing)', M],
  [
    /^packages\/@ember\/(reactive|destroyable|helper|modifier|template|template-factory|template-compilation)\//,
    'modern public API modules (@ember/reactive|destroyable|helper|modifier|template*)',
    M,
  ],
  [
    /^packages\/@ember\/(application|engine|-internals\/container|owner|-internals\/owner|service|controller)\//,
    'app infra: application/engine/container/owner/service/controller',
    M,
  ],
  [
    /^packages\/@ember\/(debug|instrumentation|-internals\/(environment|browser-environment|error-handling|deprecations))\//,
    'debug/instrumentation/environment',
    M,
  ],
  [/^packages\/@ember\/(utils|-internals\/(utils|meta|string))\//, 'utils/meta', M],
  [/^packages\//, 'other ember packages', M],
];
function classify(path) {
  for (const [re, group, cls] of RULES) {
    const m = path.match(re);
    if (m) return { group: typeof group === 'function' ? group(m) : group, cls };
  }
  return { group: 'other', cls: M };
}

function inventory(variant, files) {
  const groups = new Map(); // group -> {cls, parts[], raw}
  const perSource = new Map(); // path -> raw
  const shippedAbs = new Map(); // absolute source path -> minified bytes
  for (const file of files) {
    const code = readFileSync(file, 'utf8');
    const mapFile = `${file}.map`;
    if (!existsSync(mapFile)) throw new Error(`missing sourcemap ${mapFile}`);
    const parts = attribute(code, JSON.parse(readFileSync(mapFile, 'utf8')), dirname(mapFile));
    for (const [src, arr] of parts) {
      const path = normalize(src);
      const { group, cls } = classify(path);
      const text = arr.join('');
      const raw = Buffer.byteLength(text);
      perSource.set(path, (perSource.get(path) ?? 0) + raw);
      shippedAbs.set(src, (shippedAbs.get(src) ?? 0) + raw);
      let g = groups.get(group);
      if (!g) groups.set(group, (g = { group, cls, parts: [], raw: 0 }));
      g.parts.push(text);
      g.raw += raw;
    }
  }
  const rows = [...groups.values()]
    .map((g) => ({
      group: g.group,
      cls: g.cls,
      raw: g.raw,
      br: brotliCompressSync(Buffer.from(g.parts.join(''))).byteLength,
    }))
    .sort((a, b) => b.raw - a.raw);
  const byClass = {};
  for (const r of rows) {
    const c = (byClass[r.cls] ??= { raw: 0, brSum: 0 });
    c.raw += r.raw;
    c.brSum += r.br;
  }
  const topSources = [...perSource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
  return { variant, rows, byClass, topSources, shippedAbs };
}

// ---------------------------------------------------------------- --assert-native
// The native app closure must not contain the Glimmer VM, the compat bridge, the classic VM
// renderer, or the runtime template compiler. Patterns (shared with the rollup
// dist assertion, scripts/assert-native-dist.mjs) match absolute module ids
// (rollup) and absolute sourcemap sources.
const FORBIDDEN_NATIVE = GXT_NATIVE_FORBIDDEN;

const shortId = (id) =>
  id
    .replace(/^\0/, '')
    .replace(/^.*?\/(packages|smoke-tests|glimmer-next|node_modules)\//, '$1/')
    .replace(/node_modules\/\.pnpm\/[^/]+\/node_modules\//, 'nm/');

// Shortest importer chain from an app entry down to `id` (full importer graph
// from bundle-stats.json, incl. modules tree-shaken to nothing).
function importerChain(graph, id) {
  const isEntry = (x) => /modern-app\/(index\.html|loose\.html|app(-loose)?\/main\.js)/.test(x);
  const prev = new Map([[id, null]]);
  const queue = [id];
  let found = null;
  while (queue.length) {
    const x = queue.shift();
    if (isEntry(x)) {
      found = x;
      break;
    }
    for (const imp of graph[x] ?? []) {
      if (!prev.has(imp)) {
        prev.set(imp, x);
        queue.push(imp);
      }
    }
  }
  if (!found) return '(no path to the app entry in the importer graph)';
  const path = [];
  for (let x = found; x; x = prev.get(x)) path.push(shortId(x));
  return path.join(' > ');
}

function assertNative(result) {
  const stats = JSON.parse(
    readFileSync(join(DIST_ROOT, `${result.variant}-stats`, 'bundle-stats.json'), 'utf8')
  );
  const rendered = new Map(); // module id -> pre-minify rendered length
  for (const chunk of stats.chunks) {
    for (const [id, m] of Object.entries(chunk.modules)) rendered.set(id, m.len);
  }
  // from-dist: ember DIST files are checked against the dist manifest below
  // (a re-pointed entry like `packages/@glimmer/destroyable/index.js` IS the
  // native module, so source-path patterns must not judge dist file names).
  const distPrefix = result.variant.startsWith('gxt-native-dist')
    ? join(SNAPSHOT_ROOT, 'gxt-native') + sep
    : null;
  const why = (id) =>
    distPrefix && id.startsWith(distPrefix)
      ? undefined
      : FORBIDDEN_NATIVE.find(([re]) => re.test(id))?.[1];
  const violations = []; // shipped (minified) bytes > 0
  const preTerserOnly = []; // rollup kept it, terser dropped every byte
  const graphOnly = []; // in the import graph, rendered to 0 bytes by rollup
  const seen = new Set();
  for (const [src, bytes] of result.inventory.shippedAbs) {
    const reason = why(src);
    if (!reason || bytes === 0) continue;
    seen.add(src);
    violations.push({ id: src, reason, shipped: bytes, rendered: rendered.get(src) ?? 0 });
  }
  for (const id of Object.keys(stats.graph)) {
    const reason = why(id);
    if (!reason || seen.has(id)) continue;
    const len = rendered.get(id) ?? 0;
    (len > 0 ? preTerserOnly : graphOnly).push({ id, reason, shipped: 0, rendered: len });
  }
  const print = (title, list, withChain) => {
    console.log(`\n${title}: ${list.length}`);
    for (const v of list) {
      console.log(
        `  - ${shortId(v.id)} [${v.reason}] shipped ${fmt(v.shipped)} B (min), rendered ${fmt(v.rendered)} B (pre-minify)`
      );
      if (withChain) console.log(`      via: ${importerChain(stats.graph, v.id)}`);
    }
  };
  console.log(`\n### --assert-native: ${result.variant}`);
  print('FORBIDDEN modules shipped (violations)', violations, true);
  print(
    'forbidden modules kept by rollup but fully dropped by terser (0 shipped bytes)',
    preTerserOnly,
    true
  );
  print('forbidden modules in the import graph only (rendered to 0 bytes)', graphOnly, false);
  if (distPrefix) {
    // The dist-level assertion on the snapshot this app consumed …
    const out = join(DIST_ROOT, `${result.variant}-assert-dist.json`);
    const r = spawnSync(
      process.execPath,
      [
        join(EMBER_ROOT, 'scripts/assert-native-dist.mjs'),
        '--dist',
        join(SNAPSHOT_ROOT, 'gxt-native'),
        '--modes',
        'prod',
        '--json',
        out,
      ],
      { cwd: EMBER_ROOT, encoding: 'utf8', timeout: 300_000 }
    );
    process.stdout.write(r.stdout ?? '');
    const dist = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8'))[0] : null;
    if (r.status !== 0 || !dist?.app?.fileList) {
      violations.push({
        id: 'scripts/assert-native-dist.mjs',
        reason: `dist assertion failed (status ${r.status})`,
        shipped: 0,
        rendered: 0,
      });
    } else {
      // … and every dist chunk this app's bundle actually pulled is inside the
      // closure that assertion proved VM-free.
      const prodDir = join(distPrefix, 'prod') + sep;
      const closure = new Set(dist.app.fileList);
      const pulled = Object.keys(stats.graph)
        .filter((id) => id.startsWith(prodDir))
        .map((id) => id.slice(prodDir.length).split(sep).join('/'));
      const outside = pulled.filter((f) => !closure.has(f));
      console.log(
        `\n[assert-native] ${result.variant}: the app bundle pulled ${pulled.length} dist chunk(s); outside the asserted dist app closure: ${outside.length}`
      );
      for (const f of outside) {
        violations.push({
          id: f,
          reason: 'dist chunk outside the asserted closure',
          shipped: 0,
          rendered: 0,
        });
      }
    }
  }
  console.log(
    violations.length
      ? `[assert-native] FAIL: ${violations.length} forbidden module(s) ship in ${result.variant}`
      : `[assert-native] OK: no forbidden module ships in ${result.variant}`
  );
  return { violations, preTerserOnly, graphOnly };
}

// ---------------------------------------------------------------- main
const fmt = (n) => n.toLocaleString('en-US');
const results = [];
if (doBuildDists) {
  const flavors = variants.filter(isDistVariant).map((v) => VARIANTS[v].MODERN_APP_DIST_FLAVOR);
  if (flavors.length === 0) {
    console.error('[bundle-modern-app] --build-dists needs a *-dist variant (use --from-dist)');
    process.exit(2);
  }
  buildDists(flavors);
}
for (const variant of variants) {
  if (doBuild) buildVariant(variant);
  const { dir, boot, lazy } = bootFiles(variant);
  const files = boot.map((f) => join(dir, f));
  const total = { raw: 0, gz: 0, br: 0 };
  for (const f of files) {
    const s = sizes(readFileSync(f));
    total.raw += s.raw;
    total.gz += s.gz;
    total.br += s.br;
  }
  const inv = inventory(variant, files);
  const gxtRows = inv.rows.filter((r) => r.group.startsWith('gxt:'));
  const gxtRaw = gxtRows.reduce((a, r) => a + r.raw, 0);
  // gxt runtime brotli measured on the concatenation of all gxt-runtime bytes.
  const gxtBr = gxtRaw
    ? (() => {
        const all = [];
        for (const file of files) {
          const parts = attribute(
            readFileSync(file, 'utf8'),
            JSON.parse(readFileSync(`${file}.map`, 'utf8')),
            dirname(file)
          );
          for (const [src, arr] of parts)
            if (normalize(src).startsWith('gxt:')) all.push(arr.join(''));
        }
        return brotliCompressSync(Buffer.from(all.join(''))).byteLength;
      })()
    : 0;
  const boot_ = doBoot ? bootCheck(variant) : null;
  results.push({
    variant: tagOf(variant),
    flavor,
    files: boot,
    lazy,
    total,
    gxt: { raw: gxtRaw, br: gxtBr },
    inventory: inv,
    boot: boot_,
  });
}

console.log(
  '\n| variant | files | raw | gzip | brotli | gxt runtime raw (share) | gxt runtime br | boots |'
);
console.log('|---|---|---|---|---|---|---|---|');
for (const r of results) {
  const share = r.total.raw ? ((r.gxt.raw / r.total.raw) * 100).toFixed(1) : '0';
  const boots = r.boot ? `${r.boot.ok ? 'YES' : 'NO'} (${r.boot.passed}/${r.boot.total})` : 'n/a';
  console.log(
    `| ${r.variant} | ${r.files.length}${r.lazy.length ? ` (+${r.lazy.length} lazy)` : ''} | ${fmt(r.total.raw)} | ${fmt(r.total.gz)} | ${fmt(r.total.br)} | ${fmt(r.gxt.raw)} (${share}%) | ${fmt(r.gxt.br)} | ${boots} |`
  );
}
for (const r of results) {
  if (r.boot && !r.boot.ok) {
    console.log(
      `  ${r.variant} boot: first failure = ${JSON.stringify(r.boot.firstFailure)}; first page error = ${r.boot.firstPageError}`
    );
  }
}

if (showInventory) {
  for (const r of results) {
    const inv = r.inventory;
    console.log(
      `\n### inventory: ${r.variant} (minified bytes attributed via sourcemap; br = brotli of the group's concatenated bytes)`
    );
    console.log('| group | class | raw | % raw | br |');
    console.log('|---|---|---|---|---|');
    for (const row of inv.rows) {
      console.log(
        `| ${row.group} | ${row.cls} | ${fmt(row.raw)} | ${((row.raw / r.total.raw) * 100).toFixed(1)}% | ${fmt(row.br)} |`
      );
    }
    console.log(
      `\nclass totals (${r.variant}): ` +
        Object.entries(inv.byClass)
          .map(([c, v]) => `${c} raw ${fmt(v.raw)} (Σgroup-br ${fmt(v.brSum)})`)
          .join(' · ')
    );
  }
}

if (assertNativeFlag) {
  const native = results.filter((r) => r.variant.startsWith('gxt-native'));
  if (native.length === 0) {
    console.error('[assert-native] no gxt-native variant in this run (use --variants gxt-native)');
    process.exitCode = 2;
  }
  for (const r of native) {
    r.assertNative = assertNative(r);
    if (r.assertNative.violations.length) process.exitCode = 1;
  }
}

if (jsonOut) {
  for (const r of results) r.inventory.shippedAbs = Object.fromEntries(r.inventory.shippedAbs);
  writeFileSync(jsonOut, JSON.stringify(results, null, 1));
  log(`wrote ${jsonOut}`);
}
