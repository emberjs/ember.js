import { setOwner } from 'ember-utils';
import EmberRouter from '../../system/router';
import { buildOwner } from 'internal-test-helpers';

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

QUnit.test('should reset namespace of loading and error routes for routes with resetNamespace', function() {
  Router.map(function() {
    this.route('blork', function() {
      this.route('blorp');
      this.route('bleep', { resetNamespace: true });
    });
  });

  let router = Router.create({
    _hasModuleBasedResolver() { return true; }
  });

  router._initRouterJs();

  ok(router.router.recognizer.names['blork.blorp'], 'nested route was created');
  ok(router.router.recognizer.names['blork.blorp_loading'], 'nested loading route was added');
  ok(router.router.recognizer.names['blork.blorp_error'], 'nested error route was added');

  ok(router.router.recognizer.names['bleep'], 'reset route was created');
  ok(router.router.recognizer.names['bleep_loading'], 'reset loading route was added');
  ok(router.router.recognizer.names['bleep_error'], 'reset error route was added');

  ok(!router.router.recognizer.names['blork.bleep'], 'nested reset route was not created');
  ok(!router.router.recognizer.names['blork.bleep_loading'], 'nested reset loading route was not added');
  ok(!router.router.recognizer.names['blork.bleep_error'], 'nested reset error route was not added');
});

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
    ownerOptions: { routable: true }
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
    ownerOptions: { routable: true }
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
    ownerOptions: { routable: true }
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

QUnit.test('should add loading and error routes to a mount if _isRouterMapResult is true', function() {
  Router.map(function() {
    this.mount('chat');
  });

  let engineInstance = buildOwner({
    ownerOptions: { routable: true }
  });

  let router = Router.create({
    _hasModuleBasedResolver() { return true; }
  });
  setOwner(router, engineInstance);
  router._initRouterJs();

  ok(router.router.recognizer.names['chat'], 'main route was created');
  ok(router.router.recognizer.names['chat_loading'], 'loading route was added');
  ok(router.router.recognizer.names['chat_error'], 'error route was added');
});

QUnit.test('should add loading and error routes to a mount alias if _isRouterMapResult is true', function() {
  Router.map(function() {
    this.mount('chat', { as: 'shoutbox' });
  });

  let engineInstance = buildOwner({
    ownerOptions: { routable: true }
  });

  let router = Router.create({
    _hasModuleBasedResolver() { return true; }
  });
  setOwner(router, engineInstance);
  router._initRouterJs();

  ok(router.router.recognizer.names['shoutbox'], 'main route was created');
  ok(router.router.recognizer.names['shoutbox_loading'], 'loading route was added');
  ok(router.router.recognizer.names['shoutbox_error'], 'error route was added');
});

QUnit.test('should not add loading and error routes to a mount if _isRouterMapResult is false', function() {
  Router.map(function() {
    this.mount('chat');
  });

  let engineInstance = buildOwner({
    ownerOptions: { routable: true }
  });

  let router = Router.create();
  setOwner(router, engineInstance);
  router._initRouterJs(false);

  ok(router.router.recognizer.names['chat'], 'main route was created');
  ok(!router.router.recognizer.names['chat_loading'], 'loading route was not added');
  ok(!router.router.recognizer.names['chat_error'], 'error route was not added');
});

QUnit.test('should reset namespace of loading and error routes for mounts with resetNamespace', function() {
  Router.map(function() {
    this.route('news', function() {
      this.mount('chat');
      this.mount('blog', { resetNamespace: true });
    });
  });

  let engineInstance = buildOwner({
    ownerOptions: { routable: true }
  });

  let router = Router.create({
    _hasModuleBasedResolver() { return true; }
  });
  setOwner(router, engineInstance);
  router._initRouterJs();

  ok(router.router.recognizer.names['news.chat'], 'nested route was created');
  ok(router.router.recognizer.names['news.chat_loading'], 'nested loading route was added');
  ok(router.router.recognizer.names['news.chat_error'], 'nested error route was added');

  ok(router.router.recognizer.names['blog'], 'reset route was created');
  ok(router.router.recognizer.names['blog_loading'], 'reset loading route was added');
  ok(router.router.recognizer.names['blog_error'], 'reset error route was added');

  ok(!router.router.recognizer.names['news.blog'], 'nested reset route was not created');
  ok(!router.router.recognizer.names['news.blog_loading'], 'nested reset loading route was not added');
  ok(!router.router.recognizer.names['news.blog_error'], 'nested reset error route was not added');
});
