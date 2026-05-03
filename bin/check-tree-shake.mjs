/* eslint-disable no-console, n/no-process-exit */
import { check } from 'agadoo';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Entries that fully tree-shake today. A regression here means a new
// top-level side effect was introduced — fix it or move the entry to
// KNOWN_IMPURE_ENTRIES (and update package.json sideEffects accordingly).
const KNOWN_PURE_ENTRIES = [
  '@ember/-internals/browser-environment',
  '@ember/-internals/error-handling',
  '@ember/-internals/owner',
  '@ember/-internals/utility-types',
  '@ember/deprecated-features',
  '@ember/destroyable',
  '@ember/owner',
  '@ember/reactive',
  '@ember/template-compilation',
  '@ember/test',
  '@ember/version',
  '@glimmer/destroyable',
  '@glimmer/encoder',
  '@glimmer/env',
  '@glimmer/global-context',
  '@glimmer/owner',
  '@glimmer/util',
  '@glimmer/vm',
  '@glimmer/wire-format',
  '@simple-dom/document',
  'backburner.js',
  'dag-map',
  'route-recognizer',
];

// Entries that have known top-level side effects today (manager
// registrations, validator state, backburner instance, etc.). These are
// tracked so that improvements get noticed: if one of these starts
// passing agadoo, promote it to KNOWN_PURE_ENTRIES.
const KNOWN_IMPURE_ENTRIES = [
  '@ember/-internals/container',
  '@ember/-internals/deprecations',
  '@ember/-internals/environment',
  '@ember/-internals/glimmer',
  '@ember/-internals/meta',
  '@ember/-internals/metal',
  '@ember/-internals/routing',
  '@ember/-internals/runtime',
  '@ember/-internals/string',
  '@ember/-internals/utils',
  '@ember/-internals/views',
  '@ember/application',
  '@ember/array',
  '@ember/canary-features',
  '@ember/component',
  '@ember/controller',
  '@ember/debug',
  '@ember/engine',
  '@ember/enumerable',
  '@ember/helper',
  '@ember/instrumentation',
  '@ember/modifier',
  '@ember/object',
  '@ember/renderer',
  '@ember/routing',
  '@ember/runloop',
  '@ember/service',
  '@ember/template',
  '@ember/template-compiler',
  '@ember/template-factory',
  '@ember/utils',
  '@glimmer/manager',
  '@glimmer/node',
  '@glimmer/opcode-compiler',
  '@glimmer/program',
  '@glimmer/reference',
  '@glimmer/runtime',
  '@glimmer/tracking',
  '@glimmer/validator',
  'ember-template-compiler',
  'ember-testing',
  'router_js',
  'rsvp',
];

function findAllEntries() {
  const distRoot = path.join(root, 'dist/prod/packages');
  const entries = [];
  function walk(dir, prefix) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        const indexPath = path.join(full, 'index.js');
        if (fs.existsSync(indexPath)) {
          entries.push(prefix ? `${prefix}/${name}` : name);
        } else {
          walk(full, prefix ? `${prefix}/${name}` : name);
        }
      }
    }
  }
  walk(distRoot, '');
  return entries.sort();
}

const allEntries = findAllEntries();
const tracked = new Set([...KNOWN_PURE_ENTRIES, ...KNOWN_IMPURE_ENTRIES]);
const untracked = allEntries.filter((e) => !tracked.has(e));
const removed = [...tracked].filter((e) => !allEntries.includes(e));

const purityRegressed = [];
const newlyPure = [];

for (const entry of KNOWN_PURE_ENTRIES) {
  if (!allEntries.includes(entry)) continue;
  const file = path.join(root, 'dist/prod/packages', entry, 'index.js');
  const result = await check(file);
  if (result.shaken) {
    console.log(`  ✓ ${entry} (pure)`);
  } else {
    console.error(`  ✗ ${entry} (expected pure, has side effects)`);
    purityRegressed.push(entry);
  }
}

for (const entry of KNOWN_IMPURE_ENTRIES) {
  if (!allEntries.includes(entry)) continue;
  const file = path.join(root, 'dist/prod/packages', entry, 'index.js');
  const result = await check(file);
  if (result.shaken) {
    console.error(`  ! ${entry} (expected impure, now pure — promote it!)`);
    newlyPure.push(entry);
  } else {
    console.log(`  · ${entry} (impure, as expected)`);
  }
}

let exitCode = 0;

if (purityRegressed.length > 0) {
  console.error(
    `\n${purityRegressed.length} entr${purityRegressed.length === 1 ? 'y' : 'ies'} regressed (was pure, now impure):`
  );
  for (const entry of purityRegressed) console.error(`  - ${entry}`);
  console.error(
    `\nA new top-level side effect was introduced. Either:\n` +
      `  1. Remove the side effect (preferred), or\n` +
      `  2. If the side effect is intentional, move the entry from\n` +
      `     KNOWN_PURE_ENTRIES to KNOWN_IMPURE_ENTRIES in\n` +
      `     bin/check-tree-shake.mjs.`
  );
  exitCode = 1;
}

if (newlyPure.length > 0) {
  console.error(
    `\n${newlyPure.length} entr${newlyPure.length === 1 ? 'y' : 'ies'} unexpectedly tree-shake (was impure, now pure):`
  );
  for (const entry of newlyPure) console.error(`  - ${entry}`);
  console.error(
    `\nThis is good news — those packages got smaller. Promote them by\n` +
      `moving them from KNOWN_IMPURE_ENTRIES to KNOWN_PURE_ENTRIES in\n` +
      `bin/check-tree-shake.mjs.`
  );
  exitCode = 1;
}

if (untracked.length > 0) {
  console.error(`\n${untracked.length} entr${untracked.length === 1 ? 'y' : 'ies'} not tracked:`);
  for (const entry of untracked) console.error(`  - ${entry}`);
  console.error(
    `\nNew package(s) appeared. Run agadoo manually and add each to either\n` +
      `KNOWN_PURE_ENTRIES or KNOWN_IMPURE_ENTRIES in bin/check-tree-shake.mjs.`
  );
  exitCode = 1;
}

if (removed.length > 0) {
  console.error(
    `\n${removed.length} tracked entr${removed.length === 1 ? 'y' : 'ies'} no longer build:`
  );
  for (const entry of removed) console.error(`  - ${entry}`);
  console.error(`\nRemove the stale entries from bin/check-tree-shake.mjs.`);
  exitCode = 1;
}

if (exitCode === 0) {
  console.log(
    `\n${KNOWN_PURE_ENTRIES.length} pure + ${KNOWN_IMPURE_ENTRIES.length} impure entries match expectations.`
  );
}

process.exit(exitCode);
