/**
 * Vite SSR entry point for the v2-app-template.
 *
 * This file is loaded by Vite's SSR runtime (via `vite.ssrLoadModule()` in
 * development or as a standard Node ESM module in production builds).
 *
 * It exports a `render(url)` function that renders the Ember application to
 * an HTML string. The output includes Glimmer rehydration markers so the
 * browser client can efficiently rehydrate the server-rendered DOM.
 *
 * @see server.js for the Express server that uses this entry point
 * @see entry-client.js for the browser-side rehydration counterpart
 */

// Polyfill browser globals that some Ember/Embroider packages reference in SSR.
// In Node.js there is no `window`; map it to `globalThis` so lookups like
// `window._embroiderRouteBundles_` work without errors.
if (typeof window === 'undefined') {
  globalThis.window = globalThis;
}

import App from './app/app.js';
import { renderToHTML } from '@ember/server-rendering';

export async function render(url) {
  return await renderToHTML(url, App);
}
