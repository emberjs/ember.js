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

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

// Symbols that Ember's gxt-backend pulls in from each published subpath.
// Keep this list in sync with `packages/@ember/-internals/gxt-backend/`.
const required = {
  '@lifeart/gxt': [
    // rendering / context
    'createRoot',
    'setParentContext',
    'getParentContext',
    'Component',
    // reactivity
    'cell',
    'formula',
    'cellFor',
    'effect',
    // destruction
    'runDestructors',
    // tracker plumbing (exposed for {{unbound}} support)
    'setTracker',
    'getTracker',
    // template entry
    'hbs',
  ],
  '@lifeart/gxt/glimmer-compatibility': [
    'validator',
    'caching',
    'storage',
    'reference',
    'destroyable',
  ],
  '@lifeart/gxt/compiler': ['compiler'],
};

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
  const rel = typeof entry === 'string' ? entry : entry.import ?? entry.default;
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
  const reDirect = /export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while ((m = reDirect.exec(source)) !== null) {
    exports.add(m[1]);
  }

  return exports;
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

const ms = Date.now() - start;
console.log(`\nContract check finished in ${ms}ms`);

if (failed) {
  console.error('\nOne or more upstream contract checks failed.');
  console.error('Either @lifeart/gxt has drifted or Ember started relying on a new symbol.');
  process.exit(1);
}
console.log('All contract symbols present.');
