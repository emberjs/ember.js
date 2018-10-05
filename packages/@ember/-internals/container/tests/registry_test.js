import { Registry, privatize } from '..';
import {
  factory,
  moduleFor,
  AbstractTestCase,
  ModuleBasedTestResolver,
} from 'internal-test-helpers';
import { EMBER_MODULE_UNIFICATION } from '@ember/canary-features';

moduleFor(
  'Registry',
  class extends AbstractTestCase {
    ['@test A registered factory is returned from resolve'](assert) {
      let registry = new Registry();
      let PostController = factory();

      registry.register('controller:post', PostController);

      let PostControllerFactory = registry.resolve('controller:post');

      assert.ok(PostControllerFactory, 'factory is returned');
      assert.ok(
        PostControllerFactory.create() instanceof PostController,
        'The return of factory.create is an instance of PostController'
      );
    }

    ['@test The registered factory returned from resolve is the same factory each time'](assert) {
      let registry = new Registry();
      let PostController = factory();

      registry.register('controller:post', PostController);

      assert.deepEqual(
        registry.resolve('controller:post'),
        registry.resolve('controller:post'),
        'The return of resolve is always the same'
      );
    }

    ['@test The registered value returned from resolve is the same value each time even if the value is falsy'](
      assert
    ) {
      let registry = new Registry();

      registry.register('falsy:value', null, { instantiate: false });

      assert.strictEqual(
        registry.resolve('falsy:value'),
        registry.resolve('falsy:value'),
        'The return of resolve is always the same'
      );
    }

    ['@test The value returned from resolver is the same value as the original value even if the value is falsy'](
      assert
    ) {
      let resolver = {
        resolve(fullName) {
          if (fullName === 'falsy:value') {
            return null;
          }
        },
      };
      let registry = new Registry({ resolver });

      assert.strictEqual(registry.resolve('falsy:value'), null);
    }

    ['@test A registered factory returns true for `has` if an item is registered'](assert) {
      let registry = new Registry();
      let PostController = factory();

      registry.register('controller:post', PostController);

      assert.equal(
        registry.has('controller:post'),
        true,
        'The `has` method returned true for registered factories'
      );
      assert.equal(
        registry.has('controller:posts'),
        false,
        'The `has` method returned false for unregistered factories'
      );
    }

    ['@test Throw exception when trying to inject `type:thing` on all type(s)']() {
      let registry = new Registry();
      let PostController = factory();

      registry.register('controller:post', PostController);

      expectAssertion(() => {
        registry.typeInjection('controller', 'injected', 'controller:post');
      }, /Cannot inject a 'controller:post' on other controller\(s\)\./);
    }

    ['@test The registry can take a hook to resolve factories lazily'](assert) {
      let PostController = factory();
      let resolver = {
        resolve(fullName) {
          if (fullName === 'controller:post') {
            return PostController;
          }
        },
      };
      let registry = new Registry({ resolver });

      assert.strictEqual(
        registry.resolve('controller:post'),
        PostController,
        'The correct factory was provided'
      );
    }

    ['@test The registry respects the resolver hook for `has`'](assert) {
      let PostController = factory();
      let resolver = {
        resolve(fullName) {
          if (fullName === 'controller:post') {
            return PostController;
          }
        },
      };
      let registry = new Registry({ resolver });

      assert.ok(registry.has('controller:post'), 'the `has` method uses the resolver hook');
    }

    ['@test The registry normalizes names when resolving'](assert) {
      let registry = new Registry();
      let PostController = factory();

      registry.normalizeFullName = function() {
        return 'controller:post';
      };

      registry.register('controller:post', PostController);
      let type = registry.resolve('controller:normalized');

      assert.strictEqual(type, PostController, 'Normalizes the name when resolving');
    }

    ['@test The registry normalizes names when checking if the factory is registered'](assert) {
      let registry = new Registry();
      let PostController = factory();

      registry.normalizeFullName = function(fullName) {
        return fullName === 'controller:normalized' ? 'controller:post' : fullName;
      };

      registry.register('controller:post', PostController);
      let isPresent = registry.has('controller:normalized');

      assert.equal(
        isPresent,
        true,
        'Normalizes the name when checking if the factory or instance is present'
      );
    }

    ['@test The registry normalizes names when injecting'](assert) {
      let registry = new Registry();
      let PostController = factory();
      let user = { name: 'Stef' };

      registry.normalize = function() {
        return 'controller:post';
      };

      registry.register('controller:post', PostController);
      registry.register('user:post', user, { instantiate: false });
      registry.injection('controller:post', 'user', 'controller:normalized');

      assert.deepEqual(
        registry.resolve('controller:post'),
        user,
        'Normalizes the name when injecting'
      );
    }

    ['@test cannot register an `undefined` factory'](assert) {
      let registry = new Registry();

      assert.throws(() => {
        registry.register('controller:apple', undefined);
      }, '');
    }

    ['@test can re-register a factory'](assert) {
      let registry = new Registry();
      let FirstApple = factory('first');
      let SecondApple = factory('second');

      registry.register('controller:apple', FirstApple);
      registry.register('controller:apple', SecondApple);

      assert.ok(registry.resolve('controller:apple').create() instanceof SecondApple);
    }

    ['@test cannot re-register a factory if it has been resolved'](assert) {
      let registry = new Registry();
      let FirstApple = factory('first');
      let SecondApple = factory('second');

      registry.register('controller:apple', FirstApple);
      assert.strictEqual(registry.resolve('controller:apple'), FirstApple);

      expectAssertion(function() {
        registry.register('controller:apple', SecondApple);
      }, /Cannot re-register: 'controller:apple', as it has already been resolved\./);

      assert.strictEqual(registry.resolve('controller:apple'), FirstApple);
    }

    ['@test registry.has should not accidentally cause injections on that factory to be run. (Mitigate merely on observing)'](
      assert
    ) {
      assert.expect(1);

      let registry = new Registry();
      let FirstApple = factory('first');
      let SecondApple = factory('second');

      SecondApple.extend = function() {
        assert.ok(
          false,
          'should not extend or touch the injected model, merely to inspect existence of another'
        );
      };

      registry.register('controller:apple', FirstApple);
      registry.register('controller:second-apple', SecondApple);
      registry.injection('controller:apple', 'badApple', 'controller:second-apple');

      assert.ok(registry.has('controller:apple'));
    }

    ['@test registry.has should not error for invalid fullNames'](assert) {
      let registry = new Registry();

      assert.ok(!registry.has('foo:bar:baz'));
    }

    ['@test once resolved, always return the same result'](assert) {
      let registry = new Registry();

      registry.resolver = {
        resolve() {
          return 'bar';
        },
      };

      let Bar = registry.resolve('models:bar');

      registry.resolver = {
        resolve() {
          return 'not bar';
        },
      };

      assert.equal(registry.resolve('models:bar'), Bar);
    }

    ['@test factory resolves are cached'](assert) {
      let registry = new Registry();
      let PostController = factory();
      let resolveWasCalled = [];

      registry.resolver = {
        resolve(fullName) {
          resolveWasCalled.push(fullName);
          return PostController;
        },
      };

      assert.deepEqual(resolveWasCalled, []);
      registry.resolve('controller:post');
      assert.deepEqual(resolveWasCalled, ['controller:post']);

      registry.resolve('controller:post');
      assert.deepEqual(resolveWasCalled, ['controller:post']);
    }

    ['@test factory for non extendables (MODEL) resolves are cached'](assert) {
      let registry = new Registry();
      let PostController = factory();
      let resolveWasCalled = [];

      registry.resolver = {
        resolve(fullName) {
          resolveWasCalled.push(fullName);
          return PostController;
        },
      };

      assert.deepEqual(resolveWasCalled, []);
      registry.resolve('model:post');
      assert.deepEqual(resolveWasCalled, ['model:post']);

      registry.resolve('model:post');
      assert.deepEqual(resolveWasCalled, ['model:post']);
    }

    ['@test factory for non extendables resolves are cached'](assert) {
      let registry = new Registry();
      let PostController = {};
      let resolveWasCalled = [];

      registry.resolver = {
        resolve(fullName) {
          resolveWasCalled.push(fullName);
          return PostController;
        },
      };

      assert.deepEqual(resolveWasCalled, []);
      registry.resolve('foo:post');
      assert.deepEqual(resolveWasCalled, ['foo:post']);

      registry.resolve('foo:post');
      assert.deepEqual(resolveWasCalled, ['foo:post']);
    }

    ['@test registry.container creates a container'](assert) {
      let registry = new Registry();
      let PostController = factory();
      registry.register('controller:post', PostController);

      let container = registry.container();
      let postController = container.lookup('controller:post');

      assert.ok(
        postController instanceof PostController,
        'The lookup is an instance of the registered factory'
      );
    }

    ['@test `describe` will be handled by the resolver, then by the fallback registry, if available'](
      assert
    ) {
      let fallback = {
        describe(fullName) {
          return `${fullName}-fallback`;
        },
      };

      let resolver = {
        lookupDescription(fullName) {
          return `${fullName}-resolver`;
        },
      };

      let registry = new Registry({ fallback, resolver });

      assert.equal(
        registry.describe('controller:post'),
        'controller:post-resolver',
        '`describe` handled by the resolver first.'
      );

      registry.resolver = null;

      assert.equal(
        registry.describe('controller:post'),
        'controller:post-fallback',
        '`describe` handled by fallback registry next.'
      );

      registry.fallback = null;

      assert.equal(
        registry.describe('controller:post'),
        'controller:post',
        '`describe` by default returns argument.'
      );
    }

    ['@test `normalizeFullName` will be handled by the resolver, then by the fallback registry, if available'](
      assert
    ) {
      let fallback = {
        normalizeFullName(fullName) {
          return `${fullName}-fallback`;
        },
      };

      let resolver = {
        normalize(fullName) {
          return `${fullName}-resolver`;
        },
      };

      let registry = new Registry({ fallback, resolver });

      assert.equal(
        registry.normalizeFullName('controller:post'),
        'controller:post-resolver',
        '`normalizeFullName` handled by the resolver first.'
      );

      registry.resolver = null;

      assert.equal(
        registry.normalizeFullName('controller:post'),
        'controller:post-fallback',
        '`normalizeFullName` handled by fallback registry next.'
      );

      registry.fallback = null;

      assert.equal(
        registry.normalizeFullName('controller:post'),
        'controller:post',
        '`normalizeFullName` by default returns argument.'
      );
    }

    ['@test `makeToString` will be handled by the resolver, then by the fallback registry, if available'](
      assert
    ) {
      let fallback = {
        makeToString(fullName) {
          return `${fullName}-fallback`;
        },
      };

      let resolver = {
        makeToString(fullName) {
          return `${fullName}-resolver`;
        },
      };

      let registry = new Registry({ fallback, resolver });

      assert.equal(
        registry.makeToString('controller:post'),
        'controller:post-resolver',
        '`makeToString` handled by the resolver first.'
      );

      registry.resolver = null;

      assert.equal(
        registry.makeToString('controller:post'),
        'controller:post-fallback',
        '`makeToString` handled by fallback registry next.'
      );

      registry.fallback = null;

      assert.equal(
        registry.makeToString('controller:post'),
        'controller:post',
        '`makeToString` by default returns argument.'
      );
    }

    ['@test `resolve` can be handled by a fallback registry'](assert) {
      let fallback = new Registry();

      let registry = new Registry({ fallback: fallback });
      let PostController = factory();

      fallback.register('controller:post', PostController);

      let PostControllerFactory = registry.resolve('controller:post');

      assert.ok(PostControllerFactory, 'factory is returned');
      assert.ok(
        PostControllerFactory.create() instanceof PostController,
        'The return of factory.create is an instance of PostController'
      );
    }

    ['@test `has` can be handled by a fallback registry'](assert) {
      let fallback = new Registry();

      let registry = new Registry({ fallback: fallback });
      let PostController = factory();

      fallback.register('controller:post', PostController);

      assert.equal(
        registry.has('controller:post'),
        true,
        'Fallback registry is checked for registration'
      );
    }

    ['@test `getInjections` includes injections from a fallback registry'](assert) {
      let fallback = new Registry();
      let registry = new Registry({ fallback: fallback });

      assert.strictEqual(
        registry.getInjections('model:user'),
        undefined,
        'No injections in the primary registry'
      );

      fallback.injection('model:user', 'post', 'model:post');

      assert.equal(
        registry.getInjections('model:user').length,
        1,
        'Injections from the fallback registry are merged'
      );
    }

    ['@test `getTypeInjections` includes type injections from a fallback registry'](assert) {
      let fallback = new Registry();
      let registry = new Registry({ fallback: fallback });

      assert.strictEqual(
        registry.getTypeInjections('model'),
        undefined,
        'No injections in the primary registry'
      );

      fallback.injection('model', 'source', 'source:main');

      assert.equal(
        registry.getTypeInjections('model').length,
        1,
        'Injections from the fallback registry are merged'
      );
    }

    ['@test `knownForType` contains keys for each item of a given type'](assert) {
      let registry = new Registry();

      registry.register('foo:bar-baz', 'baz');
      registry.register('foo:qux-fez', 'fez');

      let found = registry.knownForType('foo');

      assert.deepEqual(found, {
        'foo:bar-baz': true,
        'foo:qux-fez': true,
      });
    }

    ['@test `knownForType` includes fallback registry results'](assert) {
      let fallback = new Registry();
      let registry = new Registry({ fallback: fallback });

      registry.register('foo:bar-baz', 'baz');
      registry.register('foo:qux-fez', 'fez');
      fallback.register('foo:zurp-zorp', 'zorp');

      let found = registry.knownForType('foo');

      assert.deepEqual(found, {
        'foo:bar-baz': true,
        'foo:qux-fez': true,
        'foo:zurp-zorp': true,
      });
    }

    ['@test `knownForType` is called on the resolver if present'](assert) {
      assert.expect(3);

      let resolver = {
        knownForType(type) {
          assert.ok(true, 'knownForType called on the resolver');
          assert.equal(type, 'foo', 'the type was passed through');

          return { 'foo:yorp': true };
        },
      };

      let registry = new Registry({
        resolver,
      });
      registry.register('foo:bar-baz', 'baz');

      let found = registry.knownForType('foo');

      assert.deepEqual(found, {
        'foo:yorp': true,
        'foo:bar-baz': true,
      });
    }

    ['@test resolver.expandLocalLookup is not required'](assert) {
      let registry = new Registry({
        resolver: {},
      });

      let result = registry.expandLocalLookup('foo:bar', {
        source: 'baz:qux',
      });

      assert.equal(result, null);
    }

    ['@test expandLocalLookup is called on the resolver if present'](assert) {
      assert.expect(4);

      let resolver = {
        expandLocalLookup: (targetFullName, sourceFullName) => {
          assert.ok(true, 'expandLocalLookup is called on the resolver');
          assert.equal(targetFullName, 'foo:bar', 'the targetFullName was passed through');
          assert.equal(sourceFullName, 'baz:qux', 'the sourceFullName was passed through');

          return 'foo:qux/bar';
        },
      };

      let registry = new Registry({
        resolver,
      });

      let result = registry.expandLocalLookup('foo:bar', {
        source: 'baz:qux',
      });

      assert.equal(result, 'foo:qux/bar');
    }

    ['@test `expandLocalLookup` is handled by the resolver, then by the fallback registry, if available'](
      assert
    ) {
      assert.expect(9);

      let fallbackResolver = {
        expandLocalLookup: (targetFullName, sourceFullName) => {
          assert.ok(true, 'expandLocalLookup is called on the fallback resolver');
          assert.equal(targetFullName, 'foo:bar', 'the targetFullName was passed through');
          assert.equal(sourceFullName, 'baz:qux', 'the sourceFullName was passed through');

          return 'foo:qux/bar-fallback';
        },
      };

      let resolver = {
        expandLocalLookup: (targetFullName, sourceFullName) => {
          assert.ok(true, 'expandLocalLookup is called on the resolver');
          assert.equal(targetFullName, 'foo:bar', 'the targetFullName was passed through');
          assert.equal(sourceFullName, 'baz:qux', 'the sourceFullName was passed through');

          return 'foo:qux/bar-resolver';
        },
      };

      let fallbackRegistry = new Registry({
        resolver: fallbackResolver,
      });

      let registry = new Registry({
        fallback: fallbackRegistry,
        resolver,
      });

      let result = registry.expandLocalLookup('foo:bar', {
        source: 'baz:qux',
      });

      assert.equal(result, 'foo:qux/bar-resolver', 'handled by the resolver');

      registry.resolver = null;

      result = registry.expandLocalLookup('foo:bar', {
        source: 'baz:qux',
      });

      assert.equal(result, 'foo:qux/bar-fallback', 'handled by the fallback registry');

      registry.fallback = null;

      result = registry.expandLocalLookup('foo:bar', {
        source: 'baz:qux',
      });

      assert.equal(
        result,
        null,
        'null is returned by default when no resolver or fallback registry is present'
      );
    }

    ['@test resolver.expandLocalLookup result is cached'](assert) {
      assert.expect(3);
      let result;

      let resolver = {
        expandLocalLookup: () => {
          assert.ok(true, 'expandLocalLookup is called on the resolver');

          return 'foo:qux/bar';
        },
      };

      let registry = new Registry({
        resolver,
      });

      result = registry.expandLocalLookup('foo:bar', {
        source: 'baz:qux',
      });

      assert.equal(result, 'foo:qux/bar');

      result = registry.expandLocalLookup('foo:bar', {
        source: 'baz:qux',
      });

      assert.equal(result, 'foo:qux/bar');
    }

    ['@test resolver.expandLocalLookup cache is busted when any unregister is called'](assert) {
      assert.expect(4);
      let result;

      let resolver = {
        expandLocalLookup: () => {
          assert.ok(true, 'expandLocalLookup is called on the resolver');

          return 'foo:qux/bar';
        },
      };

      let registry = new Registry({
        resolver,
      });

      result = registry.expandLocalLookup('foo:bar', {
        source: 'baz:qux',
      });

      assert.equal(result, 'foo:qux/bar');

      registry.unregister('foo:bar');

      result = registry.expandLocalLookup('foo:bar', {
        source: 'baz:qux',
      });

      assert.equal(result, 'foo:qux/bar');
    }

    ['@test resolve calls expandLocallookup when it receives options.source'](assert) {
      assert.expect(3);

      let resolver = {
        resolve() {},
        expandLocalLookup: (targetFullName, sourceFullName) => {
          assert.ok(true, 'expandLocalLookup is called on the resolver');
          assert.equal(targetFullName, 'foo:bar', 'the targetFullName was passed through');
          assert.equal(sourceFullName, 'baz:qux', 'the sourceFullName was passed through');

          return 'foo:qux/bar';
        },
      };

      let registry = new Registry({
        resolver,
      });

      registry.resolve('foo:bar', {
        source: 'baz:qux',
      });
    }

    ['@test has uses expandLocalLookup'](assert) {
      assert.expect(5);
      let resolvedFullNames = [];
      let result;

      let resolver = {
        resolve(name) {
          resolvedFullNames.push(name);
          return 'yippie!';
        },

        expandLocalLookup: targetFullName => {
          assert.ok(true, 'expandLocalLookup is called on the resolver');

          if (targetFullName === 'foo:bar') {
            return 'foo:qux/bar';
          } else {
            return null;
          }
        },
      };

      let registry = new Registry({
        resolver,
      });

      result = registry.has('foo:bar', {
        source: 'baz:qux',
      });

      assert.ok(result, 'found foo:bar/qux');

      result = registry.has('foo:baz', {
        source: 'baz:qux',
      });

      assert.ok(!result, 'foo:baz/qux not found');

      assert.deepEqual(['foo:qux/bar'], resolvedFullNames);
    }
  }
);

moduleFor(
  'Registry privatize',
  class extends AbstractTestCase {
    ['@test valid format'](assert) {
      let privatized = privatize(['secret:factory']);
      let matched = privatized.match(/^([^:]+):([^:]+)-(\d+)$/);

      assert.ok(matched, 'privatized format was recognized');
      assert.equal(matched[1], 'secret');
      assert.equal(matched[2], 'factory');
      assert.ok(/^\d+$/.test(matched[3]));
    }
  }
);

if (EMBER_MODULE_UNIFICATION) {
  moduleFor(
    'Registry module unification',
    class extends AbstractTestCase {
      ['@test The registry can pass a source to the resolver'](assert) {
        let PrivateComponent = factory();
        let type = 'component';
        let name = 'my-input';
        let specifier = `${type}:${name}`;
        let source = 'template:routes/application';

        let resolver = new ModuleBasedTestResolver();
        resolver.add({ specifier, source }, PrivateComponent);
        let registry = new Registry({ resolver });

        assert.strictEqual(
          registry.resolve(specifier),
          undefined,
          'Not returned when specifier not scoped'
        );
        assert.strictEqual(
          registry.resolve(specifier, { source }),
          PrivateComponent,
          'The correct factory was provided'
        );
        assert.strictEqual(
          registry.resolve(specifier, { source }),
          PrivateComponent,
          'The correct factory was provided again'
        );
      }

      ['@test The registry can pass a namespace to the resolver'](assert) {
        let PrivateComponent = factory();
        let type = 'component';
        let name = 'my-input';
        let specifier = `${type}:${name}`;
        let source = 'template:routes/application';
        let namespace = 'my-addon';

        let resolver = new ModuleBasedTestResolver();
        resolver.add({ specifier, source, namespace }, PrivateComponent);
        let registry = new Registry({ resolver });

        assert.strictEqual(
          registry.resolve(specifier),
          undefined,
          'Not returned when specifier not scoped'
        );
        assert.strictEqual(
          registry.resolve(specifier, { source }),
          undefined,
          'Not returned when specifier is missing namespace'
        );
        assert.strictEqual(
          registry.resolve(specifier, { source, namespace }),
          PrivateComponent,
          'The correct factory was provided'
        );
        assert.strictEqual(
          registry.resolve(specifier, { source, namespace }),
          PrivateComponent,
          'The correct factory was provided again'
        );
      }
    }
  );
}
