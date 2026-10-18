#!/usr/bin/env node
// scripts/gxt-test-runner/baseline-gate.mjs — the CI verdict for a
// `runner.mjs --baseline <file>` run.
//
//   status=0
//   node scripts/gxt-test-runner/runner.mjs --full … --baseline <file> || status=$?
//   node scripts/gxt-test-runner/baseline-gate.mjs --baseline <file> --runner-exit "$status"
//     [--out-dir test-results]   (where the run wrote gxt-summary.json / gxt-last-run.json)
//     [--subset]   the run covered a module subset (`--smoke`, `--shard`): only
//                  the modules it ran are compared, and condition 3 is left to
//                  the runner, which exits 3 when a listed smoke module is
//                  missing from the page
//
// runner.mjs exits 1 whenever ANY test fails, including a test the baseline
// already lists as failing (a known red). Its exit code therefore cannot gate a
// suite whose baseline has known reds. This gate passes iff:
//   1. the runner exited 0 or 1 (2 = a module timed out, 3 = harness error) and
//      wrote its summary and last-run files;
//   2. the run had no timeouts and no harness errors;
//   3. every module of the baseline ran (a test file that silently stops
//      loading must not read as "no regressions");
//   4. every failing test is listed as failing in the baseline (a failure in a
//      module the baseline does not know is a regression too).
// Baseline reds that now pass are reported (regenerate the baseline), never
// failed. With GITHUB_STEP_SUMMARY set, a markdown summary is appended to it.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const opt = (name, dflt = null) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const baselinePath = opt('--baseline');
if (!baselinePath) {
  process.stderr.write(
    'usage: baseline-gate.mjs --baseline <file> [--runner-exit N] [--out-dir dir]\n'
  );
  process.exit(3);
}
const outDir = resolve(REPO_ROOT, opt('--out-dir', 'test-results'));
const runnerExit = opt('--runner-exit');
const subset = argv.includes('--subset');

const problems = [];
const load = (path, what) => {
  if (!existsSync(path)) {
    problems.push(`${what} not found: ${path}`);
    return null;
  }
  return JSON.parse(readFileSync(path, 'utf8'));
};
const baseline = load(resolve(REPO_ROOT, baselinePath), 'baseline');
const summary = load(join(outDir, 'gxt-summary.json'), 'run summary');
const lastRun = load(join(outDir, 'gxt-last-run.json'), 'run details');

if (runnerExit !== null && runnerExit !== '0' && runnerExit !== '1') {
  problems.push(`runner.mjs exited ${runnerExit} (2 = a module timed out, 3 = harness error)`);
}

const failing = (s) => {
  const out = new Map();
  for (const [module, mod] of Object.entries(s?.modules ?? {})) {
    for (const t of mod.failingTests ?? []) out.set(`${module} :: ${t.name}`, module);
  }
  return out;
};
const ran = (module) => !subset || (summary?.modules && module in summary.modules);
const knownRed = new Map([...failing(baseline)].filter(([, module]) => ran(module)));
const nowRed = failing(summary);
const regressions = [...nowRed.keys()].filter((k) => !knownRed.has(k));
const fixed = summary ? [...knownRed.keys()].filter((k) => !nowRed.has(k)) : [];
const missingModules =
  summary && !subset
    ? Object.keys(baseline?.modules ?? {}).filter((m) => !(m in summary.modules))
    : [];

for (const t of lastRun?.timeouts ?? []) problems.push(`timeout: ${t.module}`);
for (const h of lastRun?.harnessErrors ?? []) {
  problems.push(`harness error: ${h.module}: ${String(h.error).split('\n')[0]}`);
}
for (const m of missingModules) problems.push(`baseline module did not run: ${m}`);
for (const r of regressions) {
  problems.push(
    `${baseline?.modules?.[nowRed.get(r)] ? 'green->red' : 'failing in a module the baseline lacks'}: ${r}`
  );
}

const meta = summary?.meta ?? {};
const passing = Object.values(summary?.modules ?? {}).reduce((a, m) => a + m.passing, 0);
const lines = [
  `run: ${passing}/${meta.totalTests ?? '?'} tests across ${meta.totalModules ?? '?'} module(s) (gxt ${meta.gxtVersion ?? '?'}); baseline ${baselinePath}: ${Object.keys(baseline?.modules ?? {}).length} module(s), ${knownRed.size} known red`,
  `known reds still red: ${knownRed.size - fixed.length}; red->green (regenerate the baseline): ${fixed.length}`,
  ...fixed.map((k) => `  + ${k}`),
  problems.length
    ? `FAIL: ${problems.length} problem(s)`
    : 'OK: no regressions, timeouts, harness errors or missing modules',
  ...problems.map((p) => `  - ${p}`),
];
process.stdout.write(lines.map((l) => `[baseline-gate] ${l}`).join('\n') + '\n');

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### ${problems.length ? 'FAIL' : 'PASS'}: ${baselinePath}\n\n\`\`\`\n${lines.join('\n')}\n\`\`\`\n`
  );
}
process.exit(problems.length ? 1 : 0);
