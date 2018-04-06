/**
@module @ember/string
*/

import { ENV } from 'ember-environment';
import { deprecate } from 'ember-debug';
import {
  w,
  loc,
  camelize,
  decamelize,
  dasherize,
  underscore,
  capitalize,
  classify,
} from '../system/string';

const StringPrototype = String.prototype;

function deprecateEmberStringPrototypeExtension(name, fn, opts = {}) {
  return function() {
    deprecate(
      opts.message ||
        `String prototype extensions are deprecated. Please, us ${name} from '@ember/string' instead.`,
      false,
      opts.options || {
        id: 'ember-string.prototype_extensions',
        until: '3.5.0',
        url: 'https://emberjs.com/deprecations/v2.x/#toc_ember-string-prototype-extensions',
      }
    );

    return fn(this, ...arguments);
  };
}

if (ENV.EXTEND_PROTOTYPES.String) {
  /**
    See [String.w](/api/ember/release/classes/String/methods/w?anchor=w).

    @method w
    @for @ember/string
    @static
    @private
  */
  Object.defineProperty(StringPrototype, 'w', {
    configurable: true,
    enumerable: false,
    writeable: true,
    value: deprecateEmberStringPrototypeExtension('w', w),
  });

  /**
    See [String.loc](/api/ember/release/classes/String/methods/loc?anchor=loc).

    @method loc
    @for @ember/string
    @static
    @private
  */
  Object.defineProperty(StringPrototype, 'loc', {
    configurable: true,
    enumerable: false,
    writeable: true,
    value: deprecateEmberStringPrototypeExtension('loc', loc, {
      message:
        '`loc` is deprecated. Please, use an i18n addon instead. See https://emberobserver.com/categories/internationalization for a list of them.',
    }),
  });

  /**
    See [String.camelize](/api/ember/release/classes/String/methods/camelize?anchor=camelize).

    @method camelize
    @for @ember/string
    @static
    @private
  */
  Object.defineProperty(StringPrototype, 'camelize', {
    configurable: true,
    enumerable: false,
    writeable: true,
    value: deprecateEmberStringPrototypeExtension('camelize', camelize),
  });

  /**
    See [String.decamelize](/api/ember/release/classes/String/methods/decamelize?anchor=decamelize).

    @method decamelize
    @for @ember/string
    @static
    @private
  */
  Object.defineProperty(StringPrototype, 'decamelize', {
    configurable: true,
    enumerable: false,
    writeable: true,
    value: deprecateEmberStringPrototypeExtension('decamelize', decamelize),
  });

  /**
    See [String.dasherize](/api/ember/release/classes/String/methods/dasherize?anchor=dasherize).

    @method dasherize
    @for @ember/string
    @static
    @private
  */
  Object.defineProperty(StringPrototype, 'dasherize', {
    configurable: true,
    enumerable: false,
    writeable: true,
    value: deprecateEmberStringPrototypeExtension('dasherize', dasherize),
  });

  /**
    See [String.underscore](/api/ember/release/classes/String/methods/underscore?anchor=underscore).

    @method underscore
    @for @ember/string
    @static
    @private
  */
  Object.defineProperty(StringPrototype, 'underscore', {
    configurable: true,
    enumerable: false,
    writeable: true,
    value: deprecateEmberStringPrototypeExtension('underscore', underscore),
  });

  /**
    See [String.classify](/api/ember/release/classes/String/methods/classify?anchor=classify).

    @method classify
    @for @ember/string
    @static
    @private
  */
  Object.defineProperty(StringPrototype, 'classify', {
    configurable: true,
    enumerable: false,
    writeable: true,
    value: deprecateEmberStringPrototypeExtension('classify', classify),
  });

  /**
    See [String.capitalize](/api/ember/release/classes/String/methods/capitalize?anchor=capitalize).

    @method capitalize
    @for @ember/string
    @static
    @private
  */
  Object.defineProperty(StringPrototype, 'capitalize', {
    configurable: true,
    enumerable: false,
    writeable: true,
    value: deprecateEmberStringPrototypeExtension('capitalize', capitalize),
  });
}
