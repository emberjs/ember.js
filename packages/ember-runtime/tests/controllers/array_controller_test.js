// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/mutable_array');

module("ember-runtime/controllers/array_controller_test");

Ember.MutableArrayTests.extend({

  name: 'Ember.ArrayController',

  newObject: function(ary) {
    var ret = ary ? ary.slice() : this.newFixture(3);
    return Ember.ArrayController.create({
      content: Ember.A(ret)
    });
  },

  mutate: function(obj) {
    obj.pushObject(Ember.get(obj, 'length')+1);
  },

  toArray: function(obj) {
    return obj.toArray ? obj.toArray() : obj.slice();
  }
}).run();

var controller, content;
module("Ember.ArrayController - orderBy", {
  setup: function() {
    content = Ember.A([2, 10, 5]);
    content = content.map(function(item) {
      return Ember.Object.create({
        id: item
      });
    });
    content = Ember.A(content);

    controller = Ember.ArrayController.create({
      content: content,
      orderBy: 'id'
    });
  }
});

var shouldHaveIdAtIndex = function(id, index) {
  var obj = controller.objectAt(index);
  equal(obj.get('id'), id, "should have object with id " + id + " at index " + index);
};

test("content should be sorted", function() {
  shouldHaveIdAtIndex(2, 0);
  shouldHaveIdAtIndex(5, 1);
  shouldHaveIdAtIndex(10, 2);
});

test("if new objects are added to the underlying content, the array controller should be updated", function() {
  content.replace(0, 0, [Ember.Object.create({ id: 6 })]);

  shouldHaveIdAtIndex(2, 0);
  shouldHaveIdAtIndex(5, 1);
  shouldHaveIdAtIndex(6, 2);
  shouldHaveIdAtIndex(10, 3);
});
