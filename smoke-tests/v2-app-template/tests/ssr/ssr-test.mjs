/**
 * SSR and SSG integration tests for the v2-app-template.
 *
 * These tests exercise the full SSR/SSG render pipeline using Vite's
 * programmatic API. Vite is started once in middleware mode so all tests share
 * a single server instance.
 *
 * Run:
 *   node --test tests/ssr/ssr-test.mjs
 */

import { createServer } from 'vite';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(dirname(__dirname));

/** @type {import('vite').ViteDevServer} */
let vite;
/** @type {(url: string) => Promise<{ html: string }>} */
let render;
/** @type {(url: string) => Promise<{ html: string }>} */
let prerender;

before(async () => {
  vite = await createServer({
    root: projectRoot,
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  ({ render } = await vite.ssrLoadModule('/entry-server.js'));
  ({ render: prerender } = await vite.ssrLoadModule('/entry-prerender.js'));
});

after(async () => {
  await vite.close();
});

// ---------------------------------------------------------------------------
// SSR (with rehydration markers)
// ---------------------------------------------------------------------------

describe('renderToHTML (SSR)', () => {
  it('renders the home page and returns an html string', async () => {
    const result = await render('/');
    assert.ok(
      typeof result.html === 'string' && result.html.length > 0,
      'render() should return a non-empty html string'
    );
  });

  it('renders the application template content', async () => {
    const result = await render('/');
    assert.ok(
      result.html.includes('Welcome to Ember'),
      `Expected html to contain "Welcome to Ember" but got:\n${result.html}`
    );
  });

  it('includes Glimmer rehydration markers for client-side rehydration', async () => {
    const result = await render('/');
    // The serializeBuilder inserts block markers like <!--%+b:0%--> and <!--%-b:0%-->
    // which the rehydration builder uses on the client.
    assert.ok(
      result.html.includes('%+b:') || result.html.includes('%-b:') || result.html.includes('%glmr%'),
      `Expected html to contain Glimmer rehydration markers but got:\n${result.html}`
    );
  });

  it('can render multiple URLs sequentially', async () => {
    const result1 = await render('/');
    const result2 = await render('/');
    assert.equal(result1.html, result2.html, 'Sequential renders should produce identical output');
  });
});

// ---------------------------------------------------------------------------
// SSG pre-rendering (no rehydration markers)
// ---------------------------------------------------------------------------

describe('prerender (SSG)', () => {
  it('returns a non-empty html string', async () => {
    const result = await prerender('/');
    assert.ok(
      typeof result.html === 'string' && result.html.length > 0,
      'prerender() should return a non-empty html string'
    );
  });

  it('renders the application template content', async () => {
    const result = await prerender('/');
    assert.ok(
      result.html.includes('Welcome to Ember'),
      `Expected html to contain "Welcome to Ember" but got:\n${result.html}`
    );
  });

  it('does NOT include Glimmer rehydration markers', async () => {
    const result = await prerender('/');
    assert.ok(
      !result.html.includes('%+b:') &&
        !result.html.includes('%-b:') &&
        !result.html.includes('%glmr%'),
      `Expected pre-rendered html to be free of Glimmer markers but got:\n${result.html}`
    );
  });

  it('produces cleaner html than renderToHTML', async () => {
    const ssr = await render('/');
    const ssg = await prerender('/');
    // Pre-rendered output should be shorter (markers stripped) but contain the same content.
    assert.ok(ssg.html.length < ssr.html.length, 'Pre-rendered html should be shorter (no markers)');
    assert.ok(ssg.html.includes('Welcome to Ember'), 'Content should still be present');
  });
});
