// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// ..........................................................
// COPYABLE TESTS
// 
Ember.CopyableTests.extend({
  name: 'Ember.Set Copyable',
  
  newObject: function() {
    var set = new Ember.Set();
    set.addObject(Ember.generateGuid());
    return set;
  },
  
  isEqual: function(a,b) {
    if (!(a instanceof Ember.Set)) return false;
    if (!(b instanceof Ember.Set)) return false;
    return Ember.get(a, 'firstObject') === Ember.get(b, 'firstObject');
  },
  
  shouldBeFreezable: true
}).run();


