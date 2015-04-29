/**
@module ember
@submodule ember-runtime
*/
import Ember from "ember-metal/core"; // Ember.STRINGS, Ember.FEATURES
import {
  isArray,
  inspect as emberInspect
} from "ember-metal/utils";

import Cache from "ember-metal/cache";

var STRING_DASHERIZE_REGEXP = (/[ _]/g);

var STRING_DASHERIZE_CACHE = new Cache(1000, function(key) {
  return decamelize(key).replace(STRING_DASHERIZE_REGEXP, '-');
});

var CAMELIZE_CACHE = new Cache(1000, function(key) {
  return key.replace(STRING_CAMELIZE_REGEXP, function(match, separator, chr) {
    return chr ? chr.toUpperCase() : '';
  }).replace(/^([A-Z])/, function(match, separator, chr) {
    return match.toLowerCase();
  });
});

var CLASSIFY_CACHE = new Cache(1000, function(str) {
  var parts = str.split(".");
  var out = [];

  for (var i=0, l=parts.length; i<l; i++) {
    var camelized = camelize(parts[i]);
    out.push(camelized.charAt(0).toUpperCase() + camelized.substr(1));
  }

  return out.join(".");
});

var UNDERSCORE_CACHE = new Cache(1000, function(str) {
  return str.replace(STRING_UNDERSCORE_REGEXP_1, '$1_$2').
    replace(STRING_UNDERSCORE_REGEXP_2, '_').toLowerCase();
});

var CAPITALIZE_CACHE = new Cache(1000, function(str) {
  return str.charAt(0).toUpperCase() + str.substr(1);
});

var DECAMELIZE_CACHE = new Cache(1000, function(str) {
  return str.replace(STRING_DECAMELIZE_REGEXP, '$1_$2').toLowerCase();
});

var STRING_DECAMELIZE_REGEXP = (/([a-z\d])([A-Z])/g);
var STRING_CAMELIZE_REGEXP = (/(\-|_|\.|\s)+(.)?/g);
var STRING_UNDERSCORE_REGEXP_1 = (/([a-z\d])([A-Z]+)/g);
var STRING_UNDERSCORE_REGEXP_2 = (/\-|\s+/g);

function fmt(str, formats) {
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

function loc(str, formats) {
  if (!isArray(formats) || arguments.length > 2) {
    formats = Array.prototype.slice.call(arguments, 1);
  }

  str = Ember.STRINGS[str] || str;
  return fmt(str, formats);
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
  @type Hash
*/
Ember.STRINGS = {};

/**
  Defines string helper methods including string formatting and localization.
  Unless `Ember.EXTEND_PROTOTYPES.String` is `false` these methods will also be
  added to the `String.prototype` as well.

  @class String
  @namespace Ember
  @static
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
    @deprecated Use ES6 template strings instead: https://babeljs.io/docs/learn-es6/#template-strings');
  */
  fmt: fmt,

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
  */
  loc: loc,

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
  */
  w: w,

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
  */
  decamelize: decamelize,

  /**
    Replaces underscores, spaces, or camelCase with dashes.

    ```javascript
    'innerHTML'.dasherize();          // 'inner-html'
    'action_name'.dasherize();        // 'action-name'
    'css-class-name'.dasherize();     // 'css-class-name'
    'my favorite items'.dasherize();  // 'my-favorite-items'
    ```

    @method dasherize
    @param {String} str The string to dasherize.
    @return {String} the dasherized string.
  */
  dasherize: dasherize,

  /**
    Returns the lowerCamelCase form of a string.

    ```javascript
    'innerHTML'.camelize();          // 'innerHTML'
    'action_name'.camelize();        // 'actionName'
    'css-class-name'.camelize();     // 'cssClassName'
    'my favorite items'.camelize();  // 'myFavoriteItems'
    'My Favorite Items'.camelize();  // 'myFavoriteItems'
    ```

    @method camelize
    @param {String} str The string to camelize.
    @return {String} the camelized string.
  */
  camelize: camelize,

  /**
    Returns the UpperCamelCase form of a string.

    ```javascript
    'innerHTML'.classify();          // 'InnerHTML'
    'action_name'.classify();        // 'ActionName'
    'css-class-name'.classify();     // 'CssClassName'
    'my favorite items'.classify();  // 'MyFavoriteItems'
    ```

    @method classify
    @param {String} str the string to classify
    @return {String} the classified string
  */
  classify: classify,

  /**
    More general than decamelize. Returns the lower\_case\_and\_underscored
    form of a string.

    ```javascript
    'innerHTML'.underscore();          // 'inner_html'
    'action_name'.underscore();        // 'action_name'
    'css-class-name'.underscore();     // 'css_class_name'
    'my favorite items'.underscore();  // 'my_favorite_items'
    ```

    @method underscore
    @param {String} str The string to underscore.
    @return {String} the underscored string.
  */
  underscore: underscore,

  /**
    Returns the Capitalized form of a string

    ```javascript
    'innerHTML'.capitalize()         // 'InnerHTML'
    'action_name'.capitalize()       // 'Action_name'
    'css-class-name'.capitalize()    // 'Css-class-name'
    'my favorite items'.capitalize() // 'My favorite items'
    ```

    @method capitalize
    @param {String} str The string to capitalize.
    @return {String} The capitalized string.
  */
  capitalize: capitalize
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
