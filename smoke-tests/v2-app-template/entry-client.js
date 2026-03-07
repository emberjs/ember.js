/**
 * Vite SSR client entry point for the v2-app-template.
 *
 * When the page was server-rendered (SSR mode), this boots the Ember
 * application with `_renderMode: 'rehydrate'` so Glimmer reuses the
 * existing server-rendered DOM nodes instead of clearing and re-rendering.
 *
 * When the page was NOT server-rendered (CSR/development mode), this boots
 * normally via the standard `Application.create()` autoboot path.
 *
 * @see entry-server.js for the server-side rendering counterpart
 */
import Application from './app/app.js';
import config from './app/config/environment.js';

const isSSR = document.body.hasAttribute('data-ember-ssr');

if (isSSR) {
  // The page was server-rendered; rehydrate the existing DOM.
  const app = Application.create({ ...config.APP, autoboot: false });
  app.visit('/', {
    _renderMode: 'rehydrate',
    rootElement: document.body,
  });
} else {
  // Normal client-side rendering.
  Application.create(config.APP);
}
