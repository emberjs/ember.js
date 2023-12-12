import { getOwner } from '@ember/-internals/owner';
import Service from '@ember/service';
import { DEBUG } from '@glimmer/env';
import { Registry } from '..';
import { factory, moduleFor, AbstractTestCase, runTask } from 'internal-test-helpers';

moduleFor(
  'Container.lookup',
  class extends AbstractTestCase {
    ['@test lookup returns a fresh instance if singleton: false is passed as an option'](assert) {
      let registry = new Registry();
      let container = registry.container();
      let PostController = factory();

      registry.register('controller:post', PostController);

      let postController1 = container.lookup('controller:post');
      let postController2 = container.lookup('controller:post', {
        singleton: false,
      });
      let postController3 = container.lookup('controller:post', {
        singleton: false,
      });
      let postController4 = container.lookup('controller:post');

      assert.equal(
        postController1.toString(),
        postController4.toString(),
        'Singleton factories looked up normally return the same value'
      );
      assert.notEqual(
        postController1.toString(),
        postController2.toString(),
        'Singleton factories are not equal to factories looked up with singleton: false'
      );
      assert.notEqual(
        postController2.toString(),
        postController3.toString(),
        'Two factories looked up with singleton: false are not equal'
      );
      assert.notEqual(
        postController3.toString(),
        postController4.toString(),
        'A singleton factory looked up after a factory called with singleton: false is not equal'
      );

      assert.ok(
        postController1 instanceof PostController,
        'All instances are instances of the registered factory'
      );
      assert.ok(
        postController2 instanceof PostController,
        'All instances are instances of the registered factory'
      );
      assert.ok(
        postController3 instanceof PostController,
        'All instances are instances of the registered factory'
      );
      assert.ok(
        postController4 instanceof PostController,
        'All instances are instances of the registered factory'
      );
    }

    ['@test lookup returns a fresh instance if singleton: false is passed as an option to lookup'](
      assert
    ) {
      class TestFactory {
        constructor(opts) {
          Object.assign(this, opts);
        }
        static create(opts) {
          return new this(opts);
        }
      }

      let registry = new Registry();
      let container = registry.container();
      registry.register('thing:test/obj', TestFactory);

      let instance1 = container.lookup('thing:test/obj');
      let instance2 = container.lookup('thing:test/obj', {
        singleton: false,
      });
      let instance3 = container.lookup('thing:test/obj', {
        singleton: false,
      });
      let instance4 = container.lookup('thing:test/obj');

      assert.ok(
        instance1 === instance4,
        'factories looked up up without singleton: false are the same instance'
      );
      assert.ok(
        instance1 !== instance2,
        'factories looked up with singleton: false are a different instance'
      );
      assert.ok(
        instance2 !== instance3,
        'factories looked up with singleton: false are a different instance'
      );
      assert.ok(
        instance3 !== instance4,
        'factories looked up after a call to singleton: false is a different instance'
      );
      assert.ok(
        instance1 instanceof TestFactory,
        'All instances are instances of the registered factory'
      );
      assert.ok(
        instance2 instanceof TestFactory,
        'All instances are instances of the registered factory'
      );
      assert.ok(
        instance3 instanceof TestFactory,
        'All instances are instances of the registered factory'
      );
      assert.ok(
        instance4 instanceof TestFactory,
        'All instances are instances of the registered factory'
      );
    }

    ['@test lookup returns a fresh instance if singleton: false is passed as an option to register'](
      assert
    ) {
      class TestFactory {
        constructor(opts) {
          Object.assign(this, opts);
        }
        static create(opts) {
          return new this(opts);
        }
      }

      let registry = new Registry();
      let container = registry.container();
      registry.register('thing:test/obj', TestFactory, { singleton: false });

      let instance1 = container.lookup('thing:test/obj');
      let instance2 = container.lookup('thing:test/obj');
      let instance3 = container.lookup('thing:test/obj');

      assert.ok(instance1 !== instance2, 'each lookup is a different instance');
      assert.ok(instance2 !== instance3, 'each lookup is a different instance');
      assert.ok(instance1 !== instance3, 'each lookup is a different instance');
      assert.ok(
        instance1 instanceof TestFactory,
        'All instances are instances of the registered factory'
      );
      assert.ok(
        instance2 instanceof TestFactory,
        'All instances are instances of the registered factory'
      );
      assert.ok(
        instance3 instanceof TestFactory,
        'All instances are instances of the registered factory'
      );
    }

    ['@test lookup returns a singleton instance if singleton: true is passed as an option even if registered as singleton: false'](
      assert
    ) {
      class TestFactory {
        constructor(opts) {
          Object.assign(this, opts);
        }
        static create(opts) {
          return new this(opts);
        }
      }

      let registry = new Registry();
      let container = registry.container();
      registry.register('thing:test/obj', TestFactory, { singleton: false });

      let instance1 = container.lookup('thing:test/obj');
      let instance2 = container.lookup('thing:test/obj', { singleton: true });
      let instance3 = container.lookup('thing:test/obj', { singleton: true });
      let instance4 = container.lookup('thing:test/obj');

      assert.ok(instance1 !== instance2, 'each lookup is a different instance');
      assert.ok(instance2 === instance3, 'each singleton: true lookup is the same instance');
      assert.ok(instance3 !== instance4, 'each lookup is a different instance');
      assert.ok(instance1 !== instance4, 'each lookup is a different instance');
      assert.ok(
        instance1 instanceof TestFactory,
        'All instances are instances of the registered factory'
      );
      assert.ok(
        instance2 instanceof TestFactory,
        'All instances are instances of the registered factory'
      );
      assert.ok(
        instance3 instanceof TestFactory,
        'All instances are instances of the registered factory'
      );
      assert.ok(
        instance4 instanceof TestFactory,
        'All instances are instances of the registered factory'
      );
    }
  }
);

moduleFor(
  'Container',
  class extends AbstractTestCase {
    ['@test A registered factory returns the same instance each time'](assert) {
      let registry = new Registry();
      let container = registry.container();
      let PostController = factory();

      registry.register('controller:post', PostController);

      let postController = container.lookup('controller:post');

      assert.ok(
        postController instanceof PostController,
        'The lookup is an instance of the factory'
      );

      assert.equal(postController, container.lookup('controller:post'));
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

      let template = function () {};
      registry.register('template:foo', template, { instantiate: false });
      assert.equal(container.lookup('template:foo'), template);
    }

    ['@test A failed lookup returns undefined'](assert) {
      let registry = new Registry();
      let container = registry.container();

      assert.equal(container.lookup('doesnot:exist'), undefined);
    }

    ['@test An invalid factory throws an error']() {
      let registry = new Registry();
      let container = registry.container();

      registry.register('controller:foo', {});

      expectAssertion(() => {
        container.lookup('controller:foo');
      }, /Failed to create an instance of 'controller:foo'/);
    }

    ['@test The container returns same value each time even if the value is falsey'](assert) {
      let registry = new Registry();
      let container = registry.container();

      registry.register('falsy:value', null, { instantiate: false });

      assert.strictEqual(container.lookup('falsy:value'), container.lookup('falsy:value'));
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
        },
      };

      let postController = container.lookup('controller:post');

      assert.ok(postController instanceof PostController, 'The correct factory was provided');
    }

    ['@test The container normalizes names before resolving'](assert) {
      let registry = new Registry();
      let container = registry.container();
      let PostController = factory();

      registry.normalizeFullName = function () {
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

      registry.normalizeFullName = function () {
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
        },
      };

      registry.options('view:post', { instantiate: true, singleton: false });

      let postView1 = container.lookup('view:post');
      let postView2 = container.lookup('view:post');

      assert.ok(postView1 instanceof PostView, 'The correct factory was provided');
      assert.ok(postView2 instanceof PostView, 'The correct factory was provided');

      assert.ok(postView1 !== postView2, 'The two lookups are different');
    }

    ['@test Options can be registered that should be applied to all factories for a given type'](
      assert
    ) {
      let registry = new Registry();
      let container = registry.container();
      let PostView = factory();

      registry.resolver = {
        resolve(fullName) {
          if (fullName === 'view:post') {
            return PostView;
          }
        },
      };

      registry.optionsForType('view', { singleton: false });

      let postView1 = container.lookup('view:post');
      let postView2 = container.lookup('view:post');

      assert.ok(postView1 instanceof PostView, 'The correct factory was provided');
      assert.ok(postView2 instanceof PostView, 'The correct factory was provided');

      assert.ok(postView1 !== postView2, 'The two lookups are different');
    }

    ['@test Factory resolves are cached'](assert) {
      let registry = new Registry();
      let container = registry.container();
      let PostController = factory();
      let resolveWasCalled = [];
      registry.resolve = function (fullName) {
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
      registry.resolve = function (fullName) {
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

      registry.resolve = function (fullName) {
        resolveWasCalled.push(fullName);
        return PostController;
      };

      assert.deepEqual(resolveWasCalled, []);
      container.factoryFor('foo:post');
      assert.deepEqual(resolveWasCalled, ['foo:post']);

      container.factoryFor('foo:post');
      assert.deepEqual(resolveWasCalled, ['foo:post']);
    }

    [`@test A factory's lazy injections are validated when first instantiated`]() {
      let registry = new Registry();
      let container = registry.container();
      let Apple = factory();
      let Orange = factory();

      Apple.reopenClass({
        _lazyInjections() {
          return [{ specifier: 'orange:main' }, { specifier: 'banana:main' }];
        },
      });

      registry.register('apple:main', Apple);
      registry.register('orange:main', Orange);

      expectAssertion(() => {
        container.lookup('apple:main');
      }, /Attempting to inject an unknown injection: 'banana:main'/);
    }

    ['@test Lazy injection validations are cached'](assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      assert.expect(1);

      let registry = new Registry();
      let container = registry.container();
      let Apple = factory();
      let Orange = factory();

      Apple.reopenClass({
        _lazyInjections: () => {
          assert.ok(true, 'should call lazy injection method');
          return [{ specifier: 'orange:main' }];
        },
      });

      registry.register('apple:main', Apple);
      registry.register('orange:main', Orange);

      container.lookup('apple:main');
      container.lookup('apple:main');
    }

    ['@test An object with its owner pre-set should be returned from ownerInjection'](assert) {
      let owner = {};
      let registry = new Registry();
      let container = registry.container({ owner });

      let result = container.ownerInjection();

      assert.equal(getOwner(result), owner, 'owner is properly included');
    }

    ['@test ownerInjection should be usable to create a service for testing'](assert) {
      assert.expect(0);

      let owner = {};
      let registry = new Registry();
      let container = registry.container({ owner });

      let result = container.ownerInjection();

      Service.create(result);
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

    [`@test assert when calling lookup after destroy on a container`](assert) {
      let registry = new Registry();
      let container = registry.container();
      registry.register('service:foo', factory());

      let instance = container.lookup('service:foo');
      assert.ok(instance, 'precond lookup successful');

      runTask(() => {
        container.destroy();
        container.finalizeDestroy();
      });

      assert.throws(() => {
        container.lookup('service:foo');
      }, "Cannot call `.lookup('service:foo')` after the owner has been destroyed");
    }

    [`@test assert when calling factoryFor after destroy on a container`](assert) {
      let registry = new Registry();
      let container = registry.container();
      registry.register('service:foo', factory());

      let instance = container.lookup('service:foo');
      assert.ok(instance, 'precond lookup successful');

      runTask(() => {
        container.destroy();
        container.finalizeDestroy();
      });

      assert.throws(() => {
        container.factoryFor('service:foo');
      }, "Cannot call `.factoryFor('service:foo')` after the owner has been destroyed");
    }

    // this is skipped until templates and the glimmer environment do not require `OWNER` to be
    // passed in as constructor args
    ['@skip #factoryFor does not add properties to the object being instantiated'](assert) {
      let registry = new Registry();
      let container = registry.container();

      class Component {
        static create(options) {
          let instance = new this();
          Object.assign(instance, options);
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

    '@test instantiating via container.lookup during destruction enqueues destruction'(assert) {
      let registry = new Registry();
      let container = registry.container();
      let otherInstance;
      class Service extends factory() {
        destroy() {
          otherInstance = container.lookup('service:other');

          assert.ok(otherInstance.isDestroyed, 'service:other was destroyed');
        }
      }
      registry.register('service:foo', Service);
      registry.register('service:other', factory());
      let instance = container.lookup('service:foo');
      assert.ok(instance, 'precond lookup successful');

      runTask(() => {
        container.destroy();
        container.finalizeDestroy();
      });
    }

    '@test instantiating via container.factoryFor().create() after destruction throws an error'(
      assert
    ) {
      let registry = new Registry();
      let container = registry.container();
      registry.register('service:foo', factory());
      registry.register('service:other', factory());
      let Factory = container.factoryFor('service:other');

      runTask(() => {
        container.destroy();
        container.finalizeDestroy();
      });

      assert.throws(() => {
        Factory.create();
      }, /Cannot create new instances after the owner has been destroyed \(you attempted to create service:other\)/);
    }
  }
);
