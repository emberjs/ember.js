import {
  factory
} from 'container/tests/container_helper';

import {
  Registry
} from 'container';

var originalModelInjections;

QUnit.module("Registry", {
  setup: function() {
    originalModelInjections = Ember.MODEL_FACTORY_INJECTIONS;
  },
  teardown: function() {
    Ember.MODEL_FACTORY_INJECTIONS = originalModelInjections;
  }
});

test("A registered factory is returned from resolve", function() {
  var registry = new Registry();
  var PostController = factory();

  registry.register('controller:post', PostController);

  var PostControllerFactory = registry.resolve('controller:post');

  ok(PostControllerFactory, 'factory is returned');
  ok(PostControllerFactory.create() instanceof  PostController, "The return of factory.create is an instance of PostController");
});

test("The registered factory returned from resolve is the same factory each time", function() {
  var registry = new Registry();
  var PostController = factory();

  registry.register('controller:post', PostController);

  deepEqual(registry.resolve('controller:post'), registry.resolve('controller:post'), 'The return of resolve is always the same');
});

test("A registered factory returns true for `has` if an item is registered", function() {
  var registry = new Registry();
  var PostController = factory();

  registry.register('controller:post', PostController);

  equal(registry.has('controller:post'), true, "The `has` method returned true for registered factories");
  equal(registry.has('controller:posts'), false, "The `has` method returned false for unregistered factories");
});

test("Throw exception when trying to inject `type:thing` on all type(s)", function(){
  var registry = new Registry();
  var PostController = factory();

  registry.register('controller:post', PostController);

  throws(function(){
    registry.typeInjection('controller', 'injected', 'controller:post');
  }, 'Cannot inject a `controller:post` on other controller(s). Register the `controller:post` as a different type and perform the typeInjection.');
});

test("The registry can take a hook to resolve factories lazily", function() {
  var registry = new Registry();
  var PostController = factory();

  registry.resolver = function(fullName) {
    if (fullName === 'controller:post') {
      return PostController;
    }
  };

  strictEqual(registry.resolve('controller:post'), PostController, "The correct factory was provided");
});

test("The registry respect the resolver hook for `has`", function() {
  var registry = new Registry();
  var PostController = factory();

  registry.resolver = function(fullName) {
    if (fullName === 'controller:post') {
      return PostController;
    }
  };

  ok(registry.has('controller:post'), "the `has` method uses the resolver hook");
});

test("The registry normalizes names when resolving", function() {
  var registry = new Registry();
  var PostController = factory();

  registry.normalizeFullName = function(fullName) {
    return 'controller:post';
  };

  registry.register('controller:post', PostController);
  var type = registry.resolve('controller:normalized');

  strictEqual(type, PostController, "Normalizes the name when resolving");
});

test("The registry normalizes names when checking if the factory is registered", function() {
  var registry = new Registry();
  var PostController = factory();

  registry.normalizeFullName = function(fullName) {
    return 'controller:post';
  };

  registry.register('controller:post', PostController);
  var isPresent = registry.has('controller:normalized');

  equal(isPresent, true, "Normalizes the name when checking if the factory or instance is present");
});

test("validateFullName throws an error if name is incorrect", function() {
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

test("The registry normalizes names when injecting", function() {
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

test("cannot register an `undefined` factory", function(){
  var registry = new Registry();

  throws(function(){
    registry.register('controller:apple', undefined);
  }, '');
});

test("can re-register a factory", function(){
  var registry = new Registry();
  var FirstApple = factory('first');
  var SecondApple = factory('second');

  registry.register('controller:apple', FirstApple);
  registry.register('controller:apple', SecondApple);

  ok(registry.resolve('controller:apple').create() instanceof SecondApple);
});

test("cannot re-register a factory if it has been resolved", function(){
  var registry = new Registry();
  var FirstApple = factory('first');
  var SecondApple = factory('second');

  registry.register('controller:apple', FirstApple);
  strictEqual(registry.resolve('controller:apple'), FirstApple);

  throws(function(){
    registry.register('controller:apple', SecondApple);
  }, 'Cannot re-register: `controller:apple`, as it has already been resolved.');

  strictEqual(registry.resolve('controller:apple'), FirstApple);
});

test('registry.has should not accidentally cause injections on that factory to be run. (Mitigate merely on observing)', function(){
  expect(1);

  var registry = new Registry();
  var FirstApple = factory('first');
  var SecondApple = factory('second');

  SecondApple.extend = function(a,b,c) {
    ok(false, 'should not extend or touch the injected model, merely to inspect existence of another');
  };

  registry.register('controller:apple', FirstApple);
  registry.register('controller:second-apple', SecondApple);
  registry.injection('controller:apple', 'badApple', 'controller:second-apple');

  ok(registry.has('controller:apple'));
});

test('once resolved, always return the same result', function() {
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

test("factory resolves are cached", function() {
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

test("factory for non extendables (MODEL) resolves are cached", function() {
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

test("factory for non extendables resolves are cached", function() {
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

test ("registry.container creates an associated container", function() {
  var registry = new Registry();
  var PostController = factory();
  registry.register('controller:post', PostController);

  var container = registry.container();
  var postController = container.lookup('controller:post');

  ok(postController instanceof PostController, "The lookup is an instance of the registered factory");
  strictEqual(registry._defaultContainer, container, "_defaultContainer is set to the first created container and used for Ember 1.x Container compatibility");
});
