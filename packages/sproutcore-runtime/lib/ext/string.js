// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/core');
require('sproutcore-runtime/system/string');



var fmt = SC.String.fmt,
    w   = SC.String.w,
    loc = SC.String.loc,
    decamelize = SC.String.decamelize,
    dasherize = SC.String.dasherize;
  
if (SC.EXTEND_PROTOTYPES) {

  /**
    @see SC.String.fmt
  */
  String.prototype.fmt = function() {
    return fmt(this, arguments);
  };
  
  /**
    @see SC.String.w
  */
  String.prototype.w = function() {
    return w(this);
  };
  
  /**
    @see SC.String.loc
  */
  String.prototype.loc = function() {
    return loc(this, arguments);
  };
  
  /**
    @see SC.String.decamelize
  */
  String.prototype.decamelize = function() {
    return decamelize(this);
  };
  
  /**
    @see SC.String.dasherize
  */
  String.prototype.dashersize = function() {
    return dasherize(this);
  };
}



