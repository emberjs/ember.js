#!/usr/bin/env node
// scripts/build-gxt-native-package.mjs
//
// Assembles the gxt-NATIVE Ember build (EMBER_RENDER_BACKEND=gxt-native: classic
// Ember source + the native layer, no Glimmer VM) as its own npm package — a
// full alternative to `ember-source` that apps install under the `ember-source`
// name (`"ember-source": "npm:ember-source-gxt-native@…"`) and build with the
// package's Vite preset (`<package>/vite`).
//
//   node scripts/build-gxt-native-package.mjs [--out dist-gxt-native-package]
//     [--name ember-source-gxt-native] [--gxt-version <exact>]
//     [--compare <dist snapshot>] [--pack <tarball dir>]
//
//     --compare  a rollup dist snapshot (<dir>/{dev,prod}/packages,
//                <dir>/glimmer-component) that must be byte-identical to the
//                package's build before pruning — e.g. the one
//                `node scripts/bundle-modern-app.mjs --from-dist --build-dists`
//                measured (smoke-tests/modern-app/dist/ember-dist/gxt-native)
//     --pack     run `npm pack` into this directory
//
// Pipeline (fail-loud at every step):
//   1. preflight: the gxt the dist compiles against (version, local build?)
//   2. rollup native build through rollup.config.mjs's own configs, written
//      straight into an EMPTY <out>/dist (Rollup does not clean its output
//      directory, so stale classic VM files could otherwise survive) — without
//      the package-meta plugin, so the tracked package.json is never rewritten
//      and dist/ (the classic build) is never touched
//   3. optional --compare: byte-identical to the measured dist snapshot
//   4. prune the non-app entries that still reach Glimmer VM / wire-format
//      compiler code (explicit list, with the reason the preset reports)
//   5. contract: the NATIVE_FLAGS, the gxt exports the dist imports, the entry
//      list — read by the preset, so app compile and dist cannot drift
//   6. package files: package.json, vite preset, throwing addon-main, README,
//      types, build metadata
//   7. self-verify: assert-native-dist on the package, bare-specifier audit,
//      the preset loads and resolves, package.json + dist/ untouched
//   8. optional npm pack
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  GXT_NATIVE_DIST_DROPPED_ENTRIES,
  GXT_NATIVE_FORBIDDEN,
  NATIVE_FLAGS,
} from './gxt-alias-map.mjs';

// eslint-disable-next-line no-redeclare
const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATES = join(ROOT, 'scripts', 'gxt-native-package');

const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const OUT = resolve(ROOT, opt('--out', 'dist-gxt-native-package'));
const NAME = opt('--name', 'ember-source-gxt-native');
const COMPARE = opt('--compare', null);
const PACK = opt('--pack', null);

// Non-app dist entries that still reach Glimmer VM / template-compiler modules.
// They are dropped from the package (with every chunk only they reach); the
// preset reports the reason when something imports them. Any OTHER entry that
// reaches such code fails the build — it would mean an app-facing module is not
// VM-free.
const PRUNABLE = [
  {
    match: /^ember-template-compiler(\/|$)/,
    specifier: 'ember-template-compiler',
    reason:
      'it is the Glimmer wire-format template compiler (build tooling for the Glimmer VM). Templates are compiled by the gxt compiler in the Vite preset; compile at runtime with `@ember/template-compiler`.',
  },
  {
    match: /^@ember\/template-compiler\/lib\//,
    specifier: '@ember/template-compiler/lib',
    reason:
      'these are the Glimmer wire-format compiler internals; the runtime compiler is `@ember/template-compiler` (the gxt runtime compiler).',
  },
  {
    match: /^@ember\/template-compiler\/-internal-primitives$/,
    specifier: '@ember/template-compiler/-internal-primitives',
    reason:
      'it exposes the Glimmer wire-format compiler primitives (template tooling for the Glimmer VM).',
  },
  {
    match: /^@ember\/-internals\/glimmer$/,
    specifier: '@ember/-internals/glimmer',
    reason:
      "it is the classic renderer's private barrel (it re-exports Glimmer VM DOM builders); Ember's own modules never import it.",
  },
];
// The one allowed residue inside the app closure (scripts/assert-native-dist.mjs
// checks it is the dead `getGxtRenderer(){return null}` stub).
const GXT_BRIDGE = /gxt-backend\/gxt-bridge\.ts$/;
const GXT_EXPORT_SPECIFIER = /^@lifeart\/gxt(\/|$)/;

function log(msg) {
  process.stdout.write(`[build-gxt-native-package] ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`[build-gxt-native-package] FAIL: ${msg}\n`);
  process.exit(1);
}

function walkFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

function copyDir(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const src = join(from, entry.name);
    const dst = join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else copyFileSync(src, dst);
  }
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// relative path → sha256 of every file under `dir`
function fileHashes(dir) {
  const out = new Map();
  if (!existsSync(dir)) return out;
  for (const f of walkFiles(dir).sort()) out.set(relative(dir, f), sha256(readFileSync(f)));
  return out;
}

function treeHash(dir) {
  const h = createHash('sha256');
  for (const [file, hash] of fileHashes(dir)) h.update(`${file}\0${hash}\n`);
  return h.digest('hex');
}

function git(args) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) fail(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout.trim();
}

// ---- 1. preflight ----------------------------------------------------------
const rootPkgPath = join(ROOT, 'package.json');
const rootPkgBytes = readFileSync(rootPkgPath);
const rootPkg = JSON.parse(rootPkgBytes.toString('utf8'));
const distHashBefore = treeHash(join(ROOT, 'dist'));

const gxtLink = join(ROOT, 'node_modules', '@lifeart', 'gxt');
if (!existsSync(gxtLink)) fail('node_modules/@lifeart/gxt is missing');
const gxtRoot = realpathSync(gxtLink);
const gxtPkg = JSON.parse(readFileSync(join(gxtRoot, 'package.json'), 'utf8'));
const gxtMetaPath = join(gxtRoot, 'dist', '.build-meta.json');
const gxtMeta = existsSync(gxtMetaPath) ? JSON.parse(readFileSync(gxtMetaPath, 'utf8')) : null;
if (gxtMeta?.gitDirty) {
  fail(`the gxt dist at ${gxtRoot} was built from a dirty tree (${gxtMeta.gitHash}); rebuild it`);
}
// The repo's one gxt pin is ember-source's devDependency (the classic package
// ships without gxt); this package depends on exactly that version.
const gxtVersion = opt('--gxt-version', rootPkg.devDependencies?.['@lifeart/gxt']);
if (!gxtVersion) fail('package.json has no @lifeart/gxt devDependency to pin');
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(gxtVersion)) {
  fail(`@lifeart/gxt must be pinned to an EXACT version, got "${gxtVersion}"`);
}
// An npm-installed gxt (no build meta) must be the pinned one: the dist is
// compiled against it. A local gxt build is reported by the warning below.
if (!gxtMeta && !argv.includes('--gxt-version') && gxtPkg.version !== gxtVersion) {
  fail(
    `node_modules has @lifeart/gxt ${gxtPkg.version}, package.json pins ${gxtVersion}; run pnpm install`
  );
}
// pnpm installs every package as a symlink into its virtual store
// (node_modules/.pnpm), the npm release included. Only a symlink that resolves
// outside that store is a linked gxt checkout (`pnpm link`, a `link:`
// dependency, a manual symlink). A dist with build meta is a local build
// wherever it lives (e.g. copied over the installed release).
const pnpmStore = join(ROOT, 'node_modules', '.pnpm');
const gxtInPnpmStore = existsSync(pnpmStore) && gxtRoot.startsWith(realpathSync(pnpmStore) + sep);
const gxtIsLinked = lstatSync(gxtLink).isSymbolicLink() && !gxtInPnpmStore;
const gxtIsLocal = gxtIsLinked || gxtMeta !== null;
log(
  `gxt: @lifeart/gxt ${gxtPkg.version} at ${gxtRoot}${gxtMeta ? ` (git ${gxtMeta.gitHash})` : ''}; package pins ${gxtVersion}`
);
if (gxtIsLocal) {
  log(
    `WARNING: this is a LOCAL gxt build. The package's exact pin "${gxtVersion}" names a version whose npm release is NOT this build; consumers must install the matching gxt (e.g. its npm-pack tarball + an "overrides" entry) until it is released. The Vite preset refuses a gxt that lacks the exports this dist imports.`
  );
}

const emberSha = git(['rev-parse', 'HEAD']);
const emberDirty =
  spawnSync(
    'git',
    [
      'diff',
      '--quiet',
      'HEAD',
      '--',
      'packages',
      'rollup.config.mjs',
      'babel.config.mjs',
      'scripts/gxt-alias-map.mjs',
    ],
    { cwd: ROOT }
  ).status !== 0;
log(
  `ember: ${rootPkg.version} @ ${emberSha.slice(0, 10)}${emberDirty ? ' (+ uncommitted source changes)' : ''}`
);

// ---- 2. native rollup build into an empty <out>/dist ------------------------
rmSync(OUT, { recursive: true, force: true });
const DIST = join(OUT, 'dist');
mkdirSync(DIST, { recursive: true });

for (const k of [
  'GXT_MODE',
  'GXT_NATIVE',
  'EMBER_GXT_CLASSIC',
  'DEBUG_SINGLE_CONFIG',
  'BUNDLE_VISUALIZER',
]) {
  delete process.env[k];
}
process.env.EMBER_RENDER_BACKEND = 'gxt-native';
process.chdir(ROOT); // rollup.config.mjs's version() plugin reads ./package.json

const { rollup } = require('rollup');
const { default: configs } = await import(pathToFileURL(join(ROOT, 'rollup.config.mjs')).href);
const targets = [
  ['dist/dev', join(DIST, 'dev')],
  ['dist/prod', join(DIST, 'prod')],
  // @glimmer/component builds a dev and a prod dist of its own (its package.json
  // `exports` pick one by the `development` / `production` condition).
  ['packages/@glimmer/component/dist/dev', join(DIST, 'glimmer-component', 'dev')],
  ['packages/@glimmer/component/dist/prod', join(DIST, 'glimmer-component', 'prod')],
];
const t0 = Date.now();
for (const [configDir, outDir] of targets) {
  const config = configs.find((c) => c.output?.dir === configDir);
  if (!config) fail(`rollup.config.mjs has no config writing ${configDir}`);
  const { output, ...input } = config;
  // package-meta rewrites the tracked package.json; the renamed-modules map is
  // derived from the written files below instead (same rule).
  input.plugins = input.plugins.filter((p) => p && p.name !== 'package-meta');
  const bundle = await rollup(input);
  await bundle.write({ ...output, dir: outDir });
  await bundle.close();
}
log(`native rollup build → ${relative(ROOT, DIST)} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// The rollup type declarations of @glimmer/component are a separate (tsc)
// output of the repo build; ship them next to its code when present.
const gcTypesDir = join(ROOT, 'packages', '@glimmer', 'component', 'dist');
for (const f of existsSync(gcTypesDir) ? walkFiles(gcTypesDir) : []) {
  if (!f.endsWith('.d.ts')) continue;
  const dst = join(DIST, 'glimmer-component', relative(gcTypesDir, f));
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(f, dst);
}

for (const mode of ['dev', 'prod']) {
  const manifestPath = join(DIST, mode, 'gxt-native-manifest.json');
  if (!existsSync(manifestPath))
    fail(`${relative(ROOT, manifestPath)} missing — not a native build`);
  const { nativeFlags } = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (JSON.stringify(nativeFlags) !== JSON.stringify(NATIVE_FLAGS)) {
    fail(`${mode} manifest NATIVE_FLAGS differ from scripts/gxt-alias-map.mjs`);
  }
}

// ---- 3. optional: identical to a measured dist snapshot ---------------------
if (COMPARE) {
  const snapshot = resolve(ROOT, COMPARE);
  for (const [sub, snapSub] of [
    ['dev', 'dev'],
    ['prod', 'prod'],
    ['glimmer-component', 'glimmer-component'],
  ]) {
    const mine = fileHashes(join(DIST, sub));
    const theirs = fileHashes(join(snapshot, snapSub));
    const diffs = [...new Set([...mine.keys(), ...theirs.keys()])].filter(
      (f) => mine.get(f) !== theirs.get(f)
    );
    if (diffs.length > 0) {
      fail(
        `${sub} differs from ${relative(ROOT, snapshot)}/${snapSub}: ${diffs.slice(0, 10).join(', ')}`
      );
    }
    log(`  identical to ${relative(ROOT, join(snapshot, snapSub))} (${mine.size} files)`);
  }
}

// ---- 4. prune non-app entries that reach VM / wire-format compiler code ----
// Two passes: find the entries that reach such code in EITHER mode (dev keeps
// DEBUG-only compiler edges prod tree-shakes), then drop that one set from both
// modes so dist/dev and dist/prod keep publishing the same entries.
const specifierOf = (file) => file.replace(/^packages\//, '').replace(/(\/index)?\.js$/, '');
const distManifests = {};
const forbiddenIn = (chunks, file) =>
  Object.entries(chunks[file].modules)
    .filter(
      ([id, len]) =>
        len > 0 && !GXT_BRIDGE.test(id) && GXT_NATIVE_FORBIDDEN.some(([re]) => re.test(id))
    )
    .map(([id]) => id);
const closureOf = (chunks, roots) => {
  const seen = new Set();
  const queue = [...roots];
  while (queue.length) {
    const f = queue.pop();
    if (seen.has(f) || !chunks[f]) continue;
    seen.add(f);
    queue.push(...chunks[f].imports, ...(chunks[f].dynamicImports ?? []));
  }
  return seen;
};
const prunedEntries = new Set();
for (const mode of ['dev', 'prod']) {
  const manifestPath = join(DIST, mode, 'gxt-native-manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  distManifests[mode] = { manifestPath, manifest };
  const { chunks } = manifest;
  for (const entry of Object.keys(chunks).filter((f) => chunks[f].isEntry)) {
    const reached = [...closureOf(chunks, [entry])].flatMap((f) => forbiddenIn(chunks, f));
    if (reached.length === 0) continue;
    const specifier = specifierOf(entry);
    if (!PRUNABLE.some((p) => p.match.test(specifier))) {
      fail(
        `${mode}: entry ${specifier} reaches ${reached.slice(0, 3).join(', ')} and is not a known non-app entry — refusing to ship or drop it`
      );
    }
    prunedEntries.add(entry);
  }
}
for (const mode of ['dev', 'prod']) {
  const { manifestPath, manifest } = distManifests[mode];
  const { chunks } = manifest;
  const entryFiles = Object.keys(chunks).filter((f) => chunks[f].isEntry);
  const pruned = entryFiles.filter((f) => prunedEntries.has(f));
  const keep = closureOf(
    chunks,
    entryFiles.filter((f) => !prunedEntries.has(f))
  );
  for (const entry of pruned) {
    if (keep.has(entry)) fail(`${mode}: pruned entry ${entry} is imported by a kept module`);
  }
  const removed = Object.keys(chunks).filter((f) => !keep.has(f));
  let removedBytes = 0;
  for (const f of removed) {
    removedBytes += statSync(join(DIST, mode, f)).size;
    rmSync(join(DIST, mode, f));
    delete chunks[f];
  }
  for (const f of Object.keys(chunks)) {
    const left = forbiddenIn(chunks, f);
    if (left.length) fail(`${mode}: ${f} still holds ${left.join(', ')} after pruning`);
  }
  manifest.packagePruned = { entries: pruned.map(specifierOf).sort(), files: removed.sort() };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
  log(
    `${mode}: pruned ${pruned.length} non-app entries (${manifest.packagePruned.entries.join(', ')}) — ${removed.length} files, ${removedBytes.toLocaleString('en-US')} B`
  );
}
const prunedSpecifiers = [...prunedEntries].map(specifierOf).sort();

// renamed-modules: every non-shared-chunk packages/**/*.js (packageMeta's rule)
function publishedEntries(mode) {
  const dir = join(DIST, mode, 'packages');
  return walkFiles(dir)
    .map((f) => relative(dir, f).split(/[\\/]/).join('/'))
    .filter((f) => f.endsWith('.js') && !f.startsWith('shared-chunks/'))
    .sort();
}
const entries = publishedEntries('prod');
if (JSON.stringify(entries) !== JSON.stringify(publishedEntries('dev'))) {
  fail('dist/dev and dist/prod publish different entries (the dev/prod condition would diverge)');
}
const renamedModules = Object.fromEntries(entries.map((e) => [e, `ember-source/${e}`]));

// ---- 5. contract ------------------------------------------------------------
const { parseAst } = require('rollup/parseAst');
const gxtImports = {};
const bareOffenders = [];
const entrySpecifiers = new Set(
  entries.flatMap((e) => [e, e.replace(/\.js$/, ''), specifierOf(`packages/${e}`)])
);
const shippedJs = walkFiles(DIST).filter((f) => f.endsWith('.js'));
for (const file of shippedJs) {
  const ast = parseAst(readFileSync(file, 'utf8'));
  for (const node of ast.body) {
    const source = node.source?.value;
    if (!source || source.startsWith('.')) continue;
    if (GXT_EXPORT_SPECIFIER.test(source)) {
      const names = (gxtImports[source] ??= new Set());
      if (node.type === 'ImportDeclaration') {
        for (const s of node.specifiers) {
          if (s.type === 'ImportSpecifier') names.add(s.imported.name ?? s.imported.value);
          else if (s.type === 'ImportDefaultSpecifier') names.add('default');
        }
      } else if (node.type === 'ExportNamedDeclaration') {
        for (const s of node.specifiers) names.add(s.local.name ?? s.local.value);
      }
      continue;
    }
    // A bare import must land back in this dist (glimmer-component's
    // `@ember/component`, …) — anything else would be an undeclared dependency.
    if (!entrySpecifiers.has(source)) bareOffenders.push(`${source} (in ${relative(OUT, file)})`);
  }
}
if (bareOffenders.length) {
  fail(
    `bare imports that neither @lifeart/gxt nor this dist provides:\n  ${bareOffenders.join('\n  ')}`
  );
}
const requiredExports = Object.fromEntries(
  Object.entries(gxtImports)
    .sort()
    .map(([spec, names]) => [spec, [...names].sort()])
);
// The gxt being packed against must provide them (the preset re-checks the
// consumer's gxt with the same list).
for (const [spec, names] of Object.entries(requiredExports)) {
  const file = fileURLToPath(import.meta.resolve(spec));
  const exported = new Set();
  for (const node of parseAst(readFileSync(file, 'utf8')).body) {
    if (node.type === 'ExportNamedDeclaration') {
      for (const s of node.specifiers) exported.add(s.exported.name ?? s.exported.value);
      if (node.declaration?.id) exported.add(node.declaration.id.name);
      for (const d of node.declaration?.declarations ?? []) exported.add(d.id.name);
    } else if (node.type === 'ExportDefaultDeclaration') exported.add('default');
  }
  const missing = names.filter((n) => !exported.has(n));
  if (missing.length) fail(`the build's own gxt (${spec}) lacks ${missing.join(', ')}`);
}
const contract = {
  package: NAME,
  version: rootPkg.version,
  ember: { version: rootPkg.version, sha: emberSha, uncommittedSource: emberDirty },
  gxt: { version: gxtVersion, gitHash: gxtMeta?.gitHash ?? null, requiredExports },
  nativeFlags: NATIVE_FLAGS,
  glimmerComponent: {
    dev: 'dist/glimmer-component/dev/index.js',
    prod: 'dist/glimmer-component/prod/index.js',
  },
  entries,
  droppedEntries: [...GXT_NATIVE_DIST_DROPPED_ENTRIES].sort(),
  prunedEntries: PRUNABLE.filter((p) => prunedSpecifiers.some((s) => p.match.test(s))).map(
    ({ specifier, reason }) => ({ specifier, reason })
  ),
};
writeFileSync(join(DIST, 'gxt-native-contract.json'), JSON.stringify(contract, null, 2) + '\n');
log(
  `contract: ${entries.length} entries, gxt imports ${Object.entries(requiredExports)
    .map(([s, n]) => `${s} (${n.length})`)
    .join(', ')}`
);

// ---- 6. package files ---------------------------------------------------------
mkdirSync(join(OUT, 'vite'), { recursive: true });
copyFileSync(join(TEMPLATES, 'vite.mjs'), join(OUT, 'vite', 'index.mjs'));
copyFileSync(join(TEMPLATES, 'vite.d.ts'), join(OUT, 'vite', 'index.d.ts'));
mkdirSync(join(OUT, 'lib'), { recursive: true });
copyFileSync(join(TEMPLATES, 'addon-main.cjs'), join(OUT, 'lib', 'index.cjs'));
copyFileSync(join(ROOT, 'LICENSE'), join(OUT, 'LICENSE'));
writeFileSync(
  join(OUT, 'README.md'),
  readFileSync(join(TEMPLATES, 'README.md'), 'utf8')
    .replaceAll('{{name}}', NAME)
    .replaceAll('{{version}}', rootPkg.version)
    .replaceAll('{{gxtVersion}}', gxtVersion)
);
const typesDir = join(ROOT, 'types', 'stable');
if (existsSync(join(typesDir, 'index.d.ts'))) {
  copyDir(typesDir, join(OUT, 'types', 'stable'));
} else {
  fail('types/stable is missing (build it with `pnpm build:types`)');
}
const buildInfo = require('../broccoli/build-info.cjs').buildInfo();
writeFileSync(
  join(OUT, 'build-metadata.json'),
  JSON.stringify(
    {
      version: buildInfo.version,
      buildType: buildInfo.channel,
      SHA: buildInfo.sha,
      flavor: 'gxt-native',
      gxt: { version: gxtVersion, gitHash: gxtMeta?.gitHash ?? null },
    },
    null,
    2
  ) + '\n'
);

const pkg = {
  name: NAME,
  version: rootPkg.version,
  description: `Ember ${rootPkg.version} running on @lifeart/gxt instead of the Glimmer VM (gxt-native build). Preview; Vite only.`,
  type: 'module',
  keywords: ['ember-addon'],
  exports: {
    './vite': { types: './vite/index.d.ts', default: './vite/index.mjs' },
    './*': {
      development: './dist/dev/packages/*',
      production: './dist/prod/packages/*',
      default: './dist/prod/packages/*',
    },
    './types': { types: './types/stable/index.d.ts' },
    './package.json': './package.json',
  },
  homepage: rootPkg.homepage,
  bugs: rootPkg.bugs,
  license: rootPkg.license,
  main: 'lib/index.cjs',
  files: ['build-metadata.json', 'dist', 'lib', 'types/stable', 'vite'],
  // ember-source's own `sideEffects` (same `./dist/<mode>/packages/…` layout);
  // the bundled @glimmer/component declares none, so all of it counts.
  sideEffects: Array.isArray(rootPkg.sideEffects)
    ? [...rootPkg.sideEffects, './dist/glimmer-component/**']
    : rootPkg.sideEffects === false
      ? ['./dist/glimmer-component/**']
      : true,
  repository: rootPkg.repository,
  dependencies: { '@lifeart/gxt': gxtVersion },
  peerDependencies: { '@glimmer/component': '>= 2.0.0', vite: '^7.0.0' },
  peerDependenciesMeta: { '@glimmer/component': { optional: true } },
  engines: rootPkg.engines,
  typesVersions: rootPkg.typesVersions,
  gxtNative: {
    emberSource: rootPkg.version,
    emberSha,
    gxt: gxtVersion,
    gxtGitHash: gxtMeta?.gitHash ?? null,
  },
  'ember-addon': {
    type: 'addon',
    version: 2,
    backend: 'gxt-native',
    'renamed-modules': renamedModules,
  },
};
writeFileSync(join(OUT, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

// ---- 7. self-verify -------------------------------------------------------------
log('self-verify');
const assert = spawnSync(
  process.execPath,
  [join(ROOT, 'scripts', 'assert-native-dist.mjs'), '--dist', DIST],
  { cwd: ROOT, encoding: 'utf8' }
);
const assertLines = `${assert.stdout}${assert.stderr}`
  .split('\n')
  .filter((l) => l.startsWith('[assert-native-dist]'));
for (const line of assertLines) log(`  ${line}`);
if (assert.status !== 0)
  fail(`assert-native-dist failed on the package:\n${assert.stdout}\n${assert.stderr}`);

for (const mode of ['dev', 'prod']) {
  for (const key of Object.keys(renamedModules)) {
    if (!existsSync(join(DIST, mode, 'packages', key))) fail(`${mode} lacks renamed-module ${key}`);
  }
}

const { emberGxtNative } = await import(pathToFileURL(join(OUT, 'vite', 'index.mjs')).href);
for (const [mode, dir] of [
  ['production', 'prod'],
  ['development', 'dev'],
]) {
  const [resolver] = emberGxtNative();
  const config = resolver.config({}, { mode, command: mode === 'production' ? 'build' : 'serve' });
  for (const [flag, value] of Object.entries(NATIVE_FLAGS)) {
    if (config.define[flag] !== value) fail(`preset (${mode}) define.${flag} !== ${value}`);
  }
  const expect = async (specifier, file) => {
    const got = await resolver.resolveId(specifier);
    if (got !== file) fail(`preset (${mode}) resolves ${specifier} to ${got}, expected ${file}`);
  };
  await expect(
    '@ember/application',
    join(DIST, dir, 'packages', '@ember', 'application', 'index.js')
  );
  await expect(
    '@ember/routing/route',
    join(DIST, dir, 'packages', '@ember', 'routing', 'route.js')
  );
  await expect(
    '@glimmer/tracking',
    join(DIST, dir, 'packages', '@glimmer', 'tracking', 'index.js')
  );
  await expect('@glimmer/component', join(DIST, 'glimmer-component', dir, 'index.js'));
  await expect('@ember/test-waiters', null);
  for (const refused of [
    '@glimmer/opcode-compiler',
    'ember-template-compiler',
    '@ember/-internals/glimmer',
    '@ember/application/not-a-module',
  ]) {
    let threw = null;
    try {
      await resolver.resolveId(refused);
    } catch (error) {
      threw = error.message;
    }
    if (!threw) fail(`preset (${mode}) did not refuse ${refused}`);
  }
}
log(
  '  ok: the preset loads, takes the native flags and resolves / refuses as specified (dev + prod)'
);

if (!readFileSync(rootPkgPath).equals(rootPkgBytes)) fail('the tracked package.json changed');
if (treeHash(join(ROOT, 'dist')) !== distHashBefore) fail('dist/ (the classic build) changed');
log('  ok: package.json and dist/ untouched');

// ---- 8. npm pack ------------------------------------------------------------------
if (PACK) {
  const dest = resolve(ROOT, PACK);
  mkdirSync(dest, { recursive: true });
  const r = spawnSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', dest], {
    cwd: OUT,
    encoding: 'utf8',
  });
  if (r.status !== 0) fail(`npm pack failed: ${r.stderr}`);
  const [info] = JSON.parse(r.stdout);
  const tarball = join(dest, info.filename);
  log(
    `packed ${tarball}: ${info.size.toLocaleString('en-US')} B (unpacked ${info.unpackedSize.toLocaleString('en-US')} B, ${info.entryCount} files), sha256 ${sha256(readFileSync(tarball)).slice(0, 16)}`
  );
}
log(`DONE: ${relative(ROOT, OUT)} (${NAME}@${rootPkg.version}, @lifeart/gxt ${gxtVersion})`);
