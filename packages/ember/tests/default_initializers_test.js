import Application from "ember-application/system/application";
import TextField from "ember-views/views/text_field";
import Checkbox from "ember-views/views/checkbox";

import run from "ember-metal/run_loop";

var App;

QUnit.module("Default Registry", {
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

QUnit.test("Default objects are registered", function(assert) {
  App.instanceInitializer({
    name: "test",
    initialize(instance) {
      var registry = instance.registry;

      assert.strictEqual(registry.resolve("component:-text-field"), TextField, "TextField was registered");
      assert.strictEqual(registry.resolve("component:-checkbox"), Checkbox, "Checkbox was registered");
    }
  });

  run(function() {
    App.advanceReadiness();
  });
});
