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
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { parseAst } = require('rollup/parseAst');

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
 * Parse every gxt-backend source file (TypeScript AST) and collect, per
 * `@lifeart/gxt[/subpath]`, the ORIGINAL upstream names of its named imports
 * and named re-exports (a re-export is just as much a static dependency on the
 * published surface): `orig as alias` contributes `orig`. `import type` /
 * `export type` declarations and inline `type X` specifiers are erased at
 * compile time and skipped; namespace and default imports name no export.
 */
function deriveRequiredImports() {
  const bySubpath = new Map();
  const GXT_SPECIFIER = /^@lifeart\/gxt(?:\/[\w-]+)*$/;
  const files = gxtBackendSourceFiles();
  for (const file of files) {
    const sf = ts.createSourceFile(file, readFileSync(file, 'utf-8'), ts.ScriptTarget.Latest);
    for (const stmt of sf.statements) {
      let elements;
      if (ts.isImportDeclaration(stmt)) {
        const clause = stmt.importClause;
        if (!clause || clause.isTypeOnly) continue;
        if (!clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;
        elements = clause.namedBindings.elements;
      } else if (ts.isExportDeclaration(stmt)) {
        if (stmt.isTypeOnly || !stmt.exportClause || !ts.isNamedExports(stmt.exportClause))
          continue;
        elements = stmt.exportClause.elements;
      } else {
        continue;
      }
      const subpath =
        stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)
          ? stmt.moduleSpecifier.text
          : null;
      if (!subpath || !GXT_SPECIFIER.test(subpath)) continue;
      for (const el of elements) {
        if (el.isTypeOnly) continue;
        if (!bySubpath.has(subpath)) bySubpath.set(subpath, new Set());
        bySubpath.get(subpath).add((el.propertyName ?? el.name).text);
      }
    }
  }
  return { bySubpath, fileCount: files.length };
}

// Symbols required by consumers OUTSIDE gxt-backend that the scan cannot see.
const MANUAL_REQUIRED = {
  // vite.config.mjs imports the build-time compiler.
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
 * The public names a bundle exports (`export { a, b as c }`, `export … from`,
 * `export const|function|class …`), read from its ESTree.
 */
function collectExports(source) {
  const exports = new Set();
  const nameOf = (node) => node.name ?? node.value;
  for (const node of parseAst(source).body) {
    if (node.type === 'ExportNamedDeclaration') {
      for (const spec of node.specifiers) exports.add(nameOf(spec.exported));
      const decl = node.declaration;
      if (decl?.id) exports.add(decl.id.name);
      for (const d of decl?.declarations ?? [])
        if (d.id.type === 'Identifier') exports.add(d.id.name);
    } else if (node.type === 'ExportDefaultDeclaration') {
      exports.add('default');
    }
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
