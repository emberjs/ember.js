/**
 * Vite SSR development and preview server for the v2-app-template.
 *
 * In development mode (NODE_ENV !== 'production'), Vite's dev server is used
 * as middleware so HMR and on-demand module transformation work as expected.
 * The server entry is loaded via `vite.ssrLoadModule()` on every request so
 * code changes are picked up without a full server restart.
 *
 * In production mode the pre-built server bundle is loaded once at startup.
 *
 * Usage:
 *   Development:  node server.js
 *   Production:   NODE_ENV=production node server.js
 *
 * Build for production SSR:
 *   vite build                            # builds the client
 *   vite build --ssr app/entry-server.js  # builds the server bundle
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env['NODE_ENV'] === 'production';
const port = process.env['PORT'] ? parseInt(process.env['PORT'], 10) : 4200;

async function createServer() {
  // The index.html template – in production this is the already-built file.
  const templateHtml = isProduction
    ? fs.readFileSync(path.resolve(__dirname, 'dist/client/index.html'), 'utf-8')
    : fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');

  // In production we load the pre-built server entry directly.
  // In development Vite handles module loading and transformation.
  let ssrManifest;
  if (isProduction) {
    ssrManifest = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, 'dist/client/.vite/ssr-manifest.json'), 'utf-8')
    );
  }

  /** @type {import('vite').ViteDevServer | undefined} */
  let vite;

  // We use a minimal built-in HTTP server that mimics what an Express server
  // would do, without requiring Express as a dependency.
  const { default: http } = await import('node:http');

  if (!isProduction) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
  }

  /**
   * Handles an incoming SSR request.
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async function handleRequest(req, res) {
    const url = req.url ?? '/';

    try {
      let template = templateHtml;
      let render;

      if (!isProduction && vite) {
        // Apply Vite's HTML transforms (injects HMR client, etc.).
        template = await vite.transformIndexHtml(url, template);
        // Load the server entry fresh on every request during development.
        ({ render } = await vite.ssrLoadModule('/entry-server.js'));
      } else {
        // Production: use the pre-built server bundle.
        ({ render } = await import('./dist/server/entry-server.js'));
      }

      const rendered = await render(url);

      // Inject the rendered HTML and mark the body so the client knows to
      // rehydrate rather than do a fresh client-side render.
      const html = template
        .replace('<!--app-html-->', rendered.html)
        .replace('<body>', '<body data-ember-ssr="true">');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (e) {
      // In development, Vite can fix source maps for better error messages.
      if (vite) {
        vite.ssrFixStacktrace(/** @type {Error} */ (e));
      }
      console.error(/** @type {Error} */ (e).stack);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(/** @type {Error} */ (e).message);
    }
  }

  const server = http.createServer(async (req, res) => {
    // In development, let Vite handle asset requests (JS, CSS, source maps…).
    if (!isProduction && vite) {
      let handled = false;

      // Vite middleware uses the connect-style callback interface.
      await new Promise((resolve) => {
        vite.middlewares(req, res, () => {
          handled = false;
          resolve(undefined);
        });
        // If Vite handled the request it won't call next(), so we resolve
        // via a short-circuit after the middleware chain finishes.
        setImmediate(() => {
          if (!res.writableEnded) resolve(undefined);
          else {
            handled = true;
            resolve(undefined);
          }
        });
      });

      if (handled || res.writableEnded) return;
    }

    // All non-asset requests go through the SSR handler.
    await handleRequest(req, res);
  });

  server.listen(port, () => {
    console.log(`SSR server running at http://localhost:${port}`);
  });
}

createServer();
