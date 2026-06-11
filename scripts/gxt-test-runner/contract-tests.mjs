#!/usr/bin/env node
// scripts/gxt-test-runner/contract-tests.mjs
//
// Fast upstream-seam check. Verifies that every symbol Ember's
// `packages/@ember/-internals/gxt-backend/` imports from the
// published `@lifeart/gxt` package still exists in the currently
// installed version. Designed to run in well under a minute so CI
// can fail fast when the upstream surface drifts.
//
// We cannot actually `import()` the GXT bundles in Node because
// they reference browser globals (`location` etc.), so we do a
// static check: resolve each subpath via `exports`, read the file,
// and scan the final `export { ... }` list for each required symbol.
//
// The required symbol lists are AUTO-DERIVED by scanning the static
// named-import statements in `packages/@ember/-internals/gxt-backend/`
// (.ts/.gts, excluding __tests__). A hand-maintained list drifted stale
// once (it required 6 root symbols while compile.ts statically imported
// ~26), so the source of truth is now the import statements themselves:
// adding a new `import { x } from '@lifeart/gxt'` automatically gates
// `x` here. Namespace imports (`import * as gxt`) are runtime-looked-up
// by construction and inline `type` specifiers are erased at compile
// time, so neither requires a runtime export.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

const GXT_BACKEND_DIR = resolve(repoRoot, 'packages/@ember/-internals/gxt-backend');

function gxtBackendSourceFiles() {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(ts|gts)$/.test(entry.name)) {
        out.push(full);
      }
    }
  };
  walk(GXT_BACKEND_DIR);
  return out;
}

/**
 * Scan every gxt-backend source file for `import { ... } from '@lifeart/gxt[/subpath]'`
 * statements AND `export { ... } from '@lifeart/gxt'` re-exports (the alias
 * entry module gxt-with-runtime-hbs.ts re-exports ~70 upstream symbols, which
 * are just as much a static dependency on the published surface). Blocks are
 * multi-line with comments interspersed. Collects the ORIGINAL upstream names
 * per subpath: `orig as alias` contributes `orig`; `type X` specifiers are
 * skipped.
 */
function deriveRequiredImports() {
  const bySubpath = new Map();
  // `import type { ... }` statements deliberately do not match (the `type`
  // keyword between `import` and `{` breaks the pattern) — they are erased.
  // The body is restricted to brace-free text so the lazy match cannot span
  // from an earlier `import {` of a DIFFERENT module across `} from '...'`
  // boundaries into a later @lifeart/gxt import. Comments are stripped first
  // (also brace-proofing: compile.ts's import block mentions `{{unbound}}`
  // in a comment, and fully commented-out imports vanish with their line).
  const importRe =
    /(?:import|export)\s*\{([^{}]*?)\}\s*from\s*['"](@lifeart\/gxt(?:\/[\w-]+)*)['"]/g;
  const files = gxtBackendSourceFiles();
  for (const file of files) {
    const source = readFileSync(file, 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    let m;
    while ((m = importRe.exec(source)) !== null) {
      for (const piece of m[1].split(',')) {
        const spec = piece.trim();
        if (!spec || spec.startsWith('type ')) continue;
        const orig = spec.split(/\s+as\s+/)[0].trim();
        if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(orig)) continue;
        if (!bySubpath.has(m[2])) bySubpath.set(m[2], new Set());
        bySubpath.get(m[2]).add(orig);
      }
    }
  }
  return { bySubpath, fileCount: files.length };
}

// Symbols required by consumers OUTSIDE gxt-backend that the scan cannot see.
const MANUAL_REQUIRED = {
  // vite.config.mjs and packages/demo/vite.config.mts import the build-time compiler.
  '@lifeart/gxt/compiler': ['compiler'],
};

const { bySubpath: derived, fileCount } = deriveRequiredImports();
const required = {};
for (const subpath of [...derived.keys()].sort()) {
  required[subpath] = [...derived.get(subpath)].sort();
}
for (const [subpath, symbols] of Object.entries(MANUAL_REQUIRED)) {
  required[subpath] = [...new Set([...(required[subpath] ?? []), ...symbols])].sort();
}

if (!required['@lifeart/gxt'] || required['@lifeart/gxt'].length < 6) {
  // The scan found fewer root-import symbols than the old hand-written floor —
  // the scanner itself is broken (moved dir, changed import style). Fail loud
  // rather than green-light a no-op check.
  console.error(
    `FAIL: import scan looks broken — only ${required['@lifeart/gxt']?.length ?? 0} ` +
      `root symbols derived from ${fileCount} files under ${GXT_BACKEND_DIR}`
  );
  process.exit(1);
}

function resolveSubpath(subpath) {
  const pkgRoot = resolve(repoRoot, 'node_modules/@lifeart/gxt');
  const pkgJsonPath = resolve(pkgRoot, 'package.json');
  if (!existsSync(pkgJsonPath)) {
    throw new Error(`@lifeart/gxt not installed at ${pkgRoot}`);
  }
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
  const key = subpath === '@lifeart/gxt' ? '.' : './' + subpath.slice('@lifeart/gxt/'.length);
  const entry = pkg.exports?.[key];
  if (!entry) {
    throw new Error(`package.json exports has no entry for ${key}`);
  }
  const rel = typeof entry === 'string' ? entry : (entry.import ?? entry.default);
  if (!rel) {
    throw new Error(`exports[${key}] has no import/default branch`);
  }
  return resolve(pkgRoot, rel);
}

/**
 * Scan the bundle text for bindings exposed via `export { a, b as c }` and
 * `export { ... } from '...'` declarations. We only care that each required
 * *public name* appears as an export binding — the internal source does not
 * need to be walked.
 */
function collectExports(source) {
  const exports = new Set();

  // export { a, b as c, d as default }
  const reExportBlock = /export\s*\{([^}]*)\}/g;
  let m;
  while ((m = reExportBlock.exec(source)) !== null) {
    const inside = m[1];
    for (const piece of inside.split(',')) {
      const trimmed = piece.trim();
      if (!trimmed) continue;
      // `x as y` -> public name is `y`; bare `x` -> public name is `x`
      const asMatch = trimmed.match(/\bas\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*$/);
      const name = asMatch ? asMatch[1] : trimmed.match(/^([A-Za-z_$][A-Za-z0-9_$]*)/)?.[1];
      if (name) exports.add(name);
    }
  }

  // export function foo / export class Foo / export const foo / export let foo / export var foo
  const reDirect =
    /export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while ((m = reDirect.exec(source)) !== null) {
    exports.add(m[1]);
  }

  return exports;
}

if (process.env.GXT_CONTRACT_DEBUG) {
  console.log(JSON.stringify(required, null, 2));
}

let failed = false;
const start = Date.now();

for (const [pkgSubpath, symbols] of Object.entries(required)) {
  let file;
  try {
    file = resolveSubpath(pkgSubpath);
  } catch (err) {
    console.error(`FAIL: ${pkgSubpath} — ${err.message}`);
    failed = true;
    continue;
  }

  if (!existsSync(file)) {
    console.error(`FAIL: ${pkgSubpath} resolved to missing file ${file}`);
    failed = true;
    continue;
  }

  const source = readFileSync(file, 'utf-8');
  const exported = collectExports(source);

  const missing = symbols.filter((s) => !exported.has(s));
  if (missing.length > 0) {
    console.error(`FAIL: ${pkgSubpath} missing exports: ${missing.join(', ')}`);
    console.error(`      (resolved to ${file})`);
    failed = true;
  } else {
    console.log(`OK  : ${pkgSubpath} (${symbols.length} symbols)`);
  }
}

console.log(`\n(required lists derived from ${fileCount} gxt-backend source files)`);

const ms = Date.now() - start;
console.log(`\nContract check finished in ${ms}ms`);

if (failed) {
  console.error('\nOne or more upstream contract checks failed.');
  console.error('Either @lifeart/gxt has drifted or Ember started relying on a new symbol.');
  process.exit(1);
}
console.log('All contract symbols present.');
