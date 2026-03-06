import createHTMLDocument from '@simple-dom/document';
import HTMLSerializer from '@simple-dom/serializer';
import voidMap from '@simple-dom/void-map';

// The glimmer serialization markers are HTML comments used during rehydration.
// When pre-rendering (SSG), we strip these to produce clean static HTML.
const GLIMMER_COMMENT_PATTERN = /<!--%[^%]*%-->/g;

/**
 * Patches a SimpleDOM element (and its descendants) with a minimal
 * `querySelectorAll` implementation. SimpleDOM doesn't support CSS selectors;
 * this shim returns an empty NodeList for any query, which is sufficient for
 * SSR where the document starts empty and addons only need to *check* whether
 * elements exist (not actually query them).
 * @param {object} node - A SimpleDOM node
 */
function patchQuerySelectorAll(node) {
  if (node && typeof node === 'object' && !node.querySelectorAll) {
    // Minimal querySelectorAll that always returns an empty array-like.
    node.querySelectorAll = () => ({ length: 0 });
    node.querySelector = () => null;
    // Walk children
    let child = node.firstChild;
    while (child) {
      patchQuerySelectorAll(child);
      child = child.nextSibling;
    }
  }
}

/**
 * Renders an Ember application to an HTML string suitable for server-side
 * rendering (SSR). The output includes Glimmer rehydration markers so the
 * client can efficiently rehydrate the server-rendered DOM rather than
 * re-rendering from scratch.
 *
 * This is compatible with Vite's SSR mode. Use this in your `entry-server.js`
 * to render the app on the server, then use `_renderMode: 'rehydrate'` on the
 * client to rehydrate the result.
 *
 * @param {string} url - The URL path to render (e.g. '/', '/about')
 * @param {object} AppClass - Your Ember Application subclass
 * @returns {Promise<{ html: string }>} A promise resolving to the rendered HTML
 *
 * @example
 * ```js
 * // entry-server.js
 * import App from './app/app.js';
 * import { renderToHTML } from '@ember/server-rendering';
 *
 * export async function render(url) {
 *   return await renderToHTML(url, App);
 * }
 * ```
 */
export async function renderToHTML(url, AppClass) {
  const document = createHTMLDocument();
  const rootElement = document.body;

  // Patch the SimpleDOM document with minimal selector support so addons
  // that call document.querySelectorAll / document.head.querySelectorAll
  // don't throw. SimpleDOM is a minimal implementation without CSS selectors.
  patchQuerySelectorAll(document);

  // Some addons (e.g. ember-page-title) access the global `document` directly
  // rather than the Ember `-document` service. Temporarily install the
  // SimpleDOM document as the global so these accesses don't throw in Node.js.
  const previousDocument = globalThis.document;
  globalThis.document = document;

  try {
    const app = AppClass.create({ autoboot: false });

    try {
      // app.visit() manages the Ember run loop internally via boot() -> run(this, '_bootSync').
      const instance = await app.visit(url, {
        isBrowser: false,
        document,
        rootElement,
        _renderMode: 'serialize',
      });

      const serializer = new HTMLSerializer(voidMap);
      const html = serializer.serializeChildren(rootElement);

      instance.destroy();

      return { html };
    } finally {
      app.destroy();
    }
  } finally {
    // Restore the previous global document value (typically undefined in Node.js).
    if (previousDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = previousDocument;
    }
  }
}

/**
 * Pre-renders an Ember application to a clean HTML string for static site
 * generation (SSG). Unlike `renderToHTML`, the output does NOT include
 * Glimmer rehydration markers, making it suitable for use in documentation
 * sites or any scenario where the client will perform a full render rather
 * than rehydrating the server output.
 *
 * @param {string} url - The URL path to render (e.g. '/', '/about')
 * @param {object} AppClass - Your Ember Application subclass
 * @returns {Promise<{ html: string }>} A promise resolving to the clean HTML
 *
 * @example
 * ```js
 * // scripts/prerender.js
 * import App from './app/app.js';
 * import { prerender } from '@ember/server-rendering';
 *
 * const { html } = await prerender('/', App);
 * fs.writeFileSync('dist/index.html', `<html><body>${html}</body></html>`);
 * ```
 */
export async function prerender(url, AppClass) {
  const { html: rawHtml } = await renderToHTML(url, AppClass);
  // Strip Glimmer's serialization markers (block boundaries, HTML markers, etc.)
  const html = rawHtml.replace(GLIMMER_COMMENT_PATTERN, '');
  return { html };
}



