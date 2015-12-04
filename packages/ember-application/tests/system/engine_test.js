import run from 'ember-metal/run_loop';
import Engine from 'ember-application/system/engine';

var engine;

QUnit.module('Ember.Engine', {
  setup() {
    run(function() {
      engine = Engine.create({ router: null });
    });
  },

  teardown() {
    if (engine) {
      run(engine, 'destroy');
    }
  }
});
