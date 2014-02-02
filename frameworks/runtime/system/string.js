// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @class
  
  Implements support methods useful when working with strings in SproutCore
  applications.
*/
SC.String = /** @scope SC.String.prototype */ {
  
  /**
    This finds the value for a key in a formatting string.
    
    Keys take the form:
    
        key[:argument to formatter]
  */
  _scs_valueForKey: function(key, data, /* for debugging purposes: */ string) {
    var arg, value, formatter, argsplit = key.indexOf(':');
    if (argsplit > -1) {
      arg = key.substr(argsplit + 1);
      key = key.substr(0, argsplit);
    }
    
    value = data[key];
    formatter = data[key + 'Formatter'];
    
    // formatters are optional
    if (formatter) value = formatter(value, arg);
    else if (arg) {
      throw new Error("String.fmt was given a formatting string, but key `" + key + "` has no formatter! String: " + string);
    }
    
    return value;
  },

  /**
    Formats a string. You can format either with named parameters or
    indexed, but not both.

    Indexed Parameters
    --------------------
    Indexed parameters are just arguments you pass into format. For example:
    
        "%@1 %@3 %@2".fmt(1, 2, 3)
        
        // -> "1 3 2"
    
    If you don't supply a number, it will use them in the order you supplied. For example:
    
        "%@, %@".fmt("Iskander", "Alex")
        
        // -> "Iskander, Alex"

    Named Paramters
    --------------------
    You can use named parameters like this:

        "Value: %{key_name}".fmt({ key_name: "A Value" })
        
        // -> "Value: A Value"
    
    You can supply formatters for each field. A formatter is a method to get applied
    to the parameter:
    
        Currency = function(v) { return "$" + v; };
        "Value: %{val}".fmt({ val: 12.00, valFormatter: Currency })
        
        // -> $12.00
    
    Formatters can also use arguments:
    
        Currency = function(v, sign) { return sign + v; };
        "Value: %{val:£}".fmt({ val: 12.00, valFormatter: Currency })
        
        // -> £12.00

    You can supply a different formatter for each named parameter. Formatters can ONLY be
    used with named parameters (not indexed parameters).
        
  */
  fmt: function(string, args) {
    var i = 0, data = undefined, hasHadNamedArguments;
    if (args) {
      data = args[0];
    }
    
    return string.replace(/%\{(.*?)\}/g, function(match, propertyPath) {
      hasHadNamedArguments = YES;
      if (!data) {
        throw new Error("Cannot use named parameters with `fmt` without a data hash. String: '" + string + "'");
      }

      var ret = SC.String._scs_valueForKey(propertyPath, data, string);
      // If a value was found, return that; otherwise return the original matched text to retain it in the string
      // for future formatting.
      if (!SC.none(ret)) { return ret; }
      else { return match; }
    }).replace(/%@([0-9]+)?/g, function(match, index) {
      if (hasHadNamedArguments) {
        throw new Error("Invalid attempt to use both named parameters and indexed parameters. String: '" + string + "'");
      }
      index = index ? parseInt(index, 10) - 1 : i++;
      if(args[index]!==undefined) return args[index];
      else return "";
    });
  },
  
  /**
    Splits the string into words, separated by spaces. Empty strings are
    removed from the results.

    @returns {Array} An array of non-empty strings
  */
  w: function(str) {
    var ary = [], ary2 = str.split(' '), len = ary2.length, string, idx=0;
    for (idx=0; idx<len; ++idx) {
      string = ary2[idx] ;
      if (string.length !== 0) ary.push(string) ; // skip empty strings
    }
    return ary ;
  }
};
