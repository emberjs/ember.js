import EmberRouter from 'ember-routing/system/router';
import { setOwner } from 'container/owner';
import buildOwner from 'container/tests/test-helpers/build-owner';
import isEnabled from 'ember-metal/features';

let Router;

function setup() {
  Router = EmberRouter.extend();
}

function teardown() {
  Router = null;
}

QUnit.module('Ember Router DSL', {
  setup,
  teardown
});

QUnit.test('should fail when using a reserved route name', function() {
  expectDeprecation('this.resource() is deprecated. Use this.route(\'name\', { resetNamespace: true }, function () {}) instead.');
  let reservedNames = ['array', 'basic', 'object', 'application'];

  expect((reservedNames.length * 2) + 1);

  reservedNames.forEach(reservedName => {
    expectAssertion(() => {
      Router = EmberRouter.extend();

      Router.map(function() {
        this.route(reservedName);
      });

      let router = Router.create();
      router._initRouterJs();
    }, '\'' + reservedName + '\' cannot be used as a route name.');

    expectAssertion(() => {
      Router = EmberRouter.extend();

      Router.map(function() {
        this.resource(reservedName);
      });

      let router = Router.create();
      router._initRouterJs();
    }, `'${reservedName}' cannot be used as a route name.`);
  });
});

QUnit.test('should reset namespace if nested with resource', function() {
  expectDeprecation('this.resource() is deprecated. Use this.route(\'name\', { resetNamespace: true }, function () {}) instead.');

  Router = Router.map(function() {
    this.resource('bleep', function() {
      this.resource('bloop', function() {
        this.resource('blork');
      });
    });
  });

  let router = Router.create();
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

  let router = Router.create();
  router._initRouterJs();

  ok(router.router.recognizer.names['bleep'], 'parent name was used as base of nested routes');
  ok(router.router.recognizer.names['bleep.bloop'], 'parent name was used as base of nested routes');
  ok(router.router.recognizer.names['bleep.bloop.blork'], 'parent name was used as base of nested routes');
});

QUnit.test('should add loading and error routes if _isRouterMapResult is true', function() {
  Router.map(function() {
    this.route('blork');
  });

  let router = Router.create({
    _hasModuleBasedResolver() { return true; }
  });

  router._initRouterJs();

  ok(router.router.recognizer.names['blork'], 'main route was created');
  ok(router.router.recognizer.names['blork_loading'], 'loading route was added');
  ok(router.router.recognizer.names['blork_error'], 'error route was added');
});

QUnit.test('should not add loading and error routes if _isRouterMapResult is false', function() {
  Router.map(function() {
    this.route('blork');
  });

  let router = Router.create();
  router._initRouterJs(false);

  ok(router.router.recognizer.names['blork'], 'main route was created');
  ok(!router.router.recognizer.names['blork_loading'], 'loading route was not added');
  ok(!router.router.recognizer.names['blork_error'], 'error route was not added');
});

if (isEnabled('ember-application-engines')) {
  QUnit.test('should throw an error when defining a route serializer outside an engine', function() {
    Router.map(function() {
      throws(() => {
        this.route('posts', { serialize: function() {} });
      }, /Defining a route serializer on route 'posts' outside an Engine is not allowed/);
    });

    Router.create()._initRouterJs();
  });

  QUnit.module('Ember Router DSL with engines', {
    setup,
    teardown
  });

  QUnit.test('should allow mounting of engines', function(assert) {
    assert.expect(3);

    Router = Router.map(function() {
      this.route('bleep', function() {
        this.route('bloop', function() {
          this.mount('chat');
        });
      });
    });

    let engineInstance = buildOwner({
      routable: true
    });

    let router = Router.create();
    setOwner(router, engineInstance);
    router._initRouterJs();

    assert.ok(router.router.recognizer.names['bleep'], 'parent name was used as base of nested routes');
    assert.ok(router.router.recognizer.names['bleep.bloop'], 'parent name was used as base of nested routes');
    assert.ok(router.router.recognizer.names['bleep.bloop.chat'], 'parent name was used as base of mounted engine');
  });

  QUnit.test('should allow mounting of engines at a custom path', function(assert) {
    assert.expect(1);

    Router = Router.map(function() {
      this.route('bleep', function() {
        this.route('bloop', function() {
          this.mount('chat', { path: 'custom-chat' });
        });
      });
    });

    let engineInstance = buildOwner({
      routable: true
    });

    let router = Router.create();
    setOwner(router, engineInstance);
    router._initRouterJs();

    assert.deepEqual(
      router.router.recognizer.names['bleep.bloop.chat']
        .segments
        .slice(1, 4)
        .map(s => s.string),
      ['bleep', 'bloop', 'custom-chat'],
      'segments are properly associated with mounted engine');
  });

  QUnit.test('should allow aliasing of engine names with `as`', function(assert) {
    assert.expect(1);

    Router = Router.map(function() {
      this.route('bleep', function() {
        this.route('bloop', function() {
          this.mount('chat', { as: 'blork' });
        });
      });
    });

    let engineInstance = buildOwner({
      routable: true
    });

    let router = Router.create();
    setOwner(router, engineInstance);
    router._initRouterJs();

    assert.deepEqual(
      router.router.recognizer.names['bleep.bloop.blork']
        .segments
        .slice(1, 4)
        .map(s => s.string),
      ['bleep', 'bloop', 'blork'],
      'segments are properly associated with mounted engine with aliased name');
  });
}
