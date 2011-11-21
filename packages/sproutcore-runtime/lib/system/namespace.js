// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/system/object');

/**
  @private
  A Namespace is an object usually used to contain other objects or methods
  such as an application or framework.  Create a namespace anytime you want
  to define one of these new containers.

  # Example Usage

      MyFramework = SC.Namespace.create({
        VERSION: '1.0.0'
      });

*/
SC.Namespace = SC.Object.extend({
  init: function() {
    SC.Namespace.NAMESPACES.push(this);
    SC.Namespace.PROCESSED = false;
  },

  toString: function() {
    SC.identifyNamespaces();
    return this[SC.GUID_KEY+'_name'];
  },

  destroy: function() {
    var namespaces = SC.Namespace.NAMESPACES;
    window[this.toString()] = undefined;
    namespaces.splice(namespaces.indexOf(this), 1);
    this._super();
  }
});

SC.Namespace.NAMESPACES = [];
SC.Namespace.PROCESSED = true;
