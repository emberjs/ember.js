// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('system/locale');

// These are basic enhancements to the string class used throughout
// SproutCore.
/** @private */
SC.STRING_TITLEIZE_REGEXP = (/([\s|\-|\_|\n])([^\s|\-|\_|\n]?)/g);
SC.STRING_DECAMELIZE_REGEXP = (/([a-z])([A-Z])/g);
SC.STRING_DASHERIZE_REGEXP = (/[ _]/g);
SC.STRING_DASHERIZE_CACHE = {};
SC.STRING_TRIM_LEFT_REGEXP = (/^\s+/g);
SC.STRING_TRIM_RIGHT_REGEXP = (/\s+$/g);

/**
  @namespace

  SproutCore implements a variety of enhancements to the built-in String
  object that make it easy to perform common substitutions and conversions.

  Most of the utility methods defined here mirror those found in Prototype
  1.6.

  @since SproutCore 1.0
  @lends String.prototype
*/
SC.mixin(SC.String, {

  /**
    Capitalizes a string.

    ## Examples

        capitalize('my favorite items') // 'My favorite items'
        capitalize('css-class-name')    // 'Css-class-name'
        capitalize('action_name')       // 'Action_name'
        capitalize('innerHTML')         // 'InnerHTML'

    @return {String} capitalized string
  */
  capitalize: function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /**
    Camelizes a string.  This will take any words separated by spaces, dashes
    or underscores and convert them into camelCase.

    ## Examples

        camelize('my favorite items') // 'myFavoriteItems'
        camelize('css-class-name')    // 'cssClassName'
        camelize('action_name')       // 'actionName'
        camelize('innerHTML')         // 'innerHTML'

    @returns {String} camelized string
  */
  camelize: function(str) {
    var ret = str.replace(SC.STRING_TITLEIZE_REGEXP, function(str, separater, character) {
      return character ? character.toUpperCase() : '';
    });

    var first = ret.charAt(0),
        lower = first.toLowerCase();

    return first !== lower ? lower + ret.slice(1) : ret;
  },

  /**
    Converts a camelized string into all lower case separated by underscores.

    ## Examples

    decamelize('my favorite items') // 'my favorite items'
    decamelize('css-class-name')    // 'css-class-name'
    decamelize('action_name')       // 'action_name'
    decamelize('innerHTML')         // 'inner_html'

    @returns {String} the decamelized string.
  */
  decamelize: function(str) {
    return str.replace(SC.STRING_DECAMELIZE_REGEXP, '$1_$2').toLowerCase();
  },

  /**
    Converts a camelized string or a string with spaces or underscores into
    a string with components separated by dashes.

    ## Examples

    | *Input String* | *Output String* |
    dasherize('my favorite items') // 'my-favorite-items'
    dasherize('css-class-name')    // 'css-class-name'
    dasherize('action_name')       // 'action-name'
    dasherize('innerHTML')         // 'inner-html'

    @returns {String} the dasherized string.
  */
  dasherize: function(str) {
    var cache = SC.STRING_DASHERIZE_CACHE,
        ret   = cache[str];

    if (ret) {
      return ret;
    } else {
      ret = SC.String.decamelize(str).replace(SC.STRING_DASHERIZE_REGEXP,'-');
      cache[str] = ret;
    }

    return ret;
  },

  /**
    Localizes the string.  This will look up the receiver string as a key
    in the current Strings hash.  If the key matches, the loc'd value will be
    used.  The resulting string will also be passed through fmt() to insert
    any variables.

    @param str {String} String to localize
    @param args {Object...} optional arguments to interpolate also
    @returns {String} the localized and formatted string.
  */
  loc: function(str) {
    // NB: This could be implemented as a wrapper to locWithDefault() but
    // it would add some overhead to deal with the arguments and adds stack
    // frames, so we are keeping the implementation separate.
    if (!SC.Locale.currentLocale) { SC.Locale.createCurrentLocale(); }

    var localized = SC.Locale.currentLocale.locWithDefault(str);
    if (SC.typeOf(localized) !== SC.T_STRING) { localized = str; }

    var args = SC.$A(arguments);
    args.shift(); // remove str param
    //to extend String.prototype
    if (args.length > 0 && args[0] && args[0].isSCArray) { args = args[0]; }

    // I looked up the performance of try/catch. IE and FF do not care so
    // long as the catch never happens. Safari and Chrome are affected rather
    // severely (10x), but this is a one-time cost per loc (the code being
    // executed is likely as expensive as this try/catch cost).
    //
    // Also, .loc() is not called SO much to begin with. So, the error handling
    // that this gives us is worth it.
    try {
      return SC.String.fmt(localized, args);      
    } catch (e) {
      SC.error("Error processing string with key: " + str);
      SC.error("Localized String: " + localized);
      SC.error("Error: " + e);
    }

  },

  /**
    Returns the localized metric value for the specified key.  A metric is a
    single value intended to be used in your interface’s layout, such as
    "Button.Confirm.Width" = 100.

    If you would like to return a set of metrics for use in a layout hash, you
    may prefer to use the locLayout() method instead.

    @param str {String} key
    @returns {Number} the localized metric
  */
  locMetric: function(key) {
    var K             = SC.Locale,
        currentLocale = K.currentLocale;

    if (!currentLocale) {
      K.createCurrentLocale();
      currentLocale = K.currentLocale;
    }
    return currentLocale.locMetric(key);
  },

  /**
    Creates and returns a new hash suitable for use as an SC.View’s 'layout'
    hash.  This hash will be created by looking for localized metrics following
    a pattern based on the “base key” you specify.

    For example, if you specify "Button.Confirm", the following metrics will be
    used if they are defined:

      Button.Confirm.left
      Button.Confirm.top
      Button.Confirm.right
      Button.Confirm.bottom
      Button.Confirm.width
      Button.Confirm.height
      Button.Confirm.midWidth
      Button.Confirm.minHeight
      Button.Confirm.centerX
      Button.Confirm.centerY

    Additionally, you can optionally specify a hash which will be merged on top
    of the returned hash.  For example, if you wish to allow a button’s width
    to be configurable per-locale, but always wish for it to be centered
    vertically and horizontally, you can call:

      locLayout("Button.Confirm", {centerX:0, centerY:0})

    …so that you can combine both localized and non-localized elements in the
    returned hash.  (An exception will be thrown if there is a locale-specific
    key that matches a key specific in this hash.)


    For example, if your locale defines:

      Button.Confirm.left
      Button.Confirm.top
      Button.Confirm.right
      Button.Confirm.bottom


    …then these two code snippets will produce the same result:

      layout: {
        left:   "Button.Confirm.left".locMetric(),
        top:    "Button.Confirm.top".locMetric(),
        right:  "Button.Confirm.right".locMetric(),
        bottom: "Button.Confirm.bottom".locMetric()
      }

      layout: "Button.Confirm".locLayout()

    The former is slightly more efficient because it doesn’t have to iterate
    through the possible localized layout keys, but in virtually all situations
    you will likely wish to use the latter.

    @param str {String} key
    @param {str} (optional) additionalHash
    @param {String} (optional) additionalHash
    @returns {Number} the localized metric
  */
  locLayout: function(key, additionalHash) {
    var K             = SC.Locale,
        currentLocale = K.currentLocale;

    if (!currentLocale) {
      K.createCurrentLocale();
      currentLocale = K.currentLocale;
    }
    return currentLocale.locLayout(key, additionalHash);
  },

  /**
    Works just like loc() except that it will return the passed default
    string if a matching key is not found.

    @param {String} str the string to localize
    @param {String} def the default to return
    @param {Object...} args optional formatting arguments
    @returns {String} localized and formatted string
  */
  locWithDefault: function(str, def) {
    if (!SC.Locale.currentLocale) { SC.Locale.createCurrentLocale(); }

    var localized = SC.Locale.currentLocale.locWithDefault(str, def);
    if (SC.typeOf(localized) !== SC.T_STRING) { localized = str; }

    var args = SC.$A(arguments);
    args.shift(); // remove str param
    args.shift(); // remove def param

    return SC.String.fmt(localized, args);
  },

  /**
   Removes any extra whitespace from the edges of the string. This method is
   also aliased as strip().

   @returns {String} the trimmed string
  */
  trim: jQuery.trim,

  /**
   Removes any extra whitespace from the left edge of the string.

   @returns {String} the trimmed string
  */
  trimLeft: function (str) {
    return str.replace(SC.STRING_TRIM_LEFT_REGEXP,"");
  },

  /**
   Removes any extra whitespace from the right edge of the string.

   @returns {String} the trimmed string
  */
  trimRight: function (str) {
    return str.replace(SC.STRING_TRIM_RIGHT_REGEXP,"");
  },
  
  /**
    Mulitplies a given string. For instance if you have a string "xyz"
    and multiply it by 2 the result is "xyzxyz".
    
    @param {String} str the string to multiply
    @param {Number} value the number of times to multiply the string
    @returns {String} the mulitiplied string
  */
  mult: function(str, value) {
    if (SC.typeOf(value) !== SC.T_NUMBER || value < 1) return null;
    
    var ret = "";
    for (var i = 0; i < value; i += 1) {
      ret += str;
    }
    
    return ret;
  }
  
});


// IE doesn't support string trimming
if(String.prototype.trim) {
  SC.supplement(String.prototype,
  /** @scope String.prototype */ {

    trim: function() {
      return SC.String.trim(this, arguments);
    },

    trimLeft: function() {
      return SC.String.trimLeft(this, arguments);
    },

    trimRight: function() {
      return SC.String.trimRight(this, arguments);
    }
  });
}

// We want the version defined here, not in Runtime
SC.mixin(String.prototype,
/** @scope String.prototype */ {

  loc: function() {
    return SC.String.loc(this.toString(), SC.$A(arguments));
  },

  locMetric: function() {
    return SC.String.locMetric(this.toString());
  },

  locLayout: function(additionalHash) {
    return SC.String.locLayout(this.toString(), additionalHash);
  }

});

