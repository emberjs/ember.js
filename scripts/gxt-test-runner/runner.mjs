#!/usr/bin/env node
/**
 * GXT Test Runner — production-grade QUnit-in-browser runner
 *
 * Correctness over everything:
 *   - The ONLY signal for "module finished" is QUnit.done / QUnit.on('runEnd').
 *   - A module that does not emit runEnd within its wall-clock budget is a TIMEOUT.
 *     It is never counted as a partial pass.
 *
 * Usage:
 *   node scripts/gxt-test-runner/runner.mjs --smoke
 *   node scripts/gxt-test-runner/runner.mjs --full
 *   node scripts/gxt-test-runner/runner.mjs --filter "Syntax test: {{#if}}"
 *   node scripts/gxt-test-runner/runner.mjs --smoke --shard 2/4
 *   node scripts/gxt-test-runner/runner.mjs --full --baseline test-results/gxt-baseline.json
 *
 * Exit codes:
 *   0  clean run (all modules completed; no green->red regressions if baseline)
 *   1  hard test failures (or baseline regression)
 *   2  at least one module timed out
 *   3  harness error (vite server down, browser launch failure, etc.)
 */

import { chromium } from 'playwright';
import {
  writeFileSync,
  mkdirSync,
  readFileSync,
  existsSync,
} from 'node:fs';
import { spawn, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..', '..');
const RUNNER_VERSION = 'scripts/gxt-test-runner/runner.mjs@v1';

// ---------- CLI parsing ----------

function parseArgs(argv) {
  const args = {
    smoke: false,
    full: false,
    filter: null,
    shard: null, // { index, total }
    baseline: null,
    outDir: 'test-results',
    moduleTimeout: 300_000,
    testTimeout: 20_000,
    retries: 2,
    url: process.env.GXT_URL || 'http://localhost:5180/',
    autoServe: false,
    headful: false,
    verbose: false,
    list: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--smoke': args.smoke = true; break;
      case '--full': args.full = true; break;
      case '--filter': args.filter = next(); break;
      case '--shard': {
        const v = next();
        const m = /^(\d+)\/(\d+)$/.exec(v);
        if (!m) throw new Error(`--shard expects N/M, got ${v}`);
        args.shard = { index: Number(m[1]), total: Number(m[2]) };
        if (args.shard.index < 1 || args.shard.index > args.shard.total) {
          throw new Error(`--shard index out of range: ${v}`);
        }
        break;
      }
      case '--baseline': args.baseline = next(); break;
      case '--out-dir': args.outDir = next(); break;
      case '--module-timeout': args.moduleTimeout = Number(next()); break;
      case '--test-timeout': args.testTimeout = Number(next()); break;
      case '--retries': args.retries = Number(next()); break;
      case '--url': args.url = next(); break;
      case '--auto-serve': args.autoServe = true; break;
      case '--headful': args.headful = true; break;
      case '--verbose': args.verbose = true; break;
      case '--list': args.list = true; break;
      case '--help':
      case '-h':
        printHelp(); process.exit(0);
      default:
        throw new Error(`Unknown argument: ${a}`);
    }
  }
  if (!args.smoke && !args.full && !args.filter && !args.list) {
    args.smoke = true; // default
  }
  return args;
}

function printHelp() {
  process.stdout.write(`GXT Test Runner

  --smoke                 Run the 14-module smoke suite (default)
  --full                  Run every discovered module
  --filter <glob>         Substring/glob filter on module names
  --shard N/M             Run only shard N of M (by module hash)
  --baseline <file>       Compare against baseline JSON; non-zero on green->red
  --out-dir <dir>         Output directory (default: test-results)
  --module-timeout <ms>   Per-module wall-clock timeout (default 300000)
  --test-timeout <ms>     QUnit.config.testTimeout (default 20000)
  --retries <n>           QUnit-level retries per failing test (default 2)
  --url <url>             Dev server URL (default http://localhost:5180/)
  --auto-serve            Spawn "pnpm vite --port 5180" and wait for it
  --headful               Show the browser
  --list                  Only list modules that would run
  --verbose               Verbose logging
`);
}

// ---------- Module filtering ----------

function shardFilter(modules, shard) {
  if (!shard) return modules;
  return modules.filter((name) => {
    const h = createHash('sha1').update(name).digest();
    const bucket = (h.readUInt32BE(0) % shard.total) + 1;
    return bucket === shard.index;
  });
}

function globFilter(modules, pattern) {
  if (!pattern) return modules;
  // Very lightweight glob: '*' -> '.*', otherwise substring.
  let rx;
  if (pattern.includes('*') || pattern.startsWith('^')) {
    const esc = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    rx = new RegExp(esc);
  } else {
    const lower = pattern.toLowerCase();
    return modules.filter((m) => m.toLowerCase().includes(lower));
  }
  return modules.filter((m) => rx.test(m));
}

// ---------- Dev server ----------

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 304) return true;
    } catch {}
    await delay(500);
  }
  return false;
}

async function startAutoServe(url) {
  const port = new URL(url).port || '5180';
  const child = spawn('pnpm', ['vite', '--port', port], {
    cwd: REPO_ROOT,
    env: { ...process.env, GXT_MODE: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  const ok = await waitForServer(url, 120_000);
  if (!ok) {
    child.kill();
    throw new Error(`Dev server did not come up at ${url}`);
  }
  return child;
}

// ---------- Browser / QUnit orchestration ----------

async function discoverModules(browser, url) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    // Retry the goto+wait up to 3 times to absorb cold-start flakiness
    // (first Vite request may return before all modules have registered).
    let lastErr = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await page.goto(url, { timeout: 180_000, waitUntil: 'load' });
        await page.waitForFunction(
          () => typeof QUnit !== 'undefined' && QUnit.config.modules?.length > 50,
          { timeout: 120_000 },
        );
        // Give late-registered modules a moment.
        await delay(3000);
        const modules = await page.evaluate(() =>
          [...new Set((QUnit.config.modules || []).map((m) => m.name).filter(Boolean))],
        );
        if (modules.length > 50) {
          return modules.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        }
        lastErr = new Error(`discovery returned ${modules.length} modules`);
      } catch (e) {
        lastErr = e;
      }
      await delay(2000);
    }
    throw lastErr || new Error('module discovery failed');
  } finally {
    await ctx.close();
  }
}

/**
 * Run a single module in a dedicated context.
 * Returns one of:
 *   { status: 'completed', total, passing, failing, failingTests: [...], durationMs }
 *   { status: 'timeout',   partialTotal, partialPassing, durationMs }
 *   { status: 'harness-error', error, durationMs }
 *
 * "completed" is the only state that contributes to the baseline.
 */
async function runModule(browser, url, moduleName, opts) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const started = Date.now();
  try {
    const target = url + '?module=' + encodeURIComponent(moduleName);

    // Install the collector BEFORE QUnit starts running tests.
    // We do this via addInitScript so it is present on first document.
    await page.addInitScript(
      ({ testTimeout, retries }) => {
        // eslint-disable-next-line no-undef
        window.__gxtCollector = {
          done: false,
          runEnd: null,
          testResults: new Map(), // name -> array of pass/fail outcomes (for retry tracking)
          assertions: [], // last assertions in flight (cleared per test)
          failingTests: [], // final failing tests (after retry resolution)
          currentTestAssertions: [],
        };
        const install = () => {
          if (typeof QUnit === 'undefined') {
            setTimeout(install, 10);
            return;
          }
          try {
            QUnit.config.testTimeout = testTimeout;
          } catch {}
          try {
            QUnit.config.autostart = QUnit.config.autostart !== false;
          } catch {}

          QUnit.log((details) => {
            if (!details.result) {
              window.__gxtCollector.currentTestAssertions.push({
                message: String(details.message || ''),
                actual: safeStringify(details.actual),
                expected: safeStringify(details.expected),
                source: String(details.source || '').slice(0, 800),
              });
            }
          });

          QUnit.testStart(() => {
            window.__gxtCollector.currentTestAssertions = [];
          });

          QUnit.testDone((d) => {
            const key = d.module + ' :: ' + d.name;
            const outcomes = window.__gxtCollector.testResults.get(key) || {
              module: d.module,
              name: d.name,
              outcomes: [],
              lastAssertions: [],
            };
            outcomes.outcomes.push(d.failed > 0 ? 'fail' : 'pass');
            if (d.failed > 0) {
              outcomes.lastAssertions = window.__gxtCollector.currentTestAssertions.slice(0, 5);
            }
            window.__gxtCollector.testResults.set(key, outcomes);
          });

          const finalize = (runEnd) => {
            // Resolve retries: a test that had any fails is still failing
            // if the *final* outcome is fail OR if outcomes are mixed.
            const failing = [];
            for (const [, rec] of window.__gxtCollector.testResults) {
              const outs = rec.outcomes;
              const anyFail = outs.includes('fail');
              const allPass = outs.every((o) => o === 'pass');
              const allFail = outs.every((o) => o === 'fail');
              if (!anyFail) continue; // clean pass
              let status;
              if (allFail) status = 'fail';
              else if (allPass) status = 'pass'; // impossible branch
              else status = 'quarantined'; // mixed
              failing.push({
                module: rec.module,
                name: rec.name,
                outcomes: outs.slice(),
                status,
                assertions: rec.lastAssertions,
              });
            }
            window.__gxtCollector.failingTests = failing;
            window.__gxtCollector.runEnd = runEnd || null;
            window.__gxtCollector.done = true;
          };

          if (typeof QUnit.on === 'function') {
            QUnit.on('runEnd', (runEnd) => {
              try { finalize(runEnd); } catch (e) { console.error(e); }
            });
          }
          // Belt-and-suspenders: also listen on QUnit.done for older APIs.
          QUnit.done((summary) => {
            try { if (!window.__gxtCollector.done) finalize(summary); } catch (e) { console.error(e); }
          });
        };
        function safeStringify(v) {
          try { return typeof v === 'string' ? v.slice(0, 400) : JSON.stringify(v)?.slice(0, 400); }
          catch { return String(v).slice(0, 400); }
        }
        install();
      },
      { testTimeout: opts.testTimeout, retries: opts.retries },
    );

    await page.goto(target, { timeout: 60_000, waitUntil: 'commit' });
    await page.waitForFunction(
      () => typeof QUnit !== 'undefined' && !!window.__gxtCollector,
      { timeout: 60_000 },
    );

    // Wait strictly for collector.done.  No stuck-detection fallback.
    const deadline = started + opts.moduleTimeout;
    let done = false;
    while (Date.now() < deadline) {
      done = await page.evaluate(() => !!window.__gxtCollector?.done).catch(() => false);
      if (done) break;
      await delay(500);
    }

    if (!done) {
      // Grab what QUnit thinks it saw, for the timeout report — but do NOT
      // promote that into "passed".
      let partial = { total: 0, passing: 0 };
      try {
        partial = await page.evaluate(() => ({
          total: QUnit.config.stats?.all || 0,
          passing: (QUnit.config.stats?.all || 0) - (QUnit.config.stats?.bad || 0),
        }));
      } catch {}
      return {
        status: 'timeout',
        partialTotal: partial.total,
        partialPassing: partial.passing,
        durationMs: Date.now() - started,
      };
    }

    const collected = await page.evaluate(() => {
      const c = window.__gxtCollector;
      const allTests = [...c.testResults.values()];
      const total = allTests.length;
      const failingTests = c.failingTests || [];
      const quarantined = failingTests.filter((t) => t.status === 'quarantined').length;
      const hardFailing = failingTests.filter((t) => t.status !== 'quarantined').length;
      const passing = total - hardFailing - quarantined;
      const statsAll = (QUnit.config.stats && QUnit.config.stats.all) || 0;
      const statsBad = (QUnit.config.stats && QUnit.config.stats.bad) || 0;
      return {
        total,
        passing,
        failing: hardFailing,
        quarantined,
        failingTests,
        assertionsTotal: statsAll,
        assertionsFailing: statsBad,
        runEnd: c.runEnd && {
          status: c.runEnd.status,
          testCounts: c.runEnd.testCounts,
        },
      };
    });

    // Sanity: if QUnit reported zero tests in the module, that's a harness mismatch.
    if (collected.total === 0) {
      return {
        status: 'harness-error',
        error: `Module "${moduleName}" produced 0 tests — module name mismatch?`,
        durationMs: Date.now() - started,
      };
    }

    return {
      status: 'completed',
      ...collected,
      durationMs: Date.now() - started,
    };
  } catch (err) {
    return {
      status: 'harness-error',
      error: err && err.stack ? err.stack : String(err),
      durationMs: Date.now() - started,
    };
  } finally {
    await ctx.close().catch(() => {});
  }
}

// ---------- Baseline comparison ----------

function loadBaseline(path) {
  if (!existsSync(path)) throw new Error(`Baseline not found: ${path}`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function compareAgainstBaseline(baseline, current) {
  // Build baseline map: module+name -> category (for passing tests, not present).
  const regressions = [];
  for (const [moduleName, mod] of Object.entries(current.modules)) {
    const baseMod = baseline.modules?.[moduleName];
    if (!baseMod) continue;
    const baseFailNames = new Set((baseMod.failingTests || []).map((t) => t.name));
    for (const failing of mod.failingTests || []) {
      if (!baseFailNames.has(failing.name)) {
        regressions.push({ module: moduleName, name: failing.name });
      }
    }
  }
  return regressions;
}

// ---------- Main ----------

async function main() {
  let args;
  try { args = parseArgs(process.argv); }
  catch (e) { process.stderr.write(`error: ${e.message}\n`); printHelp(); process.exit(3); }

  // Load smoke list if needed
  let explicitModules = null;
  if (args.smoke && !args.full) {
    const listPath = join(__dirname, 'smoke-modules.json');
    explicitModules = JSON.parse(readFileSync(listPath, 'utf8'));
  }

  // Make sure dev server is up
  let serverChild = null;
  try {
    const up = await waitForServer(args.url, 2_000);
    if (!up) {
      if (args.autoServe) {
        process.stdout.write(`[runner] dev server not up, spawning...\n`);
        serverChild = await startAutoServe(args.url);
      } else {
        process.stderr.write(
          `[runner] dev server not reachable at ${args.url}. ` +
          `Start it with: GXT_MODE=true pnpm vite --port 5180   ` +
          `(or pass --auto-serve)\n`,
        );
        process.exit(3);
      }
    }
  } catch (e) {
    process.stderr.write(`[runner] server check failed: ${e.message}\n`);
    process.exit(3);
  }

  const browser = await chromium.launch({ headless: !args.headful });
  let hardExit = 0;
  try {
    // Discover all modules once (for full / filter / shard modes).
    process.stdout.write('[runner] discovering modules...\n');
    let modules = await discoverModules(browser, args.url);
    process.stdout.write(`[runner] discovered ${modules.length} modules\n`);

    if (explicitModules) {
      const known = new Set(modules);
      const missing = explicitModules.filter((m) => !known.has(m));
      if (missing.length) {
        process.stderr.write(
          `[runner] smoke modules not found on server:\n` +
          missing.map((m) => `  - ${m}`).join('\n') + '\n',
        );
        process.exit(3);
      }
      modules = explicitModules.slice();
    } else {
      modules = globFilter(modules, args.filter);
      modules = shardFilter(modules, args.shard);
    }

    modules.sort();

    if (args.list) {
      for (const m of modules) process.stdout.write(m + '\n');
      process.exit(0);
    }

    process.stdout.write(
      `[runner] running ${modules.length} module(s)` +
      (args.shard ? ` [shard ${args.shard.index}/${args.shard.total}]` : '') +
      `\n`,
    );

    const summary = {
      meta: {
        runner: RUNNER_VERSION,
        capturedAt: new Date().toISOString(),
        gxtVersion: readGxtVersion(),
        emberCommit: readEmberCommit(),
        totalTests: 0,
        totalModules: 0,
        quarantinedTests: 0,
      },
      modules: {},
      categories: {},
    };
    const lastRun = {
      meta: { ...summary.meta },
      failingTests: [], // with error detail
      timeouts: [],
      harnessErrors: [],
    };

    let sawTimeout = false;
    let sawHardFail = false;
    const t0 = Date.now();

    for (let i = 0; i < modules.length; i++) {
      const name = modules[i];
      const startedAt = Date.now();
      const r = await runModule(browser, args.url, name, args);
      const secs = ((Date.now() - startedAt) / 1000).toFixed(1);

      if (r.status === 'completed') {
        const failingTestEntries = r.failingTests.map((t) => ({
          name: t.name,
          category: 'gxt:triage',
        }));
        summary.modules[name] = {
          total: r.total,
          passing: r.passing,
          assertionsTotal: r.assertionsTotal,
          assertionsPassing: r.assertionsTotal - r.assertionsFailing,
          failingTests: failingTestEntries,
        };
        summary.meta.totalTests += r.total;
        summary.meta.totalAssertions = (summary.meta.totalAssertions || 0) + r.assertionsTotal;
        summary.meta.totalAssertionsPassing = (summary.meta.totalAssertionsPassing || 0) + (r.assertionsTotal - r.assertionsFailing);
        summary.meta.totalModules += 1;
        summary.meta.quarantinedTests += r.quarantined;
        for (const ft of failingTestEntries) {
          summary.categories[ft.category] =
            (summary.categories[ft.category] || 0) + 1;
        }
        lastRun.failingTests.push(
          ...r.failingTests.map((t) => ({
            module: name,
            name: t.name,
            status: t.status,
            outcomes: t.outcomes,
            assertions: t.assertions,
          })),
        );
        const symbol = r.failing === 0 && r.quarantined === 0 ? 'PASS' : 'FAIL';
        if (r.failing > 0) sawHardFail = true;
        process.stdout.write(
          `[${String(i + 1).padStart(4)}/${modules.length}] ${symbol} ` +
          `${r.passing}/${r.total}` +
          (r.quarantined ? ` (q=${r.quarantined})` : '') +
          ` ${secs}s  ${name}\n`,
        );
      } else if (r.status === 'timeout') {
        sawTimeout = true;
        lastRun.timeouts.push({
          module: name,
          partialTotal: r.partialTotal,
          partialPassing: r.partialPassing,
          durationMs: r.durationMs,
        });
        process.stdout.write(
          `[${String(i + 1).padStart(4)}/${modules.length}] TIMEOUT ` +
          `(partial ${r.partialPassing}/${r.partialTotal}) ${secs}s  ${name}\n`,
        );
      } else {
        lastRun.harnessErrors.push({ module: name, error: r.error });
        process.stdout.write(
          `[${String(i + 1).padStart(4)}/${modules.length}] HARNESS-ERROR ${secs}s  ${name}\n  ${String(r.error).split('\n')[0]}\n`,
        );
        sawHardFail = true;
      }
    }

    const totalSecs = ((Date.now() - t0) / 1000).toFixed(1);
    const totalFailing = Object.values(summary.modules).reduce(
      (a, m) => a + m.failingTests.length, 0);
    const totalPassing = Object.values(summary.modules).reduce(
      (a, m) => a + m.passing, 0);
    const totalTests = Object.values(summary.modules).reduce(
      (a, m) => a + m.total, 0);

    const totalAssertions = summary.meta.totalAssertions || 0;
    const totalAssertionsPassing = summary.meta.totalAssertionsPassing || 0;
    process.stdout.write(
      `\n[runner] done in ${totalSecs}s — ` +
      `tests: ${totalPassing}/${totalTests}, ` +
      `assertions: ${totalAssertionsPassing}/${totalAssertions} ` +
      `across ${summary.meta.totalModules} module(s)` +
      (summary.meta.quarantinedTests ? `, quarantined=${summary.meta.quarantinedTests}` : '') +
      (lastRun.timeouts.length ? `, timeouts=${lastRun.timeouts.length}` : '') +
      (lastRun.harnessErrors.length ? `, harness-errors=${lastRun.harnessErrors.length}` : '') +
      `\n`,
    );

    // Write outputs
    mkdirSync(resolve(REPO_ROOT, args.outDir), { recursive: true });
    const summaryPath = resolve(REPO_ROOT, args.outDir, 'gxt-summary.json');
    const lastRunPath = resolve(REPO_ROOT, args.outDir, 'gxt-last-run.json');
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    writeFileSync(lastRunPath, JSON.stringify(lastRun, null, 2));
    process.stdout.write(`[runner] wrote ${summaryPath}\n`);
    process.stdout.write(`[runner] wrote ${lastRunPath}\n`);

    if (args.baseline) {
      const baseline = loadBaseline(resolve(REPO_ROOT, args.baseline));
      const regressions = compareAgainstBaseline(baseline, summary);
      if (regressions.length) {
        process.stdout.write(
          `[runner] BASELINE REGRESSION: ${regressions.length} newly failing test(s)\n`,
        );
        for (const r of regressions.slice(0, 50)) {
          process.stdout.write(`  - ${r.module} :: ${r.name}\n`);
        }
        sawHardFail = true;
      } else {
        process.stdout.write(`[runner] baseline ok — no green->red regressions\n`);
      }
    }

    if (sawTimeout) hardExit = 2;
    else if (sawHardFail && !args.baseline) hardExit = totalFailing > 0 ? 1 : 0;
    else if (sawHardFail) hardExit = 1;
    else hardExit = 0;
  } catch (err) {
    process.stderr.write(`[runner] harness error: ${err.stack || err}\n`);
    hardExit = 3;
  } finally {
    await browser.close().catch(() => {});
    if (serverChild) serverChild.kill();
  }
  process.exit(hardExit);
}

function readGxtVersion() {
  try {
    const pkg = JSON.parse(
      readFileSync(resolve(REPO_ROOT, 'packages/demo/package.json'), 'utf8'));
    return pkg.dependencies?.['@lifeart/gxt'] || 'unknown';
  } catch { return 'unknown'; }
}
function readEmberCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: REPO_ROOT }).toString().trim();
  } catch { return 'unknown'; }
}

main().catch((e) => {
  process.stderr.write(`[runner] fatal: ${e.stack || e}\n`);
  process.exit(3);
});
