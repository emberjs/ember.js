#!/usr/bin/env node
// scripts/bundle-size-check.mjs
// Lightweight dual-backend bundle-size gate.
// Usage: node scripts/bundle-size-check.mjs <classic|gxt>
//
// Reads scripts/bundle-budgets.json and checks every entry's raw/gzip/brotli
// size against its recorded budget. Fails (exit 1) if any metric exceeds its
// budget by more than 5 percent.
//
// An entry's `path` may be either a single file (legacy AMD layout) or a
// DIRECTORY. The current rollup build (`npx rollup --config`) emits an ESM
// chunk tree under `dist/prod` (prod) and `dist/dev` (debug) rather than the
// historical single-file `dist/ember.prod.js` / `dist/ember.debug.js` AMD
// bundles. For a directory entry the gate concatenates every `*.js` under it
// (sorted for determinism) and measures raw/gzip/brotli on the concatenation —
// the single-bundle-equivalent size of the whole backend output.

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

// Recursively collect every `*.js` file under `dir`, returned sorted so the
// concatenation (and therefore the measured gzip/brotli sizes) is stable
// across machines and runs.
function collectJsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectJsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out.sort();
}

// Returns the concatenated bytes for an entry path: the file itself if `abs`
// is a single file, or the sorted concatenation of every `*.js` under it if
// `abs` is a directory.
function readEntryBytes(abs) {
  if (statSync(abs).isDirectory()) {
    return Buffer.concat(collectJsFiles(abs).map((f) => readFileSync(f)));
  }
  return readFileSync(abs);
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');

const backend = process.argv[2];
if (!backend) {
  console.error('Usage: node scripts/bundle-size-check.mjs <classic|gxt>');
  process.exit(1);
}

const budgetsPath = resolve(repoRoot, 'scripts/bundle-budgets.json');
const budgets = JSON.parse(readFileSync(budgetsPath, 'utf-8'));
const budget = budgets[backend];

if (!budget) {
  console.error(
    `No budget entry for backend '${backend}'. Known: ${Object.keys(budgets)
      .filter((k) => !k.startsWith('_'))
      .join(', ')}`
  );
  process.exit(1);
}

const TOLERANCE = 1.05; // 5 percent headroom

// GXT-residue guard for the classic backend. Every GXT-only call site in the
// shared glimmer/metal/runloop/routing modules is wrapped in a build-time
// `if (__GXT_MODE__)` block (or a `__GXT_MODE__ ? … : …` branch) that the
// classic rollup folds to `false` and DCEs. A new GXT-only site added WITHOUT a
// build-time gate re-inflates the classic bundle (the +19.7 kB brotli
// regression this guard backstops) and reappears here as a LIVE gxt-bridge call
// site. Size budgets can't catch it once re-baselined at the fixed floor, so
// assert the live bridge call/publish patterns are absent.
//
// We match CALL/PUBLISH shapes — `getGxtRenderer()?.`, `getGxtRenderer().`, and
// the bridge `install*Part(` / `set*( ` publishers — rather than the bare
// `getGxtRenderer` identifier. ember-source ships UNMINIFIED ESM under dist/,
// so two kinds of inert residue legitimately survive and must NOT trip the
// guard: (1) doc-comments in retained shared modules that mention the bridge by
// name, and (2) a tiny dead `function getGxtRenderer(){…}` / `setAmbientOwner`
// accessor stub that rollup keeps merely because reachable modules still carry
// the (now-unused) `import { … } from '…/gxt-bridge'` statement. Both are
// stripped by consuming apps' minifiers and carry no live behavior; only a real
// ungated CALL re-introduces the regression, which the patterns below catch.
const CLASSIC_LIVE_GXT_PATTERNS = [
  /getGxtRenderer\(\)\s*\??\./, // getGxtRenderer()?.x or getGxtRenderer().x — a live read
  /\binstallCompilePipelinePart\s*\(/,
  /\binstallRootComponentPart\s*\(/,
  /\binstallViewUtilsPart\s*\(/,
  /\binstallRuntimePart\s*\(/,
  /\binstallRenderPassPart\s*\(/,
  /\binstallBacktrackingPart\s*\(/,
  /\bsetGxtRenderer\s*\(/,
  /\bsetControllerOutletRerender\s*\(/,
];

// Strip `//…` line comments and `/* … */` block comments so doc-prose that
// merely names the bridge can't false-positive. Deliberately simple (no full
// JS tokenizer): the dist is generated code, and the live patterns we match are
// distinctive enough that the rare `//` inside a string literal is harmless.
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

function assertNoGxtResidue(buf, label) {
  const code = stripComments(buf.toString('utf-8'));
  const hits = CLASSIC_LIVE_GXT_PATTERNS.filter((re) => re.test(code)).map((re) => re.source);
  if (hits.length > 0) {
    console.error(
      `  FAIL: classic ${label} contains LIVE gxt-bridge code [${hits.join(', ')}] — ` +
        `a GXT-only site is missing its build-time \`if (__GXT_MODE__)\` gate ` +
        `(see scripts/bundle-budgets.json _comment and the dual-build workflow).`
    );
    return false;
  }
  return true;
}

function fmt(n) {
  return n.toLocaleString('en-US');
}

function pct(actual, limit) {
  return ((actual / limit) * 100).toFixed(1);
}

let failed = false;

console.log(`Bundle size check for backend: ${backend}`);
console.log('='.repeat(60));

for (const entry of budget.entries) {
  const abs = resolve(repoRoot, entry.path);
  if (!existsSync(abs)) {
    console.error(`MISSING: ${entry.path} (did the build run?)`);
    failed = true;
    continue;
  }

  const buf = readEntryBytes(abs);
  const raw = buf.byteLength;
  const gz = gzipSync(buf).byteLength;
  const br = brotliCompressSync(buf).byteLength;

  const { maxRaw, maxGz, maxBr } = entry;

  console.log(entry.path);
  console.log(
    `  raw: ${fmt(raw).padStart(10)} / ${fmt(maxRaw).padStart(10)} (${pct(raw, maxRaw)}%)`
  );
  console.log(`  gz : ${fmt(gz).padStart(10)} / ${fmt(maxGz).padStart(10)} (${pct(gz, maxGz)}%)`);
  console.log(`  br : ${fmt(br).padStart(10)} / ${fmt(maxBr).padStart(10)} (${pct(br, maxBr)}%)`);

  const overs = [];
  if (raw > maxRaw * TOLERANCE) overs.push(`raw +${pct(raw, maxRaw)}%`);
  if (gz > maxGz * TOLERANCE) overs.push(`gz +${pct(gz, maxGz)}%`);
  if (br > maxBr * TOLERANCE) overs.push(`br +${pct(br, maxBr)}%`);
  if (overs.length > 0) {
    console.error(`  FAIL: exceeds 5% tolerance (${overs.join(', ')})`);
    failed = true;
  }

  // Classic dist must stay free of LIVE gxt-bridge code (see the guard above).
  if (backend === 'classic') {
    if (!assertNoGxtResidue(buf, entry.path)) {
      failed = true;
    }
  }
}

console.log('='.repeat(60));
if (failed) {
  console.error(`FAIL: one or more ${backend} bundles exceeded budget`);
  process.exit(1);
}
console.log(`OK: all ${backend} bundles within 5% of budget`);
