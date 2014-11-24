import {
  factory
} from 'container/tests/container_helper';

import Container from 'container';

var originalModelInjections;

QUnit.module("Container", {
  setup: function() {
    originalModelInjections = Ember.MODEL_FACTORY_INJECTIONS;
  },
  teardown: function() {
    Ember.MODEL_FACTORY_INJECTIONS = originalModelInjections;
  }
});

test("A registered factory returns the same instance each time", function() {
  var container = new Container();
  var PostController = factory();

  container.register('controller:post', PostController);

  var postController = container.lookup('controller:post');

  ok(postController instanceof PostController, "The lookup is an instance of the factory");

  equal(postController, container.lookup('controller:post'));
});

test("A registered factory is returned from lookupFactory", function() {
  var container = new Container();
  var PostController = factory();

  container.register('controller:post', PostController);

  var PostControllerFactory = container.lookupFactory('controller:post');

  ok(PostControllerFactory, 'factory is returned');
  ok(PostControllerFactory.create() instanceof  PostController, "The return of factory.create is an instance of PostController");
});

test("A registered factory is returned from lookupFactory is the same factory each time", function() {
  var container = new Container();
  var PostController = factory();

  container.register('controller:post', PostController);

  deepEqual(container.lookupFactory('controller:post'), container.lookupFactory('controller:post'), 'The return of lookupFactory is always the same');
});

test("A factory returned from lookupFactory has a debugkey", function() {
  var container = new Container();
  var PostController = factory();

  container.register('controller:post', PostController);
  var PostFactory = container.lookupFactory('controller:post');

  ok(!PostFactory.container, 'factory instance receives a container');
  equal(PostFactory._debugContainerKey, 'controller:post', 'factory instance receives _debugContainerKey');
});

test("fallback for to create time injections if factory has no extend", function() {
  var container = new Container();
  var AppleController = factory();
  var PostController = factory();

  PostController.extend = undefined; // remove extend

  container.register('controller:apple', AppleController);
  container.register('controller:post', PostController);
  container.injection('controller:post', 'apple', 'controller:apple');

  var postController = container.lookup('controller:post');

  ok(postController.container, 'instance receives a container');
  equal(postController.container, container, 'instance receives the correct container');
  equal(postController._debugContainerKey, 'controller:post', 'instance receives _debugContainerKey');
  ok(postController.apple instanceof AppleController, 'instance receives an apple of instance AppleController');
});

test("The descendants of a factory returned from lookupFactory have a container and debugkey", function(){
  var container = new Container();
  var PostController = factory();
  var instance;

  container.register('controller:post', PostController);
  instance = container.lookupFactory('controller:post').create();

  ok(instance.container, 'factory instance receives a container');
  equal(instance._debugContainerKey, 'controller:post', 'factory instance receives _debugContainerKey');

  ok(instance instanceof PostController, 'factory instance is instance of factory');
});

test("A registered factory returns a fresh instance if singleton: false is passed as an option", function() {
  var container = new Container();
  var PostController = factory();

  container.register('controller:post', PostController);

  var postController1 = container.lookup('controller:post');
  var postController2 = container.lookup('controller:post', { singleton: false });
  var postController3 = container.lookup('controller:post', { singleton: false });
  var postController4 = container.lookup('controller:post');

  equal(postController1.toString(), postController4.toString(), "Singleton factories looked up normally return the same value");
  notEqual(postController1.toString(), postController2.toString(), "Singleton factories are not equal to factories looked up with singleton: false");
  notEqual(postController2.toString(), postController3.toString(), "Two factories looked up with singleton: false are not equal");
  notEqual(postController3.toString(), postController4.toString(), "A singleton factory looked up after a factory called with singleton: false is not equal");

  ok(postController1 instanceof PostController, "All instances are instances of the registered factory");
  ok(postController2 instanceof PostController, "All instances are instances of the registered factory");
  ok(postController3 instanceof PostController, "All instances are instances of the registered factory");
  ok(postController4 instanceof PostController, "All instances are instances of the registered factory");
});

test("A registered factory returns true for `has` if an item is registered", function() {
  var container = new Container();
  var PostController = factory();

  container.register('controller:post', PostController);

  equal(container.has('controller:post'), true, "The `has` method returned true for registered factories");
  equal(container.has('controller:posts'), false, "The `has` method returned false for unregistered factories");
});

test("A Registered factory can be unregistered, and all cached instances are removed", function() {
  var container = new Container();
  var PostController = factory();

  container.register('controller:post', PostController);

  equal(container.has('controller:post'), true, "container is aware of the PostController");

  ok(container.lookup('controller:post') instanceof PostController, "lookup is correct instance");

  container.unregister("controller:post");

  equal(container.has('controller:post'), false, "container is no-longer aware of the PostController");
  equal(container.lookup('controller:post'), undefined, "lookup no longer returns a controller");

  // re-registration continues to work
  container.register('controller:post', PostController);

  equal(container.has('controller:post'), true, "container is aware of the PostController");

  ok(container.lookup('controller:post') instanceof PostController, "lookup is correct instance");
});

test("A container lookup has access to the container", function() {
  var container = new Container();
  var PostController = factory();

  container.register('controller:post', PostController);

  var postController = container.lookup('controller:post');

  equal(postController.container, container);
});

test("Throw exception when trying to inject `type:thing` on all type(s)", function(){
  var container = new Container();
  var PostController = factory();

  container.register('controller:post', PostController);

  throws(function(){
    container.typeInjection('controller', 'injected', 'controller:post');
  }, 'Cannot inject a `controller:post` on other controller(s). Register the `controller:post` as a different type and perform the typeInjection.');
});

test("A factory type with a registered injection's instances receive that injection", function() {
  var container = new Container();
  var PostController = factory();
  var Store = factory();

  container.register('controller:post', PostController);
  container.register('store:main', Store);

  container.typeInjection('controller', 'store', 'store:main');

  var postController = container.lookup('controller:post');
  var store = container.lookup('store:main');

  equal(postController.store, store);
});

test("An individual factory with a registered injection receives the injection", function() {
  var container = new Container();
  var PostController = factory();
  var Store = factory();

  container.register('controller:post', PostController);
  container.register('store:main', Store);

  container.injection('controller:post', 'store', 'store:main');

  var postController = container.lookup('controller:post');
  var store = container.lookup('store:main');

  equal(store.container, container);
  equal(store._debugContainerKey, 'store:main');

  equal(postController.container, container);
  equal(postController._debugContainerKey, 'controller:post');
  equal(postController.store, store, 'has the correct store injected');
});

test("A factory with both type and individual injections", function() {
  var container = new Container();
  var PostController = factory();
  var Store = factory();
  var Router = factory();

  container.register('controller:post', PostController);
  container.register('store:main', Store);
  container.register('router:main', Router);

  container.injection('controller:post', 'store', 'store:main');
  container.typeInjection('controller', 'router', 'router:main');

  var postController = container.lookup('controller:post');
  var store = container.lookup('store:main');
  var router = container.lookup('router:main');

  equal(postController.store, store);
  equal(postController.router, router);
});

test("A factory with both type and individual factoryInjections", function() {
  var container = new Container();
  var PostController = factory();
  var Store = factory();
  var Router = factory();

  container.register('controller:post', PostController);
  container.register('store:main', Store);
  container.register('router:main', Router);

  container.factoryInjection('controller:post', 'store', 'store:main');
  container.factoryTypeInjection('controller', 'router', 'router:main');

  var PostControllerFactory = container.lookupFactory('controller:post');
  var store = container.lookup('store:main');
  var router = container.lookup('router:main');

  equal(PostControllerFactory.store, store, 'PostControllerFactory has the instance of store');
  equal(PostControllerFactory.router, router, 'PostControllerFactory has the route instance');
});

test("A non-singleton instance is never cached", function() {
  var container = new Container();
  var PostView = factory();

  container.register('view:post', PostView, { singleton: false });

  var postView1 = container.lookup('view:post');
  var postView2 = container.lookup('view:post');

  ok(postView1 !== postView2, "Non-singletons are not cached");
});

test("A non-instantiated property is not instantiated", function() {
  var container = new Container();

  var template = function() {};
  container.register('template:foo', template, { instantiate: false });
  equal(container.lookup('template:foo'), template);
});

test("A failed lookup returns undefined", function() {
  var container = new Container();

  equal(container.lookup('doesnot:exist'), undefined);
});

test("An invalid factory throws an error", function() {
  var container = new Container();

  container.register('controller:foo', {});

  throws(function() {
    container.lookup('controller:foo');
  }, /Failed to create an instance of \'controller:foo\'/);
});

test("Injecting a failed lookup raises an error", function() {
  Ember.MODEL_FACTORY_INJECTIONS = true;

  var container = new Container();

  var fooInstance = {};
  var fooFactory  = {};

  var Foo = {
    create: function(args) { return fooInstance; },
    extend: function(args) { return fooFactory;  }
  };

  container.register('model:foo', Foo);
  container.injection('model:foo', 'store', 'store:main');

  throws(function() {
    container.lookup('model:foo');
  });
});

test("Injecting a falsy value does not raise an error", function() {
  var container = new Container();
  var ApplicationController = factory();

  container.register('controller:application', ApplicationController);
  container.register('user:current', null, { instantiate: false });
  container.injection('controller:application', 'currentUser', 'user:current');

  equal(container.lookup('controller:application').currentUser, null);
});

test("Destroying the container destroys any cached singletons", function() {
  var container = new Container();
  var PostController = factory();
  var PostView = factory();
  var template = function() {};

  container.register('controller:post', PostController);
  container.register('view:post', PostView, { singleton: false });
  container.register('template:post', template, { instantiate: false });

  container.injection('controller:post', 'postView', 'view:post');

  var postController = container.lookup('controller:post');
  var postView = postController.postView;

  ok(postView instanceof PostView, "The non-singleton was injected");

  container.destroy();

  ok(postController.isDestroyed, "Singletons are destroyed");
  ok(!postView.isDestroyed, "Non-singletons are not destroyed");
});

test("The container can take a hook to resolve factories lazily", function() {
  var container = new Container();
  var PostController = factory();

  container.resolver = function(fullName) {
    if (fullName === 'controller:post') {
      return PostController;
    }
  };

  var postController = container.lookup('controller:post');

  ok(postController instanceof PostController, "The correct factory was provided");
});

test("The container respect the resolver hook for `has`", function() {
  var container = new Container();
  var PostController = factory();

  container.resolver = function(fullName) {
    if (fullName === 'controller:post') {
      return PostController;
    }
  };

  ok(container.has('controller:post'), "the `has` method uses the resolver hook");
});

test("The container normalizes names before resolving", function() {
  var container = new Container();
  var PostController = factory();

  container.normalize = function(fullName) {
    return 'controller:post';
  };

  container.register('controller:post', PostController);
  var postController = container.lookup('controller:normalized');

  ok(postController instanceof PostController, "Normalizes the name before resolving");
});

test("The container normalizes names when unregistering", function() {
  var container = new Container();
  var PostController = factory();

  container.normalize = function(fullName) {
    return 'controller:post';
  };

  container.register('controller:post', PostController);
  var postController = container.lookup('controller:normalized');

  ok(postController instanceof PostController, "Normalizes the name before resolving");

  container.unregister('controller:post');
  postController = container.lookup('controller:normalized');

  equal(postController, undefined);
});

test("The container normalizes names when resolving", function() {
  var container = new Container();
  var PostController = factory();

  container.normalize = function(fullName) {
    return 'controller:post';
  };

  container.register('controller:post', PostController);
  var type = container.resolve('controller:normalized');

  equal(type === PostController, true, "Normalizes the name when resolving");
});

test("The container normalizes names when looking factory up", function() {
  var container = new Container();
  var PostController = factory();

  container.normalize = function(fullName) {
    return 'controller:post';
  };

  container.register('controller:post', PostController);
  var fact = container.lookupFactory('controller:normalized');

  equal(fact.toString() === PostController.extend().toString(), true, "Normalizes the name when looking factory up");
});

test("The container normalizes names when checking if the factory or instance is present", function() {
  var container = new Container();
  var PostController = factory();

  container.normalize = function(fullName) {
    return 'controller:post';
  };

  container.register('controller:post', PostController);
  var isPresent = container.has('controller:normalized');

  equal(isPresent, true, "Normalizes the name when checking if the factory or instance is present");
});

test("validateFullName throws an error if name is incorrect", function() {
  var container = new Container();
  var PostController = factory();

  container.normalize = function(fullName) {
    return 'controller:post';
  };

  container.register('controller:post', PostController);
  throws(function() {
    container.lookupFactory('post');
  }, 'TypeError: Invalid Fullname, expected: `type:name` got: post');
});

test("The container normalizes names when injecting", function() {
  var container = new Container();
  var PostController = factory();
  var user = { name: 'Stef' };

  container.normalize = function(fullName) {
    return 'controller:post';
  };

  container.register('controller:post', PostController);
  container.register('user:post', user, { instantiate: false });
  container.injection('controller:post', 'user', 'controller:normalized');

  deepEqual(container.lookup('controller:post'), user, "Normalizes the name when injecting");
});

test("The container can get options that should be applied to a given factory", function(){
  var container = new Container();

  var PostView = factory();

  container.resolver = function(fullName) {
    if (fullName === 'view:post') {
      return PostView;
    }
  };

  container.options('view:post', {instantiate: true, singleton: false});

  var postView1 = container.lookup('view:post');
  var postView2 = container.lookup('view:post');

  ok(postView1 instanceof PostView, "The correct factory was provided");
  ok(postView2 instanceof PostView, "The correct factory was provided");

  ok(postView1 !== postView2, "The two lookups are different");
});

test("The container can get options that should be applied to all factories for a given type", function() {
  var container = new Container();
  var PostView = factory();

  container.resolver = function(fullName) {
    if (fullName === 'view:post') {
      return PostView;
    }
  };

  container.optionsForType('view', { singleton: false });

  var postView1 = container.lookup('view:post');
  var postView2 = container.lookup('view:post');

  ok(postView1 instanceof PostView, "The correct factory was provided");
  ok(postView2 instanceof PostView, "The correct factory was provided");

  ok(postView1 !== postView2, "The two lookups are different");
});

test("cannot register an `undefined` factory", function(){
  var container = new Container();

  throws(function(){
    container.register('controller:apple', undefined);
  }, '');
});

test("can re-register a factory", function(){
  var container = new Container();
  var FirstApple = factory('first');
  var SecondApple = factory('second');

  container.register('controller:apple', FirstApple);
  container.register('controller:apple', SecondApple);

  ok(container.lookup('controller:apple') instanceof SecondApple);
});

test("cannot re-register a factory if has been looked up", function(){
  var container = new Container();
  var FirstApple = factory('first');
  var SecondApple = factory('second');

  container.register('controller:apple', FirstApple);
  ok(container.lookup('controller:apple') instanceof FirstApple);

  throws(function(){
    container.register('controller:apple', SecondApple);
  }, 'Cannot re-register: `controller:apple`, as it has already been looked up.');

  ok(container.lookup('controller:apple') instanceof FirstApple);
});


test('container.has should not accidentally cause injections on that factory to be run. (Mitigate merely on observing)', function(){
  expect(1);

  var container = new Container();
  var FirstApple = factory('first');
  var SecondApple = factory('second');

  SecondApple.extend = function(a,b,c) {
    ok(false, 'should not extend or touch the injected model, merely to inspect existence of another');
  };

  container.register('controller:apple', FirstApple);
  container.register('controller:second-apple', SecondApple);
  container.injection('controller:apple', 'badApple', 'controller:second-apple');

  ok(container.has('controller:apple'));
});

test('once resolved, always return the same result', function() {
  expect(1);

  var container = new Container();

  container.resolver = function() {
    return 'bar';
  };

  var Bar = container.resolve('models:bar');

  container.resolver = function() {
    return 'not bar';
  };

  equal(container.resolve('models:bar'), Bar);
});

test('once looked up, assert if an injection is registered for the entry', function() {
  expect(1);

  var container = new Container();
  var Apple = factory();
  var Worm = factory();

  container.register('apple:main', Apple);
  container.register('worm:main', Worm);
  container.lookup('apple:main');
  throws(function() {
    container.injection('apple:main', 'worm', 'worm:main');
  }, "Attempted to register an injection for a type that has already been looked up. ('apple:main', 'worm', 'worm:main')");
});

test("Once looked up, assert if a factoryInjection is registered for the factory", function() {
  expect(1);

  var container = new Container();
  var Apple = factory();
  var Worm = factory();

  container.register('apple:main', Apple);
  container.register('worm:main', Worm);

  container.lookupFactory('apple:main');
  throws(function() {
    container.factoryInjection('apple:main', 'worm', 'worm:main');
  }, "Attempted to register a factoryInjection for a type that has already been looked up. ('apple:main', 'worm', 'worm:main')");
});

test("factory resolves are cached", function() {
  var container = new Container();
  var PostController = factory();
  var resolveWasCalled = [];
  container.resolve = function(fullName) {
    resolveWasCalled.push(fullName);
    return PostController;
  };

  deepEqual(resolveWasCalled, []);
  container.lookupFactory('controller:post');
  deepEqual(resolveWasCalled, ['controller:post']);

  container.lookupFactory('controller:post');
  deepEqual(resolveWasCalled, ['controller:post']);
});

test("factory for non extendables (MODEL) resolves are cached", function() {
  var container = new Container();
  var PostController = factory();
  var resolveWasCalled = [];
  container.resolve = function(fullName) {
    resolveWasCalled.push(fullName);
    return PostController;
  };

  deepEqual(resolveWasCalled, []);
  container.lookupFactory('model:post');
  deepEqual(resolveWasCalled, ['model:post']);

  container.lookupFactory('model:post');
  deepEqual(resolveWasCalled, ['model:post']);
});

test("factory for non extendables resolves are cached", function() {
  var container = new Container();
  var PostController = {};
  var resolveWasCalled = [];
  container.resolve = function(fullName) {
    resolveWasCalled.push(fullName);
    return PostController;
  };

  deepEqual(resolveWasCalled, []);
  container.lookupFactory('foo:post');
  deepEqual(resolveWasCalled, ['foo:post']);

  container.lookupFactory('foo:post');
  deepEqual(resolveWasCalled, ['foo:post']);
});

if (Ember.FEATURES.isEnabled('ember-metal-injected-properties')) {
  test("A factory's lazy injections are validated when first instantiated", function() {
    var container = new Container();
    var Apple = factory();
    var Orange = factory();

    Apple.reopenClass({
      lazyInjections: function() {
        return [ 'orange:main', 'banana:main' ];
      }
    });

    container.register('apple:main', Apple);
    container.register('orange:main', Orange);

    throws(function() {
      container.lookup('apple:main');
    }, /Attempting to inject an unknown injection: `banana:main`/);
  });
}
