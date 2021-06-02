import require from 'require';
import { context } from '@ember/-internals/environment';
import { deprecate } from '@ember/debug';
import { message, deprecateOnce, setupDotAccess } from './lib/overrides';

setupDotAccess();

(function bootstrap() {
  let Ember;
  let disabled = false;

  function defineEmber(key) {
    Object.defineProperty(context.exports, key, {
      enumerable: true,
      configurable: true,
      get() {
        if (!Ember) {
          Ember = require('ember').default;
        }

        deprecate(message, disabled, {
          id: 'ember-global',
          until: '4.0.0',
          url: 'https://deprecations.emberjs.com/v3.x/#toc_ember-global',
          for: 'ember-source',
          since: {
            enabled: '3.27.0',
          },
        });

        if (deprecateOnce) {
          disabled = true;
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
