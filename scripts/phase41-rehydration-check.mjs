#!/usr/bin/env node
/**
 * Phase 4.1 verification: call GxtRehydrationDelegate.renderServerSide three
 * times in a row against a live Vite dev server and assert none of them throw.
 *
 * Exits 0 on pass, 1 on fail.
 */

import { chromium } from 'playwright';

const URL = process.env.GXT_URL || 'http://localhost:5180/tests.html';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
});

await page.goto(URL, { waitUntil: 'load', timeout: 60_000 });

// Wait for the test harness bootstrap to finish so GXT runtime is installed.
await page.waitForFunction(
  () => typeof (globalThis).QUnit !== 'undefined',
  undefined,
  { timeout: 60_000 }
);

const result = await page.evaluate(async () => {
  const out = { attempts: [], thrown: null };
  try {
    const mod = await import(
      '/packages/@glimmer-workspace/integration-tests/lib/modes/rehydration/gxt-delegate.ts'
    );
    const Delegate = mod.GxtRehydrationDelegate;
    if (!Delegate) throw new Error('GxtRehydrationDelegate export not found');
    const delegate = new Delegate({ doc: document });
    for (let i = 0; i < 3; i++) {
      try {
        const s = delegate.renderServerSide('<div>Hi!</div>', {}, () => {});
        out.attempts.push({ ok: true, length: (s || '').length });
      } catch (e) {
        out.attempts.push({ ok: false, error: (e && e.message) || String(e) });
      }
    }
  } catch (e) {
    out.thrown = (e && e.stack) || (e && e.message) || String(e);
  }
  return out;
});

console.log('[phase41] result:', JSON.stringify(result, null, 2));
if (errors.length) {
  console.log('[phase41] page errors:');
  for (const e of errors) console.log('  ', e);
}

await browser.close();

const allOk =
  !result.thrown &&
  result.attempts.length === 3 &&
  result.attempts.every((a) => a.ok);

if (!allOk) {
  console.error('[phase41] FAIL — at least one render attempt threw');
  process.exit(1);
}

console.log('[phase41] PASS — 3/3 repeated renders did not throw');
process.exit(0);
