#!/usr/bin/env node
// Boot + interaction check for a built modern-app variant (NOT a test-runner
// invocation): static-serves dist/<variant>, loads it in headless Chromium and
// asserts render, a tracked update, the tracked collection, the custom modifier,
// URL sanitization of a bound attribute, LinkTo navigation across both routes,
// and that the app's decorators need no `dt7948` global.
//
//   node smoke-tests/modern-app/boot-check.mjs <distDir> [--json out.json]
//   node smoke-tests/modern-app/boot-check.mjs --url <running app URL> [--json out.json]
//     (--url: check an already-served app, e.g. a vite dev server, instead of
//     static-serving a build)
//
// Exit 0 = every check passed; 1 = some check failed (details printed).
import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { chromium } from 'playwright';

const argOf = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : null;
};
const jsonOut = argOf('--json');
const appUrl = argOf('--url');
const distDir = appUrl ? null : resolve(process.argv[2] || '');

let server = null;
let url = appUrl;
if (!appUrl) {
  const htmlFile = existsSync(distDir)
    ? readdirSync(distDir).find((f) => f.endsWith('.html'))
    : null;
  if (!htmlFile) {
    console.error(`[boot-check] no .html entry in ${distDir}`);
    process.exit(2);
  }
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  server = createServer((req, res) => {
    const path = (req.url || '/').split('?')[0].split('#')[0];
    const file = join(distDir, path === '/' ? htmlFile : path);
    if (file.startsWith(distDir) && existsSync(file)) {
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(readFileSync(file));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${server.address().port}/`;
}

const checks = [];
const pageErrors = [];
const consoleErrors = [];
const scripts = [];
function record(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`[boot-check] ${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => pageErrors.push(String(e.stack || e.message).slice(0, 1500)));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 500));
  });
  page.on('response', (r) => {
    if (r.request().resourceType() === 'script') scripts.push(r.url());
  });

  const text = async (sel) => {
    const el = await page.$(sel);
    return el ? (await el.textContent()).replace(/\s+/g, ' ').trim() : null;
  };
  const waitText = async (name, sel, expected, timeout = 5000) => {
    try {
      await page.waitForFunction(
        ([s, e]) => document.querySelector(s)?.textContent.replace(/\s+/g, ' ').trim() === e,
        [sel, expected],
        { timeout }
      );
      record(name, true, `${sel} = "${expected}"`);
      return true;
    } catch {
      record(name, false, `${sel}: expected "${expected}", got ${JSON.stringify(await text(sel))}`);
      return false;
    }
  };
  const count = (sel) => page.$$eval(sel, (els) => els.length);

  await page.goto(url, { waitUntil: 'load' });
  const booted = await waitText(
    'render: route template + h1',
    '[data-test-title]',
    'Modern app',
    15000
  );
  if (booted) {
    // The app's decorators (`@tracked`, `@action`, `@service`, in .js and
    // .gjs) import decorator-transforms' runtime; none needs a global.
    record('decorators: no dt7948 global', !(await page.evaluate(() => 'dt7948' in globalThis)));
    await waitText('render: class component @tracked', '[data-test-count]', 'Count: 0 (x2 = 0)');
    await waitText(
      'render: plain-function helper + service getter',
      '[data-test-total]',
      'Total: $1.50'
    );
    const tagged = await page
      .$eval('.counter', (el) => el.getAttribute('data-tagged'))
      .catch(() => null);
    record(
      'modifier: setModifierManager function modifier',
      tagged === 'main',
      `data-tagged=${tagged}`
    );
    const formUrl = await page
      .$eval('[data-test-form-url]', (el) => el.getAttribute('formaction'))
      .catch(() => null);
    record(
      'attributes: a bound camelCased URL attribute (formAction) is sanitized',
      formUrl === 'unsafe:javascript:alert(1)',
      `formaction=${formUrl}`
    );
    record(
      'each/let: template-only component list',
      (await count('[data-test-items] li')) === 1,
      `li=${await count('[data-test-items] li')}`
    );
    await waitText('if: conditional block', '[data-test-item-count]', '1 items');

    await page.click('[data-test-increment]');
    await waitText('update: {{on}} click -> @tracked', '[data-test-count]', 'Count: 1 (x2 = 2)');
    await waitText('update: trackedArray push -> getter', '[data-test-total]', 'Total: $2.50');
    await waitText('update: trackedArray push -> each', '[data-test-item-count]', '2 items');
    record(
      'update: each row added',
      (await count('[data-test-items] li')) === 2,
      `li=${await count('[data-test-items] li')}`
    );

    await page.click('[data-test-link-about]');
    await waitText(
      'route: LinkTo -> about (model + service)',
      '[data-test-about]',
      'About: 2 items for guest'
    );
    record('route: index torn down', (await page.$('[data-test-title]')) === null);

    await page.click('[data-test-link-index]');
    await waitText('route: LinkTo -> index again', '[data-test-title]', 'Modern app');
    await waitText('route: service state survives navigation', '[data-test-item-count]', '2 items');
  }
  record(
    'no uncaught page errors',
    pageErrors.length === 0,
    pageErrors.length ? pageErrors[0].split('\n')[0] : ''
  );
} finally {
  await browser.close();
  server?.close();
}

const failed = checks.filter((c) => !c.ok);
const summary = {
  distDir,
  url: appUrl,
  passed: checks.length - failed.length,
  total: checks.length,
  checks,
  pageErrors,
  consoleErrors: consoleErrors.slice(0, 20),
  scripts,
};
if (pageErrors.length) console.log(`[boot-check] first page error:\n${pageErrors[0]}`);
if (consoleErrors.length)
  console.log(`[boot-check] console errors (${consoleErrors.length}), first: ${consoleErrors[0]}`);
console.log(`[boot-check] ${summary.passed}/${summary.total} checks passed`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(summary, null, 2));
process.exit(failed.length ? 1 : 0);
