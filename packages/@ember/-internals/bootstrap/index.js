import require from 'require';
import { context } from '@ember/-internals/environment';
import { deprecate } from '@ember/debug';

(function () {
  let Ember;

  function defineEmber(key) {
    Object.defineProperty(context.exports, key, {
      enumerable: true,
      configurable: true,
      get() {
        if (!Ember) {
          Ember = require('ember').default;
        }

        deprecate(
          'Usage of the Ember Global is deprecated. You should import the Ember module or the specific API instead.',
          false,
          {
            id: 'ember-global',
            until: '4.0.0',
            url: 'https://deprecations.emberjs.com/v3.x/#toc_ember-global',
            for: 'ember-source',
            since: {
              enabled: '3.27.0',
            },
          }
        );

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
