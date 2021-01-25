import require from 'require';
import { context } from '@ember/-internals/environment';

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
