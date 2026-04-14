#!/usr/bin/env node
/**
 * Interactive + batch triage helper for the GXT failing-tests JSON.
 *
 * Interactive:
 *   node scripts/gxt-test-runner/categorize.mjs test-results/gxt-summary.json
 *
 * Batch:
 *   node scripts/gxt-test-runner/categorize.mjs test-results/gxt-summary.json \
 *     --auto-category gxt:rehydration-delegate \
 *     --pattern "^rehydration:"
 *
 * Writes the updated JSON back in place. Creates a .bak alongside on first write.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const KNOWN_CATEGORIES = [
  'gxt:triage',
  'gxt:rehydration-delegate',
  'gxt:upstream-bug',
  'gxt:runtime-compiler',
  'gxt:component-manager',
  'gxt:helper-manager',
  'gxt:modifier-manager',
  'gxt:routing',
  'gxt:flaky',
  'gxt:known-gap',
];

function parseArgs(argv) {
  const args = { file: null, autoCategory: null, pattern: null, moduleRegex: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--auto-category') args.autoCategory = argv[++i];
    else if (a === '--pattern') args.pattern = argv[++i];
    else if (a === '--module-pattern') args.moduleRegex = argv[++i];
    else if (a === '--help' || a === '-h') { usage(); process.exit(0); }
    else if (!args.file) args.file = a;
    else { process.stderr.write(`unknown arg: ${a}\n`); process.exit(3); }
  }
  if (!args.file) { usage(); process.exit(3); }
  return args;
}

function usage() {
  process.stderr.write(
    'Usage: categorize.mjs <summary.json> [--auto-category CAT --pattern REGEX] [--module-pattern REGEX]\n',
  );
}

async function interactive(summary) {
  const rl = createInterface({ input, output });
  try {
    let modified = 0;
    for (const [modName, mod] of Object.entries(summary.modules)) {
      for (const t of mod.failingTests || []) {
        if (t.category && t.category !== 'gxt:triage') continue;
        process.stdout.write(`\n${modName}\n  ${t.name}  (current: ${t.category || 'gxt:triage'})\n`);
        process.stdout.write(`  categories: ${KNOWN_CATEGORIES.join(', ')}\n`);
        const ans = (await rl.question('  assign (enter to skip, q to quit): ')).trim();
        if (ans === 'q') return modified;
        if (!ans) continue;
        t.category = ans;
        modified++;
      }
    }
    return modified;
  } finally {
    rl.close();
  }
}

function batch(summary, autoCategory, pattern, moduleRegex) {
  let rx = pattern ? new RegExp(pattern) : null;
  let mrx = moduleRegex ? new RegExp(moduleRegex) : null;
  let count = 0;
  for (const [modName, mod] of Object.entries(summary.modules)) {
    if (mrx && !mrx.test(modName)) continue;
    for (const t of mod.failingTests || []) {
      if (rx && !rx.test(t.name)) continue;
      t.category = autoCategory;
      count++;
    }
  }
  return count;
}

function recomputeCategories(summary) {
  const cats = {};
  for (const mod of Object.values(summary.modules)) {
    for (const t of mod.failingTests || []) {
      cats[t.category] = (cats[t.category] || 0) + 1;
    }
  }
  summary.categories = cats;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!existsSync(args.file)) {
    process.stderr.write(`File not found: ${args.file}\n`);
    process.exit(3);
  }
  const summary = JSON.parse(readFileSync(args.file, 'utf8'));
  if (!existsSync(args.file + '.bak')) copyFileSync(args.file, args.file + '.bak');

  let count;
  if (args.autoCategory) {
    if (!args.pattern && !args.moduleRegex) {
      process.stderr.write('--auto-category requires --pattern and/or --module-pattern\n');
      process.exit(3);
    }
    count = batch(summary, args.autoCategory, args.pattern, args.moduleRegex);
  } else {
    count = await interactive(summary);
  }

  recomputeCategories(summary);
  writeFileSync(args.file, JSON.stringify(summary, null, 2));
  process.stdout.write(`categorized ${count} test(s); wrote ${args.file}\n`);
}

main().catch((e) => {
  process.stderr.write(`fatal: ${e.stack || e}\n`);
  process.exit(3);
});
