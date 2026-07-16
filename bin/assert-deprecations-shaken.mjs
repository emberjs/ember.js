/* eslint-disable no-console */
/*
  Verifies deprecation shaking end-to-end:

  1. dist/deprecation-custom/prod (built with EMBER_DEPRECATION_FLAGS
     disabling flags) must not contain the disabled flag identifiers nor the
     per-flag content markers — proof the guarded code paths were eliminated.
  2. dist/prod (the standard build) must keep the flags live: the flags
     module exists with every const `true`, consumers import it via the
     package self-reference, the identifiers and content markers are present,
     and dist/deprecation-flags.json matches the manifest.

  Run with --report to print findings without failing.
*/
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { FLAGS, parseFlagsFromEnv, DEFAULT_FLAGS } = require('../broccoli/deprecated-features.cjs');

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const report = process.argv.includes('--report');

// Content markers are runtime strings inside a guarded branch. deprecateUntil
// message arguments qualify (deprecateUntil is ordinary code, not a stripped
// debug macro) — but only when the call sits inside the guard; entrypoint-style
// stubs keep their message after shaking. Avoid `assert`/`deprecate` call text
// (stripped in prod) and words that appear in doc comments (comments are
// stripped before matching, but only block comments reliably).
const CONTENT_MARKERS = {
  DEPRECATE_COMPARABLE_MIXIN: ['The `Comparable` mixin is deprecated'],
  // DEPRECATE_IMPORT_INJECT has no content marker: its deprecateUntil message
  // intentionally survives shaking as the throwing stub. The flag identifier
  // check still proves the guarded implementation was folded away.
  DEPRECATE_IMPORT_INJECT: [],
};

const FLAGS_MODULE_SUFFIX = 'packages/@ember/deprecated-features/index.js';
const SELF_REFERENCE = 'ember-source/@ember/deprecated-features/index.js';

let failures = [];

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function walkJs(dir, found = []) {
  for (let entry of readdirSync(dir, { withFileTypes: true })) {
    let full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJs(full, found);
    } else if (entry.name.endsWith('.js')) {
      found.push(full);
    }
  }
  return found;
}

function checkShakenDist(disabledFlags) {
  let distDir = join(projectRoot, 'dist/deprecation-custom/prod');
  if (!existsSync(distDir)) {
    failures.push(`missing ${distDir} — build with EMBER_DEPRECATION_FLAGS first`);
    return;
  }

  for (let file of walkJs(distDir)) {
    if (file.endsWith(FLAGS_MODULE_SUFFIX)) {
      let code = readFileSync(file, 'utf8');
      for (let flag of disabledFlags) {
        if (!new RegExp(`${flag}\\s*=\\s*false`).test(code)) {
          failures.push(`${file}: expected ${flag} = false in shaken flags module`);
        }
      }
      continue;
    }

    let code = stripComments(readFileSync(file, 'utf8'));
    for (let flag of disabledFlags) {
      // A flag name may legitimately survive as a DEPRECATIONS registry key
      // (`DEPRECATE_X:`) or property access (`DEPRECATIONS.DEPRECATE_X`) —
      // those are the runtime registry, not the folded import. Only a
      // standalone binding reference means folding failed.
      if (new RegExp(`(?<![.\\w$'"])${flag}\\b(?!\\s*:)`).test(code)) {
        failures.push(`${file}: contains disabled flag identifier ${flag}`);
      }
      for (let marker of CONTENT_MARKERS[flag] ?? []) {
        if (code.includes(marker)) {
          failures.push(`${file}: contains content marker for ${flag}: "${marker}"`);
        }
      }
    }
  }
}

function checkStandardDist() {
  let distDir = join(projectRoot, 'dist/prod');
  if (!existsSync(distDir)) {
    failures.push(`missing ${distDir} — run the standard build first`);
    return;
  }

  let flagsModule = join(distDir, FLAGS_MODULE_SUFFIX);
  if (!existsSync(flagsModule)) {
    failures.push(`missing ${flagsModule} — flags module must ship in the standard dist`);
  } else {
    let code = readFileSync(flagsModule, 'utf8');
    for (let flag of Object.keys(FLAGS)) {
      if (!new RegExp(`${flag}\\s*=\\s*true`).test(code)) {
        failures.push(`${flagsModule}: expected ${flag} = true`);
      }
    }
  }

  let sawSelfReference = false;
  let identifiersSeen = new Set();
  let markersSeen = new Set();
  for (let file of walkJs(distDir)) {
    if (file.endsWith(FLAGS_MODULE_SUFFIX)) continue;
    let code = readFileSync(file, 'utf8');
    if (code.includes(SELF_REFERENCE)) sawSelfReference = true;
    let stripped = stripComments(code);
    for (let flag of Object.keys(FLAGS)) {
      if (new RegExp(`(?<![.\\w$'"])${flag}\\b(?!\\s*:)`).test(stripped)) identifiersSeen.add(flag);
      for (let marker of CONTENT_MARKERS[flag] ?? []) {
        if (stripped.includes(marker)) markersSeen.add(marker);
      }
    }
  }

  if (!sawSelfReference) {
    failures.push(`no module in dist/prod imports ${SELF_REFERENCE} — externalization broke`);
  }
  for (let flag of Object.keys(FLAGS)) {
    if (!identifiersSeen.has(flag)) {
      failures.push(`dist/prod: no consumer references flag ${flag}`);
    }
    for (let marker of CONTENT_MARKERS[flag] ?? []) {
      if (!markersSeen.has(marker)) {
        failures.push(`dist/prod: content marker missing (stale marker?): "${marker}"`);
      }
    }
  }

  let metaPath = join(projectRoot, 'dist/deprecation-flags.json');
  if (!existsSync(metaPath)) {
    failures.push(`missing ${metaPath}`);
  } else {
    let meta = JSON.parse(readFileSync(metaPath, 'utf8'));
    let expected = Object.entries(FLAGS).map(([name, { id, since, until }]) => ({
      const: name,
      id,
      since,
      until,
    }));
    if (JSON.stringify(meta) !== JSON.stringify(expected)) {
      failures.push(`${metaPath} does not match broccoli/deprecated-features.cjs FLAGS manifest`);
    }
  }
}

let disabledFlags = Object.keys(DEFAULT_FLAGS);
if (process.env.EMBER_DEPRECATION_FLAGS) {
  let resolved = parseFlagsFromEnv(process.env.EMBER_DEPRECATION_FLAGS);
  disabledFlags = Object.keys(resolved).filter((name) => resolved[name] === false);
}

checkShakenDist(disabledFlags);
checkStandardDist();

if (failures.length > 0) {
  console.log(`assert-deprecations-shaken: ${failures.length} problem(s):`);
  for (let failure of failures) {
    console.log(`  - ${failure}`);
  }
  if (!report) {
    throw new Error(`assert-deprecations-shaken found ${failures.length} problem(s)`);
  }
} else {
  console.log(
    `assert-deprecations-shaken: OK (${disabledFlags.length} flag(s) verified shaken; standard dist verified live)`
  );
}
