/**
 * `Application#visit` with a server-side render mode (compat, GXT_MODE).
 *
 * Classic Ember renders `_renderMode: 'serialize'` with Glimmer's serialize
 * builder, whose block comments (`<!--%+b:0%-->` ...) a later rehydration
 * reads, and `_renderMode: 'rehydrate'` with Glimmer's rehydration builder,
 * which reuses the server-rendered nodes. GXT has neither builder, so both
 * modes assert that they are not supported, instead of rendering a client
 * DOM dressed up as their output.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import { precompileTemplate } from '@ember/template-compilation';
import { DEBUG } from '@glimmer/env';

const SERVER_HTML = '<!--%+b:0%--><div class="foo">Hi, Mom!</div><!--%-b:0%-->';

moduleFor(
  'GXT correctness: visit() server-side render modes',
  class extends ApplicationTestCase {
    async ['@test _renderMode: serialize is not supported'](assert: QUnit['assert']) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }
      this.add('template:index', precompileTemplate('<div class="foo">Hi, Mom!</div>'));
      let rootElement = document.createElement('div');

      await assert.rejects(
        // @ts-expect-error -- BootOptions types rootElement as a SimpleElement; a DOM element is one at run time
        this.application.visit('/', { isBrowser: false, rootElement, _renderMode: 'serialize' }),
        /`_renderMode: 'serialize'` is not supported by the GXT renderer/
      );
      assert.strictEqual(rootElement.innerHTML, '', 'nothing is rendered');
    }

    async ['@test _renderMode: rehydrate is not supported'](assert: QUnit['assert']) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }
      this.add('template:index', precompileTemplate('<div class="foo">Hi, Mom!</div>'));
      let rootElement = document.createElement('div');
      rootElement.innerHTML = SERVER_HTML;

      await assert.rejects(
        // @ts-expect-error -- BootOptions types rootElement as a SimpleElement; a DOM element is one at run time
        this.application.visit('/', { isBrowser: false, rootElement, _renderMode: 'rehydrate' }),
        /`_renderMode: 'rehydrate'` is not supported by the GXT renderer/
      );
      assert.strictEqual(rootElement.innerHTML, SERVER_HTML, 'the server-rendered DOM is kept');
    }
  }
);
