/**
 * Pre-render (SSG) entry point for the v2-app-template.
 *
 * Similar to `entry-server.js` but uses `prerender` instead of `renderToHTML`,
 * producing clean static HTML without Glimmer rehydration markers.
 * This is ideal for documentation sites and other use cases where the client
 * performs a full client-side render rather than rehydrating.
 *
 * @see entry-server.js for the SSR (rehydration) counterpart
 */
import App from './app/app.js';
import { prerender } from '@ember/server-rendering';

export async function render(url) {
  return await prerender(url, App);
}
