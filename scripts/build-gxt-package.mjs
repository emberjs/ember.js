#!/usr/bin/env node
// scripts/build-gxt-package.mjs
//
// Assembles a self-contained, consumable `ember-source-gxt` package directory
// (`dist-gxt-package/` at the repo root, git-ignored) from the GXT Rollup build.
//
// This is mechanism (b) from docs-internal-gxt-packaging-design.md: a
// script-assembled package directory that is `ember-source` built with the GXT
// rendering backend, shaped so a consumer can `link:`/`file:` it (or scenario-
// tester `{ target }`) it in place of `ember-source`.
//
// Pipeline (idempotent):
//   1. clean   — rm -rf dist dist-gxt-package
//                (the CRITICAL §1.3 trap: Rollup does NOT clean dist/, so a
//                 GXT-over-classic build leaves ~53 stale classic VM files that
//                 would fork the reactive runtime. We must start clean.)
//   2. snapshot the tracked root package.json (the packageMeta() Rollup plugin
//      MUTATES it at build time; we restore it byte-identical afterwards).
//   3. EMBER_RENDER_BACKEND=gxt rollup --config  → clean dist/{dev,prod}/packages/*
//   4. capture the GXT `renamed-modules` map the build wrote into package.json.
//   5. RESTORE root package.json from the snapshot (fail-loud if not byte-identical).
//   6. build a CJS dist/ember-template-compiler.js (the §5.5 S-item) so the GXT
//      addon-main can expose absolutePaths.templateCompiler.
//   7. assemble dist-gxt-package/ (dist, lib (GXT-patched), blueprints, types,
//      bin, build-metadata.json, derived package.json).
//   8. self-verify (fail-loud seam checks), especially the no-stale-VM guard.
//
// Honesty note: the standalone dist/ember-template-compiler.js is the CLASSIC
// Glimmer wire-format compiler even in GXT mode (design §1.5) — real GXT
// template compilation is the Vite plugin's job (the open L-item). This entry
// only exists to stop ember-cli-htmlbars@7 from crashing on
// `findAddonByName('ember-source').absolutePaths.templateCompiler`.

import { spawnSync } from 'node:child_process';
import {
  rmSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  // CI runs this script on Node 22+ (stable cpSync); the engines floor is lower.
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  cpSync,
  readdirSync,
} from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { GXT_DROPPED_ENTRIES } from './gxt-alias-map.mjs';

// eslint-disable-next-line no-redeclare
const require = createRequire(import.meta.url);
// eslint-disable-next-line no-redeclare
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const distDir = join(repoRoot, 'dist');
const outDir = join(repoRoot, 'dist-gxt-package');
const rootPkgPath = join(repoRoot, 'package.json');

// The Glimmer VM packages the GXT build drops from the entry map — sourced
// from the canonical build contract (scripts/gxt-alias-map.mjs) so this leak
// check can never drift from what rollup.config.mjs actually drops. Their
// presence in the assembled dist would mean a stale classic build leaked
// through (the §1.3 hazard).
const DROPPED_VM_PACKAGES = [...GXT_DROPPED_ENTRIES];

// Symbols that only the real classic Glimmer VM re-exports. If any of these is
// an exported binding in the assembled dist, a VM copy leaked in.
const FORBIDDEN_VM_SYMBOLS = ['LowLevelVM', 'renderComponent', 'EnvironmentImpl'];

function log(msg) {
  process.stdout.write(`[build-gxt-package] ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`[build-gxt-package] FAIL: ${msg}\n`);
  process.exit(1);
}

function run(cmd, args, extraEnv = {}) {
  log(`$ ${[cmd, ...args].join(' ')}`);
  const res = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });
  if (res.status !== 0) {
    fail(`command exited with status ${res.status}: ${cmd} ${args.join(' ')}`);
  }
}

// Dev-only fast path: reuse an existing dist/ (skip the CPU-heavy rollup
// rebuild) and re-derive the GXT renamed-modules by scanning the dist exactly
// like the packageMeta() Rollup plugin does. The canonical CI path
// (GXT_PKG_REUSE_DIST unset) always does a clean rebuild + capture-from-pkg.json.
const REUSE_DIST = process.env.GXT_PKG_REUSE_DIST === '1';

// Re-derive the GXT renamed-modules from an existing dist/dev/packages tree,
// mirroring packageMeta() (rollup.config.mjs): every packages/<name>.js that is
// not a shared-chunk maps to `ember-source/<name>`.
function deriveRenamedModulesFromDist() {
  const devPackages = join(distDir, 'dev', 'packages');
  const files = walkFiles(devPackages, (f) => f.endsWith('.js') && !f.includes('shared-chunks'));
  const map = {};
  for (const f of files.sort()) {
    const name = relative(devPackages, f).split(/[\\/]/).join('/');
    map[name] = 'ember-source/' + name;
  }
  return map;
}

const rootPkgSnapshot = readFileSync(rootPkgPath); // raw Buffer (byte-exact)
let gxtRenamedModules;

if (REUSE_DIST && existsSync(join(distDir, 'dev', 'packages'))) {
  log('GXT_PKG_REUSE_DIST=1: reusing existing dist/, skipping rollup rebuild');
  rmSync(outDir, { recursive: true, force: true });
  gxtRenamedModules = deriveRenamedModulesFromDist();
  log(
    `derived GXT renamed-modules from existing dist (${Object.keys(gxtRenamedModules).length} entries)`
  );
} else {
  // ---- 1. clean ---------------------------------------------------------- //
  log('cleaning dist/ and dist-gxt-package/ (the §1.3 stale-VM trap fix)');
  rmSync(distDir, { recursive: true, force: true });
  rmSync(outDir, { recursive: true, force: true });

  // ---- 2. snapshot already taken above (rootPkgSnapshot) ----------------- //
  log('snapshotted root package.json for post-build restore');

  // ---- 3. GXT rollup build ----------------------------------------------- //
  log('running EMBER_RENDER_BACKEND=gxt rollup --config (CPU-heavy, sequential)');
  const rollupBin = require.resolve('rollup/dist/bin/rollup');
  run('node', [rollupBin, '--config'], { EMBER_RENDER_BACKEND: 'gxt' });

  if (
    !existsSync(join(distDir, 'dev', 'packages')) ||
    !existsSync(join(distDir, 'prod', 'packages'))
  ) {
    fail('GXT rollup build did not emit dist/{dev,prod}/packages');
  }

  // ---- 4. capture GXT renamed-modules ------------------------------------ //
  const mutatedPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));
  gxtRenamedModules = mutatedPkg['ember-addon']?.['renamed-modules'];
  if (!gxtRenamedModules || typeof gxtRenamedModules !== 'object') {
    fail('could not capture GXT renamed-modules from the build-mutated package.json');
  }
}
// Sanity: the GXT set must NOT contain the dropped VM packages and MUST contain
// the added @glimmer/application + @glimmer/utils.
for (const vm of DROPPED_VM_PACKAGES) {
  if (gxtRenamedModules[`${vm}/index.js`]) {
    fail(`captured renamed-modules still contains dropped VM package ${vm} — build is not GXT`);
  }
}
for (const added of ['@glimmer/application/index.js', '@glimmer/utils/index.js']) {
  if (!gxtRenamedModules[added]) {
    fail(`captured GXT renamed-modules is missing expected entry ${added}`);
  }
}
log(`captured GXT renamed-modules (${Object.keys(gxtRenamedModules).length} entries)`);

// ---- 5. restore root package.json (byte-identical, fail-loud) ------------ //
writeFileSync(rootPkgPath, rootPkgSnapshot);
const restored = readFileSync(rootPkgPath);
if (!restored.equals(rootPkgSnapshot)) {
  fail('root package.json restore is NOT byte-identical to the snapshot');
}
log('restored root package.json byte-identical to pre-build snapshot');

// ---- 6. build CJS dist/ember-template-compiler.js (the S-item) ----------- //
let templateCompilerBuilt = false;
const templateCompilerOut = join(distDir, 'ember-template-compiler.js');
try {
  const { rollup } = await import('rollup');
  const input = join(distDir, 'prod', 'packages', 'ember-template-compiler', 'index.js');
  if (!existsSync(input)) {
    throw new Error(`missing rollup input ${input}`);
  }
  // The prod ember-template-compiler entry imports only RELATIVE shared-chunks
  // (design §1.5 — it is the classic wire-format compiler, self-contained). Bare
  // specifiers would be a surprise; surface them loudly instead of externalizing.
  const sawBare = new Set();
  const bundle = await rollup({
    input,
    onwarn(warning, warn) {
      if (warning.code === 'UNRESOLVED_IMPORT' || warning.code === 'MISSING_NODE_BUILTINS') {
        sawBare.add(warning.source || warning.message);
      }
      warn(warning);
    },
    plugins: [
      {
        name: 'flag-bare-imports',
        resolveId(source) {
          if (!source.startsWith('.') && !source.startsWith('/') && !source.startsWith('\0')) {
            sawBare.add(source);
            // Keep node builtins / unexpected bares external rather than crash;
            // the self-verify step audits the final file's bare specifiers.
            return { id: source, external: true };
          }
          return null;
        },
      },
    ],
  });
  await bundle.write({
    file: templateCompilerOut,
    format: 'cjs',
    exports: 'named',
    inlineDynamicImports: true,
  });
  await bundle.close();
  if (sawBare.size > 0) {
    log(
      `note: template-compiler CJS bundle externalized bare specifiers: ${[...sawBare].join(', ')}`
    );
  }
  // Prove it require()s and exposes precompile (CJS, not ESM).
  const compiler = require(templateCompilerOut);
  if (typeof compiler.precompile !== 'function') {
    throw new Error(
      'built dist/ember-template-compiler.js does not export a precompile() function'
    );
  }
  templateCompilerBuilt = true;
  log('built + verified CJS dist/ember-template-compiler.js (exports precompile)');
} catch (err) {
  // S-item descope path (per task brief): keep the rest of the package green and
  // document the gap rather than yak-shave. The addon-main still gets an
  // absolutePaths.templateCompiler; it just points at a fail-loud stub.
  log(
    `WARNING: CJS template-compiler build failed, falling back to documented stub: ${err.message}`
  );
  writeFileSync(
    templateCompilerOut,
    [
      "'use strict';",
      '// DOCUMENTED STUB (design §5.5 S-item, descoped per the packaging brief).',
      '//',
      '// Purpose: this file exists so the GXT addon-main can expose a DEFINED,',
      '// require.resolve-able `absolutePaths.templateCompiler`, which is the exact',
      '// thing ember-cli-htmlbars@7 reads via',
      "//   findAddonByName('ember-source').absolutePaths.templateCompiler",
      '// — fixing the `TypeError: Cannot read properties of undefined',
      "// (reading 'templateCompiler')` crash from design §1.6.",
      '//',
      '// Why it is a stub and not the real classic wire-format compiler: the GXT',
      '// Rollup build chunk-merges the ESM-only `@lifeart/gxt` (reached via',
      "// `@ember/-internals/metal`'s `@lifeart/gxt/glimmer-compatibility` import)",
      "// into the template-compiler's shared-chunk graph, so a self-contained CJS",
      '// `require()` of the emitted ESM entry is impossible without a dedicated',
      '// classic (non-GXT) Rollup pass — a >2-layer yak-shave descoped per the brief.',
      '//',
      "// In GXT mode, real template compilation is the @lifeart/gxt Vite plugin's",
      '// job (the open L-item), NOT this entry. If a classic wire-format precompile',
      '// is actually invoked here, we fail loud (no silent swallowing).',
      'function notBuilt() {',
      '  throw new Error(',
      "    'ember-source-gxt: dist/ember-template-compiler.js is a stub (design §5.5 S-item). ' +",
      "    'The classic wire-format compiler was not extractable from the GXT build; ' +",
      "    'GXT template compilation is handled by the @lifeart/gxt Vite plugin (L-item).'",
      '  );',
      '}',
      'module.exports.precompile = notBuilt;',
      'module.exports._buildCompileOptions = notBuilt;',
      'module.exports._preprocess = notBuilt;',
      'module.exports._print = notBuilt;',
      '',
    ].join('\n')
  );
}

// ---- 7. assemble dist-gxt-package/ --------------------------------------- //
log('assembling dist-gxt-package/');
mkdirSync(outDir, { recursive: true });

// 7a. dist (incl. the CJS dist/ember-template-compiler.js)
cpSync(distDir, join(outDir, 'dist'), { recursive: true });

// 7b. flat copies
// docs/data.json exists only after `pnpm docs` (ember-cli-yuidoc), which CI
// never runs before this script — stub it there so the published layout
// (package.json `files` lists it) stays intact without the docs build.
const copySpecs = [
  ['blueprints', 'blueprints'],
  ['docs/data.json', 'docs/data.json', { optional: true }],
  ['types/stable', 'types/stable'],
  ['scripts/ember-cli-gxt.mjs', 'scripts/ember-cli-gxt.mjs'],
];
for (const [from, to, opts] of copySpecs) {
  const src = join(repoRoot, from);
  const dest = join(outDir, to);
  if (!existsSync(src)) {
    if (!opts?.optional) {
      fail(`expected source ${from} is missing`);
    }
    log(`WARNING: optional source ${from} is missing (docs not built) — writing a stub`);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(
      dest,
      JSON.stringify({ stub: 'docs were not built in this environment (`pnpm docs`)' }) + '\n'
    );
    continue;
  }
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
}

// 7c. build-metadata.json (generated like bin/build-for-publishing.js)
const buildInfo = require('../broccoli/build-info.cjs').buildInfo();
writeFileSync(
  join(outDir, 'build-metadata.json'),
  JSON.stringify(
    {
      version: buildInfo.version,
      buildType: buildInfo.channel,
      SHA: buildInfo.sha,
      assetPath: `/${buildInfo.channel}/shas/${buildInfo.sha}.tgz`,
    },
    null,
    2
  ) + '\n'
);

// 7d. lib/ (overrides.cjs, browsers.cjs verbatim; index.cjs GXT-patched)
// Upstream migrated lib/*.js -> lib/*.cjs (root package.json is `type: module`,
// so the CommonJS addon-main must use the .cjs extension to be loaded as CJS).
mkdirSync(join(outDir, 'lib'), { recursive: true });
cpSync(join(repoRoot, 'lib', 'overrides.cjs'), join(outDir, 'lib', 'overrides.cjs'));
cpSync(join(repoRoot, 'lib', 'browsers.cjs'), join(outDir, 'lib', 'browsers.cjs'));
writeFileSync(join(outDir, 'lib', 'index.cjs'), buildGxtAddonMain());

// 7e. derived package.json
writeFileSync(join(outDir, 'package.json'), buildGxtPackageJson() + '\n');

// ---- 8. self-verify (fail-loud seam checks) ------------------------------ //
log('running self-verify seam checks');
selfVerify();

log('DONE. Assembled consumable package at dist-gxt-package/');

// ========================================================================= //
// helpers
// ========================================================================= //

// Patch the classic lib/index.cjs into the GXT addon-main:
//   (1) implicit-modules: drop the 10 VM packages, add @glimmer/application + utils.
//   (2) add absolutePaths.templateCompiler.
// Done as deterministic line ops with fail-loud anchors (global fail-loud rule).
function buildGxtAddonMain() {
  const srcPath = join(repoRoot, 'lib', 'index.cjs');
  let lines = readFileSync(srcPath, 'utf8').split('\n');

  const dropRe = new RegExp(
    `^\\s*'\\./dist/dev/packages/(${DROPPED_VM_PACKAGES.map((p) =>
      p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    ).join('|')})/index\\.js',\\s*$`
  );
  const before = lines.length;
  lines = lines.filter((l) => !dropRe.test(l));
  const dropped = before - lines.length;
  if (dropped !== DROPPED_VM_PACKAGES.length) {
    fail(
      `addon-main patch: expected to drop ${DROPPED_VM_PACKAGES.length} VM implicit-modules lines, dropped ${dropped} — lib/index.js format changed`
    );
  }

  // Insert @glimmer/application + @glimmer/utils next to @glimmer/destroyable.
  const anchorIdx = lines.findIndex((l) =>
    l.includes("'./dist/dev/packages/@glimmer/destroyable/index.js',")
  );
  if (anchorIdx === -1) {
    fail('addon-main patch: could not find @glimmer/destroyable implicit-modules anchor');
  }
  const indent = lines[anchorIdx].match(/^\s*/)[0];
  lines.splice(
    anchorIdx,
    0,
    `${indent}'./dist/dev/packages/@glimmer/application/index.js',`,
    `${indent}'./dist/dev/packages/@glimmer/utils/index.js',`
  );

  let src = lines.join('\n');

  // Add absolutePaths.templateCompiler right after `...shim,` in module.exports.
  const exportsAnchor = 'module.exports = {\n  ...shim,';
  if (!src.includes(exportsAnchor)) {
    fail('addon-main patch: could not find `module.exports = { ...shim,` anchor');
  }
  src = src.replace(
    exportsAnchor,
    `module.exports = {
  ...shim,

  // GXT addition (design §3.1 / §5.5 S-item): expose absolutePaths so
  // ember-cli-htmlbars@7's findAddonByName('ember-source').absolutePaths
  // .templateCompiler resolves instead of TypeError-ing. NOTE: this is the
  // CLASSIC wire-format compiler even in GXT mode (design §1.5) — real GXT
  // template compilation is the Vite plugin's job (open L-item).
  absolutePaths: {
    templateCompiler: path.join(__dirname, '..', 'dist', 'ember-template-compiler.js'),
  },`
  );

  // Header comment marking this as the generated GXT addon-main.
  return (
    `// GENERATED by scripts/build-gxt-package.mjs from lib/index.cjs.\n` +
    `// This is the GXT-backend addon-main for ember-source-gxt. Do not edit by hand.\n` +
    src
  );
}

function buildGxtPackageJson() {
  const pkg = JSON.parse(rootPkgSnapshot.toString('utf8'));

  pkg.name = 'ember-source-gxt';
  pkg.description = 'Ember built on the GXT rendering backend (preview, outside SemVer).';

  // Strip repo-dev-only fields that must not ship (workspace:* refs in
  // devDependencies would break a real install; scripts/pnpm/resolutions are
  // repo-build-only).
  delete pkg.devDependencies;
  delete pkg.scripts;
  delete pkg.pnpm;
  delete pkg.resolutions;
  delete pkg._originalVersion;
  delete pkg._versionPreviouslyCalculated;

  // @lifeart/gxt MUST be an exact pin (lockstep, RFC §10) — never a range.
  if (!pkg.dependencies || !pkg.dependencies['@lifeart/gxt']) {
    fail('derived package.json is missing the @lifeart/gxt dependency');
  }
  if (/[\^~xX*]|\s-\s/.test(pkg.dependencies['@lifeart/gxt'])) {
    fail(`@lifeart/gxt must be an EXACT pin, got "${pkg.dependencies['@lifeart/gxt']}"`);
  }

  // bin target must be packed.
  if (!pkg.files.includes('scripts/ember-cli-gxt.mjs')) {
    pkg.files = [...pkg.files, 'scripts/ember-cli-gxt.mjs'].sort();
  }

  pkg['ember-addon'] = {
    after: pkg['ember-addon']?.after ?? 'ember-cli-legacy-blueprints',
    type: 'addon',
    version: 2,
    // Self-identification; harmless, read by scripts/ember-cli-gxt.mjs status.
    backend: 'gxt',
    'renamed-modules': gxtRenamedModules,
  };

  return JSON.stringify(pkg, null, 2);
}

function walkFiles(dir, predicate, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, predicate, acc);
    } else if (predicate(full)) {
      acc.push(full);
    }
  }
  return acc;
}

function selfVerify() {
  const pkgDist = join(outDir, 'dist');

  // (a) the GXT shim is present.
  const validatorDev = join(pkgDist, 'dev', 'packages', '@glimmer', 'validator', 'index.js');
  if (!existsSync(validatorDev)) {
    fail('self-verify: @glimmer/validator/index.js missing from assembled dist');
  }
  if (!readFileSync(validatorDev, 'utf8').includes('@lifeart/gxt/glimmer-compatibility')) {
    fail(
      'self-verify: @glimmer/validator is not the GXT shim (no @lifeart/gxt/glimmer-compatibility import)'
    );
  }
  log('  ok: @glimmer/validator is the GXT shim');

  // (b) NO stale VM packages leaked (the §1.3 critical guard).
  for (const mode of ['dev', 'prod']) {
    for (const vm of DROPPED_VM_PACKAGES) {
      const leaked = join(pkgDist, mode, 'packages', ...vm.split('/'), 'index.js');
      if (existsSync(leaked)) {
        fail(
          `self-verify: STALE VM package leaked into assembled dist: ${relative(outDir, leaked)}`
        );
      }
    }
  }
  log('  ok: no stale @glimmer/runtime|vm|opcode-compiler|... VM packages in dist');

  // (c) no SHIPPED, consumer-importable @glimmer/* package entry re-exports a
  // real VM symbol. This is the faithful form of the design's "no real VM
  // renderComponent/LowLevelVM re-exports" guard: the hazard is a consumer
  // reaching a forked VM/reactive symbol through a published @glimmer/* subpath.
  //
  // (We deliberately scope this to @glimmer/* PACKAGE ENTRIES, not shared-chunks
  // and not @ember/*: `renderComponent` is also a legitimate Ember public API
  // (@ember/renderer, @ember/-internals/glimmer), and the GXT build still bundles
  // classic VM code INTERNALLY inside @ember/-internals/glimmer's shared-chunk —
  // that is pre-existing GXT-build behavior / the +payload L-item, not a
  // consumer-importable forked surface. The single-sourced reactive core is
  // guaranteed by check (a) (@glimmer/validator is the GXT shim).)
  const distJsFiles = walkFiles(pkgDist, (f) => f.endsWith('.js'));
  const glimmerEntries = distJsFiles.filter(
    (f) =>
      (f.includes('/packages/@glimmer/') || f.includes('\\packages\\@glimmer\\')) &&
      !f.includes('shared-chunks')
  );
  for (const f of glimmerEntries) {
    const code = readFileSync(f, 'utf8');
    const clauses = [
      ...(code.match(/export\s*\{[^}]*\}/g) || []),
      ...(code.match(/export\s+(?:const|class|function|let|var)\s+[A-Za-z0-9_$]+/g) || []),
    ];
    for (const sym of FORBIDDEN_VM_SYMBOLS) {
      const wordRe = new RegExp(`\\b${sym}\\b`);
      if (clauses.some((c) => wordRe.test(c))) {
        fail(
          `self-verify: forbidden VM symbol "${sym}" is re-exported from shipped @glimmer entry ${relative(outDir, f)}`
        );
      }
    }
  }
  log('  ok: no shipped @glimmer/* entry re-exports LowLevelVM/renderComponent/EnvironmentImpl');

  // Extract REAL module specifiers from import/export-from/side-effect-import
  // statements only (line-anchored, comments stripped). Block comments are
  // removed first so JSDoc @example code (e.g. `import MyApp from 'my-app';`)
  // and template-literal error strings (e.g. `... from '<scope>'`) are not
  // mistaken for real imports.
  const collectBareSpecifiers = (raw) => {
    const code = raw.replace(/\/\*[\s\S]*?\*\//g, ''); // strip block comments
    const specs = [];
    const patterns = [
      /^\s*import\b[^\n;]*?\bfrom\s*['"]([^'"]+)['"]/gm, // import x from '...'
      /^\s*export\b[^\n;]*?\bfrom\s*['"]([^'"]+)['"]/gm, // export ... from '...'
      /^\s*import\s*['"]([^'"]+)['"]/gm, // bare side-effect import '...'
      /\brequire\(\s*['"]([^'"]+)['"]\s*\)/gm, // CJS require('...') (the stub)
    ];
    for (const re of patterns) {
      let m;
      while ((m = re.exec(code)) !== null) {
        const spec = m[1];
        if (!spec.startsWith('.') && !spec.startsWith('/')) {
          specs.push(spec);
        }
      }
    }
    return specs;
  };

  // (d) Every bare specifier in the dist must be resolvable for a consumer:
  // either @lifeart/gxt(/*), a node builtin, a SELF-reference into ember-source's
  // own dist (a renamed-modules key — these resolve back into this very package
  // via ember-auto-import/Embroider), or a DECLARED dependency. Anything else is
  // an undeclared/leaked external. (Design §1.2 stated "the only bare specifiers
  // are @lifeart/gxt(/glimmer-compatibility)" meaning the only true THIRD-PARTY
  // external; the @ember/*//@glimmer/* self-references resolve via renamed-modules.)
  const builtins = require('node:module').builtinModules;
  const writtenPkgEarly = JSON.parse(readFileSync(join(outDir, 'package.json'), 'utf8'));
  const declaredDeps = new Set([
    ...Object.keys(writtenPkgEarly.dependencies || {}),
    ...Object.keys(writtenPkgEarly.peerDependencies || {}),
    '@embroider/macros', // emitted external by the rollup build
    // rsvp's optional, try/catch-guarded Node Vert.x integration — never
    // actually resolved in a browser build; present in classic ember-source too.
    'vertx',
  ]);
  // Self-reference forms derived from renamed-modules keys.
  const selfRefs = new Set();
  for (const key of Object.keys(gxtRenamedModules)) {
    selfRefs.add(key); // e.g. @ember/array/proxy.js
    selfRefs.add(key.replace(/\.js$/, '')); // @ember/array/proxy
    selfRefs.add(key.replace(/\/index\.js$/, '')); // @ember/component
  }
  const pkgNameOf = (spec) => {
    const parts = spec.split('/');
    return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  };
  const allowedBare = (spec) =>
    spec === '@lifeart/gxt' ||
    spec.startsWith('@lifeart/gxt/') ||
    builtins.includes(spec.replace(/^node:/, '')) ||
    selfRefs.has(spec) ||
    declaredDeps.has(pkgNameOf(spec));

  const offenders = new Set();
  const usedGxtSubpaths = new Set();
  const droppedVmImports = new Set();
  for (const f of distJsFiles) {
    for (const spec of collectBareSpecifiers(readFileSync(f, 'utf8'))) {
      if (!allowedBare(spec)) {
        offenders.add(`${spec}  (in ${relative(outDir, f)})`);
      }
      if (spec === '@lifeart/gxt' || spec.startsWith('@lifeart/gxt/')) {
        usedGxtSubpaths.add(spec.replace('@lifeart/gxt', '.'));
      }
      // The §1.3 critical guard, second half: nothing may still IMPORT a dropped
      // VM package (its renamed-modules key is gone → would be unresolvable, or
      // resolve to a forked classic copy).
      if (DROPPED_VM_PACKAGES.some((vm) => spec === vm || spec.startsWith(`${vm}/`))) {
        droppedVmImports.add(`${spec}  (in ${relative(outDir, f)})`);
      }
    }
  }
  if (droppedVmImports.size > 0) {
    fail(
      `self-verify: dist still IMPORTS dropped VM packages:\n  ${[...droppedVmImports].join('\n  ')}`
    );
  }
  if (offenders.size > 0) {
    fail(
      `self-verify: unexpected/undeclared bare specifiers in dist:\n  ${[...offenders].join('\n  ')}`
    );
  }
  log('  ok: every bare specifier is @lifeart/gxt(/*), a builtin, a self-ref, or a declared dep');
  log('  ok: no dist file imports any dropped @glimmer VM package');

  // The §1.3 guard, third half: nothing may still INLINE the Glimmer VM
  // opcode core (an import-free chunk inclusion would pass the import scan
  // above). GXT_DIST_VM_STUBS severs the known pull chains (the classic
  // render fallback, the SSR builders, the bare-index UpdatingVM patch, and
  // vm/arguments' relative -debug-strip edge); this marker scan fails loud
  // if a new edge regresses any of them. `APPEND_OPCODES` is the VM's
  // append-opcode registration table — present iff the opcode core bundled.
  {
    const vmMarkers = ['APPEND_OPCODES', 'new AppendOpcodes()'];
    const markerOffenders = new Set();
    for (const dist of ['dist/dev/packages', 'dist/prod/packages']) {
      const distDir = join(outDir, dist);
      if (!existsSync(distDir)) continue;
      for (const f of walkFiles(distDir, (file) => file.endsWith('.js'))) {
        const code = readFileSync(f, 'utf8');
        for (const marker of vmMarkers) {
          if (code.includes(marker)) {
            markerOffenders.add(`${marker}  (in ${relative(outDir, f)})`);
          }
        }
      }
    }
    if (markerOffenders.size > 0) {
      fail(
        `self-verify: Glimmer VM opcode core leaked into the GXT dist:\n  ${[...markerOffenders].join('\n  ')}`
      );
    }
    log('  ok: no Glimmer VM opcode core in the dist (APPEND_OPCODES marker scan)');
  }

  // (e) @lifeart/gxt actually exports the subpaths the dist imports. (Read the
  // package.json by path — @lifeart/gxt's exports map does not expose
  // ./package.json, so require.resolve would ERR_PACKAGE_PATH_NOT_EXPORTED.)
  const gxtPkgJsonPath = join(repoRoot, 'node_modules', '@lifeart', 'gxt', 'package.json');
  if (!existsSync(gxtPkgJsonPath)) {
    fail(`self-verify: cannot find pinned @lifeart/gxt at ${relative(repoRoot, gxtPkgJsonPath)}`);
  }
  const gxtExports = JSON.parse(readFileSync(gxtPkgJsonPath, 'utf8')).exports || {};
  for (const sub of usedGxtSubpaths) {
    const key = sub === '' ? '.' : sub;
    if (!(key in gxtExports)) {
      fail(
        `self-verify: dist imports @lifeart/gxt subpath "${key}" which is not an export of the pinned @lifeart/gxt`
      );
    }
  }
  log(`  ok: all used @lifeart/gxt subpaths are real exports (${[...usedGxtSubpaths].join(', ')})`);

  // (f) addon-main loads and exposes a resolvable absolutePaths.templateCompiler.
  const addonMain = require(join(outDir, 'lib', 'index.cjs'));
  if (!addonMain.absolutePaths || !addonMain.absolutePaths.templateCompiler) {
    fail('self-verify: addon-main does not expose absolutePaths.templateCompiler');
  }
  const tc = require.resolve(addonMain.absolutePaths.templateCompiler);
  if (!existsSync(tc)) {
    fail('self-verify: absolutePaths.templateCompiler does not resolve to an existing file');
  }
  log(`  ok: addon-main exposes absolutePaths.templateCompiler (${relative(outDir, tc)})`);

  // (g) the renamed-modules in the written package.json is the GXT set.
  const writtenPkg = JSON.parse(readFileSync(join(outDir, 'package.json'), 'utf8'));
  if (writtenPkg.name !== 'ember-source-gxt') {
    fail('self-verify: assembled package.json name is not ember-source-gxt');
  }
  for (const vm of DROPPED_VM_PACKAGES) {
    if (writtenPkg['ember-addon']['renamed-modules'][`${vm}/index.js`]) {
      fail(`self-verify: assembled package.json renamed-modules still has dropped VM ${vm}`);
    }
  }
  if (writtenPkg.devDependencies) {
    fail('self-verify: assembled package.json must not ship devDependencies (workspace:* refs)');
  }
  log('  ok: assembled package.json is the GXT set (name, renamed-modules, no devDeps)');

  if (!templateCompilerBuilt) {
    log('  NOTE: dist/ember-template-compiler.js is a STUB (S-item descoped this run).');
  }
}
