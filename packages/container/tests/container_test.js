import Ember from 'ember-metal/core';
import Registry from 'container/registry';
import factory from 'container/tests/test-helpers/factory';
import isEnabled from 'ember-metal/features';

var originalModelInjections;

QUnit.module('Container', {
  setup() {
    originalModelInjections = Ember.MODEL_FACTORY_INJECTIONS;
  },
  teardown() {
    Ember.MODEL_FACTORY_INJECTIONS = originalModelInjections;
  }
});

QUnit.test('A registered factory returns the same instance each time', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostController = factory();

  registry.register('controller:post', PostController);

  var postController = container.lookup('controller:post');

  ok(postController instanceof PostController, 'The lookup is an instance of the factory');

  equal(postController, container.lookup('controller:post'));
});

QUnit.test('A registered factory is returned from lookupFactory', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostController = factory();

  registry.register('controller:post', PostController);

  var PostControllerFactory = container.lookupFactory('controller:post');

  ok(PostControllerFactory, 'factory is returned');
  ok(PostControllerFactory.create() instanceof  PostController, 'The return of factory.create is an instance of PostController');
});

QUnit.test('A registered factory is returned from lookupFactory is the same factory each time', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostController = factory();

  registry.register('controller:post', PostController);

  deepEqual(container.lookupFactory('controller:post'), container.lookupFactory('controller:post'), 'The return of lookupFactory is always the same');
});

QUnit.test('A factory returned from lookupFactory has a debugkey', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostController = factory();

  registry.register('controller:post', PostController);
  var PostFactory = container.lookupFactory('controller:post');
  equal(PostFactory._debugContainerKey, 'controller:post', 'factory instance receives _debugContainerKey');
});

QUnit.test('fallback for to create time injections if factory has no extend', function() {
  var registry = new Registry();
  var container = registry.container();
  var AppleController = factory();
  var PostController = factory();

  PostController.extend = undefined; // remove extend

  registry.register('controller:apple', AppleController);
  registry.register('controller:post', PostController);
  registry.injection('controller:post', 'apple', 'controller:apple');

  var postController = container.lookup('controller:post');

  equal(postController._debugContainerKey, 'controller:post', 'instance receives _debugContainerKey');
  ok(postController.apple instanceof AppleController, 'instance receives an apple of instance AppleController');
});

QUnit.test('The descendants of a factory returned from lookupFactory have a container and debugkey', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostController = factory();
  var instance;

  registry.register('controller:post', PostController);
  instance = container.lookupFactory('controller:post').create();

  equal(instance._debugContainerKey, 'controller:post', 'factory instance receives _debugContainerKey');

  ok(instance instanceof PostController, 'factory instance is instance of factory');
});

QUnit.test('A registered factory returns a fresh instance if singleton: false is passed as an option', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostController = factory();

  registry.register('controller:post', PostController);

  var postController1 = container.lookup('controller:post');
  var postController2 = container.lookup('controller:post', { singleton: false });
  var postController3 = container.lookup('controller:post', { singleton: false });
  var postController4 = container.lookup('controller:post');

  equal(postController1.toString(), postController4.toString(), 'Singleton factories looked up normally return the same value');
  notEqual(postController1.toString(), postController2.toString(), 'Singleton factories are not equal to factories looked up with singleton: false');
  notEqual(postController2.toString(), postController3.toString(), 'Two factories looked up with singleton: false are not equal');
  notEqual(postController3.toString(), postController4.toString(), 'A singleton factory looked up after a factory called with singleton: false is not equal');

  ok(postController1 instanceof PostController, 'All instances are instances of the registered factory');
  ok(postController2 instanceof PostController, 'All instances are instances of the registered factory');
  ok(postController3 instanceof PostController, 'All instances are instances of the registered factory');
  ok(postController4 instanceof PostController, 'All instances are instances of the registered factory');
});

QUnit.test('A factory type with a registered injection\'s instances receive that injection', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostController = factory();
  var Store = factory();

  registry.register('controller:post', PostController);
  registry.register('store:main', Store);

  registry.typeInjection('controller', 'store', 'store:main');

  var postController = container.lookup('controller:post');
  var store = container.lookup('store:main');

  equal(postController.store, store);
});

QUnit.test('An individual factory with a registered injection receives the injection', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostController = factory();
  var Store = factory();

  registry.register('controller:post', PostController);
  registry.register('store:main', Store);

  registry.injection('controller:post', 'store', 'store:main');

  var postController = container.lookup('controller:post');
  var store = container.lookup('store:main');

  equal(store._debugContainerKey, 'store:main');

  equal(postController._debugContainerKey, 'controller:post');
  equal(postController.store, store, 'has the correct store injected');
});

QUnit.test('A factory with both type and individual injections', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostController = factory();
  var Store = factory();
  var Router = factory();

  registry.register('controller:post', PostController);
  registry.register('store:main', Store);
  registry.register('router:main', Router);

  registry.injection('controller:post', 'store', 'store:main');
  registry.typeInjection('controller', 'router', 'router:main');

  var postController = container.lookup('controller:post');
  var store = container.lookup('store:main');
  var router = container.lookup('router:main');

  equal(postController.store, store);
  equal(postController.router, router);
});

QUnit.test('A factory with both type and individual factoryInjections', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostController = factory();
  var Store = factory();
  var Router = factory();

  registry.register('controller:post', PostController);
  registry.register('store:main', Store);
  registry.register('router:main', Router);

  registry.factoryInjection('controller:post', 'store', 'store:main');
  registry.factoryTypeInjection('controller', 'router', 'router:main');

  var PostControllerFactory = container.lookupFactory('controller:post');
  var store = container.lookup('store:main');
  var router = container.lookup('router:main');

  equal(PostControllerFactory.store, store, 'PostControllerFactory has the instance of store');
  equal(PostControllerFactory.router, router, 'PostControllerFactory has the route instance');
});

QUnit.test('A non-singleton instance is never cached', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostView = factory();

  registry.register('view:post', PostView, { singleton: false });

  var postView1 = container.lookup('view:post');
  var postView2 = container.lookup('view:post');

  ok(postView1 !== postView2, 'Non-singletons are not cached');
});

QUnit.test('A non-instantiated property is not instantiated', function() {
  var registry = new Registry();
  var container = registry.container();

  var template = function() {};
  registry.register('template:foo', template, { instantiate: false });
  equal(container.lookup('template:foo'), template);
});

QUnit.test('A failed lookup returns undefined', function() {
  var registry = new Registry();
  var container = registry.container();

  equal(container.lookup('doesnot:exist'), undefined);
});

QUnit.test('An invalid factory throws an error', function() {
  var registry = new Registry();
  var container = registry.container();

  registry.register('controller:foo', {});

  throws(function() {
    container.lookup('controller:foo');
  }, /Failed to create an instance of \'controller:foo\'/);
});

QUnit.test('Injecting a failed lookup raises an error', function() {
  Ember.MODEL_FACTORY_INJECTIONS = true;

  var registry = new Registry();
  var container = registry.container();

  var fooInstance = {};
  var fooFactory  = {};

  var Foo = {
    create(args) { return fooInstance; },
    extend(args) { return fooFactory;  }
  };

  registry.register('model:foo', Foo);
  registry.injection('model:foo', 'store', 'store:main');

  throws(function() {
    container.lookup('model:foo');
  });
});

QUnit.test('Injecting a falsy value does not raise an error', function() {
  var registry = new Registry();
  var container = registry.container();
  var ApplicationController = factory();

  registry.register('controller:application', ApplicationController);
  registry.register('user:current', null, { instantiate: false });
  registry.injection('controller:application', 'currentUser', 'user:current');

  equal(container.lookup('controller:application').currentUser, null);
});

QUnit.test('Destroying the container destroys any cached singletons', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostController = factory();
  var PostView = factory();
  var template = function() {};

  registry.register('controller:post', PostController);
  registry.register('view:post', PostView, { singleton: false });
  registry.register('template:post', template, { instantiate: false });

  registry.injection('controller:post', 'postView', 'view:post');

  var postController = container.lookup('controller:post');
  var postView = postController.postView;

  ok(postView instanceof PostView, 'The non-singleton was injected');

  container.destroy();

  ok(postController.isDestroyed, 'Singletons are destroyed');
  ok(!postView.isDestroyed, 'Non-singletons are not destroyed');
});

QUnit.test('The container can use a registry hook to resolve factories lazily', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostController = factory();

  registry.resolver = function(fullName) {
    if (fullName === 'controller:post') {
      return PostController;
    }
  };

  var postController = container.lookup('controller:post');

  ok(postController instanceof PostController, 'The correct factory was provided');
});

QUnit.test('The container normalizes names before resolving', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostController = factory();

  registry.normalizeFullName = function(fullName) {
    return 'controller:post';
  };

  registry.register('controller:post', PostController);
  var postController = container.lookup('controller:normalized');

  ok(postController instanceof PostController, 'Normalizes the name before resolving');
});

QUnit.test('The container normalizes names when looking factory up', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostController = factory();

  registry.normalizeFullName = function(fullName) {
    return 'controller:post';
  };

  registry.register('controller:post', PostController);
  var fact = container.lookupFactory('controller:normalized');

  equal(fact.toString() === PostController.extend().toString(), true, 'Normalizes the name when looking factory up');
});

QUnit.test('Options can be registered that should be applied to a given factory', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostView = factory();

  registry.resolver = function(fullName) {
    if (fullName === 'view:post') {
      return PostView;
    }
  };

  registry.options('view:post', { instantiate: true, singleton: false });

  var postView1 = container.lookup('view:post');
  var postView2 = container.lookup('view:post');

  ok(postView1 instanceof PostView, 'The correct factory was provided');
  ok(postView2 instanceof PostView, 'The correct factory was provided');

  ok(postView1 !== postView2, 'The two lookups are different');
});

QUnit.test('Options can be registered that should be applied to all factories for a given type', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostView = factory();

  registry.resolver = function(fullName) {
    if (fullName === 'view:post') {
      return PostView;
    }
  };

  registry.optionsForType('view', { singleton: false });

  var postView1 = container.lookup('view:post');
  var postView2 = container.lookup('view:post');

  ok(postView1 instanceof PostView, 'The correct factory was provided');
  ok(postView2 instanceof PostView, 'The correct factory was provided');

  ok(postView1 !== postView2, 'The two lookups are different');
});

QUnit.test('An injected non-singleton instance is never cached', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostView = factory();
  var PostViewHelper = factory();

  registry.register('view:post', PostView, { singleton: false });
  registry.register('view_helper:post', PostViewHelper, { singleton: false });
  registry.injection('view:post', 'viewHelper', 'view_helper:post');

  var postView1 = container.lookup('view:post');
  var postView2 = container.lookup('view:post');

  ok(postView1.viewHelper !== postView2.viewHelper, 'Injected non-singletons are not cached');
});

QUnit.test('Factory resolves are cached', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostController = factory();
  var resolveWasCalled = [];
  registry.resolve = function(fullName) {
    resolveWasCalled.push(fullName);
    return PostController;
  };

  deepEqual(resolveWasCalled, []);
  container.lookupFactory('controller:post');
  deepEqual(resolveWasCalled, ['controller:post']);

  container.lookupFactory('controller:post');
  deepEqual(resolveWasCalled, ['controller:post']);
});

QUnit.test('factory for non extendables (MODEL) resolves are cached', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostController = factory();
  var resolveWasCalled = [];
  registry.resolve = function(fullName) {
    resolveWasCalled.push(fullName);
    return PostController;
  };

  deepEqual(resolveWasCalled, []);
  container.lookupFactory('model:post');
  deepEqual(resolveWasCalled, ['model:post']);

  container.lookupFactory('model:post');
  deepEqual(resolveWasCalled, ['model:post']);
});

QUnit.test('factory for non extendables resolves are cached', function() {
  var registry = new Registry();
  var container = registry.container();
  var PostController = {};
  var resolveWasCalled = [];

  registry.resolve = function(fullName) {
    resolveWasCalled.push(fullName);
    return PostController;
  };

  deepEqual(resolveWasCalled, []);
  container.lookupFactory('foo:post');
  deepEqual(resolveWasCalled, ['foo:post']);

  container.lookupFactory('foo:post');
  deepEqual(resolveWasCalled, ['foo:post']);
});

QUnit.test('The `_onLookup` hook is called on factories when looked up the first time', function() {
  expect(2);

  var registry = new Registry();
  var container = registry.container();
  var Apple = factory();

  Apple.reopenClass({
    _onLookup(fullName) {
      equal(fullName, 'apple:main', 'calls lazy injection method with the lookup full name');
      equal(this, Apple, 'calls lazy injection method in the factory context');
    }
  });

  registry.register('apple:main', Apple);

  container.lookupFactory('apple:main');
  container.lookupFactory('apple:main');
});

QUnit.test('A factory\'s lazy injections are validated when first instantiated', function() {
  var registry = new Registry();
  var container = registry.container();
  var Apple = factory();
  var Orange = factory();

  Apple.reopenClass({
    _lazyInjections() {
      return ['orange:main', 'banana:main'];
    }
  });

  registry.register('apple:main', Apple);
  registry.register('orange:main', Orange);

  throws(function() {
    container.lookup('apple:main');
  }, /Attempting to inject an unknown injection: `banana:main`/);
});

QUnit.test('Lazy injection validations are cached', function() {
  expect(1);

  var registry = new Registry();
  var container = registry.container();
  var Apple = factory();
  var Orange = factory();

  Apple.reopenClass({
    _lazyInjections() {
      ok(true, 'should call lazy injection method');
      return ['orange:main'];
    }
  });

  registry.register('apple:main', Apple);
  registry.register('orange:main', Orange);

  container.lookup('apple:main');
  container.lookup('apple:main');
});

if (isEnabled('ember-container-inject-owner')) {
  QUnit.test('A deprecated `container` property is appended to every instantiated object', function() {
    let registry = new Registry();
    let container = registry.container();
    let PostController = factory();
    registry.register('controller:post', PostController);
    let postController = container.lookup('controller:post');

    expectDeprecation(function() {
      Ember.get(postController, 'container');
    }, 'Using the injected `container` is deprecated. Please use the `getOwner` helper instead to access the owner of this object.');

    expectDeprecation(function() {
      let c = postController.container;
      strictEqual(c, container);
    }, 'Using the injected `container` is deprecated. Please use the `getOwner` helper instead to access the owner of this object.');
  });
} else {
  QUnit.test('A `container` property is appended to every instantiated object', function() {
    let registry = new Registry();
    let container = registry.container();
    let PostController = factory();
    registry.register('controller:post', PostController);
    let postController = container.lookup('controller:post');

    strictEqual(postController.container, container, '');
  });
}
