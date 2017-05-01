import { getOwner, OWNER, assign } from 'ember-utils';
import { ENV } from 'ember-environment';
import { get } from 'ember-metal';
import { Registry } from '..';
import { factory } from 'internal-test-helpers';

let originalModelInjections;

QUnit.module('Container', {
  setup() {
    originalModelInjections = ENV.MODEL_FACTORY_INJECTIONS;
  },
  teardown() {
    ENV.MODEL_FACTORY_INJECTIONS = originalModelInjections;
  }
});

QUnit.test('A registered factory returns the same instance each time', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();

  registry.register('controller:post', PostController);

  let postController = container.lookup('controller:post');

  ok(postController instanceof PostController, 'The lookup is an instance of the factory');

  equal(postController, container.lookup('controller:post'));
});

QUnit.test('uses create time injections if factory has no extend', function() {
  let registry = new Registry();
  let container = registry.container();
  let AppleController = factory();
  let PostController = factory();

  PostController.extend = undefined; // remove extend

  registry.register('controller:apple', AppleController);
  registry.register('controller:post', PostController);
  registry.injection('controller:post', 'apple', 'controller:apple');

  let postController = container.lookup('controller:post');

  ok(postController.apple instanceof AppleController, 'instance receives an apple of instance AppleController');
});

QUnit.test('A registered factory returns a fresh instance if singleton: false is passed as an option', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();

  registry.register('controller:post', PostController);

  let postController1 = container.lookup('controller:post');
  let postController2 = container.lookup('controller:post', { singleton: false });
  let postController3 = container.lookup('controller:post', { singleton: false });
  let postController4 = container.lookup('controller:post');

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
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();
  let Store = factory();

  registry.register('controller:post', PostController);
  registry.register('store:main', Store);

  registry.typeInjection('controller', 'store', 'store:main');

  let postController = container.lookup('controller:post');
  let store = container.lookup('store:main');

  equal(postController.store, store);
});

QUnit.test('An individual factory with a registered injection receives the injection', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();
  let Store = factory();

  registry.register('controller:post', PostController);
  registry.register('store:main', Store);

  registry.injection('controller:post', 'store', 'store:main');

  let postController = container.lookup('controller:post');
  let store = container.lookup('store:main');

  equal(postController.store, store, 'has the correct store injected');
});

QUnit.test('A factory with both type and individual injections', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();
  let Store = factory();
  let Router = factory();

  registry.register('controller:post', PostController);
  registry.register('store:main', Store);
  registry.register('router:main', Router);

  registry.injection('controller:post', 'store', 'store:main');
  registry.typeInjection('controller', 'router', 'router:main');

  let postController = container.lookup('controller:post');
  let store = container.lookup('store:main');
  let router = container.lookup('router:main');

  equal(postController.store, store);
  equal(postController.router, router);
});

QUnit.test('A non-singleton instance is never cached', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostView = factory();

  registry.register('view:post', PostView, { singleton: false });

  let postView1 = container.lookup('view:post');
  let postView2 = container.lookup('view:post');

  ok(postView1 !== postView2, 'Non-singletons are not cached');
});

QUnit.test('A non-instantiated property is not instantiated', function() {
  let registry = new Registry();
  let container = registry.container();

  let template = function() {};
  registry.register('template:foo', template, { instantiate: false });
  equal(container.lookup('template:foo'), template);
});

QUnit.test('A failed lookup returns undefined', function() {
  let registry = new Registry();
  let container = registry.container();

  equal(container.lookup('doesnot:exist'), undefined);
});

QUnit.test('An invalid factory throws an error', function() {
  let registry = new Registry();
  let container = registry.container();

  registry.register('controller:foo', {});

  throws(() => {
    container.lookup('controller:foo');
  }, /Failed to create an instance of \'controller:foo\'/);
});

QUnit.test('Injecting a failed lookup raises an error', function() {
  ENV.MODEL_FACTORY_INJECTIONS = true;

  let registry = new Registry();
  let container = registry.container();

  let fooInstance = {};
  let fooFactory  = {};

  let Foo = {
    create(args) { return fooInstance; },
    extend(args) { return fooFactory;  }
  };

  registry.register('model:foo', Foo);
  registry.injection('model:foo', 'store', 'store:main');

  throws(() => {
    container.lookup('model:foo');
  });
});

QUnit.test('Injecting a falsy value does not raise an error', function() {
  let registry = new Registry();
  let container = registry.container();
  let ApplicationController = factory();

  registry.register('controller:application', ApplicationController);
  registry.register('user:current', null, { instantiate: false });
  registry.injection('controller:application', 'currentUser', 'user:current');

  strictEqual(container.lookup('controller:application').currentUser, null);
});

QUnit.test('The container returns same value each time even if the value is falsy', function() {
  let registry = new Registry();
  let container = registry.container();

  registry.register('falsy:value', null, { instantiate: false });

  strictEqual(container.lookup('falsy:value'), container.lookup('falsy:value'));
});

QUnit.test('Destroying the container destroys any cached singletons', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();
  let PostView = factory();
  let template = function() {};

  registry.register('controller:post', PostController);
  registry.register('view:post', PostView, { singleton: false });
  registry.register('template:post', template, { instantiate: false });

  registry.injection('controller:post', 'postView', 'view:post');

  let postController = container.lookup('controller:post');
  let postView = postController.postView;

  ok(postView instanceof PostView, 'The non-singleton was injected');

  container.destroy();

  ok(postController.isDestroyed, 'Singletons are destroyed');
  ok(!postView.isDestroyed, 'Non-singletons are not destroyed');
});

QUnit.test('The container can use a registry hook to resolve factories lazily', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();

  registry.resolver = {
    resolve(fullName) {
      if (fullName === 'controller:post') {
        return PostController;
      }
    }
  };

  let postController = container.lookup('controller:post');

  ok(postController instanceof PostController, 'The correct factory was provided');
});

QUnit.test('The container normalizes names before resolving', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();

  registry.normalizeFullName = function(fullName) {
    return 'controller:post';
  };

  registry.register('controller:post', PostController);
  let postController = container.lookup('controller:normalized');

  ok(postController instanceof PostController, 'Normalizes the name before resolving');
});

QUnit.test('The container normalizes names when looking factory up', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();

  registry.normalizeFullName = function(fullName) {
    return 'controller:post';
  };

  registry.register('controller:post', PostController);
  let fact = container.factoryFor('controller:normalized');

  let factInstance = fact.create();
  ok(factInstance instanceof PostController, 'Normalizes the name');
});

QUnit.test('Options can be registered that should be applied to a given factory', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostView = factory();

  registry.resolver = {
    resolve(fullName) {
      if (fullName === 'view:post') {
        return PostView;
      }
    }
  };

  registry.options('view:post', { instantiate: true, singleton: false });

  let postView1 = container.lookup('view:post');
  let postView2 = container.lookup('view:post');

  ok(postView1 instanceof PostView, 'The correct factory was provided');
  ok(postView2 instanceof PostView, 'The correct factory was provided');

  ok(postView1 !== postView2, 'The two lookups are different');
});

QUnit.test('Options can be registered that should be applied to all factories for a given type', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostView = factory();

  registry.resolver = {
    resolve(fullName) {
      if (fullName === 'view:post') {
        return PostView;
      }
    }
  };

  registry.optionsForType('view', { singleton: false });

  let postView1 = container.lookup('view:post');
  let postView2 = container.lookup('view:post');

  ok(postView1 instanceof PostView, 'The correct factory was provided');
  ok(postView2 instanceof PostView, 'The correct factory was provided');

  ok(postView1 !== postView2, 'The two lookups are different');
});

QUnit.test('An injected non-singleton instance is never cached', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostView = factory();
  let PostViewHelper = factory();

  registry.register('view:post', PostView, { singleton: false });
  registry.register('view_helper:post', PostViewHelper, { singleton: false });
  registry.injection('view:post', 'viewHelper', 'view_helper:post');

  let postView1 = container.lookup('view:post');
  let postView2 = container.lookup('view:post');

  ok(postView1.viewHelper !== postView2.viewHelper, 'Injected non-singletons are not cached');
});

QUnit.test('Factory resolves are cached', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();
  let resolveWasCalled = [];
  registry.resolve = function(fullName) {
    resolveWasCalled.push(fullName);
    return PostController;
  };

  deepEqual(resolveWasCalled, []);
  container.factoryFor('controller:post');
  deepEqual(resolveWasCalled, ['controller:post']);

  container.factoryFor('controller:post');
  deepEqual(resolveWasCalled, ['controller:post']);
});

QUnit.test('factory for non extendables (MODEL) resolves are cached', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();
  let resolveWasCalled = [];
  registry.resolve = function(fullName) {
    resolveWasCalled.push(fullName);
    return PostController;
  };

  deepEqual(resolveWasCalled, []);
  container.factoryFor('model:post');
  deepEqual(resolveWasCalled, ['model:post']);

  container.factoryFor('model:post');
  deepEqual(resolveWasCalled, ['model:post']);
});

QUnit.test('factory for non extendables resolves are cached', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = {};
  let resolveWasCalled = [];

  registry.resolve = function(fullName) {
    resolveWasCalled.push(fullName);
    return PostController;
  };

  deepEqual(resolveWasCalled, []);
  container.factoryFor('foo:post');
  deepEqual(resolveWasCalled, ['foo:post']);

  container.factoryFor('foo:post');
  deepEqual(resolveWasCalled, ['foo:post']);
});

QUnit.test('A factory\'s lazy injections are validated when first instantiated', function() {
  let registry = new Registry();
  let container = registry.container();
  let Apple = factory();
  let Orange = factory();

  Apple.reopenClass({
    _lazyInjections() {
      return ['orange:main', 'banana:main'];
    }
  });

  registry.register('apple:main', Apple);
  registry.register('orange:main', Orange);

  throws(() => {
    container.lookup('apple:main');
  }, /Attempting to inject an unknown injection: 'banana:main'/);
});

QUnit.test('Lazy injection validations are cached', function() {
  expect(1);

  let registry = new Registry();
  let container = registry.container();
  let Apple = factory();
  let Orange = factory();

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

QUnit.test('An object with its owner pre-set should be returned from ownerInjection', function() {
  let owner = { };
  let registry = new Registry();
  let container = registry.container({ owner });

  let result = container.ownerInjection();

  equal(result[OWNER], owner, 'owner is properly included');
});

QUnit.test('lookup passes options through to expandlocallookup', function(assert) {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();

  registry.register('controller:post', PostController);
  registry.expandLocalLookup = function(fullName, options) {
    assert.ok(true, 'expandLocalLookup was called');
    assert.equal(fullName, 'foo:bar');
    assert.deepEqual(options, { source: 'baz:qux' });

    return 'controller:post';
  };

  let PostControllerLookupResult = container.lookup('foo:bar', { source: 'baz:qux' });

  assert.ok(PostControllerLookupResult instanceof PostController);
});

QUnit.test('#factoryFor class is registered class', (assert) => {
  let registry = new Registry();
  let container = registry.container();

  let Component = factory();
  registry.register('component:foo-bar', Component);

  let factoryManager = container.factoryFor('component:foo-bar');
  assert.deepEqual(factoryManager.class, Component, 'No double extend');
});

QUnit.test('#factoryFor must supply a fullname', (assert) => {
  let registry = new Registry();
  let container = registry.container();
  assert.throws(() => {
    container.factoryFor('chad-bar');
  }, /Invalid Fullname, expected: 'type:name' got: chad-bar/);
});

QUnit.test('#factoryFor returns a factory manager', (assert) => {
  let registry = new Registry();
  let container = registry.container();

  let Component = factory();
  registry.register('component:foo-bar', Component);

  let factoryManager = container.factoryFor('component:foo-bar');
  assert.ok(factoryManager.create);
  assert.ok(factoryManager.class);
});

QUnit.test('#factoryFor returns a cached factory manager for the same type', (assert) => {
  let registry = new Registry();
  let container = registry.container();

  let Component = factory();
  registry.register('component:foo-bar', Component);
  registry.register('component:baz-bar', Component);

  let factoryManager1 = container.factoryFor('component:foo-bar');
  let factoryManager2 = container.factoryFor('component:foo-bar');
  let factoryManager3 = container.factoryFor('component:baz-bar');

  assert.equal(factoryManager1, factoryManager2, 'cache hit');
  assert.notEqual(factoryManager1, factoryManager3, 'cache miss');
});

QUnit.test('#factoryFor class returns the factory function', (assert) => {
  let registry = new Registry();
  let container = registry.container();

  let Component = factory();
  registry.register('component:foo-bar', Component);

  let factoryManager = container.factoryFor('component:foo-bar');
  assert.deepEqual(factoryManager.class, Component, 'No double extend');
});

QUnit.test('#factoryFor instance have a common parent', (assert) => {
  let registry = new Registry();
  let container = registry.container();

  let Component = factory();
  registry.register('component:foo-bar', Component);

  let factoryManager1 = container.factoryFor('component:foo-bar');
  let factoryManager2 = container.factoryFor('component:foo-bar');
  let instance1 = factoryManager1.create({ foo: 'foo' });
  let instance2 = factoryManager2.create({ bar: 'bar' });

  assert.deepEqual(instance1.constructor, instance2.constructor);
});

QUnit.test('#factoryFor created instances come with instance injections', (assert) => {
  let registry = new Registry();
  let container = registry.container();

  let Component = factory();
  let Ajax = factory();
  registry.register('component:foo-bar', Component);
  registry.register('util:ajax', Ajax);
  registry.injection('component:foo-bar', 'ajax', 'util:ajax');

  let componentFactory = container.factoryFor('component:foo-bar');
  let component = componentFactory.create();

  assert.ok(component.ajax);
  assert.ok(component.ajax instanceof Ajax);
});

QUnit.test('#factoryFor options passed to create clobber injections', (assert) => {
  let registry = new Registry();
  let container = registry.container();

  let Component = factory();
  let Ajax = factory();
  registry.register('component:foo-bar', Component);
  registry.register('util:ajax', Ajax);
  registry.injection('component:foo-bar', 'ajax', 'util:ajax');

  let componentFactory = container.factoryFor('component:foo-bar');

  let instrance = componentFactory.create({ ajax: 'fetch' });

  assert.equal(instrance.ajax, 'fetch');
});

QUnit.test('#factoryFor does not add properties to the object being instantiated when _initFactory is present', function(assert) {
  let owner = {};
  let registry = new Registry();
  let container = registry.container();

  let factory;
  class Component {
    static _initFactory(_factory) { factory = _factory; }
    static create(options) {
      let instance = new this();
      assign(instance, options);
      return instance;
    }
  }
  registry.register('component:foo-bar', Component);

  let componentFactory = container.factoryFor('component:foo-bar');
  let instance = componentFactory.create();

  // note: _guid and isDestroyed are being set in the `factory` constructor
  // not via registry/container shenanigans
  assert.deepEqual(Object.keys(instance), []);
});

// this is skipped until templates and the glimmer environment do not require `OWNER` to be
// passed in as constructor args
QUnit.skip('#factoryFor does not add properties to the object being instantiated', function(assert) {
  let owner = {};
  let registry = new Registry();
  let container = registry.container();

  let factory;
  class Component {
    static create(options) {
      let instance = new this();
      assign(instance, options);
      return instance;
    }
  }
  registry.register('component:foo-bar', Component);

  let componentFactory = container.factoryFor('component:foo-bar');
  let instance = componentFactory.create();

  // note: _guid and isDestroyed are being set in the `factory` constructor
  // not via registry/container shenanigans
  assert.deepEqual(Object.keys(instance), []);
});
