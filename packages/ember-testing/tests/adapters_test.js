var App, originalAdapter;

module("ember-testing Adapters", {
  setup: function() {
    originalAdapter = Ember.Test.adapter;
  },
  teardown: function() {
    Ember.run(App, App.destroy);
    App.removeTestHelpers();
    App = null;

    Ember.Test.adapter = originalAdapter;
  }
});

test("Setting a test adapter manually", function() {
  expect(1);
  var CustomAdapter;

  CustomAdapter = Ember.Test.Adapter.extend({
    asyncStart: function() {
      ok(true, "Correct adapter was used");
    }
  });

  Ember.run(function() {
    App = Ember.Application.create();
    Ember.Test.adapter = CustomAdapter.create();
    App.setupForTesting();
  });

  Ember.Test.adapter.asyncStart();
});

test("QUnitAdapter is used by default", function() {
  expect(1);

  Ember.Test.adapter = null;

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  ok(Ember.Test.adapter instanceof Ember.Test.QUnitAdapter);
});
