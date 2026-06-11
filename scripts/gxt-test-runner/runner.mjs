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
import { writeFileSync, mkdirSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { spawn, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..', '..');
const RUNNER_VERSION = 'scripts/gxt-test-runner/runner.mjs@v1';

// ---------- Boot diagnostics ----------
// The single most common CI-only failure is "the page never boots": the QUnit
// test page loads but fewer than the expected modules register, so discovery's
// waitForFunction times out. Locally everything is green, so the only way to
// know WHY in CI is to capture the evidence the page/server emit while booting.
// These ring buffers retain the tail of: the vite dev server's own stdout/stderr
// (transform 500s, staleness warnings, resolve failures), the page's console
// messages, uncaught page errors, failed network requests, and any HTTP >= 400
// responses (a vite transform error surfaces as a 500 whose URL names the exact
// module that broke the eager-glob import chain). dumpDiagnostics() prints them
// on discovery failure (and any top-level harness error).
const RING_MAX = 400;
const serverLogLines = [];
const pageConsole = [];
const pageErrors = [];
const pageBadResponses = [];
const pageFailedRequests = [];
function ringPush(arr, line) {
  arr.push(line);
  if (arr.length > RING_MAX) arr.shift();
}
function captureServerLog(buf) {
  const text = buf.toString();
  for (const line of text.split(/\r?\n/)) {
    // Strip ANSI so the CI log stays grep-able.
    const clean = line.replace(/\x1b\[[0-9;]*m/g, '');
    if (clean.trim().length === 0) continue;
    ringPush(serverLogLines, clean);
  }
}
function attachPageDiagnostics(page) {
  page.on('console', (msg) => {
    try {
      ringPush(pageConsole, `[${msg.type()}] ${msg.text()}`.slice(0, 1000));
    } catch {}
  });
  page.on('pageerror', (err) => {
    try {
      ringPush(
        pageErrors,
        String(err && err.stack ? err.stack : err)
          .split('\n')
          .slice(0, 5)
          .join('\n')
      );
    } catch {}
  });
  page.on('requestfailed', (req) => {
    try {
      const f = req.failure();
      ringPush(pageFailedRequests, `${req.method()} ${req.url()} — ${(f && f.errorText) || 'failed'}`);
    } catch {}
  });
  page.on('response', (res) => {
    try {
      const s = res.status();
      if (s >= 400) ringPush(pageBadResponses, `${s} ${res.url()}`);
    } catch {}
  });
}
let _diagnosticsDumped = false;
async function dumpDiagnostics(page, label) {
  if (_diagnosticsDumped) return;
  _diagnosticsDumped = true;
  const w = (s) => process.stderr.write(s);
  w(`\n[runner] ===== BOOT DIAGNOSTICS (${label}) =====\n`);
  if (page) {
    try {
      const state = await Promise.race([
        page.evaluate(() => ({
          url: location.href,
          qunit: typeof QUnit,
          moduleCount:
            typeof QUnit !== 'undefined' && QUnit.config && QUnit.config.modules
              ? QUnit.config.modules.length
              : -1,
          hasCollector: !!window.__gxtCollector,
          title: document.title,
          // A vite runtime-error overlay (or a thrown boot error) leaves its
          // message in the body — the first 1.2k usually contains the stack.
          bodyText: ((document.body && document.body.innerText) || '').slice(0, 1200),
        })),
        new Promise((_, rej) => setTimeout(() => rej(new Error('diag-eval-timeout')), 5000)),
      ]);
      w(
        `[runner] page: url=${state.url} QUnit=${state.qunit} ` +
          `modules=${state.moduleCount} collector=${state.hasCollector} ` +
          `title=${JSON.stringify(state.title)}\n`
      );
      if (state.bodyText && state.bodyText.trim()) {
        w(`[runner] page body text (first 1.2k):\n${state.bodyText}\n`);
      }
    } catch (e) {
      w(`[runner] page.evaluate for diagnostics failed: ${e.message}\n`);
    }
  }
  if (pageBadResponses.length) {
    w(`[runner] HTTP >=400 responses (${pageBadResponses.length}; these name the broken modules):\n`);
    for (const l of pageBadResponses.slice(-40)) w(`    ${l}\n`);
  }
  if (pageFailedRequests.length) {
    w(`[runner] failed requests (last 20 of ${pageFailedRequests.length}):\n`);
    for (const l of pageFailedRequests.slice(-20)) w(`    ${l}\n`);
  }
  if (pageErrors.length) {
    w(`[runner] uncaught page errors (last 20 of ${pageErrors.length}):\n`);
    for (const l of pageErrors.slice(-20)) w(`    ${l.replace(/\n/g, '\n      ')}\n`);
  }
  if (pageConsole.length) {
    w(`[runner] page console (last 60 of ${pageConsole.length}):\n`);
    for (const l of pageConsole.slice(-60)) w(`    ${l}\n`);
  }
  if (serverLogLines.length) {
    w(`[runner] vite server log (last 80 of ${serverLogLines.length}):\n`);
    for (const l of serverLogLines.slice(-80)) w(`    ${l}\n`);
  } else {
    w(`[runner] (no vite server log captured — server was already up, or --auto-serve not used)\n`);
  }
  w(`[runner] ===== END BOOT DIAGNOSTICS =====\n`);
}

// Lock file prevents concurrent runner instances. Each runner spawns 1 chromium
// + ~8 child processes; parallel runs cause the laptop freeze documented in PR
// #21340 (17+ chrome-headless-shell at 55%+ CPU each).
const LOCK_PATH = '/tmp/gxt-test-runner.lock';
let browserRef = null;
let serverChildRef = null;
let cleanupRan = false;

function acquireLock() {
  if (existsSync(LOCK_PATH)) {
    const existing = readFileSync(LOCK_PATH, 'utf8').trim();
    const pid = parseInt(existing, 10);
    if (pid > 0) {
      try {
        process.kill(pid, 0);
        process.stderr.write(
          `[runner] another instance is running (pid=${pid}). ` +
            `If you're sure it's not, rm ${LOCK_PATH} and retry.\n`
        );
        process.exit(3);
      } catch (e) {
        if (e.code === 'ESRCH') unlinkSync(LOCK_PATH);
        else throw e;
      }
    }
  }
  writeFileSync(LOCK_PATH, String(process.pid));
}

function releaseLock() {
  try {
    if (existsSync(LOCK_PATH)) {
      const existing = readFileSync(LOCK_PATH, 'utf8').trim();
      if (parseInt(existing, 10) === process.pid) unlinkSync(LOCK_PATH);
    }
  } catch {}
}

async function cleanup(reason) {
  if (cleanupRan) return;
  cleanupRan = true;
  process.stderr.write(`[runner] cleanup (${reason})\n`);
  try {
    if (browserRef) await browserRef.close();
  } catch (e) {
    process.stderr.write(`[runner] browser.close error: ${e.message}\n`);
  }
  try {
    if (serverChildRef) serverChildRef.kill();
  } catch {}
  releaseLock();
}

for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, async () => {
    await cleanup(sig);
    process.exit(130);
  });
}
process.on('uncaughtException', async (e) => {
  process.stderr.write(`[runner] uncaughtException: ${e.stack || e.message}\n`);
  await cleanup('uncaughtException');
  process.exit(1);
});

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
    // Per-test progress watchdog: if no QUnit assertion or testDone fires for
    // this many ms, the runner aborts the module as a timeout (instead of
    // burning the full moduleTimeout on a renderer spinning at 100% CPU).
    perTestTimeout: 30_000,
    // GC cadence: call window.gc() (when exposed via --js-flags=--expose-gc)
    // every Nth test to release cumulative GXT pipeline pressure.
    gcInterval: 50,
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
      case '--smoke':
        args.smoke = true;
        break;
      case '--full':
        args.full = true;
        break;
      case '--filter':
        args.filter = next();
        break;
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
      case '--baseline':
        args.baseline = next();
        break;
      case '--out-dir':
        args.outDir = next();
        break;
      case '--module-timeout':
        args.moduleTimeout = Number(next());
        break;
      case '--test-timeout':
        args.testTimeout = Number(next());
        break;
      case '--per-test-timeout':
        args.perTestTimeout = Number(next());
        break;
      case '--gc-interval':
        args.gcInterval = Number(next());
        break;
      case '--retries':
        args.retries = Number(next());
        break;
      case '--url':
        args.url = next();
        break;
      case '--auto-serve':
        args.autoServe = true;
        break;
      case '--headful':
        args.headful = true;
        break;
      case '--verbose':
        args.verbose = true;
        break;
      case '--list':
        args.list = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
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
  --per-test-timeout <ms> Abort module if no QUnit progress for this long (default 30000)
  --gc-interval <n>       Call window.gc() every Nth test (default 50). Requires --expose-gc.
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
  // Retain the dev server's output in a ring buffer so dumpDiagnostics() can
  // show WHY the page failed to boot (transform 500s, resolve failures, the
  // GXT staleness banner, etc.). Previously discarded — which is exactly why
  // CI logs showed nothing but the downstream waitForFunction timeout.
  child.stdout.on('data', captureServerLog);
  child.stderr.on('data', captureServerLog);
  const ok = await waitForServer(url, 120_000);
  if (!ok) {
    child.kill();
    throw new Error(`Dev server did not come up at ${url}`);
  }
  return child;
}

// ---------- Browser / QUnit orchestration ----------

// Single shared browser session (one context, ONE page/tab) reused for
// discovery and every module run. A page can only be replaced — never
// multiplied — and only when it hung (infinite JS loop / watchdog timeout).
// Storage is cleared between modules so behavior matches the historical
// fresh-context-per-module semantics the baseline was captured with.
let _session = null;
let _sessionOpts = null;

async function getSession(browser, opts) {
  if (_session) return _session;
  const ctx = await browser.newContext();
  if (opts) {
    await installCollectorInitScript(ctx, opts);
    _sessionOpts = opts;
  }
  const page = await ctx.newPage();
  // Capture console / pageerror / failed-request / HTTP>=400 evidence for
  // boot-failure diagnostics. Re-attached on every fresh session.
  attachPageDiagnostics(page);
  _session = { ctx, page };
  return _session;
}

async function disposeSession() {
  if (!_session) return;
  const { ctx } = _session;
  _session = null;
  // ctx.close() may hang if the page is in an infinite JS loop. Race it.
  try {
    await Promise.race([
      ctx.close(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('ctx-close-timeout')), 5000)),
    ]);
  } catch {
    try {
      for (const p of ctx.pages()) await p.close({ runBeforeUnload: false }).catch(() => {});
    } catch {}
    try { await ctx.close().catch(() => {}); } catch {}
  }
}

// Best-effort: clear web storage so the next module starts as clean as a
// fresh context would (QUnit's reorder feature persists per-test state in
// sessionStorage). Raced so a busy page can't stall the loop.
async function clearPageStorage(page) {
  try {
    await Promise.race([
      page.evaluate(() => {
        try { sessionStorage.clear(); } catch {}
        try { localStorage.clear(); } catch {}
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('storage-clear-timeout')), 2000)),
    ]);
  } catch {}
}

async function discoverModules(browser, url) {
  // Reuses the shared single-page session; it stays open for the module loop.
  const { page } = await getSession(browser, _sessionOpts);
  {
    // Append `?filter=__gxt_discover_nothing__` so QUnit's autostart matches
    // zero tests. Modules still register at module-init time (which is what
    // discovery cares about), but the renderer doesn't burn minutes running
    // every test in the suite while we're trying to count them. Without this
    // filter, the renderer stays so busy executing tests that
    // `page.evaluate` calls never get a JS slot and discovery times out.
    const sep = url.includes('?') ? '&' : '?';
    const discoverUrl = url + sep + 'filter=__gxt_discover_nothing__';
    let lastErr = null;
    // Retry the goto+wait up to 3 times to absorb cold-start flakiness
    // (first Vite request may return before all modules have registered).
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const tGoto = Date.now();
        await page.goto(discoverUrl, { timeout: 180_000, waitUntil: 'load' });
        process.stdout.write(
          `[runner] discovery attempt ${attempt}: goto resolved in ${((Date.now() - tGoto) / 1000).toFixed(1)}s — ` +
            `waiting for QUnit modules to register...\n`
        );
        // NOTE: the 3rd arg is the options bag. Passing `{ timeout }` as the
        // 2nd arg makes Playwright treat it as the (ignored) page-function
        // argument and silently fall back to the 30s default — too short for
        // the full suite (900+ modules registering asynchronously under the
        // vite dev server). Pass `undefined` as the arg so the timeout applies.
        await page.waitForFunction(
          () => typeof QUnit !== 'undefined' && QUnit.config.modules?.length > 50,
          undefined,
          { timeout: 120_000 }
        );
        // Modules register asynchronously (one ESM request each) for many
        // seconds; a fixed delay can read an incomplete set. Poll until the
        // count stops growing for several consecutive reads (stable), capped.
        let prev = -1;
        let stableReads = 0;
        for (let i = 0; i < 90; i++) {
          const n = await page.evaluate(() => (QUnit.config.modules || []).length);
          if (n === prev) {
            if (++stableReads >= 4) break;
          } else {
            stableReads = 0;
            prev = n;
          }
          await delay(1000);
        }
        const modules = await page.evaluate(() => [
          ...new Set((QUnit.config.modules || []).map((m) => m.name).filter(Boolean)),
        ]);
        if (modules.length > 50) {
          return modules.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        }
        lastErr = new Error(`discovery returned ${modules.length} modules`);
      } catch (e) {
        lastErr = e;
      }
      process.stderr.write(
        `[runner] discovery attempt ${attempt}/3 failed: ${lastErr && lastErr.message}\n`
      );
      await delay(2000);
    }
    // Page never booted with the expected module set. Dump everything we
    // captured so CI logs reveal the root cause instead of a bare timeout.
    await dumpDiagnostics(page, 'module-discovery').catch(() => {});
    throw lastErr || new Error('module discovery failed');
  }
}

/**
 * Run a single module in the shared single-page session.
 * Returns one of:
 *   { status: 'completed', total, passing, failing, failingTests: [...], durationMs }
 *   { status: 'timeout',   partialTotal, partialPassing, durationMs }
 *   { status: 'harness-error', error, durationMs }
 *
 * "completed" is the only state that contributes to the baseline.
 */
// Install the QUnit collector on the shared context. addInitScript at the
// CONTEXT level runs before every navigation in the context, so one install
// covers every module run in the shared single-page session.
async function installCollectorInitScript(ctx, opts) {
  await ctx.addInitScript(
      ({ testTimeout, retries, gcInterval }) => {
        // Morph retirement: the former runtime __GXT_SPIKE_SKIP_MORPH force-set
        // is gone — fine-grained is the build-time default (__GXT_SKIP_MORPH__).
        // eslint-disable-next-line no-undef
        window.__gxtCollector = {
          done: false,
          runEnd: null,
          testResults: new Map(), // name -> array of pass/fail outcomes (for retry tracking)
          assertions: [], // last assertions in flight (cleared per test)
          failingTests: [], // final failing tests (after retry resolution)
          currentTestAssertions: [],
          // Per-test timeout tracking — caller polls these to detect a stuck test.
          currentTestName: null,
          currentTestStartedAt: 0,
          lastProgressAt: Date.now(),
          testsCompleted: 0,
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
            // Any assertion is forward progress — keep the watchdog quiet.
            window.__gxtCollector.lastProgressAt = Date.now();
            if (!details.result) {
              window.__gxtCollector.currentTestAssertions.push({
                message: String(details.message || ''),
                actual: safeStringify(details.actual),
                expected: safeStringify(details.expected),
                source: String(details.source || '').slice(0, 800),
              });
            }
          });

          QUnit.testStart((d) => {
            window.__gxtCollector.currentTestAssertions = [];
            window.__gxtCollector.currentTestName = (d && (d.module + ' :: ' + d.name)) || null;
            window.__gxtCollector.currentTestStartedAt = Date.now();
            window.__gxtCollector.lastProgressAt = Date.now();
            // Periodic GC: every N tests trigger window.gc() (exposed via
            // --js-flags=--expose-gc) to release GXT pipeline pressure that
            // builds up cumulatively. Best-effort; missing gc() = harmless.
            const idx = window.__gxtCollector.testsCompleted;
            if (gcInterval > 0 && idx > 0 && idx % gcInterval === 0) {
              try {
                if (typeof window.gc === 'function') {
                  window.gc();
                } else {
                  // DEBUG-warn once — gc() unavailable means --expose-gc flag
                  // didn't take. Test still runs; just no relief valve.
                  if (!window.__gxtGcWarned) {
                    window.__gxtGcWarned = true;
                    console.debug('[gxt-runner] window.gc() unavailable; --expose-gc not active');
                  }
                }
              } catch (e) {
                if (!window.__gxtGcWarned) {
                  window.__gxtGcWarned = true;
                  console.debug('[gxt-runner] window.gc() threw: ' + (e && e.message));
                }
              }
            }
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
            window.__gxtCollector.testsCompleted += 1;
            window.__gxtCollector.lastProgressAt = Date.now();
            window.__gxtCollector.currentTestName = null;
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
              else if (allPass)
                status = 'pass'; // impossible branch
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
              try {
                finalize(runEnd);
              } catch (e) {
                console.error(e);
              }
            });
          }
          // Belt-and-suspenders: also listen on QUnit.done for older APIs.
          QUnit.done((summary) => {
            try {
              if (!window.__gxtCollector.done) finalize(summary);
            } catch (e) {
              console.error(e);
            }
          });
        };
        function safeStringify(v) {
          try {
            return typeof v === 'string' ? v.slice(0, 400) : JSON.stringify(v)?.slice(0, 400);
          } catch {
            return String(v).slice(0, 400);
          }
        }
        install();
      },
      { testTimeout: opts.testTimeout, retries: opts.retries, gcInterval: opts.gcInterval || 50 }
  );
}

async function runModule(browser, url, moduleName, opts) {
  const { page } = await getSession(browser, opts);
  const started = Date.now();
  try {
    const target = url + '?module=' + encodeURIComponent(moduleName);

    await page.goto(target, { timeout: 60_000, waitUntil: 'commit' });
    await page.waitForFunction(() => typeof QUnit !== 'undefined' && !!window.__gxtCollector, {
      timeout: 60_000,
    });

    // Wait for collector.done, with a per-test watchdog. If no forward QUnit
    // progress (assertion / testDone) for `perTestTimeout` ms, treat the
    // module as stuck and abort the gate — far better than burning the full
    // moduleTimeout on a renderer that's spinning at 100% CPU. This catches
    // the Component Tracked Properties canary's setTimeout race after ~800
    // cumulative tests (see project_gxt_cumulative_failures.md).
    const deadline = started + opts.moduleTimeout;
    const perTestTimeout = opts.perTestTimeout || 30_000;
    const EVAL_TIMEOUT_MS = 5_000;
    let done = false;
    let stuckTest = null;
    let evalStuckSince = null;
    // Track last successfully-read totals for stuck-test fallback reporting.
    let lastStatsAll = 0;
    let lastStatsBad = 0;
    while (Date.now() < deadline) {
      // Race page.evaluate against a short JS timeout. When the renderer is
      // stuck in a JS infinite loop, page.evaluate never returns because the
      // renderer can't schedule it. Treat a non-responsive renderer as stuck.
      let state;
      try {
        state = await Promise.race([
          page.evaluate(() => {
            const c = window.__gxtCollector || {};
            const s = (typeof QUnit !== 'undefined' && QUnit.config && QUnit.config.stats) || {};
            return {
              done: !!c.done,
              currentTestName: c.currentTestName || null,
              lastProgressAt: c.lastProgressAt || 0,
              statsAll: s.all || 0,
              statsBad: s.bad || 0,
            };
          }),
          new Promise((_, rej) =>
            setTimeout(() => rej(new Error('evaluate-timeout')), EVAL_TIMEOUT_MS)
          ),
        ]);
        evalStuckSince = null;
      } catch {
        if (!evalStuckSince) evalStuckSince = Date.now();
        if (Date.now() - evalStuckSince > perTestTimeout) {
          stuckTest = stuckTest || '<renderer unresponsive>';
          break;
        }
        await delay(500);
        continue;
      }
      done = state.done;
      if (done) break;
      if (state.currentTestName) stuckTest = state.currentTestName;
      if (typeof state.statsAll === 'number') lastStatsAll = state.statsAll;
      if (typeof state.statsBad === 'number') lastStatsBad = state.statsBad;
      if (
        state.lastProgressAt > 0 &&
        state.currentTestName &&
        Date.now() - state.lastProgressAt > perTestTimeout
      ) {
        break;
      }
      await delay(500);
    }

    if (!done) {
      // Grab what QUnit thinks it saw, for the timeout report — but do NOT
      // promote that into "passed". Race the eval — renderer may still be
      // unresponsive after the per-test watchdog fired. Fall back to the
      // last successfully-polled stats so the timeout report shows real
      // progress instead of 0/0 when post-loop evaluate also hangs.
      let partial = { total: lastStatsAll, passing: lastStatsAll - lastStatsBad };
      try {
        partial = await Promise.race([
          page.evaluate(() => ({
            total: QUnit.config.stats?.all || 0,
            passing: (QUnit.config.stats?.all || 0) - (QUnit.config.stats?.bad || 0),
          })),
          new Promise((_, rej) => setTimeout(() => rej(new Error('partial-eval-timeout')), 3000)),
        ]);
      } catch {}
      // The page may be wedged (stuck test / infinite loop) — replace the
      // session so the NEXT module gets a fresh page. Still one tab at a time.
      await disposeSession();
      return {
        status: 'timeout',
        partialTotal: partial.total,
        partialPassing: partial.passing,
        durationMs: Date.now() - started,
        stuckTest,
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

    // Leave the page clean for the next module's navigation (QUnit reorder
    // state etc. lives in web storage; the baseline was captured with fresh
    // contexts, so reused-page runs must start equally clean).
    await clearPageStorage(page);

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
    // The page may be in an unknown state (crash, navigation failure) —
    // replace the session so the next module starts on a fresh page.
    await disposeSession();
    return {
      status: 'harness-error',
      error: err && err.stack ? err.stack : String(err),
      durationMs: Date.now() - started,
    };
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
  try {
    args = parseArgs(process.argv);
  } catch (e) {
    process.stderr.write(`error: ${e.message}\n`);
    printHelp();
    process.exit(3);
  }

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
            `(or pass --auto-serve)\n`
        );
        process.exit(3);
      }
    }
  } catch (e) {
    process.stderr.write(`[runner] server check failed: ${e.message}\n`);
    process.exit(3);
  }

  acquireLock();
  const browser = await chromium.launch({
    headless: !args.headful,
    args: [
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-software-rasterizer',
      '--no-sandbox',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI,IsolateOrigins,site-per-process',
      '--disable-audio-output',
      // Expose window.gc() so cumulative test pages can release GXT pipeline
      // pressure between tests. Without this, the render canary (which has a
      // setTimeout(100ms)→assert(+200ms) race) hangs at 100% CPU after ~800
      // cumulative tests because GXT revalidation can't keep up.
      '--js-flags=--expose-gc',
    ],
  });
  browserRef = browser;
  serverChildRef = serverChild;
  let hardExit = 0;
  try {
    // Create the single shared session up front (installs the collector init
    // script on the context) — discovery and every module reuse this ONE tab.
    await getSession(browser, args);
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
            missing.map((m) => `  - ${m}`).join('\n') +
            '\n'
        );
        process.exit(3);
      }
      modules = explicitModules.slice();
      // Apply shard / filter to the smoke list too. Without this each CI
      // shard ran the full 14-module list, multiplying compute by 4× for
      // identical results.
      modules = globFilter(modules, args.filter);
      modules = shardFilter(modules, args.shard);
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
        `\n`
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

    let modulesSinceRecycle = 0;
    for (let i = 0; i < modules.length; i++) {
      const name = modules[i];
      const startedAt = Date.now();
      // Proactive session recycle: a single long-lived page accumulates
      // renderer GC debt across hundreds of heavy test realms; periodically a
      // goto lands in a multi-second GC pause and trips the boot watchdog
      // (observed as scattered `partial 0/0` ~30s timeouts). Recycling every
      // 50 modules bounds that debt while keeping ONE tab at any moment.
      if (modulesSinceRecycle >= 50) {
        await disposeSession();
        modulesSinceRecycle = 0;
      }
      let r = await runModule(browser, args.url, name, args);
      modulesSinceRecycle += 1;
      // A `partial 0/0` timeout means the page never booted — almost always
      // the GC-pause artifact above, not a real hang. runModule already
      // disposed the session on timeout, so one retry runs on a fresh page.
      if (r.status === 'timeout' && (r.partialTotal || 0) === 0) {
        process.stdout.write(`[ ${String(i + 1).padStart(3)}/${modules.length}] retrying after cold timeout: ${name}\n`);
        r = await runModule(browser, args.url, name, args);
        modulesSinceRecycle = 1;
      }
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
        summary.meta.totalAssertionsPassing =
          (summary.meta.totalAssertionsPassing || 0) + (r.assertionsTotal - r.assertionsFailing);
        summary.meta.totalModules += 1;
        summary.meta.quarantinedTests += r.quarantined;
        for (const ft of failingTestEntries) {
          summary.categories[ft.category] = (summary.categories[ft.category] || 0) + 1;
        }
        lastRun.failingTests.push(
          ...r.failingTests.map((t) => ({
            module: name,
            name: t.name,
            status: t.status,
            outcomes: t.outcomes,
            assertions: t.assertions,
          }))
        );
        const symbol = r.failing === 0 && r.quarantined === 0 ? 'PASS' : 'FAIL';
        if (r.failing > 0) sawHardFail = true;
        process.stdout.write(
          `[${String(i + 1).padStart(4)}/${modules.length}] ${symbol} ` +
            `${r.passing}/${r.total}` +
            (r.quarantined ? ` (q=${r.quarantined})` : '') +
            ` ${secs}s  ${name}\n`
        );
      } else if (r.status === 'timeout') {
        sawTimeout = true;
        lastRun.timeouts.push({
          module: name,
          partialTotal: r.partialTotal,
          partialPassing: r.partialPassing,
          durationMs: r.durationMs,
          stuckTest: r.stuckTest || null,
        });
        process.stdout.write(
          `[${String(i + 1).padStart(4)}/${modules.length}] TIMEOUT ` +
            `(partial ${r.partialPassing}/${r.partialTotal}) ${secs}s  ${name}` +
            (r.stuckTest ? `\n    stuck-at: ${r.stuckTest}` : '') +
            `\n`
        );
      } else {
        lastRun.harnessErrors.push({ module: name, error: r.error });
        process.stdout.write(
          `[${String(i + 1).padStart(4)}/${modules.length}] HARNESS-ERROR ${secs}s  ${name}\n  ${String(r.error).split('\n')[0]}\n`
        );
        sawHardFail = true;
      }
    }

    const totalSecs = ((Date.now() - t0) / 1000).toFixed(1);
    const totalFailing = Object.values(summary.modules).reduce(
      (a, m) => a + m.failingTests.length,
      0
    );
    const totalPassing = Object.values(summary.modules).reduce((a, m) => a + m.passing, 0);
    const totalTests = Object.values(summary.modules).reduce((a, m) => a + m.total, 0);

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
        `\n`
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
          `[runner] BASELINE REGRESSION: ${regressions.length} newly failing test(s)\n`
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
    // Surface boot evidence for any harness error (no-op if discovery already
    // dumped it). _session may be live even when the error came from elsewhere.
    try {
      await dumpDiagnostics(_session && _session.page, 'harness-error');
    } catch {}
    hardExit = 3;
  } finally {
    await cleanup('finally');
  }
  process.exit(hardExit);
}

function readGxtVersion() {
  try {
    const pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, 'packages/demo/package.json'), 'utf8'));
    return pkg.dependencies?.['@lifeart/gxt'] || 'unknown';
  } catch {
    return 'unknown';
  }
}
function readEmberCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: REPO_ROOT }).toString().trim();
  } catch {
    return 'unknown';
  }
}

main().catch(async (e) => {
  process.stderr.write(`[runner] fatal: ${e.stack || e}\n`);
  await cleanup('catch');
  process.exit(3);
});
