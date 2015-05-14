import {
  factory
} from 'container/tests/container_helper';

import {
  Registry
} from 'container';

var originalModelInjections;

QUnit.module("Registry", {
  setup() {
    originalModelInjections = Ember.MODEL_FACTORY_INJECTIONS;
  },
  teardown() {
    Ember.MODEL_FACTORY_INJECTIONS = originalModelInjections;
  }
});

QUnit.test("A registered factory is returned from resolve", function() {
  var registry = new Registry();
  var PostController = factory();

  registry.register('controller:post', PostController);

  var PostControllerFactory = registry.resolve('controller:post');

  ok(PostControllerFactory, 'factory is returned');
  ok(PostControllerFactory.create() instanceof  PostController, "The return of factory.create is an instance of PostController");
});

QUnit.test("The registered factory returned from resolve is the same factory each time", function() {
  var registry = new Registry();
  var PostController = factory();

  registry.register('controller:post', PostController);

  deepEqual(registry.resolve('controller:post'), registry.resolve('controller:post'), 'The return of resolve is always the same');
});

QUnit.test("A registered factory returns true for `has` if an item is registered", function() {
  var registry = new Registry();
  var PostController = factory();

  registry.register('controller:post', PostController);

  equal(registry.has('controller:post'), true, "The `has` method returned true for registered factories");
  equal(registry.has('controller:posts'), false, "The `has` method returned false for unregistered factories");
});

QUnit.test("Throw exception when trying to inject `type:thing` on all type(s)", function() {
  var registry = new Registry();
  var PostController = factory();

  registry.register('controller:post', PostController);

  throws(function() {
    registry.typeInjection('controller', 'injected', 'controller:post');
  }, 'Cannot inject a `controller:post` on other controller(s).');
});

QUnit.test("The registry can take a hook to resolve factories lazily", function() {
  var registry = new Registry();
  var PostController = factory();

  registry.resolver = function(fullName) {
    if (fullName === 'controller:post') {
      return PostController;
    }
  };

  strictEqual(registry.resolve('controller:post'), PostController, "The correct factory was provided");
});

QUnit.test("The registry respects the resolver hook for `has`", function() {
  var registry = new Registry();
  var PostController = factory();

  registry.resolver = function(fullName) {
    if (fullName === 'controller:post') {
      return PostController;
    }
  };

  ok(registry.has('controller:post'), "the `has` method uses the resolver hook");
});

QUnit.test("The registry normalizes names when resolving", function() {
  var registry = new Registry();
  var PostController = factory();

  registry.normalizeFullName = function(fullName) {
    return 'controller:post';
  };

  registry.register('controller:post', PostController);
  var type = registry.resolve('controller:normalized');

  strictEqual(type, PostController, "Normalizes the name when resolving");
});

QUnit.test("The registry normalizes names when checking if the factory is registered", function() {
  var registry = new Registry();
  var PostController = factory();

  registry.normalizeFullName = function(fullName) {
    return 'controller:post';
  };

  registry.register('controller:post', PostController);
  var isPresent = registry.has('controller:normalized');

  equal(isPresent, true, "Normalizes the name when checking if the factory or instance is present");
});

QUnit.test("validateFullName throws an error if name is incorrect", function() {
  var registry = new Registry();
  var PostController = factory();

  registry.normalize = function(fullName) {
    return 'controller:post';
  };

  registry.register('controller:post', PostController);
  throws(function() {
    registry.resolve('post');
  }, 'TypeError: Invalid Fullname, expected: `type:name` got: post');
});

QUnit.test("The registry normalizes names when injecting", function() {
  var registry = new Registry();
  var PostController = factory();
  var user = { name: 'Stef' };

  registry.normalize = function(fullName) {
    return 'controller:post';
  };

  registry.register('controller:post', PostController);
  registry.register('user:post', user, { instantiate: false });
  registry.injection('controller:post', 'user', 'controller:normalized');

  deepEqual(registry.resolve('controller:post'), user, "Normalizes the name when injecting");
});

QUnit.test("cannot register an `undefined` factory", function() {
  var registry = new Registry();

  throws(function() {
    registry.register('controller:apple', undefined);
  }, '');
});

QUnit.test("can re-register a factory", function() {
  var registry = new Registry();
  var FirstApple = factory('first');
  var SecondApple = factory('second');

  registry.register('controller:apple', FirstApple);
  registry.register('controller:apple', SecondApple);

  ok(registry.resolve('controller:apple').create() instanceof SecondApple);
});

QUnit.test("cannot re-register a factory if it has been resolved", function() {
  var registry = new Registry();
  var FirstApple = factory('first');
  var SecondApple = factory('second');

  registry.register('controller:apple', FirstApple);
  strictEqual(registry.resolve('controller:apple'), FirstApple);

  throws(function() {
    registry.register('controller:apple', SecondApple);
  }, 'Cannot re-register: `controller:apple`, as it has already been resolved.');

  strictEqual(registry.resolve('controller:apple'), FirstApple);
});

QUnit.test('registry.has should not accidentally cause injections on that factory to be run. (Mitigate merely on observing)', function() {
  expect(1);

  var registry = new Registry();
  var FirstApple = factory('first');
  var SecondApple = factory('second');

  SecondApple.extend = function(a, b, c) {
    ok(false, 'should not extend or touch the injected model, merely to inspect existence of another');
  };

  registry.register('controller:apple', FirstApple);
  registry.register('controller:second-apple', SecondApple);
  registry.injection('controller:apple', 'badApple', 'controller:second-apple');

  ok(registry.has('controller:apple'));
});

QUnit.test('once resolved, always return the same result', function() {
  expect(1);

  var registry = new Registry();

  registry.resolver = function() {
    return 'bar';
  };

  var Bar = registry.resolve('models:bar');

  registry.resolver = function() {
    return 'not bar';
  };

  equal(registry.resolve('models:bar'), Bar);
});

QUnit.test("factory resolves are cached", function() {
  var registry = new Registry();
  var PostController = factory();
  var resolveWasCalled = [];
  registry.resolver = function(fullName) {
    resolveWasCalled.push(fullName);
    return PostController;
  };

  deepEqual(resolveWasCalled, []);
  registry.resolve('controller:post');
  deepEqual(resolveWasCalled, ['controller:post']);

  registry.resolve('controller:post');
  deepEqual(resolveWasCalled, ['controller:post']);
});

QUnit.test("factory for non extendables (MODEL) resolves are cached", function() {
  var registry = new Registry();
  var PostController = factory();
  var resolveWasCalled = [];
  registry.resolver = function(fullName) {
    resolveWasCalled.push(fullName);
    return PostController;
  };

  deepEqual(resolveWasCalled, []);
  registry.resolve('model:post');
  deepEqual(resolveWasCalled, ['model:post']);

  registry.resolve('model:post');
  deepEqual(resolveWasCalled, ['model:post']);
});

QUnit.test("factory for non extendables resolves are cached", function() {
  var registry = new Registry();
  var PostController = {};
  var resolveWasCalled = [];
  registry.resolver = function(fullName) {
    resolveWasCalled.push(fullName);
    return PostController;
  };

  deepEqual(resolveWasCalled, []);
  registry.resolve('foo:post');
  deepEqual(resolveWasCalled, ['foo:post']);

  registry.resolve('foo:post');
  deepEqual(resolveWasCalled, ['foo:post']);
});

QUnit.test("registry.container creates an associated container", function() {
  var registry = new Registry();
  var PostController = factory();
  registry.register('controller:post', PostController);

  var container = registry.container();
  var postController = container.lookup('controller:post');

  ok(postController instanceof PostController, "The lookup is an instance of the registered factory");
  strictEqual(registry._defaultContainer, container, "_defaultContainer is set to the first created container and used for Ember 1.x Container compatibility");
});

QUnit.test("`resolve` can be handled by a fallback registry", function() {
  var fallback = new Registry();

  var registry = new Registry({ fallback: fallback });
  var PostController = factory();

  fallback.register('controller:post', PostController);

  var PostControllerFactory = registry.resolve('controller:post');

  ok(PostControllerFactory, 'factory is returned');
  ok(PostControllerFactory.create() instanceof  PostController, "The return of factory.create is an instance of PostController");
});

QUnit.test("`has` can be handled by a fallback registry", function() {
  var fallback = new Registry();

  var registry = new Registry({ fallback: fallback });
  var PostController = factory();

  fallback.register('controller:post', PostController);

  equal(registry.has('controller:post'), true, "Fallback registry is checked for registration");
});

QUnit.test("`getInjections` includes injections from a fallback registry", function() {
  var fallback = new Registry();
  var registry = new Registry({ fallback: fallback });

  equal(registry.getInjections('model:user').length, 0, "No injections in the primary registry");

  fallback.injection('model:user', 'post', 'model:post');

  equal(registry.getInjections('model:user').length, 1, "Injections from the fallback registry are merged");
});

QUnit.test("`getTypeInjections` includes type injections from a fallback registry", function() {
  var fallback = new Registry();
  var registry = new Registry({ fallback: fallback });

  equal(registry.getTypeInjections('model').length, 0, "No injections in the primary registry");

  fallback.injection('model', 'source', 'source:main');

  equal(registry.getTypeInjections('model').length, 1, "Injections from the fallback registry are merged");
});

QUnit.test("`getFactoryInjections` includes factory injections from a fallback registry", function() {
  var fallback = new Registry();
  var registry = new Registry({ fallback: fallback });

  equal(registry.getFactoryInjections('model:user').length, 0, "No factory injections in the primary registry");

  fallback.factoryInjection('model:user', 'store', 'store:main');

  equal(registry.getFactoryInjections('model:user').length, 1, "Factory injections from the fallback registry are merged");
});


QUnit.test("`getFactoryTypeInjections` includes factory type injections from a fallback registry", function() {
  var fallback = new Registry();
  var registry = new Registry({ fallback: fallback });

  equal(registry.getFactoryTypeInjections('model').length, 0, "No factory type injections in the primary registry");

  fallback.factoryInjection('model', 'store', 'store:main');

  equal(registry.getFactoryTypeInjections('model').length, 1, "Factory type injections from the fallback registry are merged");
});
