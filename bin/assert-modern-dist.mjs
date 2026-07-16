/* eslint-disable no-console */
/* eslint-disable n/no-process-exit */

// Scans the modern dist for classic-object-model code that should have been
// excluded. Content markers are used (rather than module filenames) because
// rollup collapses internals into hashed shared chunks.
//
// Usage: node bin/assert-modern-dist.mjs [--report]
//   --report  print findings without failing (useful before the modern
//             entrypoint swaps are complete)

import { globSync } from 'glob';
import { readFileSync } from 'node:fs';

const DIST = 'dist/modern/prod';

// Unique identifiers from the classic modules that must not reach the modern
// build. Comments are stripped before matching, so doc-comment mentions of
// these names do not count. Each marker is paired with the module it
// indicts. Note that assert/deprecation message strings make poor markers:
// they are stripped from prod builds.
const FORBIDDEN_MARKERS = [
  // @ember/object/mixin.ts machinery
  ['applyMixin', '@ember/object/mixin'],
  // @ember/-internals/metal/lib/computed.ts
  ['ComputedProperty', '@ember/-internals/metal/lib/computed'],
  // @ember/-internals/metal/lib/alias.ts (throw message, not an assert)
  ['Cannot set read-only property', '@ember/-internals/metal/lib/alias'],
  // @ember/object/core.ts
  ['CoreObject', '@ember/object/core'],
  // @ember/array/proxy.ts
  ['ArrayProxy', '@ember/array/proxy'],
  // @ember/object/observable.ts
  ['incrementProperty', '@ember/object/observable'],
];

// Rough comment stripping; good enough for scanning our own generated output.
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

// Modules still expected in the modern graph until CONTROLLER_QUERY_PARAMS
// can flip (query params run on controller observers).
const ALLOWLISTED_MARKERS = [
  // @ember/-internals/metal/lib/observer.ts
  ['flushAsyncObservers', 'observer machinery (allowlisted: controller query params)'],
];

const report = process.argv.includes('--report');

let files = globSync(`${DIST}/**/*.js`, { nodir: true });

if (files.length === 0) {
  console.error(`No files found under ${DIST}; run the build first.`);
  process.exit(1);
}

let failures = [];
let allowlistedHits = new Set();

for (let file of files) {
  let content = stripComments(readFileSync(file, 'utf8'));

  for (let [marker, module] of FORBIDDEN_MARKERS) {
    if (content.includes(marker)) {
      failures.push(`${file}: contains "${marker}" (${module})`);
    }
  }

  for (let [marker, description] of ALLOWLISTED_MARKERS) {
    if (content.includes(marker)) {
      allowlistedHits.add(description);
    }
  }
}

for (let hit of allowlistedHits) {
  console.log(`allowlisted: ${hit}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} forbidden classic module(s) found in ${DIST}:\n`);
  for (let failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(report ? 0 : 1);
}

console.log(`${DIST} is free of forbidden classic modules (${files.length} files scanned).`);
