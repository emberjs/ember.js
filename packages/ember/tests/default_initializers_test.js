import Application from 'ember-application/system/application';
import TextField from 'ember-templates/components/text_field';
import Checkbox from 'ember-templates/components/checkbox';

import run from 'ember-metal/run_loop';

var App;

QUnit.module('Default Registry', {
  setup() {
    run(function() {
      App = Application.create({
        rootElement: '#qunit-fixture'
      });

      App.deferReadiness();
    });
  },

  teardown() {
    run(App, 'destroy');
  }
});

QUnit.test('Default objects are registered', function(assert) {
  App.instanceInitializer({
    name: 'test',
    initialize(instance) {
      assert.strictEqual(instance.resolveRegistration('component:-text-field'), TextField, 'TextField was registered');
      assert.strictEqual(instance.resolveRegistration('component:-checkbox'), Checkbox, 'Checkbox was registered');
    }
  });

  run(function() {
    App.advanceReadiness();
  });
});
