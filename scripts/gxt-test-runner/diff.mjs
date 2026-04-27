#!/usr/bin/env node
/**
 * Baseline comparison for GXT test runner JSON artifacts.
 *
 * Usage:
 *   node scripts/gxt-test-runner/diff.mjs <baseline.json> <current.json>
 *   node scripts/gxt-test-runner/diff.mjs baseline.json current.json --allow gxt:rehydration-delegate
 *
 * Exit codes:
 *   0  no green->red regressions (within allowed categories)
 *   1  at least one green->red regression outside allowed categories
 *   3  harness error (bad arguments, missing file)
 */

import { readFileSync, existsSync } from 'node:fs';

function parseArgs(argv) {
  const allow = new Set();
  const positional = [];
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--allow') allow.add(argv[++i]);
    else if (a === '--help' || a === '-h') {
      usage();
      process.exit(0);
    } else if (a.startsWith('--')) {
      process.stderr.write(`unknown flag: ${a}\n`);
      process.exit(3);
    } else positional.push(a);
  }
  if (positional.length !== 2) {
    usage();
    process.exit(3);
  }
  return { baseline: positional[0], current: positional[1], allow };
}

function usage() {
  process.stderr.write('Usage: diff.mjs <baseline.json> <current.json> [--allow <category>]...\n');
}

function load(file) {
  if (!existsSync(file)) {
    process.stderr.write(`File not found: ${file}\n`);
    process.exit(3);
  }
  return JSON.parse(readFileSync(file, 'utf8'));
}

function indexFailing(summary) {
  const map = new Map(); // "module :: name" -> category
  for (const [modName, mod] of Object.entries(summary.modules || {})) {
    for (const t of mod.failingTests || []) {
      map.set(modName + ' :: ' + t.name, t.category || 'gxt:triage');
    }
  }
  return map;
}

function indexModules(summary) {
  const out = new Map();
  for (const [name, mod] of Object.entries(summary.modules || {})) {
    out.set(name, { total: mod.total, passing: mod.passing });
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  const base = load(args.baseline);
  const curr = load(args.current);

  const baseFailing = indexFailing(base);
  const currFailing = indexFailing(curr);

  const redToGreen = []; // wins
  const greenToRed = []; // regressions
  const categoryChanges = [];

  for (const [key, cat] of baseFailing) {
    if (!currFailing.has(key)) {
      redToGreen.push({ key, category: cat });
    } else if (currFailing.get(key) !== cat) {
      categoryChanges.push({ key, from: cat, to: currFailing.get(key) });
    }
  }
  for (const [key, cat] of currFailing) {
    if (!baseFailing.has(key)) {
      greenToRed.push({ key, category: cat });
    }
  }

  const baseModules = indexModules(base);
  const currModules = indexModules(curr);
  const moduleDeltas = [];
  const allModuleNames = new Set([...baseModules.keys(), ...currModules.keys()]);
  for (const name of allModuleNames) {
    const b = baseModules.get(name);
    const c = currModules.get(name);
    if (!b && c) moduleDeltas.push({ name, kind: 'added', total: c.total });
    else if (b && !c) moduleDeltas.push({ name, kind: 'removed', total: b.total });
    else if (b && c && b.total !== c.total) {
      moduleDeltas.push({ name, kind: 'resized', before: b.total, after: c.total });
    }
  }

  process.stdout.write(`\n=== GXT baseline diff ===\n`);
  process.stdout.write(`baseline : ${args.baseline}\n`);
  process.stdout.write(`current  : ${args.current}\n\n`);

  process.stdout.write(`red->green (wins):   ${redToGreen.length}\n`);
  for (const r of redToGreen.slice(0, 50)) {
    process.stdout.write(`  + ${r.key}  [${r.category}]\n`);
  }
  if (redToGreen.length > 50) {
    process.stdout.write(`  ... and ${redToGreen.length - 50} more\n`);
  }

  process.stdout.write(`\ngreen->red (regressions): ${greenToRed.length}\n`);
  for (const r of greenToRed.slice(0, 100)) {
    process.stdout.write(`  - ${r.key}  [${r.category}]\n`);
  }
  if (greenToRed.length > 100) {
    process.stdout.write(`  ... and ${greenToRed.length - 100} more\n`);
  }

  if (categoryChanges.length) {
    process.stdout.write(`\ncategory changes: ${categoryChanges.length}\n`);
    for (const c of categoryChanges.slice(0, 50)) {
      process.stdout.write(`  ~ ${c.key}  ${c.from} -> ${c.to}\n`);
    }
  }

  if (moduleDeltas.length) {
    process.stdout.write(`\nmodule-level deltas: ${moduleDeltas.length}\n`);
    for (const d of moduleDeltas.slice(0, 50)) {
      if (d.kind === 'added') process.stdout.write(`  + ${d.name} (+${d.total} tests)\n`);
      else if (d.kind === 'removed') process.stdout.write(`  - ${d.name} (-${d.total} tests)\n`);
      else process.stdout.write(`  ~ ${d.name} (${d.before} -> ${d.after})\n`);
    }
  }

  // Apply allow-list: regressions whose *current* category is in allow do not gate.
  const gating = greenToRed.filter((r) => !args.allow.has(r.category));
  if (gating.length) {
    process.stdout.write(
      `\nFAIL: ${gating.length} regression(s) outside allow-list (${[...args.allow].join(', ') || 'none'})\n`
    );
    process.exit(1);
  }
  process.stdout.write(`\nOK: no gating regressions\n`);
  process.exit(0);
}

main();
