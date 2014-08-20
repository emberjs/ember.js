import EmberRouter from "ember-routing/system/router";

var Router;

QUnit.module("Ember Router DSL", {
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

test("should reset namespace if nested with resource", function(){
  var router = Router.map(function(){
    this.resource('bleep', function(){
      this.resource('bloop', function() {
        this.resource('blork');
      });
    });
  });

  ok(router.recognizer.names['bleep'], 'nested resources do not contain parent name');
  ok(router.recognizer.names['bloop'], 'nested resources do not contain parent name');
  ok(router.recognizer.names['blork'], 'nested resources do not contain parent name');
});

test("should retain resource namespace if nested with routes", function(){
  var router = Router.map(function(){
    this.route('bleep', function(){
      this.route('bloop', function() {
        this.route('blork');
      });
    });
  });

  ok(router.recognizer.names['bleep'], 'parent name was used as base of nested routes');
  ok(router.recognizer.names['bleep.bloop'], 'parent name was used as base of nested routes');
  ok(router.recognizer.names['bleep.bloop.blork'], 'parent name was used as base of nested routes');
});
