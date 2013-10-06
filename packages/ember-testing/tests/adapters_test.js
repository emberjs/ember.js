var App;

module("ember-testing Adapters", {
  teardown: function() {
    Ember.run(App, App.destroy);
    App.removeTestHelpers();
    App = null;
  }
});

test("Setting a test adapter manually", function() {
  expect(1);
  var originalAdapter = Ember.Test.adapter, CustomAdapter;

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

  Ember.Test.adapter = originalAdapter;
});

test("QUnitAdapter is used by default", function() {
  expect(1);
  var originalAdapter = Ember.Test.adapter, CustomAdapter;

  Ember.Test.adapter = null;

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  ok(Ember.Test.adapter instanceof Ember.Test.QUnitAdapter);

  Ember.Test.adapter = originalAdapter;
});
