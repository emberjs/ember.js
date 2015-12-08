import Ember from 'ember-metal/core';
import run from 'ember-metal/run_loop';
import Engine from 'ember-application/system/engine';
import EmberObject from 'ember-runtime/system/object';

let engine;

QUnit.module('Ember.Engine', {
  setup() {
    run(function() {
      engine = Engine.create();
    });
  },

  teardown() {
    if (engine) {
      run(engine, 'destroy');
    }
  }
});

QUnit.test('acts like a namespace', function() {
  let lookup = Ember.lookup = {};

  run(function() {
    engine = lookup.TestEngine = Engine.create();
  });

  engine.Foo = EmberObject.extend();
  equal(engine.Foo.toString(), 'TestEngine.Foo', 'Classes pick up their parent namespace');
});
