import Ember from "ember-metal/core";
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

test("will reset nested resource scope by default", function(){
  var router = Router.map(function(){
    this.resource('bleep', function(){
      this.resource('bloop');
    });
  });

  ok(!router.recognizer.names['bleep.bloop'], 'resource resets route namespacing by default');
});

if (Ember.FEATURES.isEnabled('ember-routing-nested-resource-can-inherit-namespace')) {
  test("should retain resource namespace if `resetScope` is false", function(){
    var router = Router.map(function(){
      this.resource('bleep', function(){
        this.resource('bloop', {resetNamespace: false});
      });
    });

    ok(router.recognizer.names['bleep.bloop'], 'parent name was used as base of route with resetNamespace: false');
  });
}
