import EmberRouter from "ember-routing/system/router";

var Router;

module("Ember Router DSL", {
  setup: function() {
    Router = EmberRouter.extend();
  },
  teardown: function() {
    Router = null;
  }
});

test("should fail when using a reserved route name", function() {
  expect(2);

  expectAssertion(function() {
    Router.map(function() {
      this.route('basic');
    });
  }, "'basic' cannot be used as a route name.");

  expectAssertion(function() {
    Router.map(function() {
      this.resource('basic');
    });
  }, "'basic' cannot be used as a resource name.");
});
