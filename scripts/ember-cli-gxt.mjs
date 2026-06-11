#!/usr/bin/env node
// scripts/ember-cli-gxt.mjs
// Minimal install-UX CLI that toggles the GXT render backend for a
// consuming app by flipping `ember-addon.backend` in its package.json.
//
// Usage:
//   npx ember-cli-gxt enable [srcDir]
//   npx ember-cli-gxt disable
//   npx ember-cli-gxt status [srcDir]
//
// On `enable`, the CLI runs the RFC §6 Option-2 import-identity guard: if the
// app has a DIRECT `@glimmer/component` dependency, or (when a srcDir is
// given) a reachable `@glimmer/component` import, it REFUSES to proceed,
// because an npm-installed `@glimmer/component` brings a second copy of the
// reactive runtime and forks the symbol identity of Tag / createTag /
// CURRENT_TAG / getCustomTagFor against the GXT build. See
// rfcs/text/0000-gxt-dual-backend.md §6.
//
// This is PREVIEW software. See rfcs/text/0000-gxt-dual-backend.md.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const command = process.argv[2];
const pkgPath = resolve(process.cwd(), 'package.json');

if (!existsSync(pkgPath)) {
  console.error('error: no package.json in current directory');
  process.exit(1);
}

function readPkg() {
  return JSON.parse(readFileSync(pkgPath, 'utf-8'));
}

function writePkg(pkg) {
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

// --- RFC §6 Option-2 import-identity guard ------------------------------- //

const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

// Match `@glimmer/component` but NOT the `@glimmer/component-gxt` sibling.
// (`(?!-gxt)` rejects the `-gxt` suffix; the trailing class rejects other
// package-name characters so we don't match longer names.)
const IMPORT_RE =
  /(?:import\s[^;]*?from|require\(|import\(|export\s[^;]*?from)\s*['"]@glimmer\/component(?!-gxt)(?:\/[^'"]*)?['"]/;

// Source extensions worth scanning for a "cheap grep". `.hbs` can carry
// `{{component}}` invocations but never a JS import, so we skip it.
const SCAN_EXTS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.mts',
  '.cts',
  '.gjs',
  '.gts',
  '.jsx',
  '.tsx',
]);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'tmp', 'build', '.cache']);

function scanDeps(pkg) {
  const hits = [];
  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (deps && Object.prototype.hasOwnProperty.call(deps, '@glimmer/component')) {
      hits.push({ field, version: deps['@glimmer/component'] });
    }
  }
  return hits;
}

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(join(dir, entry.name));
    } else if (entry.isFile()) {
      const dot = entry.name.lastIndexOf('.');
      if (dot !== -1 && SCAN_EXTS.has(entry.name.slice(dot))) {
        yield join(dir, entry.name);
      }
    }
  }
}

function scanImports(srcDir) {
  const root = resolve(process.cwd(), srcDir);
  const hits = [];
  let stat;
  try {
    stat = statSync(root);
  } catch {
    return { ok: false, hits, scanned: 0 };
  }
  if (!stat.isDirectory()) {
    return { ok: false, hits, scanned: 0 };
  }
  let scanned = 0;
  for (const file of walk(root)) {
    scanned++;
    let contents;
    try {
      contents = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    const lines = contents.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (IMPORT_RE.test(lines[i])) {
        hits.push({ file, line: i + 1, text: lines[i].trim() });
      }
    }
  }
  return { ok: true, hits, scanned };
}

function printRefusal(depHits, importScan) {
  console.error('REFUSED: a direct `@glimmer/component` is still reachable.');
  console.error('');
  console.error('Why: `@glimmer/component` is published independently of Ember and');
  console.error('directly imports `@glimmer/manager` + `@glimmer/reference`. Installed');
  console.error('alongside a GXT build, it brings a SECOND copy of the reactive runtime,');
  console.error('forking the symbol identity of Tag / createTag / CURRENT_TAG /');
  console.error('getCustomTagFor. (RFC 0000-gxt-dual-backend.md §6.)');
  console.error('');
  if (depHits.length) {
    console.error('Direct dependency found in package.json:');
    for (const h of depHits) {
      console.error(`  - ${h.field}: "@glimmer/component": ${JSON.stringify(h.version)}`);
    }
    console.error('');
  }
  if (importScan && importScan.ok && importScan.hits.length) {
    console.error(
      `Reachable imports (${importScan.hits.length} in ${importScan.scanned} files scanned):`
    );
    for (const h of importScan.hits.slice(0, 10)) {
      console.error(`  - ${h.file}:${h.line}  ${h.text}`);
    }
    if (importScan.hits.length > 10) {
      console.error(`  ... and ${importScan.hits.length - 10} more`);
    }
    console.error('');
  }
  console.error('Fix: swap the dependency to the GXT-backed sibling, which re-exports the');
  console.error("same public API against GXT's reactive core so symbol identity does not");
  console.error('fork:');
  console.error('');
  console.error('  - package.json:  "@glimmer/component"  ->  "@glimmer/component-gxt"');
  console.error("  - source code:   import Component from '@glimmer/component';");
  console.error("                   -> import Component from '@glimmer/component-gxt';");
  console.error('');
  console.error('HONEST STATUS: `@glimmer/component-gxt` is in-repo fallback machinery and');
  console.error('is NOT published yet; there is also no consumable `ember-source-gxt`');
  console.error('package today (RFC §5.5). This guard is forward-looking: it blocks');
  console.error('`enable` so the fork cannot be introduced silently once that packaging');
  console.error('ships. Until then, GXT runs only via the in-repo workspace build, which');
  console.error('alias-injects the shims and does not hit this fork.');
}

if (command === 'enable') {
  const srcDir = process.argv[3];
  const pkg = readPkg();

  const depHits = scanDeps(pkg);
  const importScan = srcDir ? scanImports(srcDir) : null;
  if (importScan && !importScan.ok) {
    console.error(`error: srcDir "${srcDir}" is not a directory`);
    process.exit(1);
  }
  const reachable = depHits.length > 0 || (importScan && importScan.hits.length > 0);

  if (reachable) {
    printRefusal(depHits, importScan);
    process.exit(2);
  }

  pkg['ember-addon'] = pkg['ember-addon'] ?? {};
  pkg['ember-addon'].backend = 'gxt';
  writePkg(pkg);
  console.log('ok: GXT backend enabled in package.json');
  console.log(
    '    import-identity guard: no direct `@glimmer/component` dependency' +
      (srcDir ? ` or import (${importScan.scanned} files scanned)` : '') +
      ' found.'
  );
  console.log('    run `pnpm install` (or npm/yarn) to pick up the change.');
  console.log('    WARNING: this is preview software. See rfcs/text/0000-gxt-dual-backend.md.');
} else if (command === 'disable') {
  const pkg = readPkg();
  if (pkg['ember-addon']?.backend) {
    delete pkg['ember-addon'].backend;
    if (Object.keys(pkg['ember-addon']).length === 0) {
      delete pkg['ember-addon'];
    }
    writePkg(pkg);
    console.log('ok: GXT backend disabled, restored to classic');
  } else {
    console.log('ok: GXT backend was not enabled (already on classic)');
  }
} else if (command === 'status') {
  const srcDir = process.argv[3];
  const pkg = readPkg();
  const backend = pkg['ember-addon']?.backend ?? 'classic (default)';
  console.log(`Backend: ${backend}`);

  const depHits = scanDeps(pkg);
  const importScan = srcDir ? scanImports(srcDir) : null;
  if (importScan && !importScan.ok) {
    console.log(
      `Import-identity guard: srcDir "${srcDir}" is not a directory (skipped import scan)`
    );
  }
  const importHits = importScan && importScan.ok ? importScan.hits.length : 0;
  const clean = depHits.length === 0 && importHits === 0;
  console.log(
    `Import-identity guard (RFC §6): ${clean ? 'OK' : 'CONFLICT'} — ` +
      `direct @glimmer/component dependency: ${depHits.length ? depHits.map((h) => h.field).join(', ') : 'none'}; ` +
      `reachable imports: ${srcDir && importScan?.ok ? `${importHits} (in ${importScan.scanned} files)` : 'not scanned (pass a srcDir)'}.`
  );
  if (!clean) {
    console.log('  enable would be REFUSED — swap @glimmer/component -> @glimmer/component-gxt.');
  }
} else {
  console.log('Usage: ember-cli-gxt <enable|disable|status> [srcDir]');
  process.exit(1);
}
