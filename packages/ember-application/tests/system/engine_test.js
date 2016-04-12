import { context } from 'ember-environment';
import run from 'ember-metal/run_loop';
import Engine from 'ember-application/system/engine';
import EmberObject from 'ember-runtime/system/object';

let engine;
let originalLookup = context.lookup;
let lookup;

QUnit.module('Ember.Engine', {
  setup() {
    lookup = context.lookup = {};
    run(function() {
      engine = Engine.create();
    });
  },

  teardown() {
    context.lookup = originalLookup;
    if (engine) {
      run(engine, 'destroy');
    }
  }
});

QUnit.test('acts like a namespace', function() {
  run(function() {
    engine = lookup.TestEngine = Engine.create();
  });

  engine.Foo = EmberObject.extend();
  equal(engine.Foo.toString(), 'TestEngine.Foo', 'Classes pick up their parent namespace');
});
