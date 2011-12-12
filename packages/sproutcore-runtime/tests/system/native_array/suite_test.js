// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

Ember.MutableArrayTests.extend({
  
  name: 'Native Array',
  
  newObject: function(ary) {
    return Ember.A(ary ? ary.slice() : this.newFixture(3));
  },

  mutate: function(obj) {
    obj.pushObject(obj.length+1);
  },
  
  toArray: function(obj) {
    return obj.slice(); // make a copy.
  }
  
}).run();



