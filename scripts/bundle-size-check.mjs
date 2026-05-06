#!/usr/bin/env node
// scripts/bundle-size-check.mjs
// Lightweight dual-backend bundle-size gate.
// Usage: node scripts/bundle-size-check.mjs <classic|gxt>
//
// Reads scripts/bundle-budgets.json and checks every entry's raw/gzip/brotli
// size against its recorded budget. Fails (exit 1) if any metric exceeds its
// budget by more than 5 percent.

import { readFileSync, existsSync } from 'node:fs';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

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

  const buf = readFileSync(abs);
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
}

console.log('='.repeat(60));
if (failed) {
  console.error(`FAIL: one or more ${backend} bundles exceeded budget`);
  process.exit(1);
}
console.log(`OK: all ${backend} bundles within 5% of budget`);
