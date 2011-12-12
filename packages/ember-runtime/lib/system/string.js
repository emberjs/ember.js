// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================





/** @private **/
var STRING_DASHERIZE_REGEXP = (/[ _]/g);
var STRING_DASHERIZE_CACHE = {};
var STRING_DECAMELIZE_REGEXP = (/([a-z])([A-Z])/g);
  
/**
  Defines the hash of localized strings for the current language.  Used by 
  the `Ember.String.loc()` helper.  To localize, add string values to this
  hash.
  
  @property {String}
*/
Ember.STRINGS = {};

/**
  Defines string helper methods including string formatting and localization.
  Unless Ember.EXTEND_PROTOTYPES = false these methods will also be added to the
  String.prototype as well.
  
  @namespace
*/
Ember.String = {

  /**
    Apply formatting options to the string.  This will look for occurrences
    of %@ in your string and substitute them with the arguments you pass into
    this method.  If you want to control the specific order of replacement,
    you can add a number after the key as well to indicate which argument
    you want to insert.

    Ordered insertions are most useful when building loc strings where values
    you need to insert may appear in different orders.

    ## Examples

        "Hello %@ %@".fmt('John', 'Doe') => "Hello John Doe"
        "Hello %@2, %@1".fmt('John', 'Doe') => "Hello Doe, John"

    @param {Object...} [args]
    @returns {String} formatted string
  */
  fmt: function(str, formats) {
    // first, replace any ORDERED replacements.
    var idx  = 0; // the current index for non-numerical replacements
    return str.replace(/%@([0-9]+)?/g, function(s, argIndex) {
      argIndex = (argIndex) ? parseInt(argIndex,0) - 1 : idx++ ;
      s = formats[argIndex];
      return ((s === null) ? '(null)' : (s === undefined) ? '' : s).toString();
    }) ;
  },

  /**
    Formats the passed string, but first looks up the string in the localized
    strings hash.  This is a convenient way to localize text.  See 
    `Ember.String.fmt()` for more information on formatting.
    
    Note that it is traditional but not required to prefix localized string
    keys with an underscore or other character so you can easily identify
    localized strings.
    
    # Example Usage
    
        @javascript@
        Ember.STRINGS = {
          '_Hello World': 'Bonjour le monde',
          '_Hello %@ %@': 'Bonjour %@ %@'
        };
        
        Ember.String.loc("_Hello World");
        => 'Bonjour le monde';
        
        Ember.String.loc("_Hello %@ %@", ["John", "Smith"]);
        => "Bonjour John Smith";
        
        
        
    @param {String} str
      The string to format
    
    @param {Array} formats
      Optional array of parameters to interpolate into string.
      
    @returns {String} formatted string
  */
  loc: function(str, formats) {
    str = Ember.STRINGS[str] || str;
    return Ember.String.fmt(str, formats) ;
  },

  /**
    Splits a string into separate units separated by spaces, eliminating any
    empty strings in the process.  This is a convenience method for split that
    is mostly useful when applied to the String.prototype.
    
    # Example Usage
    
        @javascript@
        Ember.String.w("alpha beta gamma").forEach(function(key) { 
          console.log(key); 
        });
        > alpha
        > beta
        > gamma

    @param {String} str
      The string to split
      
    @returns {String} split string
  */
  w: function(str) { return str.split(/\s+/); },
  
  /**
    Converts a camelized string into all lower case separated by underscores.

    h2. Examples

    | *Input String* | *Output String* |
    | my favorite items | my favorite items |
    | css-class-name | css-class-name |
    | action_name | action_name |
    | innerHTML | inner_html |

    @returns {String} the decamelized string.
  */
  decamelize: function(str) {
    return str.replace(STRING_DECAMELIZE_REGEXP, '$1_$2').toLowerCase();
  },

  /**
    Converts a camelized string or a string with spaces or underscores into
    a string with components separated by dashes.

    h2. Examples

    | *Input String* | *Output String* |
    | my favorite items | my-favorite-items |
    | css-class-name | css-class-name |
    | action_name | action-name |
    | innerHTML | inner-html |

    @returns {String} the dasherized string.
  */
  dasherize: function(str) {
    var cache = STRING_DASHERIZE_CACHE,
        ret   = cache[str];

    if (ret) {
      return ret;
    } else {
      ret = Ember.String.decamelize(str).replace(STRING_DASHERIZE_REGEXP,'-');
      cache[str] = ret;
    }

    return ret;
  }
};



