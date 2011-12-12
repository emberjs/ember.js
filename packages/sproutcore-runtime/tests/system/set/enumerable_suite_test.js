// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// ..........................................................
// MUTABLE ENUMERABLE TESTS
// 
Ember.MutableEnumerableTests.extend({
  
  name: 'Ember.Set',
  
  newObject: function(ary) {
    ary = ary ? ary.slice() : this.newFixture(3);
    var ret = new Ember.Set();
    ret.addObjects(ary);
    return ret;
  },

  mutate: function(obj) {
    obj.addObject(Ember.get(obj, 'length')+1);
  },
  
  toArray: function(obj) {
    return obj.toArray ? obj.toArray() : obj.slice(); // make a copy.
  }
  
}).run();
