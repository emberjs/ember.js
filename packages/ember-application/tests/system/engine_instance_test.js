import Engine from 'ember-application/system/engine';
import run from 'ember-metal/run_loop';

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
