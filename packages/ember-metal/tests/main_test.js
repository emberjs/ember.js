import Ember from "ember-metal/core";

QUnit.module('ember-metal/core/main');

QUnit.test('Ember registers itself', function() {
  var lib = Ember.libraries._registry[0];

  equal(lib.name, 'Ember');
  equal(lib.version, Ember.VERSION);
});

