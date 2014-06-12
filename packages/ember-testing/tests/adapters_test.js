import run from "ember-metal/run_loop";
import Test from "ember-testing/test";
import Adapter from "ember-testing/adapters/adapter";
import QUnitAdapter from "ember-testing/adapters/qunit";
import EmberApplication from "ember-application/system/application";

var App, originalAdapter;

QUnit.module("ember-testing Adapters", {
  setup: function() {
    originalAdapter = Test.adapter;
  },
  teardown: function() {
    run(App, App.destroy);
    App.removeTestHelpers();
    App = null;

    Test.adapter = originalAdapter;
  }
});

test("Setting a test adapter manually", function() {
  expect(1);
  var CustomAdapter;

  CustomAdapter = Adapter.extend({
    asyncStart: function() {
      ok(true, "Correct adapter was used");
    }
  });

  run(function() {
    App = EmberApplication.create();
    Test.adapter = CustomAdapter.create();
    App.setupForTesting();
  });

  Test.adapter.asyncStart();
});

test("QUnitAdapter is used by default", function() {
  expect(1);

  Test.adapter = null;

  run(function() {
    App = EmberApplication.create();
    App.setupForTesting();
  });

  ok(Test.adapter instanceof QUnitAdapter);
});
