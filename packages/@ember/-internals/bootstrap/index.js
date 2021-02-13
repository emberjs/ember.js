import require from 'require';
import { deprecate } from '@ember/debug';
import { context } from '@ember/-internals/environment';

(function () {
  let Ember;

  function defineEmber(key) {
    Object.defineProperty(context.exports, key, {
      enumerable: true,
      configurable: true,
      get() {
        deprecate(
          "Using window.Ember and window.Em have been deprecated. Use `import Ember  from 'ember';` instead ",
          false,
          {
            id: 'ember-source.window-global',
            until: '4.0.0',
            url: 'tbd',
            for: 'ember-source',
            since: { enabled: '3.26.0-beta.1' },
          }
        );

        if (!Ember) {
          Ember = require('ember').default;
        }

        return Ember;
      },
    });
  }

  // Bootstrap the global
  defineEmber('Ember');
  defineEmber('Em');

  // Bootstrap Node module
  // eslint-disable-next-line no-undef
  if (typeof module === 'object' && typeof module.require === 'function') {
    // eslint-disable-next-line no-undef
    module.exports = Ember = require('ember').default;
  }
})();
