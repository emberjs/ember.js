// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/core');
require('ember-runtime/system/string');



var fmt = Ember.String.fmt,
    w   = Ember.String.w,
    loc = Ember.String.loc,
    decamelize = Ember.String.decamelize,
    dasherize = Ember.String.dasherize;
  
if (Ember.EXTEND_PROTOTYPES) {

  /**
    @see Ember.String.fmt
  */
  String.prototype.fmt = function() {
    return fmt(this, arguments);
  };
  
  /**
    @see Ember.String.w
  */
  String.prototype.w = function() {
    return w(this);
  };
  
  /**
    @see Ember.String.loc
  */
  String.prototype.loc = function() {
    return loc(this, arguments);
  };
  
  /**
    @see Ember.String.decamelize
  */
  String.prototype.decamelize = function() {
    return decamelize(this);
  };
  
  /**
    @see Ember.String.dasherize
  */
  String.prototype.dasherize = function() {
    return dasherize(this);
  };
}



