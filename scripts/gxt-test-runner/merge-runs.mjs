#!/usr/bin/env node
// scripts/gxt-test-runner/merge-runs.mjs — merges the outputs of a sharded run
// (`runner.mjs --shard i/M`, one directory per shard) into the
// gxt-summary.json and gxt-last-run.json that one unsharded run writes: same
// shape, modules in the same (sorted) order, totals summed. The merged summary
// is a baseline candidate like any other run, and baseline-gate.mjs without
// `--subset` on it checks the whole suite, including that every baseline
// module ran in some shard.
//
//   node scripts/gxt-test-runner/merge-runs.mjs --shards M [--out-dir test-results] <shard-dir>...
//
// Each <shard-dir> holds what one shard wrote: gxt-summary.json,
// gxt-last-run.json and gxt-runner-exit.txt (runner.mjs's exit code, written by
// the CI step). A shard whose runner exited without writing its results (a
// page that never booted) is merged as a shard that ran no module; its exit
// code is kept, so the gate still fails on it. The merge fails (exit 3) when
// there are not M shard directories, when a shard has neither results nor an
// exit code, when the shards ran different code (runner, gxt version, ember
// commit) or when a module ran in more than one shard.
//
// Writes <out-dir>/gxt-summary.json, <out-dir>/gxt-last-run.json and, when
// every shard has its exit code, <out-dir>/gxt-runner-exit.txt with the
// highest of them (0 clean, 1 failing tests, 2 timeout, 3 harness error) for
// `baseline-gate.mjs --runner-exit`.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SUMMARY = 'gxt-summary.json';
const LAST_RUN = 'gxt-last-run.json';
const RUNNER_EXIT = 'gxt-runner-exit.txt';

const fail = (msg) => {
  process.stderr.write(`[merge-runs] ${msg}\n`);
  process.exit(3);
};

const argv = process.argv.slice(2);
let expected = null;
let outDir = 'test-results';
const dirs = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--shards') expected = Number(argv[++i]);
  else if (argv[i] === '--out-dir') outDir = argv[++i];
  else if (argv[i].startsWith('--')) fail(`unknown argument: ${argv[i]}`);
  else dirs.push(argv[i]);
}
if (!Number.isInteger(expected) || expected < 1) {
  fail('usage: merge-runs.mjs --shards M [--out-dir dir] <shard-dir>...');
}
if (dirs.length !== expected) {
  fail(`expected ${expected} shard run(s), got ${dirs.length}: ${dirs.join(' ') || '(none)'}`);
}

const shards = dirs.map((dir) => {
  const read = (file) =>
    existsSync(join(dir, file)) ? JSON.parse(readFileSync(join(dir, file), 'utf8')) : null;
  const exitFile = join(dir, RUNNER_EXIT);
  const exit = existsSync(exitFile) ? readFileSync(exitFile, 'utf8').trim() : null;
  if (exit !== null && !/^\d+$/.test(exit)) fail(`${exitFile}: not an exit code: ${exit}`);
  const summary = read(SUMMARY);
  const lastRun = read(LAST_RUN);
  if (!summary !== !lastRun) fail(`${dir}: has only one of ${SUMMARY} and ${LAST_RUN}`);
  if (!summary && exit === null) fail(`${dir}: no run results and no runner exit code`);
  return {
    name: basename(resolve(dir)),
    summary,
    lastRun,
    exit: exit === null ? null : Number(exit),
  };
});

const ran = shards.filter((s) => s.summary);
for (const s of shards) {
  if (!s.summary) {
    process.stdout.write(
      `[merge-runs] ${s.name}: runner exited ${s.exit} without writing its results\n`
    );
  }
}
for (const key of ['runner', 'gxtVersion', 'emberCommit']) {
  const values = new Set(ran.map((s) => s.summary.meta[key]));
  if (values.size > 1) fail(`shards disagree on meta.${key}: ${[...values].join(', ')}`);
}

// The module order of an unsharded run: runner.mjs sorts the list it runs.
const owner = new Map();
for (const s of ran) {
  const own = [
    ...Object.keys(s.summary.modules),
    ...s.lastRun.timeouts.map((t) => t.module),
    ...s.lastRun.harnessErrors.map((h) => h.module),
  ];
  for (const module of new Set(own)) {
    if (owner.has(module)) fail(`module ran in ${owner.get(module)} and ${s.name}: ${module}`);
    owner.set(module, s.name);
  }
}
const byModule = (a, b) => (a.module < b.module ? -1 : a.module > b.module ? 1 : 0);

// The earliest shard start stands for the run's start, as capturedAt does for
// an unsharded run; gxt-last-run.json's meta is that shard's (runner.mjs copies
// it before any module ran, so its totals are 0).
const first = [...ran].sort((a, b) =>
  a.summary.meta.capturedAt < b.summary.meta.capturedAt ? -1 : 1
)[0];
const sum = (key) => ran.reduce((a, s) => a + (s.summary.meta[key] || 0), 0);
const meta = {
  runner: first?.summary.meta.runner ?? 'unknown',
  capturedAt: first?.summary.meta.capturedAt ?? new Date().toISOString(),
  gxtVersion: first?.summary.meta.gxtVersion ?? 'unknown',
  emberCommit: first?.summary.meta.emberCommit ?? 'unknown',
  totalTests: sum('totalTests'),
  totalModules: sum('totalModules'),
  quarantinedTests: sum('quarantinedTests'),
};
if (ran.some((s) => 'totalAssertions' in s.summary.meta)) {
  meta.totalAssertions = sum('totalAssertions');
  meta.totalAssertionsPassing = sum('totalAssertionsPassing');
}

const modules = {};
const categories = {};
const allModules = ran.flatMap((s) => Object.entries(s.summary.modules));
allModules.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
for (const [module, record] of allModules) {
  modules[module] = record;
  for (const t of record.failingTests) {
    categories[t.category] = (categories[t.category] || 0) + 1;
  }
}
const summary = { meta, modules, categories };
const lastRun = {
  meta: first ? { ...first.lastRun.meta } : { ...meta },
  failingTests: ran.flatMap((s) => s.lastRun.failingTests).sort(byModule),
  timeouts: ran.flatMap((s) => s.lastRun.timeouts).sort(byModule),
  harnessErrors: ran.flatMap((s) => s.lastRun.harnessErrors).sort(byModule),
};

const out = resolve(REPO_ROOT, outDir);
mkdirSync(out, { recursive: true });
writeFileSync(join(out, SUMMARY), JSON.stringify(summary, null, 2));
writeFileSync(join(out, LAST_RUN), JSON.stringify(lastRun, null, 2));
const exits = shards.map((s) => s.exit);
if (exits.every((e) => e !== null)) {
  writeFileSync(join(out, RUNNER_EXIT), `${Math.max(...exits)}\n`);
}

const passing = Object.values(modules).reduce((a, m) => a + m.passing, 0);
for (const s of ran) {
  const p = Object.values(s.summary.modules).reduce((a, m) => a + m.passing, 0);
  process.stdout.write(
    `[merge-runs] ${s.name}: ${p}/${s.summary.meta.totalTests} tests across ${s.summary.meta.totalModules} module(s), runner exit ${s.exit ?? '?'}\n`
  );
}
process.stdout.write(
  `[merge-runs] merged ${shards.length} shard(s): ${passing}/${meta.totalTests} tests across ${meta.totalModules} module(s)` +
    (lastRun.timeouts.length ? `, timeouts=${lastRun.timeouts.length}` : '') +
    (lastRun.harnessErrors.length ? `, harness-errors=${lastRun.harnessErrors.length}` : '') +
    `; runner exit ${exits.every((e) => e !== null) ? Math.max(...exits) : 'unknown'}` +
    ` -> ${join(outDir, SUMMARY)}, ${join(outDir, LAST_RUN)}\n`
);
