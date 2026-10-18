#!/usr/bin/env node
// scripts/assert-native-dist.mjs — checks the ROLLUP gxt-native dist: a VM-free
// app closure, contained template compilers, one reactive system.
//
//   rm -rf dist && EMBER_RENDER_BACKEND=gxt-native npx rollup --config
//   node scripts/assert-native-dist.mjs [--dist dist] [--modes prod,dev] [--json out.json]
//   (--dist: a dist root holding <mode>/packages, e.g. a snapshot the modern-app
//   harness consumes; default ./dist)
//
// The native dist (rollup.config.mjs, EMBER_RENDER_BACKEND=gxt-native) is a
// per-module ESM tree like the classic one: an app pays only for the chunks its
// imports reach. This script walks the import graph of the SHIPPED files from
// the public entries a modern app imports (APP_ENTRIES, plus the
// @glimmer/component package dist, whose bare `@ember/*` imports resolve into
// the ember dist) and asserts:
//
//   1. VM-FREE: no chunk in that closure contains a module from
//      GXT_NATIVE_FORBIDDEN (scripts/gxt-alias-map.mjs — the same list the vite
//      harness `--assert-native` uses: Glimmer VM packages, the validator
//      tag-revision protocol, the gxt compat bridge and its Glimmer host
//      (glimmer-host / root-template / render-component / classic-roots /
//      template-adapter), the classic VM renderer, template compilers), and
//      the closure imports no compiler entry of gxt
//      (`@lifeart/gxt/runtime-compiler`, `@lifeart/gxt/compiler`).
//      One documented exception: `gxt-backend/gxt-bridge.ts` may appear as the
//      dead `function getGxtRenderer() { return null }` stub rollup keeps for
//      the `__GXT_MODE__`-folded call sites (the identical classic-dist residue
//      that bundle-size-check.mjs tolerates) — allowed only while that
//      identifier is declared and never referenced in the closure's code and no
//      other bridge accessor survives; a consumer's minifier drops it.
//   2. COMPILER CONTAINMENT: across EVERY dist entry, the template compilers
//      (@glimmer/syntax / @glimmer/compiler / @handlebars / simple-html-tokenizer
//      and gxt's runtime compiler) are reachable only from COMPILER_ENTRIES.
//   3. SINGLE REACTIVE SYSTEM (grep level over the closure's code with
//      comments stripped): no classic `$REVISION` tag-revision counter, no
//      `setInterval` render pump, no compat tag<->cell bridge / bridge
//      publishers / `__gxt*` globalThis wiring; the native validator is in the
//      closure and its `CURRENT_TAG` reads gxt `currentRevision`.
//
// Module provenance comes from `gxt-native-manifest.json`, emitted by the
// native build next to each dist mode; the script first proves the manifest
// describes the files on disk (same chunk set, same static imports, parsed with
// babel from the shipped code).
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GXT_NATIVE_FORBIDDEN } from './gxt-alias-map.mjs';

const babel = createRequire(import.meta.url)('@babel/core');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const DIST = resolve(opt('--dist', join(ROOT, 'dist')));
const modes = opt('--modes', 'prod,dev').split(',');
const jsonOut = opt('--json', null);

// The public modules a modern (strict or loose) Ember app imports (components,
// helpers, modifiers, reactivity, routing / app infra, the renderComponent API)
// plus the framework base classes routes / services / controllers still extend.
const APP_ENTRIES = [
  '@ember/application',
  '@ember/application/instance',
  '@ember/application/namespace',
  '@ember/array',
  '@ember/component',
  '@ember/component/helper',
  '@ember/component/template-only',
  '@ember/controller',
  '@ember/debug',
  '@ember/destroyable',
  '@ember/engine',
  '@ember/engine/instance',
  '@ember/helper',
  '@ember/instrumentation',
  '@ember/modifier',
  '@ember/object',
  '@ember/object/compat',
  '@ember/object/computed',
  '@ember/object/core',
  '@ember/object/evented',
  '@ember/object/internals',
  '@ember/owner',
  '@ember/reactive',
  '@ember/reactive/collections',
  '@ember/renderer',
  '@ember/routing',
  '@ember/routing/hash-location',
  '@ember/routing/history-location',
  '@ember/routing/none-location',
  '@ember/routing/route',
  '@ember/routing/router',
  '@ember/routing/router-service',
  '@ember/runloop',
  '@ember/service',
  '@ember/template',
  // Build-time-compiled loose templates keep a
  // `precompileTemplate(maker, options)` call that imports this entry.
  '@ember/template-compilation',
  '@ember/utils',
  '@ember/version',
  '@glimmer/env',
  '@glimmer/owner',
  '@glimmer/tracking',
  '@glimmer/tracking/primitives/cache',
];

// Entries allowed to reach a template compiler: the build-time Glimmer
// compiler (kept for tooling), the explicit runtime compiler
// (`@ember/template-compiler[/runtime]` → native/runtime-compile.ts, the gxt
// runtime compiler under NATIVE_FLAGS) and its classic plugin modules.
const COMPILER_ENTRIES = [/^ember-template-compiler(\/|$)/, /^@ember\/template-compiler(\/|$)/];
const COMPILER_REASONS = new Set(['template compiler', 'gxt runtime compiler / rehydration']);
const FORBIDDEN_EXTERNALS = new Set(['@lifeart/gxt/runtime-compiler', '@lifeart/gxt/compiler']);
const GXT_BRIDGE = /gxt-backend\/gxt-bridge\.ts$/;

// Single-reactive-system grep markers over the app closure's shipped code
// (comments stripped).
const ABSENT_MARKERS = [
  [/\$REVISION\b/, 'classic Glimmer tag-revision counter ($REVISION)'],
  [/\bsetInterval\s*\(/, 'setInterval render pump'],
  [/\b(touchClassicBridge|registerClassicReactor)\b/, 'compat tag<->cell bridge'],
  [/getGxtRenderer\(\)\s*\??\./, 'live gxt-bridge read'],
  [
    /\b(installCompilePipelinePart|installRootComponentPart|installViewUtilsPart|installRuntimePart|installRenderPassPart|installBacktrackingPart|setGxtRenderer|setControllerOutletRerender)\s*\(/,
    'gxt-bridge publisher',
  ],
  [/__gxt[A-Z]\w*/, 'compat globalThis.__gxt* wiring'],
];
// Known inert residue, reported but not counted as a marker hit: the DEBUG-only
// `globalThis.__gxtOpCheck` loop-guard hook in shared
// @ember/-internals/metal/lib/property_events.ts (DEBUG-gated, not
// `__GXT_MODE__`-gated, so the classic dev dist carries it too). Only the compat
// test harness defines the global; in native it is an always-false `typeof`
// check. Absent from the prod dist (DEBUG strips it).
const KNOWN_INERT = [
  [/\b__gxtOpCheck\b/g, 'DEBUG-only globalThis.__gxtOpCheck hook (shared metal)'],
];

function listJs(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJs(full, base));
    else if (entry.name.endsWith('.js')) out.push(relative(base, full).split('\\').join('/'));
  }
  return out.sort();
}

// Parse one shipped file: its static / dynamic import specifiers (from the AST,
// so doc-comment examples never count) and its code re-printed WITHOUT comments.
// Rollup's residue of `__GXT_MODE__`-folded guards — `if (false && …) ;`, a dead
// statement a minifier deletes — is removed from the grep text too.
function analyze(code, filename) {
  const result = babel.transformSync(code, {
    filename,
    configFile: false,
    babelrc: false,
    sourceType: 'module',
    comments: false,
    ast: true,
    code: true,
  });
  const statics = new Set();
  const dynamics = new Set();
  for (const node of result.ast.program.body) {
    if (
      (node.type === 'ImportDeclaration' ||
        node.type === 'ExportNamedDeclaration' ||
        node.type === 'ExportAllDeclaration') &&
      node.source
    ) {
      statics.add(node.source.value);
    }
  }
  babel.traverse(result.ast, {
    CallExpression(path) {
      const arg = path.node.arguments[0];
      if (path.node.callee.type === 'Import' && arg?.type === 'StringLiteral') {
        dynamics.add(arg.value);
      }
    },
    ImportExpression(path) {
      if (path.node.source.type === 'StringLiteral') dynamics.add(path.node.source.value);
    },
  });
  const text = result.code.replace(/if \(false && [^;{}]*\);?/g, '');
  return { statics: [...statics], dynamics: [...dynamics], text };
}

const classify = (id) => GXT_NATIVE_FORBIDDEN.find(([re]) => re.test(id))?.[1] ?? null;

function checkMode(mode) {
  const outDir = join(DIST, mode);
  const manifestPath = join(outDir, 'gxt-native-manifest.json');
  const errors = [];
  if (!existsSync(manifestPath)) {
    return {
      mode,
      errors: [
        `${relative(ROOT, manifestPath)} is missing — not a gxt-native dist (run: rm -rf dist && EMBER_RENDER_BACKEND=gxt-native npx rollup --config)`,
      ],
    };
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  // ---- 0. the manifest describes the shipped files
  const onDisk = listJs(outDir);
  const inManifest = Object.keys(manifest.chunks).sort();
  const missing = inManifest.filter((f) => !onDisk.includes(f));
  const unlisted = onDisk.filter((f) => !manifest.chunks[f]);
  if (missing.length) errors.push(`manifest chunks missing on disk: ${missing.join(', ')}`);
  if (unlisted.length) errors.push(`dist files not in the manifest: ${unlisted.join(', ')}`);
  const files = new Map(); // file -> {statics, dynamics, text, raw}
  let importMismatches = 0;
  for (const file of onDisk) {
    const raw = readFileSync(join(outDir, file), 'utf8');
    const a = analyze(raw, file);
    const resolveSpec = (spec) =>
      spec.startsWith('.') ? posix.normalize(posix.join(posix.dirname(file), spec)) : spec;
    const statics = a.statics.map(resolveSpec);
    files.set(file, { statics, dynamics: a.dynamics.map(resolveSpec), text: a.text, raw });
    const expected = new Set(manifest.chunks[file]?.imports ?? []);
    const parsed = new Set(statics);
    const diff = [...expected]
      .filter((x) => !parsed.has(x))
      .concat([...parsed].filter((x) => !expected.has(x)));
    if (diff.length) {
      importMismatches++;
      errors.push(`${file}: parsed static imports differ from the manifest (${diff.join(', ')})`);
    }
  }

  const closure = (roots) => {
    const reached = new Set();
    const externals = new Set();
    const dynamicEdges = [];
    const queue = [...roots];
    while (queue.length) {
      const f = queue.shift();
      if (reached.has(f)) continue;
      const node = files.get(f);
      if (!node) {
        errors.push(`import of ${f}: no such dist file`);
        continue;
      }
      reached.add(f);
      for (const dep of node.statics) {
        if (files.has(dep) || dep.startsWith('packages/')) queue.push(dep);
        else externals.add(dep);
      }
      for (const dep of node.dynamics) {
        dynamicEdges.push(`${f} -> ${dep}`);
        if (files.has(dep)) queue.push(dep);
        else externals.add(dep);
      }
    }
    return { files: reached, externals, dynamicEdges };
  };
  const entryFile = (specifier) => {
    for (const candidate of [`packages/${specifier}/index.js`, `packages/${specifier}.js`]) {
      if (files.has(candidate)) return candidate;
    }
    return null;
  };
  // Forbidden modules inside a closure, with the gxt-bridge dead-residue rule.
  const forbiddenIn = (c) => {
    const text = [...c.files].map((f) => files.get(f).text).join('\n');
    const violations = [];
    const deadResidue = [];
    const graphOnly = [];
    let modules = 0;
    for (const f of c.files) {
      for (const [id, len] of Object.entries(manifest.chunks[f]?.modules ?? {})) {
        modules++;
        const reason = classify(id);
        if (!reason) continue;
        const m = { chunk: f, id, len, reason };
        if (len === 0) {
          graphOnly.push(m);
          continue;
        }
        if (GXT_BRIDGE.test(id)) {
          const uses = text.match(/\bgetGxtRenderer\b/g)?.length ?? 0;
          const decls = text.match(/\bfunction getGxtRenderer\(\)/g)?.length ?? 0;
          const otherAccessors =
            /\b(setGxtRenderer|getAmbientOwner|setAmbientOwner|setCurrentOutletState|install[A-Z]\w*Part)\b/.test(
              text
            );
          if (decls > 0 && uses === decls && !otherAccessors) {
            deadResidue.push({
              ...m,
              note: `${decls} dead getGxtRenderer() stub(s), 0 references`,
            });
            continue;
          }
        }
        violations.push(m);
      }
    }
    for (const e of c.externals) {
      if (FORBIDDEN_EXTERNALS.has(e)) {
        violations.push({
          chunk: '(external import)',
          id: e,
          len: 0,
          reason: 'gxt compiler entry',
        });
      }
    }
    return { text, modules, violations, deadResidue, graphOnly };
  };

  // ---- 1. the app closure
  const roots = [];
  const absentEntries = [];
  for (const specifier of APP_ENTRIES) {
    const f = entryFile(specifier);
    if (f) roots.push(f);
    else absentEntries.push(specifier);
  }
  if (absentEntries.length) errors.push(`app entries missing from the dist: ${absentEntries}`);
  // @glimmer/component publishes its own package dist; its bare imports
  // resolve into the ember dist like an app's.
  // It builds a dev and a prod dist (packages/@glimmer/component/dist/<mode>/).
  const glimmerComponentDist = [
    join(DIST, 'glimmer-component', mode, 'index.js'), // a harness snapshot
    join(ROOT, 'packages/@glimmer/component/dist', mode, 'index.js'), // the rollup build output
  ].find((p) => existsSync(p));
  if (glimmerComponentDist) {
    const gc = analyze(readFileSync(glimmerComponentDist, 'utf8'), glimmerComponentDist);
    for (const spec of gc.statics) {
      if (spec.startsWith('.')) continue;
      const f = entryFile(spec);
      if (f) roots.push(f);
      else errors.push(`@glimmer/component imports ${spec}, which the dist does not publish`);
    }
  } else {
    errors.push(`packages/@glimmer/component/dist/${mode}/index.js missing`);
  }
  const app = closure(roots);
  const appForbidden = forbiddenIn(app);
  if (appForbidden.violations.length) {
    errors.push(`${appForbidden.violations.length} forbidden module(s) in the app closure`);
  }

  // ---- 2. compiler containment (and VM reach, informational) across EVERY entry
  const entries = Object.entries(manifest.chunks)
    .filter(([, c]) => c.isEntry)
    .map(([f]) => f);
  const compilerReach = [];
  const vmReach = [];
  for (const f of entries) {
    const specifier = f.replace(/^packages\//, '').replace(/(\/index)?\.js$/, '');
    const reasons = new Set(forbiddenIn(closure([f])).violations.map((v) => v.reason));
    if ([...reasons].some((r) => COMPILER_REASONS.has(r) || r === 'gxt compiler entry')) {
      compilerReach.push(specifier);
    }
    const vm = [...reasons].filter((r) => !COMPILER_REASONS.has(r) && r !== 'gxt compiler entry');
    if (vm.length) vmReach.push({ specifier, reasons: vm });
  }
  const uncontained = compilerReach.filter((s) => !COMPILER_ENTRIES.some((re) => re.test(s)));
  if (uncontained.length) {
    errors.push(`template compiler reachable from non-compiler entries: ${uncontained.join(', ')}`);
  }

  // ---- 3. single-reactive-system markers
  let markerText = appForbidden.text;
  const inert = [];
  for (const [re, why] of KNOWN_INERT) {
    const n = markerText.match(re)?.length ?? 0;
    if (n) inert.push(`${why}: ${n} occurrence(s)`);
    markerText = markerText.replace(re, '');
  }
  const markerHits = ABSENT_MARKERS.filter(([re]) => re.test(markerText)).map(([, why]) => why);
  const nativeValidator = [...app.files].some((f) =>
    Object.keys(manifest.chunks[f]?.modules ?? {}).some((id) =>
      /gxt-backend\/native\/validator\.ts$/.test(id)
    )
  );
  const currentRevisionImported =
    /import\s*\{[^}]*\bcurrentRevision\b[^}]*\}\s*from\s*["']@lifeart\/gxt["']/.test(
      appForbidden.text
    );
  if (markerHits.length)
    errors.push(`single-reactive-system markers present in the app closure: ${markerHits}`);
  if (!nativeValidator) errors.push('native/validator.ts is not in the app closure');
  if (!currentRevisionImported) errors.push('the app closure does not import gxt currentRevision');

  const bytes = [...app.files].reduce((n, f) => n + Buffer.byteLength(files.get(f).raw), 0);
  return {
    mode,
    errors,
    chunks: onDisk.length,
    entries: entries.length,
    importMismatches,
    app: {
      roots: roots.length,
      files: app.files.size,
      bytes,
      modules: appForbidden.modules,
      externals: [...app.externals].sort(),
      dynamicEdges: app.dynamicEdges,
      fileList: [...app.files].sort(),
    },
    violations: appForbidden.violations,
    deadResidue: appForbidden.deadResidue,
    graphOnly: appForbidden.graphOnly,
    compilerReach: compilerReach.sort(),
    vmReach,
    markers: { absent: ABSENT_MARKERS.map(([, why]) => why), hits: markerHits, inert },
    nativeValidator,
    currentRevisionImported,
  };
}

const fmt = (n) => n.toLocaleString('en-US');
const results = modes.map(checkMode);
let failed = false;
for (const r of results) {
  console.log(`\n### assert-native-dist: ${relative(ROOT, join(DIST, r.mode))}`);
  if (r.chunks === undefined) {
    console.log(`  ERROR ${r.errors[0]}`);
    failed = true;
    continue;
  }
  console.log(
    `  dist: ${r.chunks} js files, ${r.entries} entries; manifest vs parsed-import mismatches: ${r.importMismatches}`
  );
  console.log(
    `  app closure: ${r.app.roots} roots -> ${r.app.files} files, ${fmt(r.app.bytes)} B unminified, ${r.app.modules} source modules`
  );
  console.log(`  app closure externals: ${r.app.externals.join(', ') || '(none)'}`);
  console.log(`  app closure dynamic imports: ${r.app.dynamicEdges.length}`);
  console.log(`  FORBIDDEN modules in the app closure (violations): ${r.violations.length}`);
  for (const v of r.violations) console.log(`    - ${v.id} [${v.reason}] ${v.len} B in ${v.chunk}`);
  console.log(`  dead residue allowed (minifier-dropped): ${r.deadResidue.length}`);
  for (const v of r.deadResidue) console.log(`    - ${v.id} ${v.len} B in ${v.chunk}: ${v.note}`);
  console.log(`  forbidden modules rendered to 0 B (graph only): ${r.graphOnly.length}`);
  console.log(
    `  entries reaching a template compiler (${r.compilerReach.length}; allowed: ember-template-compiler, @ember/template-compiler*): ${r.compilerReach.join(', ')}`
  );
  console.log(
    `  entries reaching Glimmer VM / compat / classic-renderer modules (non-app, informational): ${r.vmReach.length}`
  );
  for (const v of r.vmReach) console.log(`    - ${v.specifier} [${v.reasons.join('; ')}]`);
  console.log(
    `  single-reactive-system markers absent from the app closure: ${r.markers.absent.length - r.markers.hits.length}/${r.markers.absent.length}` +
      (r.markers.hits.length ? ` — PRESENT: ${r.markers.hits.join('; ')}` : '')
  );
  for (const i of r.markers.inert) console.log(`    known inert residue (allowed): ${i}`);
  console.log(
    `  native validator in the app closure: ${r.nativeValidator}; gxt currentRevision imported (CURRENT_TAG): ${r.currentRevisionImported}`
  );
  for (const e of r.errors) console.log(`  ERROR ${e}`);
  if (r.errors.length) failed = true;
  console.log(
    r.errors.length
      ? `[assert-native-dist] FAIL ${relative(ROOT, join(DIST, r.mode))}`
      : `[assert-native-dist] OK ${relative(ROOT, join(DIST, r.mode))}: VM-free app closure, compilers contained, single-reactive-system markers clean`
  );
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(results, null, 1));
process.exit(failed ? 1 : 0);
