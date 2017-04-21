import { Registry } from '..';
import { factory } from 'internal-test-helpers';

QUnit.module('Registry');

QUnit.test('A registered factory is returned from resolve', function() {
  let registry = new Registry();
  let PostController = factory();

  registry.register('controller:post', PostController);

  let PostControllerFactory = registry.resolve('controller:post');

  ok(PostControllerFactory, 'factory is returned');
  ok(PostControllerFactory.create() instanceof  PostController, 'The return of factory.create is an instance of PostController');
});

QUnit.test('The registered factory returned from resolve is the same factory each time', function() {
  let registry = new Registry();
  let PostController = factory();

  registry.register('controller:post', PostController);

  deepEqual(registry.resolve('controller:post'), registry.resolve('controller:post'), 'The return of resolve is always the same');
});

QUnit.test('The registered value returned from resolve is the same value each time even if the value is falsy', function() {
  let registry = new Registry();

  registry.register('falsy:value', null, { instantiate: false });

  strictEqual(registry.resolve('falsy:value'), registry.resolve('falsy:value'), 'The return of resolve is always the same');
});

QUnit.test('The value returned from resolver is the same value as the original value even if the value is falsy', function() {
  let resolver = {
    resolve(fullName) {
      if (fullName === 'falsy:value') {
        return null;
      }
    }
  };
  let registry = new Registry({ resolver });

  strictEqual(registry.resolve('falsy:value'), null);
});

QUnit.test('A registered factory returns true for `has` if an item is registered', function() {
  let registry = new Registry();
  let PostController = factory();

  registry.register('controller:post', PostController);

  equal(registry.has('controller:post'), true, 'The `has` method returned true for registered factories');
  equal(registry.has('controller:posts'), false, 'The `has` method returned false for unregistered factories');
});

QUnit.test('Throw exception when trying to inject `type:thing` on all type(s)', function() {
  let registry = new Registry();
  let PostController = factory();

  registry.register('controller:post', PostController);

  throws(() => {
    registry.typeInjection('controller', 'injected', 'controller:post');
  }, /Cannot inject a 'controller:post' on other controller\(s\)\./);
});

QUnit.test('The registry can take a hook to resolve factories lazily', function() {
  let PostController = factory();
  let resolver = {
    resolve(fullName) {
      if (fullName === 'controller:post') {
        return PostController;
      }
    }
  };
  let registry = new Registry({ resolver });

  strictEqual(registry.resolve('controller:post'), PostController, 'The correct factory was provided');
});

QUnit.test('The registry respects the resolver hook for `has`', function() {
  let PostController = factory();
  let resolver = {
    resolve(fullName) {
      if (fullName === 'controller:post') {
        return PostController;
      }
    }
  };
  let registry = new Registry({ resolver });

  ok(registry.has('controller:post'), 'the `has` method uses the resolver hook');
});

QUnit.test('The registry normalizes names when resolving', function() {
  let registry = new Registry();
  let PostController = factory();

  registry.normalizeFullName = function(fullName) {
    return 'controller:post';
  };

  registry.register('controller:post', PostController);
  let type = registry.resolve('controller:normalized');

  strictEqual(type, PostController, 'Normalizes the name when resolving');
});

QUnit.test('The registry normalizes names when checking if the factory is registered', function() {
  let registry = new Registry();
  let PostController = factory();

  registry.normalizeFullName = function(fullName) {
    return fullName === 'controller:normalized' ? 'controller:post' : fullName;
  };

  registry.register('controller:post', PostController);
  let isPresent = registry.has('controller:normalized');

  equal(isPresent, true, 'Normalizes the name when checking if the factory or instance is present');
});

QUnit.test('validateFullName throws an error if name is incorrect', function() {
  expect(2);

  let registry = new Registry();
  let PostController = factory();

  registry.normalize = function(fullName) {
    return 'controller:post';
  };

  registry.register('controller:post', PostController);
  throws(() => {
    registry.validateFullName('post');
  }, /TypeError: Invalid Fullname, expected: 'type:name' got: post/);

  throws(() => {
    registry.validateFullName('route:http://foo.bar.com/baz');
  }, /TypeError: Invalid Fullname, expected: 'type:name' got: route:http:\/\/foo.bar.com\/baz/);
});

QUnit.test('The registry normalizes names when injecting', function() {
  let registry = new Registry();
  let PostController = factory();
  let user = { name: 'Stef' };

  registry.normalize = function(fullName) {
    return 'controller:post';
  };

  registry.register('controller:post', PostController);
  registry.register('user:post', user, { instantiate: false });
  registry.injection('controller:post', 'user', 'controller:normalized');

  deepEqual(registry.resolve('controller:post'), user, 'Normalizes the name when injecting');
});

QUnit.test('cannot register an `undefined` factory', function() {
  let registry = new Registry();

  throws(() => {
    registry.register('controller:apple', undefined);
  }, '');
});

QUnit.test('can re-register a factory', function() {
  let registry = new Registry();
  let FirstApple = factory('first');
  let SecondApple = factory('second');

  registry.register('controller:apple', FirstApple);
  registry.register('controller:apple', SecondApple);

  ok(registry.resolve('controller:apple').create() instanceof SecondApple);
});

QUnit.test('cannot re-register a factory if it has been resolved', function() {
  let registry = new Registry();
  let FirstApple = factory('first');
  let SecondApple = factory('second');

  registry.register('controller:apple', FirstApple);
  strictEqual(registry.resolve('controller:apple'), FirstApple);

  throws(function() {
    registry.register('controller:apple', SecondApple);
  }, /Cannot re-register: 'controller:apple', as it has already been resolved\./);

  strictEqual(registry.resolve('controller:apple'), FirstApple);
});

QUnit.test('registry.has should not accidentally cause injections on that factory to be run. (Mitigate merely on observing)', function() {
  expect(1);

  let registry = new Registry();
  let FirstApple = factory('first');
  let SecondApple = factory('second');

  SecondApple.extend = function(a, b, c) {
    ok(false, 'should not extend or touch the injected model, merely to inspect existence of another');
  };

  registry.register('controller:apple', FirstApple);
  registry.register('controller:second-apple', SecondApple);
  registry.injection('controller:apple', 'badApple', 'controller:second-apple');

  ok(registry.has('controller:apple'));
});

QUnit.test('registry.has should not error for invalid fullNames)', function() {
  expect(1);

  let registry = new Registry();

  ok(!registry.has('foo:bar:baz'));
});

QUnit.test('once resolved, always return the same result', function() {
  expect(1);

  let registry = new Registry();

  registry.resolver = {
    resolve() {
      return 'bar';
    }
  };

  let Bar = registry.resolve('models:bar');

  registry.resolver = {
    resolve() {
      return 'not bar';
    }
  };

  equal(registry.resolve('models:bar'), Bar);
});

QUnit.test('factory resolves are cached', function() {
  let registry = new Registry();
  let PostController = factory();
  let resolveWasCalled = [];

  registry.resolver = {
    resolve(fullName) {
      resolveWasCalled.push(fullName);
      return PostController;
    }
  };

  deepEqual(resolveWasCalled, []);
  registry.resolve('controller:post');
  deepEqual(resolveWasCalled, ['controller:post']);

  registry.resolve('controller:post');
  deepEqual(resolveWasCalled, ['controller:post']);
});

QUnit.test('factory for non extendables (MODEL) resolves are cached', function() {
  let registry = new Registry();
  let PostController = factory();
  let resolveWasCalled = [];

  registry.resolver = {
    resolve(fullName) {
      resolveWasCalled.push(fullName);
      return PostController;
    }
  };

  deepEqual(resolveWasCalled, []);
  registry.resolve('model:post');
  deepEqual(resolveWasCalled, ['model:post']);

  registry.resolve('model:post');
  deepEqual(resolveWasCalled, ['model:post']);
});

QUnit.test('factory for non extendables resolves are cached', function() {
  let registry = new Registry();
  let PostController = {};
  let resolveWasCalled = [];

  registry.resolver = {
    resolve(fullName) {
      resolveWasCalled.push(fullName);
      return PostController;
    }
  };

  deepEqual(resolveWasCalled, []);
  registry.resolve('foo:post');
  deepEqual(resolveWasCalled, ['foo:post']);

  registry.resolve('foo:post');
  deepEqual(resolveWasCalled, ['foo:post']);
});

QUnit.test('registry.container creates a container', function() {
  let registry = new Registry();
  let PostController = factory();
  registry.register('controller:post', PostController);

  let container = registry.container();
  let postController = container.lookup('controller:post');

  ok(postController instanceof PostController, 'The lookup is an instance of the registered factory');
});

QUnit.test('`describe` will be handled by the resolver, then by the fallback registry, if available', function() {
  let fallback = {
    describe(fullName) {
      return `${fullName}-fallback`;
    }
  };

  let resolver = {
    lookupDescription(fullName) {
      return `${fullName}-resolver`;
    }
  };

  let registry = new Registry({ fallback, resolver });

  equal(registry.describe('controller:post'), 'controller:post-resolver', '`describe` handled by the resolver first.');

  registry.resolver = null;

  equal(registry.describe('controller:post'), 'controller:post-fallback', '`describe` handled by fallback registry next.');

  registry.fallback = null;

  equal(registry.describe('controller:post'), 'controller:post', '`describe` by default returns argument.');
});

QUnit.test('`normalizeFullName` will be handled by the resolver, then by the fallback registry, if available', function() {
  let fallback = {
    normalizeFullName(fullName) {
      return `${fullName}-fallback`;
    }
  };

  let resolver = {
    normalize(fullName) {
      return `${fullName}-resolver`;
    }
  };

  let registry = new Registry({ fallback, resolver });

  equal(registry.normalizeFullName('controller:post'), 'controller:post-resolver', '`normalizeFullName` handled by the resolver first.');

  registry.resolver = null;

  equal(registry.normalizeFullName('controller:post'), 'controller:post-fallback', '`normalizeFullName` handled by fallback registry next.');

  registry.fallback = null;

  equal(registry.normalizeFullName('controller:post'), 'controller:post', '`normalizeFullName` by default returns argument.');
});

QUnit.test('`makeToString` will be handled by the resolver, then by the fallback registry, if available', function() {
  let fallback = {
    makeToString(fullName) {
      return `${fullName}-fallback`;
    }
  };

  let resolver = {
    makeToString(fullName) {
      return `${fullName}-resolver`;
    }
  };

  let registry = new Registry({ fallback, resolver });

  equal(registry.makeToString('controller:post'), 'controller:post-resolver', '`makeToString` handled by the resolver first.');

  registry.resolver = null;

  equal(registry.makeToString('controller:post'), 'controller:post-fallback', '`makeToString` handled by fallback registry next.');

  registry.fallback = null;

  equal(registry.makeToString('controller:post'), 'controller:post', '`makeToString` by default returns argument.');
});

QUnit.test('`resolve` can be handled by a fallback registry', function() {
  let fallback = new Registry();

  let registry = new Registry({ fallback: fallback });
  let PostController = factory();

  fallback.register('controller:post', PostController);

  let PostControllerFactory = registry.resolve('controller:post');

  ok(PostControllerFactory, 'factory is returned');
  ok(PostControllerFactory.create() instanceof  PostController, 'The return of factory.create is an instance of PostController');
});

QUnit.test('`has` can be handled by a fallback registry', function() {
  let fallback = new Registry();

  let registry = new Registry({ fallback: fallback });
  let PostController = factory();

  fallback.register('controller:post', PostController);

  equal(registry.has('controller:post'), true, 'Fallback registry is checked for registration');
});

QUnit.test('`getInjections` includes injections from a fallback registry', function() {
  let fallback = new Registry();
  let registry = new Registry({ fallback: fallback });

  equal(registry.getInjections('model:user').length, 0, 'No injections in the primary registry');

  fallback.injection('model:user', 'post', 'model:post');

  equal(registry.getInjections('model:user').length, 1, 'Injections from the fallback registry are merged');
});

QUnit.test('`getTypeInjections` includes type injections from a fallback registry', function() {
  let fallback = new Registry();
  let registry = new Registry({ fallback: fallback });

  equal(registry.getTypeInjections('model').length, 0, 'No injections in the primary registry');

  fallback.injection('model', 'source', 'source:main');

  equal(registry.getTypeInjections('model').length, 1, 'Injections from the fallback registry are merged');
});

QUnit.test('`getFactoryInjections` includes factory injections from a fallback registry', function() {
  let fallback = new Registry();
  let registry = new Registry({ fallback: fallback });

  equal(registry.getFactoryInjections('model:user').length, 0, 'No factory injections in the primary registry');

  fallback.factoryInjection('model:user', 'store', 'store:main');

  equal(registry.getFactoryInjections('model:user').length, 1, 'Factory injections from the fallback registry are merged');
});


QUnit.test('`getFactoryTypeInjections` includes factory type injections from a fallback registry', function() {
  let fallback = new Registry();
  let registry = new Registry({ fallback: fallback });

  equal(registry.getFactoryTypeInjections('model').length, 0, 'No factory type injections in the primary registry');

  fallback.factoryInjection('model', 'store', 'store:main');

  equal(registry.getFactoryTypeInjections('model').length, 1, 'Factory type injections from the fallback registry are merged');
});

QUnit.test('`knownForType` contains keys for each item of a given type', function() {
  let registry = new Registry();

  registry.register('foo:bar-baz', 'baz');
  registry.register('foo:qux-fez', 'fez');

  let found = registry.knownForType('foo');

  deepEqual(found, {
    'foo:bar-baz': true,
    'foo:qux-fez': true
  });
});

QUnit.test('`knownForType` includes fallback registry results', function() {
  let fallback = new Registry();
  let registry = new Registry({ fallback: fallback });

  registry.register('foo:bar-baz', 'baz');
  registry.register('foo:qux-fez', 'fez');
  fallback.register('foo:zurp-zorp', 'zorp');

  let found = registry.knownForType('foo');

  deepEqual(found, {
    'foo:bar-baz': true,
    'foo:qux-fez': true,
    'foo:zurp-zorp': true
  });
});

QUnit.test('`knownForType` is called on the resolver if present', function() {
  expect(3);

  let resolver = {
    knownForType(type) {
      ok(true, 'knownForType called on the resolver');
      equal(type, 'foo', 'the type was passed through');

      return { 'foo:yorp': true };
    }
  };

  let registry = new Registry({
    resolver
  });
  registry.register('foo:bar-baz', 'baz');

  let found = registry.knownForType('foo');

  deepEqual(found, {
    'foo:yorp': true,
    'foo:bar-baz': true
  });
});

QUnit.test('A registry can be created with a deprecated `resolver` function instead of an object', function() {
  expect(2);

  let registry;

  expectDeprecation(() => {
    registry = new Registry({
      resolver(fullName) {
        return `${fullName}-resolved`;
      }
    });
  }, 'Passing a `resolver` function into a Registry is deprecated. Please pass in a Resolver object with a `resolve` method.');

  equal(registry.resolve('foo:bar'), 'foo:bar-resolved', '`resolve` still calls the deprecated function');
});

QUnit.test('resolver.expandLocalLookup is not required', function(assert) {
  assert.expect(1);

  let registry = new Registry({
    resolver: { }
  });

  let result = registry.expandLocalLookup('foo:bar', {
    source: 'baz:qux'
  });

  assert.equal(result, null);
});

QUnit.test('expandLocalLookup is called on the resolver if present', function(assert) {
  assert.expect(4);

  let resolver = {
    expandLocalLookup(targetFullName, sourceFullName) {
      assert.ok(true, 'expandLocalLookup is called on the resolver');
      assert.equal(targetFullName, 'foo:bar', 'the targetFullName was passed through');
      assert.equal(sourceFullName, 'baz:qux', 'the sourceFullName was passed through');

      return 'foo:qux/bar';
    }
  };

  let registry = new Registry({
    resolver
  });

  let result = registry.expandLocalLookup('foo:bar', {
    source: 'baz:qux'
  });

  assert.equal(result, 'foo:qux/bar');
});

QUnit.test('`expandLocalLookup` is handled by the resolver, then by the fallback registry, if available', function(assert) {
  assert.expect(9);

  let fallbackResolver = {
    expandLocalLookup(targetFullName, sourceFullName) {
      assert.ok(true, 'expandLocalLookup is called on the fallback resolver');
      assert.equal(targetFullName, 'foo:bar', 'the targetFullName was passed through');
      assert.equal(sourceFullName, 'baz:qux', 'the sourceFullName was passed through');

      return 'foo:qux/bar-fallback';
    }
  };

  let resolver = {
    expandLocalLookup(targetFullName, sourceFullName) {
      assert.ok(true, 'expandLocalLookup is called on the resolver');
      assert.equal(targetFullName, 'foo:bar', 'the targetFullName was passed through');
      assert.equal(sourceFullName, 'baz:qux', 'the sourceFullName was passed through');

      return 'foo:qux/bar-resolver';
    }
  };

  let fallbackRegistry = new Registry({
    resolver: fallbackResolver
  });

  let registry = new Registry({
    fallback: fallbackRegistry,
    resolver
  });

  let result = registry.expandLocalLookup('foo:bar', {
    source: 'baz:qux'
  });

  assert.equal(result, 'foo:qux/bar-resolver', 'handled by the resolver');

  registry.resolver = null;

  result = registry.expandLocalLookup('foo:bar', {
    source: 'baz:qux'
  });

  assert.equal(result, 'foo:qux/bar-fallback', 'handled by the fallback registry');

  registry.fallback = null;

  result = registry.expandLocalLookup('foo:bar', {
    source: 'baz:qux'
  });

  assert.equal(result, null, 'null is returned by default when no resolver or fallback registry is present');
});

QUnit.test('resolver.expandLocalLookup result is cached', function(assert) {
  assert.expect(3);
  let result;

  let resolver = {
    expandLocalLookup(targetFullName, sourceFullName) {
      assert.ok(true, 'expandLocalLookup is called on the resolver');

      return 'foo:qux/bar';
    }
  };

  let registry = new Registry({
    resolver
  });

  result = registry.expandLocalLookup('foo:bar', {
    source: 'baz:qux'
  });

  assert.equal(result, 'foo:qux/bar');

  result = registry.expandLocalLookup('foo:bar', {
    source: 'baz:qux'
  });

  assert.equal(result, 'foo:qux/bar');
});

QUnit.test('resolver.expandLocalLookup cache is busted when any unregister is called', function(assert) {
  assert.expect(4);
  let result;

  let resolver = {
    expandLocalLookup(targetFullName, sourceFullName) {
      assert.ok(true, 'expandLocalLookup is called on the resolver');

      return 'foo:qux/bar';
    }
  };

  let registry = new Registry({
    resolver
  });

  result = registry.expandLocalLookup('foo:bar', {
    source: 'baz:qux'
  });

  assert.equal(result, 'foo:qux/bar');

  registry.unregister('foo:bar');

  result = registry.expandLocalLookup('foo:bar', {
    source: 'baz:qux'
  });

  assert.equal(result, 'foo:qux/bar');
});

QUnit.test('resolve calls expandLocallookup when it receives options.source', function(assert) {
  assert.expect(3);

  let resolver = {
    resolve() { },
    expandLocalLookup(targetFullName, sourceFullName) {
      assert.ok(true, 'expandLocalLookup is called on the resolver');
      assert.equal(targetFullName, 'foo:bar', 'the targetFullName was passed through');
      assert.equal(sourceFullName, 'baz:qux', 'the sourceFullName was passed through');

      return 'foo:qux/bar';
    }
  };

  let registry = new Registry({
    resolver
  });

  registry.resolve('foo:bar', {
    source: 'baz:qux'
  });
});

QUnit.test('has uses expandLocalLookup', function(assert) {
  assert.expect(5);
  let resolvedFullNames = [];
  let result;

  let resolver = {
    resolve(name) {
      resolvedFullNames.push(name);

      return 'yippie!';
    },

    expandLocalLookup(targetFullName, sourceFullName) {
      assert.ok(true, 'expandLocalLookup is called on the resolver');

      if (targetFullName === 'foo:bar') {
        return 'foo:qux/bar';
      } else {
        return null;
      }
    }
  };

  let registry = new Registry({
    resolver
  });

  result = registry.has('foo:bar', {
    source: 'baz:qux'
  });

  assert.ok(result, 'found foo:bar/qux');

  result = registry.has('foo:baz', {
    source: 'baz:qux'
  });

  assert.ok(!result, 'foo:baz/qux not found');

  assert.deepEqual(['foo:qux/bar'], resolvedFullNames);
});
