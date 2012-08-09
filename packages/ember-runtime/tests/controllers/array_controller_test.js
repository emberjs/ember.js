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

module("Ember.ArrayController");


test("Ember.ArrayController content initialized to [] if not already defined", function() {
  var controller = Ember.ArrayController.create();
  equal(controller.get('content.length'), 0, "content initialized if not defined");

  var initialContent = Ember.A([1, 2, 3]);
  var initialized_controller = Ember.ArrayController.create({content: initialContent});
  equal(initialized_controller.get('content'), initialContent, "initial content not overriden");  
});
