// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/core');

if (Ember.EXTEND_PROTOTYPES) {

  Function.prototype.property = function() {
    var ret = Ember.computed(this);
    return ret.property.apply(ret, arguments);
  };

  Function.prototype.observes = function() {
    this.__ember_observes__ = Array.prototype.slice.call(arguments);
    return this;
  };

  Function.prototype.observesBefore = function() {
    this.__ember_observesBefore__ = Array.prototype.slice.call(arguments);
    return this;
  };

}

