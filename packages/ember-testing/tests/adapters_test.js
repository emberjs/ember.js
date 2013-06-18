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

test("Concurrent wait calls are supported", function() {
  expect(4);

  var originalAdapter = Ember.Test.adapter,
      CustomAdapter,
      asyncStartCalled = 0,
      asyncEndCalled = 0,
      wait;

  CustomAdapter = Ember.Test.QUnitAdapter.extend({
    asyncStart: function() {
      asyncStartCalled++;
      this._super();
    },
    asyncEnd: function() {
      asyncEndCalled++;
      this._super();
    }
  });

  Ember.Test.adapter = CustomAdapter.create();

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  App.injectTestHelpers();

  wait = App.testHelpers.wait;

  Ember.run(App, App.advanceReadiness);

  wait().then(function() {
    equal(asyncStartCalled, 1, "asyncStart was called once");
    equal(asyncEndCalled, 0, "asyncEnd hasn't been called yet");
  });
  wait().then(function() {
    equal(asyncStartCalled, 1, "asyncStart was called once");
    equal(asyncEndCalled, 1, "asyncEnd was called once");
    Ember.Test.adapter = originalAdapter;
  });

});
