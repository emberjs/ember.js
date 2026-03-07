/**
  @module @ember/server-rendering
  @public
*/

import createHTMLDocument from '@simple-dom/document';
import HTMLSerializer from '@simple-dom/serializer';
import voidMap from '@simple-dom/void-map';

// The glimmer serialization markers are HTML comments used during rehydration.
// When pre-rendering (SSG), we strip these to produce clean static HTML.
const GLIMMER_COMMENT_PATTERN = /<!--%[^%]*%-->/g;

// Patches a SimpleDOM node tree with minimal selector stubs so that
// SSR-unaware addons that call `querySelector`/`querySelectorAll` during
// render don't throw. SimpleDOM does not implement CSS selectors.
function patchSimpleDocument(node) {
  if (node && typeof node === 'object' && !node.querySelectorAll) {
    node.querySelectorAll = function () {
      return { length: 0 };
    };
    node.querySelector = function () {
      return null;
    };
    let child = node.firstChild;
    while (child) {
      patchSimpleDocument(child);
      child = child.nextSibling;
    }
  }
}

/**
  Renders an Ember application to an HTML string suitable for server-side
  rendering (SSR). The output includes Glimmer rehydration markers so the
  client can efficiently rehydrate the server-rendered DOM rather than
  re-rendering from scratch.

  This is compatible with Vite's SSR mode. Use this in your `entry-server.js`
  to render the app on the server, then use `_renderMode: 'rehydrate'` on the
  client to rehydrate the result.

  @method renderToHTML
  @for @ember/server-rendering
  @param {string} url The URL path to render (e.g. '/', '/about')
  @param {object} AppClass Your Ember Application subclass
  @return {Promise} resolves to `{ html }` with the serialized body HTML
  @public
*/
export function renderToHTML(url, AppClass) {
  let ssrDocument = createHTMLDocument();
  let rootElement = ssrDocument.body;

  // Patch the SimpleDOM nodes with minimal selector stubs so that
  // SSR-unaware addons (e.g. ember-page-title in development mode) that
  // call `document.head.querySelectorAll()` don't throw.
  patchSimpleDocument(ssrDocument);

  // Some addons access the global `document` directly rather than via Ember's
  // DI container. Set it to our SimpleDOM instance during rendering so those
  // accesses don't throw in Node.js, then restore the previous value.
  let previousDocument = window.document;
  window.document = ssrDocument;

  let app = AppClass.create({ autoboot: false });

  function cleanup() {
    if (previousDocument === undefined) {
      delete window.document;
    } else {
      window.document = previousDocument;
    }
  }

  return app
    .visit(url, {
      isBrowser: false,
      document: ssrDocument,
      rootElement: rootElement,
      _renderMode: 'serialize',
    })
    .then(
      function (instance) {
        let serializer = new HTMLSerializer(voidMap);
        let html = serializer.serializeChildren(rootElement);
        instance.destroy();
        app.destroy();
        cleanup();
        return { html };
      },
      function (err) {
        app.destroy();
        cleanup();
        throw err;
      }
    );
}

/**
  Pre-renders an Ember application to a clean HTML string for static site
  generation (SSG). Unlike `renderToHTML`, the output does NOT include
  Glimmer rehydration markers, making it suitable for documentation sites
  or any scenario where the client performs a full render.

  @method prerender
  @for @ember/server-rendering
  @param {string} url The URL path to render (e.g. '/', '/about')
  @param {object} AppClass Your Ember Application subclass
  @return {Promise} resolves to `{ html }` with clean static HTML
  @public
*/
export function prerender(url, AppClass) {
  return renderToHTML(url, AppClass).then(function (result) {
    // Strip Glimmer's serialization markers (block boundaries, etc.)
    let html = result.html.replace(GLIMMER_COMMENT_PATTERN, '');
    return { html };
  });
}
