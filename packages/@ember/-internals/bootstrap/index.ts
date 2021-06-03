import { context } from '@ember/-internals/environment';
import { onEmberGlobalAccess } from '@ember/-internals/overrides';
import { deprecate } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import require from 'require';

(function bootstrap() {
  let Ember: unknown;

  let get = () => {
    if (!Ember) {
      // tslint:disable-next-line: no-require-imports
      Ember = require('ember').default;
    }

    return Ember;
  };

  if (DEBUG) {
    let defaultHandler = () => {
      return 'Usage of the Ember Global is deprecated. You should import the Ember module or the specific API instead.';
    };

    let handler = onEmberGlobalAccess || defaultHandler;
    let _get = get;

    get = () => {
      let message = handler();

      if (message !== null) {
        deprecate(message, false, {
          id: 'ember-global',
          until: '4.0.0',
          url: 'https://deprecations.emberjs.com/v3.x/#toc_ember-global',
          for: 'ember-source',
          since: {
            enabled: '3.27.0',
          },
        });
      }

      return _get();
    };
  }

  function defineEmber(key: string) {
    Object.defineProperty(context.exports, key, {
      enumerable: true,
      configurable: true,
      get,
    });
  }

  // Bootstrap the global
  defineEmber('Ember');
  defineEmber('Em');

  // Bootstrap Node module
  // eslint-disable-next-line no-undef
  if (typeof module === 'object' && typeof module.require === 'function') {
    // tslint:disable-next-line: no-require-imports
    module.exports = Ember = require('ember').default;
  }
})();
