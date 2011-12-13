// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/copyable');

// NOTE: See debug/suites/copyable.js for mosts tests

var CopyableObject = Ember.Object.extend(Ember.Copyable, {
  
  id: null,
  
  init: function() {
    this._super();
    Ember.set(this, 'id', Ember.generateGuid());
  },
  
  copy: function() {
    var ret = new CopyableObject();
    Ember.set(ret, 'id', Ember.get(this, 'id'));
    return ret;
  }
});

Ember.CopyableTests.extend({
  
  name: 'Ember.Copyable Basic Test',
  
  newObject: function() {
    return new CopyableObject();
  },
  
  isEqual: function(a, b) {
    if (!(a instanceof CopyableObject) || !(b instanceof CopyableObject)) return false;
    return Ember.get(a, 'id') === Ember.get(b,'id');
  }
}).run();
