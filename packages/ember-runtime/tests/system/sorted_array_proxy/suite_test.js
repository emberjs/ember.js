// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2012 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

Ember.MutableArrayTests.extend({

  name: 'Ember.SortedArrayProxy',

  newObject: function(ary) {
    var ret = ary ? ary.slice() : this.newFixture(3);
    return Ember.SortedArrayProxy.create({ content: Ember.A(ret) });
  },

  mutate: function(obj) {
    obj.pushObject(Ember.get(obj, 'length')+1);
  },

  toArray: function(obj) {
    return obj.toArray ? obj.toArray() : obj.slice();
  }

}).run();
