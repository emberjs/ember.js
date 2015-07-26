/* globals EmberDev */
import isEnabled from 'ember-metal/features';
import EmberRouter from 'ember-routing/system/router';
import { HANDLERS } from 'ember-debug/handlers';
import {
  registerHandler as registerWarnHandler
} from 'ember-debug/warn';



var Router, outerWarnHandler;

QUnit.module('Ember Router DSL', {
  setup() {
    Router = EmberRouter.extend();
    outerWarnHandler = HANDLERS.warn;
  },
  teardown() {
    HANDLERS.warn = outerWarnHandler;
    Router = null;
  }
});

QUnit.test('should fail when using a reserved route name', function() {
  expectDeprecation('this.resource() is deprecated. Use this.route(\'name\', { resetNamespace: true }, function () {}) instead.');
  var reservedNames = ['array', 'basic', 'object', 'application'];

  expect((reservedNames.length * 2) + 1);

  reservedNames.forEach(function(reservedName) {
    expectAssertion(function() {
      Router = EmberRouter.extend();

      Router.map(function() {
        this.route(reservedName);
      });

      var router = Router.create();
      router._initRouterJs();
    }, '\'' + reservedName + '\' cannot be used as a route name.');

    expectAssertion(function() {
      Router = EmberRouter.extend();

      Router.map(function() {
        this.resource(reservedName);
      });

      var router = Router.create();
      router._initRouterJs();
    }, `'${reservedName}' cannot be used as a route name.`);
  });
});

// jscs:disable validateIndentation
if (EmberDev && !EmberDev.runningProdBuild) {
  QUnit.test('should warn when using a dangerous select route name', function(assert) {
    expect(1);

    var originalWarnHandler = HANDLERS.warn;

    registerWarnHandler(function(message) {
      assert.equal(message,
                   `Using a route named 'select' (and defining a App.SelectView) will prevent you from using {{view 'select'}}`,
                   'select route warning is triggered');
    });

    Router = EmberRouter.extend();

    Router.map(function() {
      this.route('select');
    });

    var router = Router.create();
    router._initRouterJs();

    HANDLERS.warn = originalWarnHandler;
  });
}
// jscs:enable validateIndentation

QUnit.test('should reset namespace if nested with resource', function() {
  expectDeprecation('this.resource() is deprecated. Use this.route(\'name\', { resetNamespace: true }, function () {}) instead.');

  Router = Router.map(function() {
    this.resource('bleep', function() {
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

QUnit.test('should retain resource namespace if nested with routes', function() {
  Router = Router.map(function() {
    this.route('bleep', function() {
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

// jscs:disable validateIndentation
if (isEnabled('ember-routing-named-substates')) {
  QUnit.test('should add loading and error routes if _isRouterMapResult is true', function() {
  Router.map(function() {
    this.route('blork');
  });

  var router = Router.create();
  router._initRouterJs(true);

  ok(router.router.recognizer.names['blork'], 'main route was created');
  ok(router.router.recognizer.names['blork_loading'], 'loading route was added');
  ok(router.router.recognizer.names['blork_error'], 'error route was added');
});

  QUnit.test('should not add loading and error routes if _isRouterMapResult is false', function() {
  Router.map(function() {
    this.route('blork');
  });

  var router = Router.create();
  router._initRouterJs(false);

  ok(router.router.recognizer.names['blork'], 'main route was created');
  ok(!router.router.recognizer.names['blork_loading'], 'loading route was not added');
  ok(!router.router.recognizer.names['blork_error'], 'error route was not added');
});
}
// jscs:enable validateIndentation
