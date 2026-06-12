// Tier-2 runtime acceptance test for the consumable `ember-source-gxt`
// package (design doc docs-internal-gxt-packaging-design.md §5, "Tier 2 —
// runtime smoke"). Where gxt-consumable-test.ts proves the package RESOLVES
// (no browser, no build), this scenario proves a consumer-shaped app actually
// BUILDS and BOOTS on it:
//
//   1. `vite build` over smoke-tests/v2-app-gxt-template succeeds — the
//      non-Embroider GXT pipeline (ember-source-resolver plugin + runtime
//      template compilation, see that template's vite.config.mjs).
//   2. The built app boots in headless Chromium: the application route
//      template renders, and a `{{on "click"}}` -> classic `set()` round trip
//      updates the DOM — i.e. the GXT reactive backend is actually driving
//      the page, not just loading.
//
// Prerequisite: `node scripts/build-gxt-package.mjs` must have produced
// `dist-gxt-package/` (the CI smoke jobs run it for emberSourceGxt-* matrix
// names; the test fails loud if it is missing).

import { gxtBootAppScenarios } from './scenarios';
import type { PreparedApp } from 'scenario-tester';
import * as QUnit from 'qunit';
import { existsSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const { module: Qmodule, test } = QUnit;
QUnit.config.testTimeout = 300_000;

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.map': 'application/json',
};

function serveDir(dir: string): Promise<{ server: Server; url: string }> {
  const server = createServer((req, res) => {
    const path = (req.url || '/').split('?')[0];
    const file = join(dir, path === '/' ? 'index.html' : path);
    if (existsSync(file)) {
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(readFileSync(file));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((resolvePromise) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolvePromise({ server, url: `http://127.0.0.1:${port}/` });
    });
  });
}

gxtBootAppScenarios
  .map('gxt-boot', (_project) => {})
  .forEachScenario((scenario) => {
    Qmodule(scenario.name, function (hooks) {
      let app: PreparedApp;

      hooks.before(async () => {
        app = await scenario.prepare();
      });

      test('1: vite build succeeds against ember-source-gxt', async function (assert) {
        const result = await app.execute('npx vite build');
        assert.equal(result.exitCode, 0, result.output);
        assert.true(
          existsSync(join(app.dir, 'dist', 'index.html')),
          'the production build emitted dist/index.html'
        );
      });

      test('2: the built app boots and reacts in a browser', async function (assert) {
        // playwright resolves from the workspace root (the same install the
        // GXT test runner uses).
        const { chromium } = await import('playwright');
        const { server, url } = await serveDir(join(app.dir, 'dist'));
        const browser = await chromium.launch();
        try {
          const page = await browser.newPage();
          const pageErrors: string[] = [];
          page.on('pageerror', (e) => pageErrors.push(String(e.message)));
          await page.goto(url, { waitUntil: 'load' });
          await page.waitForSelector('[data-test-title]', { timeout: 30_000 });

          assert.equal(
            await page.textContent('[data-test-title]'),
            'Hello from Ember on GXT',
            'the application route template rendered'
          );
          assert.equal(
            await page.textContent('[data-test-count]'),
            'Count: 0',
            'initial reactive state rendered'
          );

          for (let i = 0; i < 3; i++) {
            await page.click('[data-test-increment]');
          }
          // The classic-set -> GXT cell bridge flushes on the runloop; poll
          // briefly rather than asserting synchronously.
          await page.waitForFunction(
            () => document.querySelector('[data-test-count]')?.textContent === 'Count: 3',
            undefined,
            { timeout: 10_000 }
          );
          assert.equal(
            await page.textContent('[data-test-count]'),
            'Count: 3',
            '{{on "click"}} -> set() -> DOM update round trip works'
          );
          assert.deepEqual(pageErrors, [], 'no uncaught page errors during boot + interaction');
        } finally {
          await browser.close();
          server.close();
        }
      });
    });
  });
