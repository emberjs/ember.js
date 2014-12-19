import EmberRouter from "ember-routing/system/router";
import { forEach } from "ember-metal/enumerable_utils";

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
  var reservedNames = ['array', 'basic', 'object'];

  expect(reservedNames.length * 2);

  forEach(reservedNames, function(reservedName) {

    expectAssertion(function() {
      Router = EmberRouter.extend();

      Router.map(function() {
        this.route(reservedName);
      });

      var router = Router.create();
      router._initRouterJs();
    }, "'" + reservedName + "' cannot be used as a route name.");

    expectAssertion(function() {
      Router = EmberRouter.extend();

      Router.map(function() {
        this.resource(reservedName);
      });

      var router = Router.create();
      router._initRouterJs();
    }, "'" + reservedName + "' cannot be used as a resource name.");

  });
});

test("should reset namespace if nested with resource", function(){
  Router = Router.map(function(){
    this.resource('bleep', function(){
      this.resource('bloop', function() {
        this.resource('blork');
      });
    });
  });

  var router = Router.create();
  router._initRouterJs();

  ok(router.router.recognizer.names['bleep'], 'nested resources do not contain parent name');
  ok(router.router.recognizer.names['bloop'], 'nested resources do not contain parent name');
  ok(router.router.recognizer.names['blork'], 'nested resources do not contain parent name');
});

test("should retain resource namespace if nested with routes", function(){
  Router = Router.map(function(){
    this.route('bleep', function(){
      this.route('bloop', function() {
        this.route('blork');
      });
    });
  });

  var router = Router.create();
  router._initRouterJs();

  ok(router.router.recognizer.names['bleep'], 'parent name was used as base of nested routes');
  ok(router.router.recognizer.names['bleep.bloop'], 'parent name was used as base of nested routes');
  ok(router.router.recognizer.names['bleep.bloop.blork'], 'parent name was used as base of nested routes');
});
