import { OWNER, assign } from 'ember-utils';
import { EMBER_MODULE_UNIFICATION } from 'ember/features';
import { Registry } from '..';
import { factory, moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor('Container', class extends AbstractTestCase {
  ['@test A registered factory returns the same instance each time'](assert) {
    let registry = new Registry();
    let container = registry.container();
    let PostController = factory();

    registry.register('controller:post', PostController);

    let postController = container.lookup('controller:post');

    assert.ok(postController instanceof PostController, 'The lookup is an instance of the factory');

    assert.equal(postController, container.lookup('controller:post'));
  }

  ['@test uses create time injections if factory has no extend'](assert) {
    let registry = new Registry();
    let container = registry.container();
    let AppleController = factory();
    let PostController = factory();

    PostController.extend = undefined; // remove extend

    registry.register('controller:apple', AppleController);
    registry.register('controller:post', PostController);
    registry.injection('controller:post', 'apple', 'controller:apple');

    let postController = container.lookup('controller:post');

    assert.ok(postController.apple instanceof AppleController, 'instance receives an apple of instance AppleController');
  }

  ['@test A registered factory returns a fresh instance if singleton: false is passed as an option'](assert) {
    let registry = new Registry();
    let container = registry.container();
    let PostController = factory();

    registry.register('controller:post', PostController);

    let postController1 = container.lookup('controller:post');
    let postController2 = container.lookup('controller:post', { singleton: false });
    let postController3 = container.lookup('controller:post', { singleton: false });
    let postController4 = container.lookup('controller:post');

    assert.equal(postController1.toString(), postController4.toString(), 'Singleton factories looked up normally return the same value');
    assert.notEqual(postController1.toString(), postController2.toString(), 'Singleton factories are not equal to factories looked up with singleton: false');
    assert.notEqual(postController2.toString(), postController3.toString(), 'Two factories looked up with singleton: false are not equal');
    assert.notEqual(postController3.toString(), postController4.toString(), 'A singleton factory looked up after a factory called with singleton: false is not equal');

    assert.ok(postController1 instanceof PostController, 'All instances are instances of the registered factory');
    assert.ok(postController2 instanceof PostController, 'All instances are instances of the registered factory');
    assert.ok(postController3 instanceof PostController, 'All instances are instances of the registered factory');
    assert.ok(postController4 instanceof PostController, 'All instances are instances of the registered factory');
  }

  ['@test A factory type with a registered injection\'s instances receive that injection'](assert) {
    let registry = new Registry();
    let container = registry.container();
    let PostController = factory();
    let Store = factory();

    registry.register('controller:post', PostController);
    registry.register('store:main', Store);

    registry.typeInjection('controller', 'store', 'store:main');

    let postController = container.lookup('controller:post');
    let store = container.lookup('store:main');

    assert.equal(postController.store, store);
  }

  ['@test An individual factory with a registered injection receives the injection'](assert) {
    let registry = new Registry();
    let container = registry.container();
    let PostController = factory();
    let Store = factory();

    registry.register('controller:post', PostController);
    registry.register('store:main', Store);

    registry.injection('controller:post', 'store', 'store:main');

    let postController = container.lookup('controller:post');
    let store = container.lookup('store:main');

    assert.equal(postController.store, store, 'has the correct store injected');
  }

  ['@test A factory with both type and individual injections'](assert) {
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

    assert.equal(postController.store, store);
    assert.equal(postController.router, router);
  }

  ['@test A non-singleton instance is never cached'](assert) {
    let registry = new Registry();
    let container = registry.container();
    let PostView = factory();

    registry.register('view:post', PostView, { singleton: false });

    let postView1 = container.lookup('view:post');
    let postView2 = container.lookup('view:post');

    assert.ok(postView1 !== postView2, 'Non-singletons are not cached');
  }

  ['@test A non-instantiated property is not instantiated'](assert) {
    let registry = new Registry();
    let container = registry.container();

    let template = function() {};
    registry.register('template:foo', template, { instantiate: false });
    assert.equal(container.lookup('template:foo'), template);
  }

  ['@test A failed lookup returns undefined'](assert) {
    let registry = new Registry();
    let container = registry.container();

    assert.equal(container.lookup('doesnot:exist'), undefined);
  }

  ['@test An invalid factory throws an error'](assert) {
    let registry = new Registry();
    let container = registry.container();

    registry.register('controller:foo', {});

    assert.throws(() => {
      container.lookup('controller:foo');
    }, /Failed to create an instance of \'controller:foo\'/);
  }

  ['@test Injecting a failed lookup raises an error'](assert) {
    let registry = new Registry();
    let container = registry.container();

    let fooInstance = {};
    let fooFactory  = {};


    let Foo = {
      create() { return fooInstance; },
      extend() { return fooFactory;  }
    };

    registry.register('model:foo', Foo);
    registry.injection('model:foo', 'store', 'store:main');

    assert.throws(() => {
      container.lookup('model:foo');
    });
  }

  ['@test Injecting a falsy value does not raise an error'](assert) {
    let registry = new Registry();
    let container = registry.container();
    let ApplicationController = factory();

    registry.register('controller:application', ApplicationController);
    registry.register('user:current', null, { instantiate: false });
    registry.injection('controller:application', 'currentUser', 'user:current');

    assert.strictEqual(container.lookup('controller:application').currentUser, null);
  }

  ['@test The container returns same value each time even if the value is falsy'](assert) {
    let registry = new Registry();
    let container = registry.container();

    registry.register('falsy:value', null, { instantiate: false });

    assert.strictEqual(container.lookup('falsy:value'), container.lookup('falsy:value'));
  }

  ['@test Destroying the container destroys any cached singletons'](assert) {
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

    assert.ok(postView instanceof PostView, 'The non-singleton was injected');

    container.destroy();

    assert.ok(postController.isDestroyed, 'Singletons are destroyed');
    assert.ok(!postView.isDestroyed, 'Non-singletons are not destroyed');
  }

  ['@test The container can use a registry hook to resolve factories lazily'](assert) {
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

    assert.ok(postController instanceof PostController, 'The correct factory was provided');
  }

  ['@test The container normalizes names before resolving'](assert) {
    let registry = new Registry();
    let container = registry.container();
    let PostController = factory();

    registry.normalizeFullName = function() {
      return 'controller:post';
    };

    registry.register('controller:post', PostController);
    let postController = container.lookup('controller:normalized');

    assert.ok(postController instanceof PostController, 'Normalizes the name before resolving');
  }

  ['@test The container normalizes names when looking factory up'](assert) {
    let registry = new Registry();
    let container = registry.container();
    let PostController = factory();

    registry.normalizeFullName = function() {
      return 'controller:post';
    };

    registry.register('controller:post', PostController);
    let fact = container.factoryFor('controller:normalized');

    let factInstance = fact.create();
    assert.ok(factInstance instanceof PostController, 'Normalizes the name');
  }

  ['@test Options can be registered that should be applied to a given factory'](assert) {
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

    assert.ok(postView1 instanceof PostView, 'The correct factory was provided');
    assert.ok(postView2 instanceof PostView, 'The correct factory was provided');

    assert.ok(postView1 !== postView2, 'The two lookups are different');
  }

  ['@test Options can be registered that should be applied to all factories for a given type'](assert) {
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

    assert.ok(postView1 instanceof PostView, 'The correct factory was provided');
    assert.ok(postView2 instanceof PostView, 'The correct factory was provided');

    assert.ok(postView1 !== postView2, 'The two lookups are different');
  }

  ['@test An injected non-singleton instance is never cached'](assert) {
    let registry = new Registry();
    let container = registry.container();
    let PostView = factory();
    let PostViewHelper = factory();

    registry.register('view:post', PostView, { singleton: false });
    registry.register('view_helper:post', PostViewHelper, { singleton: false });
    registry.injection('view:post', 'viewHelper', 'view_helper:post');

    let postView1 = container.lookup('view:post');
    let postView2 = container.lookup('view:post');

    assert.ok(postView1.viewHelper !== postView2.viewHelper, 'Injected non-singletons are not cached');
  }

  ['@test Factory resolves are cached'](assert) {
    let registry = new Registry();
    let container = registry.container();
    let PostController = factory();
    let resolveWasCalled = [];
    registry.resolve = function(fullName) {
      resolveWasCalled.push(fullName);
      return PostController;
    };

    assert.deepEqual(resolveWasCalled, []);
    container.factoryFor('controller:post');
    assert.deepEqual(resolveWasCalled, ['controller:post']);

    container.factoryFor('controller:post');
    assert.deepEqual(resolveWasCalled, ['controller:post']);
  }

  ['@test factory for non extendables (MODEL) resolves are cached'](assert) {
    let registry = new Registry();
    let container = registry.container();
    let PostController = factory();
    let resolveWasCalled = [];
    registry.resolve = function(fullName) {
      resolveWasCalled.push(fullName);
      return PostController;
    };

    assert.deepEqual(resolveWasCalled, []);
    container.factoryFor('model:post');
    assert.deepEqual(resolveWasCalled, ['model:post']);

    container.factoryFor('model:post');
    assert.deepEqual(resolveWasCalled, ['model:post']);
  }

  ['@test factory for non extendables resolves are cached'](assert) {
    let registry = new Registry();
    let container = registry.container();
    let PostController = {};
    let resolveWasCalled = [];

    registry.resolve = function(fullName) {
      resolveWasCalled.push(fullName);
      return PostController;
    };

    assert.deepEqual(resolveWasCalled, []);
    container.factoryFor('foo:post');
    assert.deepEqual(resolveWasCalled, ['foo:post']);

    container.factoryFor('foo:post');
    assert.deepEqual(resolveWasCalled, ['foo:post']);
  }

  ['@test A factory\'s lazy injections are validated when first instantiated'](assert) {
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

    assert.throws(() => {
      container.lookup('apple:main');
    }, /Attempting to inject an unknown injection: 'banana:main'/);
  }

  ['@test Lazy injection validations are cached'](assert) {
    assert.expect(1);

    let registry = new Registry();
    let container = registry.container();
    let Apple = factory();
    let Orange = factory();

    Apple.reopenClass({
      _lazyInjections: () => {
        assert.ok(true, 'should call lazy injection method');
        return ['orange:main'];
      }
    });

    registry.register('apple:main', Apple);
    registry.register('orange:main', Orange);

    container.lookup('apple:main');
    container.lookup('apple:main');
  }

  ['@test An object with its owner pre-set should be returned from ownerInjection'](assert) {
    let owner = { };
    let registry = new Registry();
    let container = registry.container({ owner });

    let result = container.ownerInjection();

    assert.equal(result[OWNER], owner, 'owner is properly included');
  }

  ['@test lookup passes options through to expandlocallookup'](assert) {
    let registry = new Registry();
    let container = registry.container();
    let PostController = factory();

    registry.register('controller:post', PostController);
    registry.expandLocalLookup = (fullName, options) => {
      assert.ok(true, 'expandLocalLookup was called');
      assert.equal(fullName, 'foo:bar');
      assert.deepEqual(options, { source: 'baz:qux' });

      return 'controller:post';
    };

    let PostControllerLookupResult = container.lookup('foo:bar', { source: 'baz:qux' });

    assert.ok(PostControllerLookupResult instanceof PostController);
  }

  ['@test #factoryFor class is registered class'](assert) {
    let registry = new Registry();
    let container = registry.container();

    let Component = factory();
    registry.register('component:foo-bar', Component);

    let factoryManager = container.factoryFor('component:foo-bar');
    assert.deepEqual(factoryManager.class, Component, 'No double extend');
  }

  ['@test #factoryFor must supply a fullname']() {
    let registry = new Registry();
    let container = registry.container();
    expectAssertion(() => {
      container.factoryFor('chad-bar');
    }, /fullName must be a proper full name/);
  }

  ['@test #factoryFor returns a factory manager'](assert) {
    let registry = new Registry();
    let container = registry.container();

    let Component = factory();
    registry.register('component:foo-bar', Component);

    let factoryManager = container.factoryFor('component:foo-bar');
    assert.ok(factoryManager.create);
    assert.ok(factoryManager.class);
  }

  ['@test #factoryFor returns a cached factory manager for the same type'](assert) {
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
  }

  ['@test #factoryFor class returns the factory function'](assert) {
    let registry = new Registry();
    let container = registry.container();

    let Component = factory();
    registry.register('component:foo-bar', Component);

    let factoryManager = container.factoryFor('component:foo-bar');
    assert.deepEqual(factoryManager.class, Component, 'No double extend');
  }

  ['@test #factoryFor instance have a common parent'](assert) {
    let registry = new Registry();
    let container = registry.container();

    let Component = factory();
    registry.register('component:foo-bar', Component);

    let factoryManager1 = container.factoryFor('component:foo-bar');
    let factoryManager2 = container.factoryFor('component:foo-bar');
    let instance1 = factoryManager1.create({ foo: 'foo' });
    let instance2 = factoryManager2.create({ bar: 'bar' });

    assert.deepEqual(instance1.constructor, instance2.constructor);
  }

  ['@test can properly reset cache'](assert) {
    let registry = new Registry();
    let container = registry.container();

    let Component = factory();
    registry.register('component:foo-bar', Component);

    let factory1 = container.factoryFor('component:foo-bar');
    let factory2 = container.factoryFor('component:foo-bar');

    let instance1 = container.lookup('component:foo-bar');
    let instance2 = container.lookup('component:foo-bar');

    assert.equal(instance1, instance2);
    assert.equal(factory1, factory2);

    container.reset();

    let factory3 = container.factoryFor('component:foo-bar');
    let instance3 = container.lookup('component:foo-bar');

    assert.notEqual(instance1, instance3);
    assert.notEqual(factory1, factory3);
  }

  ['@test #factoryFor created instances come with instance injections'](assert) {
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
  }

  ['@test #factoryFor options passed to create clobber injections'](assert) {
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
  }

  ['@test #factoryFor does not add properties to the object being instantiated when _initFactory is present'](assert) {
    let registry = new Registry();
    let container = registry.container();

    class Component {
      static _initFactory() {}
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
  }

  // this is skipped until templates and the glimmer environment do not require `OWNER` to be
  // passed in as constructor args
  ['@skip #factoryFor does not add properties to the object being instantiated'](assert) {
    let registry = new Registry();
    let container = registry.container();

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
  }
});

if (EMBER_MODULE_UNIFICATION) {
  QUnit.module('Container module unification');

  moduleFor('Container module unification', class extends AbstractTestCase {
    ['@test The container can pass a source to factoryFor'](assert) {
      let PrivateComponent = factory();
      let lookup = 'component:my-input';
      let expectedSource = 'template:routes/application';
      let registry = new Registry();
      let resolveCount = 0;
      registry.resolve = function(fullName, { source }) {
        resolveCount++;
        if (fullName === lookup && source === expectedSource) {
          return PrivateComponent;
        }
      };

      let container = registry.container();

      assert.strictEqual(container.factoryFor(lookup, { source: expectedSource }).class, PrivateComponent, 'The correct factory was provided');
      assert.strictEqual(container.factoryFor(lookup, { source: expectedSource }).class, PrivateComponent, 'The correct factory was provided again');
      assert.equal(resolveCount, 1, 'resolve called only once and a cached factory was returned the second time');
    }

    ['@test The container can pass a source to lookup']() {
      let PrivateComponent = factory();
      let lookup = 'component:my-input';
      let expectedSource = 'template:routes/application';
      let registry = new Registry();
      registry.resolve = function(fullName, { source }) {
        if (fullName === lookup && source === expectedSource) {
          return PrivateComponent;
        }
      };

      let container = registry.container();

      let result = container.lookup(lookup, { source: expectedSource });
      this.assert.ok(result instanceof PrivateComponent, 'The correct factory was provided');

      this.assert.ok(container.cache[`template:routes/application:component:my-input`] instanceof PrivateComponent,
        'The correct factory was stored in the cache with the correct key which includes the source.');
    }
  });
}
