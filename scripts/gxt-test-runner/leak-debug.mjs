// Open the local vite dev server in a single browser context, let QUnit run
// all tests naturally, and capture browser console output to stdout. The
// __GXT_LEAK_DEBUG__ flag in index.html (set when ?gxtLeakDebug=true is
// in the URL) turns on the instrumentation in
// validator.ts/manager.ts/renderer.ts.
//
// Usage:
//   node scripts/gxt-test-runner/leak-debug.mjs > /tmp/leak.log
//   grep -E 'LEAK|cacheHIT' /tmp/leak.log
//
// Tunable: GXT_LEAK_TIMEOUT_MS (default 1800000 = 30min).

import { chromium } from 'playwright';

const URL = process.env.GXT_URL || 'http://localhost:5180/?gxtLeakDebug=true';
const TIMEOUT = Number(process.env.GXT_LEAK_TIMEOUT_MS || 1_800_000);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

let lines = 0;
let leaks = 0;
let cacheHits = 0;
page.on('console', (msg) => {
  const text = msg.text();
  if (text.includes('[leak-debug]') || text.includes(' LEAK ') || text.includes('cacheHIT')) {
    if (text.includes('LEAK')) leaks++;
    if (text.includes('cacheHIT')) cacheHits++;
    lines++;
    process.stdout.write(text + '\n');
  }
});

page.on('pageerror', (err) => {
  process.stderr.write('[pageerror] ' + err.message + '\n');
});

await page.goto(URL, { waitUntil: 'load', timeout: 60_000 });

// Wait for QUnit to complete OR our wall-clock timeout.
const result = await page.evaluate((timeoutMs) => {
  return new Promise((resolve) => {
    if (typeof QUnit === 'undefined') {
      resolve({ status: 'no-qunit' });
      return;
    }
    const t = setTimeout(() => resolve({ status: 'timeout' }), timeoutMs);
    QUnit.done((rec) => {
      clearTimeout(t);
      resolve({ status: 'done', failed: rec.failed, passed: rec.passed, total: rec.total });
    });
  });
}, TIMEOUT);

process.stdout.write(
  `---summary--- ${JSON.stringify(result)} lines=${lines} leaks=${leaks} cacheHits=${cacheHits}\n`
);

await browser.close();
