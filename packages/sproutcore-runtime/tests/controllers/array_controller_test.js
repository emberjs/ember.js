// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/~tests/suites/mutable_array');

module("sproutcore-runtime/controllers/array_controller_test");

SC.MutableArrayTests.extend({

  name: 'SC.ArrayController',

  newObject: function(ary) {
    var ret = ary ? ary.slice() : this.newFixture(3);
    return SC.ArrayController.create({
      content: ret
    });
  },

  mutate: function(obj) {
    obj.pushObject(SC.get(obj, 'length')+1);
  },

  toArray: function(obj) {
    return obj.toArray ? obj.toArray() : obj.slice();
  }
}).run();
