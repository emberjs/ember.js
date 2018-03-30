/**
@module @ember/string
*/

import { ENV } from 'ember-environment';
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
    value: function() {
      return w(this);
    },
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
    value: function(...args) {
      return loc(this, args);
    },
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
    value: function() {
      return camelize(this);
    },
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
    value: function() {
      return decamelize(this);
    },
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
    value: function() {
      return dasherize(this);
    },
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
    value: function() {
      return underscore(this);
    },
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
    value: function() {
      return classify(this);
    },
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
    value: function() {
      return capitalize(this);
    },
  });
}
