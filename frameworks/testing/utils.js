// ==========================================================================
// Project:   SproutCore Unit Testing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// These utility methods are included from the SproutCore's foundation to 
// make it easier write unit tests.  They only install themselves if a method
// has not already been defined.

if (!String.prototype.camelize) {
  String.prototype.camelize = function camelize() {
    var ret = this.replace(SC.STRING_TITLEIZE_REGEXP, 
      function(str,separater,character) { 
        return (character) ? character.toUpperCase() : '' ;
      }) ;
    var first = ret.charAt(0), lower = first.toLowerCase() ;
    return (first !== lower) ? (lower + ret.slice(1)) : ret ;
  };
}

if (!String.prototype.trim) {
  String.prototype.trim = function trim() {
    return this.replace(/^\s+|\s+$/g,"");
  } ;
}

if (!String.prototype.fmt) {
  String.prototype.fmt = function fmt() {
    // first, replace any ORDERED replacements.
    var args = arguments;
    var idx  = 0; // the current index for non-numerical replacements
    return this.replace(/%@([0-9]+)?/g, function(s, argIndex) {
      argIndex = (argIndex) ? parseInt(argIndex,0)-1 : idx++ ;
      s =args[argIndex];
      return ((s===null) ? '(null)' : (s===undefined) ? '' : s).toString(); 
    }) ;
  } ;
}

if (!Array.prototype.uniq) {
  Array.prototype.uniq = function uniq() {
    var ret = [], len = this.length, item, idx ;
    for(idx=0;idx<len;idx++) {
      item = this[idx];
      if (ret.indexOf(item) < 0) ret.push(item);
    }
    return ret ;
  };
}

if (!String.prototype.w) {
  String.prototype.w = function w() { 
    var ary = [], ary2 = this.split(' '), len = ary2.length ;
    for (var idx=0; idx<len; ++idx) {
      var str = ary2[idx] ;
      if (str.length !== 0) ary.push(str) ; // skip empty strings
    }
    return ary ;
  };
}
