import Engine from 'ember-application/system/engine';
import EngineInstance from 'ember-application/system/engine-instance';
import run from 'ember-metal/run_loop';
import factory from 'container/tests/test-helpers/factory';

let engine, engineInstance;

QUnit.module('Ember.EngineInstance', {
  setup() {
    run(function() {
      engine = Engine.create({ router: null });
    });
  },

  teardown() {
    if (engineInstance) {
      run(engineInstance, 'destroy');
    }

    if (engine) {
      run(engine, 'destroy');
    }
  }
});

QUnit.test('an engine instance can be created based upon a base engine', function() {
  run(function() {
    engineInstance = EngineInstance.create({ base: engine });
  });

  ok(engineInstance, 'instance should be created');
  equal(engineInstance.base, engine, 'base should be set to engine');
});

QUnit.test('unregistering a factory clears all cached instances of that factory', function(assert) {
  assert.expect(3);

  run(function() {
    engineInstance = EngineInstance.create({ base: engine });
  });

  let PostController = factory();

  engineInstance.register('controller:post', PostController);

  let postController1 = engineInstance.lookup('controller:post');
  assert.ok(postController1, 'lookup creates instance');

  engineInstance.unregister('controller:post');
  engineInstance.register('controller:post', PostController);

  let postController2 = engineInstance.lookup('controller:post');
  assert.ok(postController2, 'lookup creates instance');

  assert.notStrictEqual(postController1, postController2, 'lookup creates a brand new instance, because previous one was reset');
});
