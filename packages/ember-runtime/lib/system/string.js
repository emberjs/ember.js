/**
@module ember
@submodule ember-runtime
*/
import Ember from 'ember-metal/core'; // Ember.STRINGS
import { deprecate } from 'ember-metal/debug';
import {
  inspect as emberInspect
} from 'ember-metal/utils';
import { isArray } from 'ember-runtime/utils';

import Cache from 'ember-metal/cache';

var STRING_DASHERIZE_REGEXP = (/[ _]/g);

var STRING_DASHERIZE_CACHE = new Cache(1000, function(key) {
  return decamelize(key).replace(STRING_DASHERIZE_REGEXP, '-');
});

var STRING_CAMELIZE_REGEXP_1 = (/(\-|\_|\.|\s)+(.)?/g);
var STRING_CAMELIZE_REGEXP_2 = (/(^|\/)([A-Z])/g);

var CAMELIZE_CACHE = new Cache(1000, function(key) {
  return key.replace(STRING_CAMELIZE_REGEXP_1, function(match, separator, chr) {
    return chr ? chr.toUpperCase() : '';
  }).replace(STRING_CAMELIZE_REGEXP_2, function(match, separator, chr) {
    return match.toLowerCase();
  });
});

var STRING_CLASSIFY_REGEXP_1 = (/(\-|\_|\.|\s)+(.)?/g);
var STRING_CLASSIFY_REGEXP_2 = (/(^|\/|\.)([a-z])/g);

var CLASSIFY_CACHE = new Cache(1000, function(str) {
  return str.replace(STRING_CLASSIFY_REGEXP_1, function(match, separator, chr) {
    return chr ? chr.toUpperCase() : '';
  }).replace(STRING_CLASSIFY_REGEXP_2, function(match, separator, chr) {
    return match.toUpperCase();
  });
});

var STRING_UNDERSCORE_REGEXP_1 = (/([a-z\d])([A-Z]+)/g);
var STRING_UNDERSCORE_REGEXP_2 = (/\-|\s+/g);

var UNDERSCORE_CACHE = new Cache(1000, function(str) {
  return str.replace(STRING_UNDERSCORE_REGEXP_1, '$1_$2').
    replace(STRING_UNDERSCORE_REGEXP_2, '_').toLowerCase();
});

var STRING_CAPITALIZE_REGEXP = (/(^|\/)([a-z])/g);

var CAPITALIZE_CACHE = new Cache(1000, function(str) {
  return str.replace(STRING_CAPITALIZE_REGEXP, function(match, separator, chr) {
    return match.toUpperCase();
  });
});

var STRING_DECAMELIZE_REGEXP = (/([a-z\d])([A-Z])/g);

var DECAMELIZE_CACHE = new Cache(1000, function(str) {
  return str.replace(STRING_DECAMELIZE_REGEXP, '$1_$2').toLowerCase();
});

function _fmt(str, formats) {
  var cachedFormats = formats;

  if (!isArray(cachedFormats) || arguments.length > 2) {
    cachedFormats = new Array(arguments.length - 1);

    for (var i = 1, l = arguments.length; i < l; i++) {
      cachedFormats[i - 1] = arguments[i];
    }
  }

  // first, replace any ORDERED replacements.
  var idx  = 0; // the current index for non-numerical replacements
  return str.replace(/%@([0-9]+)?/g, function(s, argIndex) {
    argIndex = (argIndex) ? parseInt(argIndex, 10) - 1 : idx++;
    s = cachedFormats[argIndex];
    return (s === null) ? '(null)' : (s === undefined) ? '' : emberInspect(s);
  });
}

function fmt(str, formats) {
  deprecate(
    'Ember.String.fmt is deprecated, use ES6 template strings instead.',
    false,
    { id: 'ember-string-utils.fmt', until: '3.0.0', url: 'https://babeljs.io/docs/learn-es6/#template-strings' }
  );
  return _fmt(...arguments);
}

function loc(str, formats) {
  if (!isArray(formats) || arguments.length > 2) {
    formats = Array.prototype.slice.call(arguments, 1);
  }

  str = Ember.STRINGS[str] || str;
  return _fmt(str, formats);
}

function w(str) {
  return str.split(/\s+/);
}

function decamelize(str) {
  return DECAMELIZE_CACHE.get(str);
}

function dasherize(str) {
  return STRING_DASHERIZE_CACHE.get(str);
}

function camelize(str) {
  return CAMELIZE_CACHE.get(str);
}

function classify(str) {
  return CLASSIFY_CACHE.get(str);
}

function underscore(str) {
  return UNDERSCORE_CACHE.get(str);
}

function capitalize(str) {
  return CAPITALIZE_CACHE.get(str);
}

/**
  Defines the hash of localized strings for the current language. Used by
  the `Ember.String.loc()` helper. To localize, add string values to this
  hash.

  @property STRINGS
  @for Ember
  @type Object
  @private
*/
Ember.STRINGS = {};

/**
  Defines string helper methods including string formatting and localization.
  Unless `Ember.EXTEND_PROTOTYPES.String` is `false` these methods will also be
  added to the `String.prototype` as well.

  @class String
  @namespace Ember
  @static
  @public
*/
export default {
  /**
    Apply formatting options to the string. This will look for occurrences
    of "%@" in your string and substitute them with the arguments you pass into
    this method. If you want to control the specific order of replacement,
    you can add a number after the key as well to indicate which argument
    you want to insert.

    Ordered insertions are most useful when building loc strings where values
    you need to insert may appear in different orders.

    ```javascript
    "Hello %@ %@".fmt('John', 'Doe');     // "Hello John Doe"
    "Hello %@2, %@1".fmt('John', 'Doe');  // "Hello Doe, John"
    ```

    @method fmt
    @param {String} str The string to format
    @param {Array} formats An array of parameters to interpolate into string.
    @return {String} formatted string
    @public
    @deprecated Use ES6 template strings instead: https://babeljs.io/docs/learn-es6/#template-strings');
  */
  fmt,

  /**
    Formats the passed string, but first looks up the string in the localized
    strings hash. This is a convenient way to localize text. See
    `Ember.String.fmt()` for more information on formatting.

    Note that it is traditional but not required to prefix localized string
    keys with an underscore or other character so you can easily identify
    localized strings.

    ```javascript
    Ember.STRINGS = {
      '_Hello World': 'Bonjour le monde',
      '_Hello %@ %@': 'Bonjour %@ %@'
    };

    Ember.String.loc("_Hello World");  // 'Bonjour le monde';
    Ember.String.loc("_Hello %@ %@", ["John", "Smith"]);  // "Bonjour John Smith";
    ```

    @method loc
    @param {String} str The string to format
    @param {Array} formats Optional array of parameters to interpolate into string.
    @return {String} formatted string
    @public
  */
  loc,

  /**
    Splits a string into separate units separated by spaces, eliminating any
    empty strings in the process. This is a convenience method for split that
    is mostly useful when applied to the `String.prototype`.

    ```javascript
    Ember.String.w("alpha beta gamma").forEach(function(key) {
      console.log(key);
    });

    // > alpha
    // > beta
    // > gamma
    ```

    @method w
    @param {String} str The string to split
    @return {Array} array containing the split strings
    @public
  */
  w,

  /**
    Converts a camelized string into all lower case separated by underscores.

    ```javascript
    'innerHTML'.decamelize();           // 'inner_html'
    'action_name'.decamelize();        // 'action_name'
    'css-class-name'.decamelize();     // 'css-class-name'
    'my favorite items'.decamelize();  // 'my favorite items'
    ```

    @method decamelize
    @param {String} str The string to decamelize.
    @return {String} the decamelized string.
    @public
  */
  decamelize,

  /**
    Replaces underscores, spaces, or camelCase with dashes.

    ```javascript
    'innerHTML'.dasherize();          // 'inner-html'
    'action_name'.dasherize();        // 'action-name'
    'css-class-name'.dasherize();     // 'css-class-name'
    'my favorite items'.dasherize();  // 'my-favorite-items'
    'privateDocs/ownerInvoice'.dasherize(); // 'private-docs/owner-invoice'
    ```

    @method dasherize
    @param {String} str The string to dasherize.
    @return {String} the dasherized string.
    @public
  */
  dasherize,

  /**
    Returns the lowerCamelCase form of a string.

    ```javascript
    'innerHTML'.camelize();          // 'innerHTML'
    'action_name'.camelize();        // 'actionName'
    'css-class-name'.camelize();     // 'cssClassName'
    'my favorite items'.camelize();  // 'myFavoriteItems'
    'My Favorite Items'.camelize();  // 'myFavoriteItems'
    'private-docs/owner-invoice'.camelize(); // 'privateDocs/ownerInvoice'
    ```

    @method camelize
    @param {String} str The string to camelize.
    @return {String} the camelized string.
    @public
  */
  camelize,

  /**
    Returns the UpperCamelCase form of a string.

    ```javascript
    'innerHTML'.classify();          // 'InnerHTML'
    'action_name'.classify();        // 'ActionName'
    'css-class-name'.classify();     // 'CssClassName'
    'my favorite items'.classify();  // 'MyFavoriteItems'
    'private-docs/owner-invoice'.classify(); // 'PrivateDocs/OwnerInvoice'
    ```

    @method classify
    @param {String} str the string to classify
    @return {String} the classified string
    @public
  */
  classify,

  /**
    More general than decamelize. Returns the lower\_case\_and\_underscored
    form of a string.

    ```javascript
    'innerHTML'.underscore();          // 'inner_html'
    'action_name'.underscore();        // 'action_name'
    'css-class-name'.underscore();     // 'css_class_name'
    'my favorite items'.underscore();  // 'my_favorite_items'
    'privateDocs/ownerInvoice'.underscore(); // 'private_docs/owner_invoice'
    ```

    @method underscore
    @param {String} str The string to underscore.
    @return {String} the underscored string.
    @public
  */
  underscore,

  /**
    Returns the Capitalized form of a string

    ```javascript
    'innerHTML'.capitalize()         // 'InnerHTML'
    'action_name'.capitalize()       // 'Action_name'
    'css-class-name'.capitalize()    // 'Css-class-name'
    'my favorite items'.capitalize() // 'My favorite items'
    'privateDocs/ownerInvoice'.capitalize(); // 'PrivateDocs/OwnerInvoice'
    ```

    @method capitalize
    @param {String} str The string to capitalize.
    @return {String} The capitalized string.
    @public
  */
  capitalize
};

export {
  fmt,
  loc,
  w,
  decamelize,
  dasherize,
  camelize,
  classify,
  underscore,
  capitalize
};
